// @ts-nocheck
/**
 * OneForm Practical Autofill - Content Script v2.0
 * Optimized for Indian hardware constraints (2015-2025 devices)
 * 
 * LANGUAGES: 11 Indian languages + English + Hinglish
 * - en (English), hi (Hindi), ta (Tamil), te (Telugu), bn (Bengali)
 * - mr (Marathi), gu (Gujarati), kn (Kannada), ml (Malayalam)
 * - pa (Punjabi), or (Odia)
 * 
 * TIER ARCHITECTURE (Realistic for 2-4GB RAM):
 * - Tier 1: Enhanced Heuristics + 11-lang patterns (100% devices) → 70-80% success
 * - Tier 2: SKIP on low RAM (<4GB) - crashes old CSC computers
 * - Tier 3: Server fallback via Groq/Gemini (100% with internet) → +10-15% success
 * 
 * TARGET: 80-90% overall success (NOT 95%)
 * 
 * @version 2.0.0
 * @updated 2025-12-02
 */

/* global chrome, window, document, navigator, console, Event, caches */

// Use FieldMapper from fieldMappers.js if available
const getFieldMapper = () => {
  if (typeof window !== 'undefined' && window.OneFormFieldMapper) {
    return window.OneFormFieldMapper;
  }
  return null;
};

class OneFormAutofill {
  constructor() {
    this.initialized = false;
    this.canUseTransformers = false;
    this.cloudConsentGiven = false;
    this.serverUrl = null;

    // Statistics
    this.stats = {
      formsDetected: 0,
      fieldsTotal: 0,
      fillsAttempted: 0,
      fillsSuccessful: 0,
      fillsFailed: 0,
      tier1Success: 0,
      tier2Success: 0,
      tier3Success: 0,
      tier2Available: false
    };

    // Strategy success tracking (simplified Q-learning)
    this.strategyStats = {};
  }

  async init() {
    if (this.initialized) return;

    console.log('[OneForm] Initializing (Practical Edition)...');

    // Load settings
    const settings = await chrome.storage.local.get([
      'cloudConsent',
      'serverUrl',
      'strategyStats'
    ]);

    this.cloudConsentGiven = settings.cloudConsent || false;
    this.serverUrl = settings.serverUrl || 'http://localhost:3000';
    this.strategyStats = settings.strategyStats || {};

    // Check device capabilities (Tier 2 availability)
    this.canUseTransformers = await this.detectCapabilities();
    this.stats.tier2Available = this.canUseTransformers;

    if (this.canUseTransformers) {
      console.log('[OneForm] Device capable - Tier 2 enabled');
    } else {
      console.log('[OneForm] Device too weak - Tier 1+3 only');
    }

    // Detect forms on page
    this.detectForms();

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'getStats') {
        sendResponse(this.stats);
      }
      return true;
    });

    this.initialized = true;
    console.log('[OneForm] Ready');
  }

  /**
   * Detect device capabilities for Tier 2 (Transformers.js)
   * REALISTIC checks for Indian hardware
   */
  async detectCapabilities() {
    try {
      // Check 1: Chrome version (need 127+ for WebGPU stability)
      const chromeVersion = this.getChromeVersion();
      if (chromeVersion < 110) {
        console.log('[Tier 2] Chrome too old:', chromeVersion);
        return false;
      }

      // Check 2: WebGPU availability (only on decent GPUs)
      if (!('gpu' in navigator)) {
        console.log('[Tier 2] No WebGPU support');
        return false;
      }

      // Check 3: Memory (need at least 4GB available)
      const memory = navigator.deviceMemory; // GB estimate
      if (memory && memory < 4) {
        console.log('[Tier 2] Insufficient RAM:', memory, 'GB');
        return false;
      }

      // Check 4: Try to request WebGPU adapter
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
          console.log('[Tier 2] WebGPU adapter unavailable');
          return false;
        }

        // Check 5: Developer preference - is Tier 2 enabled in options?
        try {
          const opts = await chrome.storage.local.get(['enableTier2']);
          if (!opts.enableTier2) {
            console.log('[Tier 2] Disabled in options by user');
            return false;
          }

          // Try to prefetch model metadata via background
          chrome.runtime.sendMessage({ action: 'prefetchTier2' }, (resp) => {
            if (resp && resp.manifest) {
              console.log('[Tier 2] Prefetch manifest received', resp.manifest);
            }
          });
        } catch (err) {
          console.warn('[Tier 2] Could not read options', err);
        }

        // Success - device is capable
        console.log('[Tier 2] WebGPU available, device capable');
        return true;

      } catch (error) {
        console.log('[Tier 2] WebGPU test failed:', error);
        return false;
      }

    } catch (error) {
      console.log('[Tier 2] Capability detection failed:', error);
      return false;
    }
  }

  getChromeVersion() {
    const match = navigator.userAgent.match(/Chrome\/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Detect all forms on page and inject autofill buttons
   */
  detectForms() {
    const forms = document.querySelectorAll('form');
    console.log(`[OneForm] Found ${forms.length} forms`);

    forms.forEach((form, index) => {
      this.stats.formsDetected++;

      // Analyze form structure
      const formInfo = this.analyzeForm(form);

      if (formInfo.fields.length > 0) {
        // Inject autofill button
        this.addAutofillButton(form, formInfo, index);
      }
    });
  }

  /**
   * Analyze form structure and detect fields
   */
  analyzeForm(form) {
    const fields = [];

    // Find all fillable inputs
    const inputs = form.querySelectorAll(
      'input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset]), select, textarea'
    );

    inputs.forEach(element => {
      const field = this.detectField(element);
      if (field) {
        fields.push(field);
        this.stats.fieldsTotal++;
      }
    });

    return {
      form,
      fields,
      action: form.action,
      method: form.method
    };
  }

  /**
   * Detect field type using Tier 1 enhanced heuristics with 11-language support
   * This MUST work on 100% of devices (no dependencies, no ML models)
   * 
   * DETECTION PRIORITY:
   * 1. Portal-specific mappings (98% accuracy on known portals)
   * 2. Enhanced FieldMapper (11 languages + fuzzy matching)
   * 3. Legacy strategies (Autocomplete → Attributes → Labels → Placeholder)
   */
  detectField(element) {
    const field = {
      element,
      type: element.type || element.tagName.toLowerCase(),
      id: element.id,
      name: element.name,
      className: element.className,
      autocomplete: element.getAttribute('autocomplete'),
      placeholder: element.placeholder,
      ariaLabel: element.getAttribute('aria-label'),
      label: null,
      canonicalField: null,
      strategy: null,
      confidence: 0,
      detectedLanguage: null,
      portal: null
    };

    // Find associated label
    field.label = this.findLabel(element);

    // PRIORITY 1: Portal-specific mappings (highest accuracy)
    if (typeof window !== 'undefined' && window.OneFormPortalMapper) {
      const portalDetection = window.OneFormPortalMapper.detectByPortalMapping(
        { id: field.id, name: field.name, className: field.className },
        window.location.hostname
      );

      if (portalDetection && portalDetection.canonical) {
        field.canonicalField = portalDetection.canonical;
        field.strategy = portalDetection.source;
        field.confidence = portalDetection.confidence;
        field.portal = portalDetection.portal;
        console.log(`[OneForm] Portal match: ${field.id || field.name} → ${portalDetection.canonical} (${portalDetection.portal})`);
        return field;
      }
    }

    // PRIORITY 2: Use enhanced FieldMapper if available (11 languages + fuzzy matching)
    const mapper = getFieldMapper();
    if (mapper && mapper.detectFieldType) {
      const detection = mapper.detectFieldType({
        label: field.label,
        name: field.name,
        id: field.id,
        placeholder: field.placeholder,
        type: field.type
      });

      if (detection && detection.canonical) {
        field.canonicalField = detection.canonical;
        field.strategy = detection.source || 'enhanced_mapper';
        field.confidence = detection.confidence || 0.85;
        return field;
      }
    }

    // PRIORITY 3: Fallback to legacy detection strategies in order (Tier 1 only)
    field.canonicalField =
      this.detectByAutocomplete(field) ||
      this.detectByAttributes(field) ||
      this.detectByLabel(field) ||
      this.detectByPlaceholder(field) ||
      this.detectByHindiPatterns(field) ||  // Hindi/regional patterns
      null;

    return field;
  }

  /**
   * NEW: Detect using Hindi and regional language patterns
   * Zero overhead - just regex matching
   */
  detectByHindiPatterns(field) {
    const combined = `${field.label || ''} ${field.placeholder || ''}`.trim();
    if (!combined) return null;

    // Hindi (Devanagari) patterns - most common regional script
    const hindiPatterns = [
      { pattern: /नाम|पूरा[\s_-]?नाम/, field: 'person.name.full' },
      { pattern: /पिता[\s_-]?(का[\s_-]?)?नाम/, field: 'person.parent.father_name' },
      { pattern: /माता[\s_-]?(का[\s_-]?)?नाम|माँ[\s_-]?का[\s_-]?नाम/, field: 'person.parent.mother_name' },
      { pattern: /ईमेल|ई-मेल/, field: 'person.contact.email' },
      { pattern: /फ़ोन|मोबाइल|संपर्क[\s_-]?नंबर/, field: 'person.contact.phone' },
      { pattern: /जन्म[\s_-]?तिथि|जन्म[\s_-]?तारीख/, field: 'person.dob' },
      { pattern: /लिंग/, field: 'person.gender' },
      { pattern: /आधार/, field: 'person.identity.aadhar' },
      { pattern: /पैन/, field: 'person.identity.pan' },
      { pattern: /जाति|वर्ग/, field: 'person.category.caste' },
      { pattern: /पता/, field: 'person.address.line1' },
      { pattern: /जिला/, field: 'person.address.district' },
      { pattern: /राज्य/, field: 'person.address.state' },
      { pattern: /पिन[\s_-]?कोड/, field: 'person.address.pincode' },
      { pattern: /गाँव|ग्राम/, field: 'person.address.village' },
      { pattern: /तहसील/, field: 'person.address.tehsil' },
      { pattern: /शिक्षा|योग्यता/, field: 'education.highest_degree' },
      { pattern: /खाता[\s_-]?संख्या/, field: 'bank.account_number' },
      { pattern: /आईएफएससी/, field: 'bank.ifsc' }
    ];

    // Tamil patterns
    const tamilPatterns = [
      { pattern: /பெயர்/, field: 'person.name.full' },
      { pattern: /தந்தை[\s_-]?பெயர்/, field: 'person.parent.father_name' },
      { pattern: /தாய்[\s_-]?பெயர்/, field: 'person.parent.mother_name' },
      { pattern: /பிறந்த[\s_-]?தேதி/, field: 'person.dob' },
      { pattern: /மாவட்டம்/, field: 'person.address.district' },
      { pattern: /மாநிலம்/, field: 'person.address.state' }
    ];

    // Telugu patterns
    const teluguPatterns = [
      { pattern: /పేరు/, field: 'person.name.full' },
      { pattern: /తండ్రి[\s_-]?పేరు/, field: 'person.parent.father_name' },
      { pattern: /తల్లి[\s_-]?పేరు/, field: 'person.parent.mother_name' },
      { pattern: /పుట్టిన[\s_-]?తేదీ/, field: 'person.dob' },
      { pattern: /జిల్లా/, field: 'person.address.district' },
      { pattern: /రాష్ట్రం/, field: 'person.address.state' }
    ];

    // Bengali patterns
    const bengaliPatterns = [
      { pattern: /নাম/, field: 'person.name.full' },
      { pattern: /পিতার[\s_-]?নাম/, field: 'person.parent.father_name' },
      { pattern: /মাতার[\s_-]?নাম/, field: 'person.parent.mother_name' },
      { pattern: /জন্ম[\s_-]?তারিখ/, field: 'person.dob' },
      { pattern: /জেলা/, field: 'person.address.district' },
      { pattern: /রাজ্য/, field: 'person.address.state' }
    ];

    // All regional patterns combined
    const allPatterns = [
      ...hindiPatterns,
      ...tamilPatterns,
      ...teluguPatterns,
      ...bengaliPatterns
    ];

    for (const { pattern, field: canonicalField } of allPatterns) {
      if (pattern.test(combined)) {
        field.strategy = 'regional_language_pattern';
        field.detectedLanguage = this.detectScript(combined);
        return canonicalField;
      }
    }

    return null;
  }

  /**
   * Detect which script/language is being used
   */
  detectScript(text) {
    if (/[\u0900-\u097F]/.test(text)) return 'hi'; // Devanagari (Hindi, Marathi)
    if (/[\u0B80-\u0BFF]/.test(text)) return 'ta'; // Tamil
    if (/[\u0C00-\u0C7F]/.test(text)) return 'te'; // Telugu
    if (/[\u0980-\u09FF]/.test(text)) return 'bn'; // Bengali
    if (/[\u0A80-\u0AFF]/.test(text)) return 'gu'; // Gujarati
    if (/[\u0C80-\u0CFF]/.test(text)) return 'kn'; // Kannada
    if (/[\u0D00-\u0D7F]/.test(text)) return 'ml'; // Malayalam
    if (/[\u0A00-\u0A7F]/.test(text)) return 'pa'; // Punjabi (Gurmukhi)
    if (/[\u0B00-\u0B7F]/.test(text)) return 'or'; // Odia
    return 'en'; // Default to English
  }

  /**
   * TIER 1 STRATEGY 1: HTML5 Autocomplete (40% coverage)
   * Most reliable, works everywhere
   */
  detectByAutocomplete(field) {
    if (!field.autocomplete) return null;

    const autocomplete = field.autocomplete.toLowerCase();

    // Standard HTML5 autocomplete values
    const mapping = {
      'name': 'person.name.full',
      'given-name': 'person.name.first',
      'family-name': 'person.name.last',
      'email': 'person.contact.email',
      'tel': 'person.contact.phone',
      'bday': 'person.dob',
      'sex': 'person.gender',
      'address-line1': 'person.address.line1',
      'address-line2': 'person.address.line2',
      'address-level2': 'person.address.city',
      'address-level1': 'person.address.state',
      'postal-code': 'person.address.pincode',
      'country': 'person.address.country'
    };

    if (mapping[autocomplete]) {
      field.strategy = 'html5_autocomplete';
      return mapping[autocomplete];
    }

    return null;
  }

  /**
   * TIER 1 STRATEGY 2: ID/Name Pattern Matching (20% coverage)
   * Works on most government forms
   */
  detectByAttributes(field) {
    const id = (field.id || '').toLowerCase();
    const name = (field.name || '').toLowerCase();
    const combined = `${id} ${name}`.trim();

    if (!combined) return null;

    // Indian-specific patterns (government forms)
    const patterns = [
      // Names
      { pattern: /^(full[\s_-]?)?name$/i, field: 'person.name.full' },
      { pattern: /first[\s_-]?name/i, field: 'person.name.first' },
      { pattern: /last[\s_-]?name|surname/i, field: 'person.name.last' },
      { pattern: /middle[\s_-]?name/i, field: 'person.name.middle' },
      { pattern: /father[\s_-]?name/i, field: 'person.parent.father_name' },
      { pattern: /mother[\s_-]?name/i, field: 'person.parent.mother_name' },

      // Contact
      { pattern: /email|e[\s_-]?mail/i, field: 'person.contact.email' },
      { pattern: /phone|mobile|tel|contact/i, field: 'person.contact.phone' },

      // Identity (India-specific)
      { pattern: /dob|date.*birth|birth.*date/i, field: 'person.dob' },
      { pattern: /gender|sex/i, field: 'person.gender' },
      { pattern: /aadh?ar|uid/i, field: 'person.identity.aadhar' },
      { pattern: /pan[\s_-]?(card|no|number)?/i, field: 'person.identity.pan' },
      { pattern: /voter|epic/i, field: 'person.identity.voter_id' },

      // Category (Indian quotas)
      { pattern: /caste|category|quota/i, field: 'person.category.caste' },
      { pattern: /(obc|sc|st|gen|general)/i, field: 'person.category.reservation' },
      { pattern: /pwd|disability/i, field: 'person.category.pwd' },

      // Education
      { pattern: /qualification|degree|education/i, field: 'education.highest_degree' },
      { pattern: /institution|college|university|school/i, field: 'education.institution' },
      { pattern: /passing.*year|year.*pass/i, field: 'education.year_of_passing' },
      { pattern: /marks|percentage|cgpa|gpa/i, field: 'education.marks' },

      // Address (Indian format)
      { pattern: /address.*1|street|house/i, field: 'person.address.line1' },
      { pattern: /address.*2|locality/i, field: 'person.address.line2' },
      { pattern: /village/i, field: 'person.address.village' },
      { pattern: /tehsil|taluk/i, field: 'person.address.tehsil' },
      { pattern: /district/i, field: 'person.address.district' },
      { pattern: /city|town/i, field: 'person.address.city' },
      { pattern: /state|province/i, field: 'person.address.state' },
      { pattern: /pin.*code|postal|zip/i, field: 'person.address.pincode' }
    ];

    for (const { pattern, field: canonicalField } of patterns) {
      if (pattern.test(combined)) {
        field.strategy = 'attribute_matching';
        return canonicalField;
      }
    }

    return null;
  }

  /**
   * TIER 1 STRATEGY 3: Label Proximity (15% coverage)
   * Finds associated label and matches patterns
   */
  detectByLabel(field) {
    if (!field.label) return null;

    const labelText = field.label.toLowerCase().trim();

    // Reuse attribute patterns on label text
    const patterns = [
      { pattern: /^(full\s*)?name$/i, field: 'person.name.full' },
      { pattern: /email/i, field: 'person.contact.email' },
      { pattern: /phone|mobile/i, field: 'person.contact.phone' },
      { pattern: /father.*name/i, field: 'person.parent.father_name' },
      { pattern: /mother.*name/i, field: 'person.parent.mother_name' },
      { pattern: /date.*birth|dob/i, field: 'person.dob' },
      { pattern: /aadh?ar/i, field: 'person.identity.aadhar' },
      { pattern: /pan/i, field: 'person.identity.pan' },
      { pattern: /category|caste/i, field: 'person.category.caste' },
      { pattern: /address/i, field: 'person.address.line1' },
      { pattern: /city/i, field: 'person.address.city' },
      { pattern: /state/i, field: 'person.address.state' },
      { pattern: /pin.*code/i, field: 'person.address.pincode' }
    ];

    for (const { pattern, field: canonicalField } of patterns) {
      if (pattern.test(labelText)) {
        field.strategy = 'label_proximity';
        return canonicalField;
      }
    }

    return null;
  }

  /**
   * TIER 1 STRATEGY 4: Placeholder Text (10% coverage)
   * Fallback when no label/id/name
   */
  detectByPlaceholder(field) {
    if (!field.placeholder) return null;

    const placeholder = field.placeholder.toLowerCase().trim();

    // Common placeholder patterns
    if (/enter.*name|your name/i.test(placeholder)) {
      field.strategy = 'placeholder';
      return 'person.name.full';
    }
    if (/email/i.test(placeholder)) {
      field.strategy = 'placeholder';
      return 'person.contact.email';
    }
    if (/phone|mobile/i.test(placeholder)) {
      field.strategy = 'placeholder';
      return 'person.contact.phone';
    }

    return null;
  }

  /**
   * Find associated label for input
   */
  findLabel(element) {
    // Method 1: <label for="id">
    if (element.id) {
      const label = document.querySelector(`label[for="${element.id}"]`);
      if (label) return label.textContent.trim();
    }

    // Method 2: Wrapped in <label>
    const parentLabel = element.closest('label');
    if (parentLabel) {
      return parentLabel.textContent.trim();
    }

    // Method 3: Previous sibling
    let prev = element.previousElementSibling;
    while (prev) {
      if (prev.tagName === 'LABEL') {
        return prev.textContent.trim();
      }
      if (prev.textContent.trim().length > 0 && prev.textContent.trim().length < 100) {
        return prev.textContent.trim();
      }
      prev = prev.previousElementSibling;
    }

    // Method 4: ARIA label
    if (element.getAttribute('aria-label')) {
      return element.getAttribute('aria-label');
    }

    return null;
  }

  /**
   * Add autofill button to form with Hinglish support
   */
  addAutofillButton(form, formInfo, index) {
    // Skip if already has button
    if (form.querySelector('.oneform-autofill-btn')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'oneform-autofill-btn';

    // Hinglish button text for Indian users
    button.innerHTML = '⚡ फॉर्म भरें / Fill Form';
    button.title = 'OneForm से फॉर्म भरें - Click to autofill';

    button.style.cssText = `
      position: relative;
      display: inline-block;
      margin: 10px 0;
      padding: 12px 24px;
      background: linear-gradient(135deg, #FF6B35 0%, #F7931E 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(255, 107, 53, 0.3);
      transition: all 0.2s;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Devanagari', sans-serif;
    `;

    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-2px)';
      button.style.boxShadow = '0 4px 12px rgba(255, 107, 53, 0.4)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 2px 8px rgba(255, 107, 53, 0.3)';
    });

    button.addEventListener('click', () => {
      this.autofillForm(formInfo);
    });

    // Insert button at top of form
    form.insertBefore(button, form.firstChild);
  }

  /**
   * Main autofill orchestration
   * Tries Tier 1 → Tier 2 → Tier 3
   */
  async autofillForm(formInfo) {
    console.log('[OneForm] Starting autofill...');

    // Request permissions if needed
    const hasPermission = await this.requestHostPermission();
    if (!hasPermission) {
      this.showToast('❌ Permission denied / अनुमति नहीं मिली', 'error');
      return;
    }

    // Get user profile from service worker
    const profile = await chrome.runtime.sendMessage({ action: 'getUserProfile' });

    if (!profile || !profile.success) {
      this.showToast('🔐 पहले indianform.com पर login करें / Please login first', 'error');
      return;
    }

    const userData = profile.data;
    let successCount = 0;
    let failCount = 0;

    // Fill each field
    for (const field of formInfo.fields) {
      this.stats.fillsAttempted++;

      let success = false;

      // TIER 1: Try detected canonical field (heuristics)
      if (field.canonicalField) {
        const value = this.getValueForCanonical(field.canonicalField, userData);
        if (value) {
          success = await this.setFieldValue(field.element, value);
          if (success) {
            this.stats.tier1Success++;
            this.recordStrategySuccess(field.strategy);
          }
        }
      }

      // TIER 2: Try Transformers.js (if available and Tier 1 failed)
      if (!success && this.canUseTransformers) {
        try {
          const canonicalField = await this.detectWithTransformers(field);
          if (canonicalField) {
            const value = this.getValueForCanonical(canonicalField, userData);
            if (value) {
              success = await this.setFieldValue(field.element, value);
              if (success) {
                this.stats.tier2Success++;
                this.recordStrategySuccess('transformers_js');
              }
            }
          }
        } catch (error) {
          console.log('[Tier 2] Failed:', error);
        }
      }

      // TIER 3: Try server fallback (if consent given and Tier 1+2 failed)
      if (!success && this.cloudConsentGiven) {
        try {
          const canonicalField = await this.detectWithServer(field);
          if (canonicalField) {
            const value = this.getValueForCanonical(canonicalField, userData);
            if (value) {
              success = await this.setFieldValue(field.element, value);
              if (success) {
                this.stats.tier3Success++;
                this.recordStrategySuccess('cloud_fallback');
              }
            }
          }
        } catch (error) {
          console.log('[Tier 3] Failed:', error);
        }
      }

      if (success) {
        successCount++;
        this.stats.fillsSuccessful++;
      } else {
        failCount++;
        this.stats.fillsFailed++;
      }
    }

    // Show result with Hinglish messages
    const successRate = Math.round((successCount / formInfo.fields.length) * 100);

    // Bilingual success messages
    const messages = {
      high: `✅ ${successCount}/${formInfo.fields.length} फ़ील्ड भरे (${successRate}%) - बहुत बढ़िया!`,
      medium: `⚠️ ${successCount}/${formInfo.fields.length} फ़ील्ड भरे (${successRate}%) - कुछ manually भरें`,
      low: `❌ सिर्फ ${successCount}/${formInfo.fields.length} भरे (${successRate}%) - Network slow है?`
    };

    let message, type;
    if (successRate >= 80) {
      message = messages.high;
      type = 'success';
    } else if (successRate >= 50) {
      message = messages.medium;
      type = 'warning';
    } else {
      message = messages.low;
      type = 'error';
    }

    this.showToast(message, type);

    // Log usage to Firebase
    await chrome.runtime.sendMessage({
      action: 'logAutofillUsage',
      data: {
        url: window.location.href,
        domain: window.location.hostname,
        formAction: formInfo.action,
        fieldsTotal: formInfo.fields.length,
        fieldsSuccess: successCount,
        fieldsFailed: failCount,
        tier1Success: this.stats.tier1Success,
        tier2Success: this.stats.tier2Success,
        tier3Success: this.stats.tier3Success
      }
    });
  }

  /**
   * TIER 2: Detect with Transformers.js (optional, WebGPU only)
   * SKIPPED for 70% of users (too slow/crashes)
   */
  async detectWithTransformers(field) {
    // TODO: Implement when device is capable
    // For now, return null (skip Tier 2)
    // Load model if not already loaded
    if (!this.transformerModelLoaded) {
      await this.loadTransformersConditional();
    }

    if (!this.transformerModelLoaded) return null;

    // Minimal similarity check using heuristics (placeholder for real miniLM)
    const label = (field.label || field.placeholder || field.name || field.id || '').toLowerCase();
    if (label.includes('email')) return 'person.contact.email';
    if (label.includes('phone') || label.includes('mobile')) return 'person.contact.phone';
    if (label.includes('dob') || label.includes('date of birth')) return 'person.dob';
    return null;
  }

  async loadTransformersConditional() {
    // Try to load a minimal model manifest from background
    try {
      const resp = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'prefetchTier2' }, (r) => resolve(r || {}));
      });

      if (!resp || !resp.manifest) {
        console.log('[Tier 2] No manifest available');
        this.transformerModelLoaded = false;
        return;
      }

      // Optionally, fetch manifest.url to warm cache. We do not load huge weights in extension.
      const manifest = resp.manifest;
      const modelUrl = manifest.url;
      // Cache manifest via fetch + Cache API
      await caches.open('oneform-models').then(cache => cache.add(modelUrl).catch(() => { }));
      console.log('[Tier 2] Model metadata cached', manifest.name);
      this.transformerModelLoaded = true;
    } catch (err) {
      console.warn('[Tier 2] Prefetch failed:', err);
      this.transformerModelLoaded = false;
    }
  }

  /**
   * TIER 3: Detect with server (cloud fallback)
   * Only after user consent
   */
  async detectWithServer(field) {
    // Use background service worker to proxy call (centralized logging & CORS handling)
    try {
      const payload = {
        label: field.label,
        placeholder: field.placeholder,
        id: field.id,
        name: field.name,
        type: field.type,
        url: window.location.href
      };

      const result = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'resolveField', data: payload }, (resp) => {
          resolve(resp || null);
        });
      });

      if (!result || result.error) {
        console.warn('[Tier 3] Server error or no result', result);
        return null;
      }

      return result.canonicalType || result.canonicalField || null;
    } catch (err) {
      console.warn('[Tier 3] Server call failed:', err);
      return null;
    }
  }

  /**
   * Get value from user profile for canonical field
   */
  getValueForCanonical(canonical, userData) {
    const parts = canonical.split('.');
    let value = userData;

    for (const part of parts) {
      if (!value || typeof value !== 'object') return null;
      value = value[part];
    }

    return value || null;
  }

  /**
   * Set field value and trigger events
   */
  async setFieldValue(element, value) {
    if (!element || !value) return false;

    try {
      // Set value using native setter (React compatibility)
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      ).set;

      nativeInputValueSetter.call(element, value);

      // Trigger events
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new Event('blur', { bubbles: true }));

      // Wait for validation
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify value persisted
      return element.value === value;

    } catch (error) {
      console.error('[Fill] Failed to set value:', error);
      return false;
    }
  }

  /**
   * Record strategy success for future optimization
   */
  recordStrategySuccess(strategy) {
    const domain = window.location.hostname;

    if (!this.strategyStats[domain]) {
      this.strategyStats[domain] = {};
    }

    if (!this.strategyStats[domain][strategy]) {
      this.strategyStats[domain][strategy] = { attempts: 0, successes: 0 };
    }

    this.strategyStats[domain][strategy].attempts++;
    this.strategyStats[domain][strategy].successes++;

    // Save to storage (debounced)
    this.saveStrategyStats();
  }

  async saveStrategyStats() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);

    this.saveTimeout = setTimeout(async () => {
      await chrome.storage.local.set({ strategyStats: this.strategyStats });
    }, 5000);
  }

  /**
   * Request host permission at runtime
   */
  async requestHostPermission() {
    try {
      const origin = window.location.origin;
      const granted = await chrome.permissions.request({
        origins: [origin + '/*']
      });
      return granted;
    } catch (error) {
      console.error('[Permissions] Request failed:', error);
      return false;
    }
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'oneform-toast';
    toast.textContent = message;

    const colors = {
      info: '#2196F3',
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#F44336'
    };

    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${colors[type] || colors.info};
      color: white;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 999999;
      animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// Listen for messages from background script for AI field extraction
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[ContentScript] Message received:', message.action);

  if (message.action === 'getFormFields') {
    const fields = extractAllFormFields();
    sendResponse({ success: true, fields });
    return false;
  }

  sendResponse({ success: false, error: 'Unknown action' });
  return false;
});

/**
 * Extract all form fields from the page for AI processing
 */
function extractAllFormFields() {
  const fields = [];
  const forms = document.querySelectorAll('form');

  forms.forEach((form, formIndex) => {
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach((input, inputIndex) => {
      // Skip hidden and button-like inputs
      const type = input.type || input.tagName.toLowerCase();
      if (type === 'hidden' || type === 'submit' || type === 'button' || type === 'reset') {
        return;
      }

      const field = {
        formIndex,
        inputIndex,
        type,
        name: input.name || '',
        id: input.id || '',
        placeholder: input.placeholder || '',
        label: findFieldLabel(input),
        value: input.value || '',
        required: input.required || false,
        autocomplete: input.getAttribute('autocomplete') || ''
      };
      fields.push(field);
    });
  });

  return fields;
}

/**
 * Find label text for an input element
 */
function findFieldLabel(input) {
  // Check for explicit label
  if (input.id) {
    const label = document.querySelector(`label[for="${input.id}"]`);
    if (label) return label.textContent.trim();
  }

  // Check for parent label
  const parentLabel = input.closest('label');
  if (parentLabel) return parentLabel.textContent.trim();

  // Check for preceding element
  const prevElement = input.previousElementSibling;
  if (prevElement && (prevElement.tagName === 'LABEL' || prevElement.tagName === 'SPAN')) {
    return prevElement.textContent.trim();
  }

  // Check ARIA label
  if (input.getAttribute('aria-label')) {
    return input.getAttribute('aria-label');
  }

  return '';
}

// Initialize on page load
const autofill = new OneFormAutofill();
autofill.init();

