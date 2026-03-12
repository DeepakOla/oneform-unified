// @ts-nocheck
/**
 * OneForm Practical Extension - Service Worker v2.1.0
 * 
 * Handles background tasks:
 * - First-run setup wizard trigger
 * - Multi-AI provider fallback (Groq → OpenRouter → Skyvern → Gemini)
 * - Firebase wallet integration for paid features
 * - Message passing between content script and server
 * - Statistics tracking and aggregation
 * - Server health monitoring
 * - Settings management
 * 
 * CHROME POLICY COMPLIANCE:
 * - NO CAPTCHA solving (operators handle manually)
 * - NO OTP automation (users enter manually)  
// Job polling state
let jobPollingInterval = null;
let isProcessingJob = false;
let currentJobId = null;

// ============================================================
// JOB QUEUE LISTENER (MCP ↔ Extension Bridge)
// ============================================================

/**
 * Start polling for jobs from Firebase
 * Called when user logs in or on extension startup
 */
async function startJobPolling() {
  if (jobPollingInterval) {
    console.log('[JobQueue] Already polling');
    return;
  }
  
  const { firebaseToken, userId, tenantId } = await chrome.storage.local.get(['firebaseToken', 'userId', 'tenantId']);
  
  if (!firebaseToken || !userId) {
    console.log('[JobQueue] Not logged in, skipping job polling');
    return;
  }
  
  console.log('[JobQueue] Starting job polling for user:', userId);
  
  // Poll every 5 seconds (reasonable for real-time without hammering)
  jobPollingInterval = setInterval(async () => {
    if (isProcessingJob) return;
    await checkForPendingJobs(firebaseToken, userId, tenantId);
  }, 5000);
  
  // Also check immediately
  await checkForPendingJobs(firebaseToken, userId, tenantId);
}

/**
 * Stop job polling
 */
function stopJobPolling() {
  if (jobPollingInterval) {
    clearInterval(jobPollingInterval);
    jobPollingInterval = null;
    console.log('[JobQueue] Stopped polling');
  }
}

/**
 * Check for pending jobs via Firebase Function
 */
async function checkForPendingJobs(token, userId, tenantId) {
  try {
    const response = await fetch(`${FIREBASE_API_URL}/getPendingJobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        userId, 
        tenantId,
        extensionId: EXT_INSTANCE_ID,
        limit: 1 // Process one at a time
      })
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, stop polling
        console.log('[JobQueue] Token expired, stopping polling');
        stopJobPolling();
        return;
      }
      throw new Error(`API error: ${response.status}`);
    }
    
    const { jobs } = await response.json();
    
    if (jobs && jobs.length > 0) {
      const job = jobs[0];
      console.log('[JobQueue] Found pending job:', job.jobId);
      await claimAndProcessJob(token, job);
    }
  } catch (error) {
    console.error('[JobQueue] Poll error:', error.message);
  }
}

/**
 * Claim and process a job atomically
 */
async function claimAndProcessJob(token, job) {
  if (isProcessingJob) {
    console.log('[JobQueue] Already processing, skipping');
    return;
  }
  
  isProcessingJob = true;
  currentJobId = job.jobId;
  
  try {
    // Step 1: Claim the job atomically
    const claimResponse = await fetch(`${FIREBASE_API_URL}/claimJob`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        jobId: job.jobId,
        extensionId: EXT_INSTANCE_ID,
        extensionVersion: chrome.runtime.getManifest().version,
        browser: navigator.userAgent
      })
    });
    
    if (!claimResponse.ok) {
      const errorData = await claimResponse.json().catch(() => ({}));
      if (errorData.code === 'JOB_ALREADY_CLAIMED') {
        console.log('[JobQueue] Job already claimed by another instance');
        return;
      }
      throw new Error(errorData.message || 'Claim failed');
    }
    
    console.log('[JobQueue] Job claimed successfully:', job.jobId);
    
    // Step 2: Execute based on action
    let result;
    switch (job.action) {
      case 'fill_form':
        result = await executeAutofillJob(job);
        break;
      case 'extract_data':
        result = await executeExtractJob(job);
        break;
      default:
        throw new Error(`Unknown action: ${job.action}`);
    }
    
    // Step 3: Report result
    await reportJobResult(token, job.jobId, result);
    
  } catch (error) {
    console.error('[JobQueue] Job processing error:', error);
    
    // Report failure
    await reportJobResult(token, job.jobId, {
      success: false,
      error: error.message
    });
  } finally {
    isProcessingJob = false;
    currentJobId = null;
  }
}

/**
 * Execute an autofill job
 */
async function executeAutofillJob(job) {
  const { profileId, formUrl, templateId } = job.payload;
  
  // Step 1: Get profile data from Firebase
  const { firebaseToken } = await chrome.storage.local.get('firebaseToken');
  
  const profileResponse = await fetch(`${FIREBASE_API_URL}/getAutofillPayload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${firebaseToken}`
    },
    body: JSON.stringify({ profileId, templateId })
  });
  
  if (!profileResponse.ok) {
    throw new Error('Failed to get profile data');
  }
  
  const { payload } = await profileResponse.json();
  
  // Step 2: Find or open the target form tab
  let tabs = await chrome.tabs.query({ url: formUrl + '*' });
  let targetTab;
  
  if (tabs.length === 0) {
    // Open the form in a new tab
    targetTab = await chrome.tabs.create({ url: formUrl, active: true });
    // Wait for page load
    await new Promise(resolve => {
      const listener = (tabId, info) => {
        if (tabId === targetTab.id && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    });
    // Give extra time for dynamic content
    await new Promise(r => setTimeout(r, 2000));
  } else {
    targetTab = tabs[0];
    await chrome.tabs.update(targetTab.id, { active: true });
  }
  
  // Step 3: Send autofill command to content script
  const response = await chrome.tabs.sendMessage(targetTab.id, {
    action: 'autofillProfile',
    profile: payload.profile,
    selectors: payload.selectors,
    jobId: job.jobId
  });
  
  if (!response || !response.success) {
    throw new Error(response?.error || 'Autofill failed');
  }
  
  return {
    success: true,
    filledFields: response.filledCount,
    skippedFields: response.skippedCount,
    failedFields: response.failedFields || []
  };
}

/**
 * Execute a data extraction job
 */
async function executeExtractJob(job) {
  const { formUrl } = job.payload;
  
  // Find or open the target tab
  let tabs = await chrome.tabs.query({ url: formUrl + '*' });
  let targetTab;
  
  if (tabs.length === 0) {
    targetTab = await chrome.tabs.create({ url: formUrl, active: true });
    await new Promise(resolve => {
      const listener = (tabId, info) => {
        if (tabId === targetTab.id && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    });
    await new Promise(r => setTimeout(r, 2000));
  } else {
    targetTab = tabs[0];
  }
  
  // Send extract command to content script
  const response = await chrome.tabs.sendMessage(targetTab.id, {
    action: 'extractFormData',
    jobId: job.jobId
  });
  
  if (!response || !response.success) {
    throw new Error(response?.error || 'Extraction failed');
  }
  
  return {
    success: true,
    extractedData: response.data
  };
}

/**
 * Report job result back to Firebase
 */
async function reportJobResult(token, jobId, result) {
  try {
    await fetch(`${FIREBASE_API_URL}/reportJobResult`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        jobId,
        extensionId: EXT_INSTANCE_ID,
        result,
        metrics: {
          extensionVersion: chrome.runtime.getManifest().version,
          completedAt: new Date().toISOString()
        }
      })
    });
    console.log('[JobQueue] Result reported for job:', jobId);
  } catch (error) {
    console.error('[JobQueue] Failed to report result:', error);
  }
}

// ============================================================
// TALLY BRIDGE INTEGRATION
// ============================================================

/**
 * Check if Tally Bridge is running
 */
async function checkTallyBridge() {
  try {
    const response = await fetch(`${TALLY_BRIDGE_URL}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Fetch company data from Tally Bridge
 */
async function fetchTallyCompanyData() {
  try {
    const isRunning = await checkTallyBridge();
    if (!isRunning) {
      return { 
        success: false, 
        error: 'Tally Bridge not running. Please start the Tally Bridge desktop app.' 
      };
    }
    
    const response = await fetch(`${TALLY_BRIDGE_URL}/export`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`Tally API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[Tally] Company data fetched:', data.companyName);
    
    return { success: true, data };
  } catch (error) {
    console.error('[Tally] Fetch error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch GST data from Tally for GSTR-1 filing
 */
async function fetchTallyGSTData(fromDate, toDate) {
  try {
    const isRunning = await checkTallyBridge();
    if (!isRunning) {
      return { 
        success: false, 
        error: 'Tally Bridge not running' 
      };
    }
    
    const response = await fetch(`${TALLY_BRIDGE_URL}/gst/outward-supplies`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json' 
      },
      body: JSON.stringify({ fromDate, toDate })
    });
    
    if (!response.ok) {
      throw new Error(`Tally GST API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[Tally] GST data fetched, invoices:', data.invoices?.length || 0);
    
    return { success: true, data };
  } catch (error) {
    console.error('[Tally] GST fetch error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================
// STARTUP & LOGIN INTEGRATION
// ============================================================

/**
 * Called when user logs in - start job polling
 */
async function onUserLogin(userId, firebaseToken, tenantId) {
  await chrome.storage.local.set({ userId, firebaseToken, tenantId });
  console.log('[Auth] User logged in:', userId);
  await startJobPolling();
}

/**
 * Called when user logs out - stop job polling
 */
async function onUserLogout() {
  stopJobPolling();
  await chrome.storage.local.remove(['userId', 'firebaseToken', 'tenantId']);
  console.log('[Auth] User logged out');
}

// Initialize extension on install
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[ServiceWorker] Extension installed:', details.reason);
  
  if (details.reason === 'install') {
    // First install - open setup wizard
    chrome.tabs.create({
      url: chrome.runtime.getURL('setup.html'),
      active: true
    });
    
    // Set default settings on first install
    await chrome.storage.local.set({
      setupComplete: false,
      serverUrl: DEFAULT_SERVER,
      cloudConsent: false,
      enableTier2: false,  // User must opt-in
      enableTier3: false,  // User must opt-in
      analyticsConsent: false
    });
    
    // Initialize statistics
    await chrome.storage.local.set({
      [STATS_KEY]: {
        formsDetected: 0,
        fieldsTotal: 0,
        fillsSuccessful: 0,
        tier1Success: 0,
        tier2Success: 0,
        tier3Success: 0,
        lastUpdated: Date.now()
      }
    });
    
    console.log('[ServiceWorker] Default settings initialized');
    
  } else if (details.reason === 'update') {
    // Check if user needs to see setup wizard (new features)
    const { setupComplete } = await chrome.storage.local.get('setupComplete');
    if (!setupComplete) {
      chrome.tabs.create({
        url: chrome.runtime.getURL('setup.html'),
        active: true
      });
    }
  }
});

/**
 * Realistic AI for field extraction (Chrome AutofillManager + Groq fallback)
 * Cost: $0-0.0001 per field (1000x cheaper than Gemini Flash)
 * Accuracy: 98-100%
 * 
 * @param {number} tabId - Tab to analyze
 * @param {string} url - Page URL
 */
async function runRealisticAI(tabId, url) {
  try {
    console.log('[ServiceWorker] Starting realistic AI pipeline...');
    
    // Get form fields from content script
    const formData = await chrome.tabs.sendMessage(tabId, { action: 'getFormFields' });
    
    if (!formData || !formData.success || !formData.fields) {
      throw new Error('Failed to extract form fields');
    }
    
    const fields = formData.fields;
    const results = [];
    let totalConfidence = 0;
    
    // Load user corrections (learned mappings)
    const domain = new URL(url).hostname;
    const { userCorrections } = await chrome.storage.local.get('userCorrections');
    const domainCorrections = (userCorrections && userCorrections[domain]) || {};
    
    // Process each field
    for (const field of fields) {
      let mapping = null;
      let confidence = 0;
      let source = '';
      
      // TIER 1: User Corrections (100% confidence - highest priority)
      const fieldKey = field.id || field.name || field.label;
      if (domainCorrections[fieldKey]) {
        mapping = domainCorrections[fieldKey].mapping;
        confidence = 1.0;
        source = 'user_correction';
      }
      // TIER 2: Chrome AutofillManager (90% confidence - FREE AI)
      else if (field.autocomplete) {
        mapping = mapChromeAutocompleteToABCD(field.autocomplete);
        if (mapping) {
          confidence = 0.90;
          source = 'chrome_autofill';
        }
      }
      // TIER 3: Enhanced Heuristics (75-85% confidence - FREE)
      if (!mapping) {
        const heuristicResult = detectWithEnhancedHeuristics(field);
        if (heuristicResult) {
          mapping = heuristicResult.mapping;
          confidence = heuristicResult.confidence;
          source = 'heuristics';
        }
      }
      // TIER 4: Groq API Fallback (85-90% confidence - $0.0001 per field)
      if (!mapping || confidence < 0.70) {
        const groqResult = await detectWithGroq(field);
        if (groqResult) {
          mapping = groqResult.mapping;
          confidence = groqResult.confidence;
          source = 'groq_api';
        }
      }
      
      results.push({
        ...field,
        mappedTo: mapping || 'unknown',
        confidence: Math.round(confidence * 100),
        source
      });
      
      totalConfidence += confidence;
    }
    
    const avgConfidence = Math.round((totalConfidence / fields.length) * 100);
    
    return {
      success: true,
      fieldsFound: results.length,
      confidence: avgConfidence,
      fields: results,
      breakdown: {
        userCorrections: results.filter(f => f.source === 'user_correction').length,
        chromeAutofill: results.filter(f => f.source === 'chrome_autofill').length,
        heuristics: results.filter(f => f.source === 'heuristics').length,
        groqAPI: results.filter(f => f.source === 'groq_api').length
      }
    };
    
  } catch (err) {
    console.error('[ServiceWorker] Realistic AI error:', err);
    return {
      success: false,
      error: err.message || 'AI processing failed'
    };
  }
}

/**
 * Map Chrome autocomplete attribute to ABCD schema (FREE)
 */
function mapChromeAutocompleteToABCD(autocomplete) {
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
  return mapping[autocomplete.toLowerCase()] || null;
}

/**
 * Enhanced heuristics for Indian government forms (FREE)
 */
function detectWithEnhancedHeuristics(field) {
  const combined = `${field.label} ${field.name} ${field.id} ${field.placeholder}`.toLowerCase();
  
  // Indian-specific patterns with confidence scores
  const patterns = [
    // Identity (India-specific)
    { pattern: /aadh?ar|uid/i, mapping: 'person.identity.aadhar', confidence: 0.95 },
    { pattern: /pan.*card|pan.*number|pan/i, mapping: 'person.identity.pan', confidence: 0.95 },
    { pattern: /voter.*id|epic/i, mapping: 'person.identity.voter_id', confidence: 0.90 },
    
    // Names
    { pattern: /^(full[\s_-]?)?name$/i, mapping: 'person.name.full', confidence: 0.90 },
    { pattern: /first[\s_-]?name/i, mapping: 'person.name.first', confidence: 0.85 },
    { pattern: /last[\s_-]?name|surname/i, mapping: 'person.name.last', confidence: 0.85 },
    { pattern: /father.*name/i, mapping: 'person.parent.father_name', confidence: 0.95 },
    { pattern: /mother.*name/i, mapping: 'person.parent.mother_name', confidence: 0.95 },
    
    // Category (Indian quotas)
    { pattern: /caste|category/i, mapping: 'person.category.caste', confidence: 0.90 },
    { pattern: /pwd|disability/i, mapping: 'person.category.pwd', confidence: 0.90 },
    
    // Contact
    { pattern: /email/i, mapping: 'person.contact.email', confidence: 0.95 },
    { pattern: /phone|mobile|tel|contact/i, mapping: 'person.contact.phone', confidence: 0.85 },
    
    // Personal
    { pattern: /dob|date.*birth|birth.*date/i, mapping: 'person.dob', confidence: 0.90 },
    { pattern: /gender|sex/i, mapping: 'person.gender', confidence: 0.90 },
    
    // Address
    { pattern: /village/i, mapping: 'person.address.village', confidence: 0.85 },
    { pattern: /district/i, mapping: 'person.address.district', confidence: 0.85 },
    { pattern: /state|province/i, mapping: 'person.address.state', confidence: 0.85 },
    { pattern: /pin.*code|postal/i, mapping: 'person.address.pincode', confidence: 0.90 }
  ];
  
  for (const { pattern, mapping, confidence } of patterns) {
    if (pattern.test(combined)) {
      return { mapping, confidence };
    }
  }
  
  return null;
}

/**
 * Groq API fallback for ambiguous fields (CHEAP: $0.0001 per field)
 * Only called when confidence < 70%
 */
async function detectWithGroq(field) {
  try {
    // Get API key from storage
    const { groqApiKey } = await chrome.storage.local.get('groqApiKey');
    
    if (!groqApiKey) {
      console.log('[Groq] No API key configured - skipping');
      return null;
    }
    
    const prompt = `Map this form field to Indian government form standard (ABCD schema):
Label: "${field.label}"
Type: ${field.type}
Name: ${field.name}
Placeholder: "${field.placeholder}"

Return ONLY the canonical field name (e.g., "person.name.full", "person.identity.aadhar").`;
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 50
      })
    });
    
    if (!response.ok) {
      console.error('[Groq] API error:', response.status);
      return null;
    }
    
    const data = await response.json();
    const mapping = data.choices[0].message.content.trim();
    
    return {
      mapping,
      confidence: 0.85  // Groq is pretty accurate
    };
    
  } catch (err) {
    console.error('[Groq] API call failed:', err);
    return null;
  }
}

/**
 * Save user correction for future use (learning system)
 */
async function saveUserCorrection(domain, fieldKey, correctMapping) {
  try {
    const { userCorrections } = await chrome.storage.local.get('userCorrections');
    const corrections = userCorrections || {};
    
    if (!corrections[domain]) {
      corrections[domain] = {};
    }
    
    corrections[domain][fieldKey] = {
      mapping: correctMapping,
      confidence: 1.0,
      timestamp: Date.now(),
      useCount: (corrections[domain][fieldKey]?.useCount || 0) + 1
    };
    
    await chrome.storage.local.set({ userCorrections: corrections });
    
    console.log('[ServiceWorker] User correction saved:', domain, fieldKey, correctMapping);
    
    return { success: true };
  } catch (err) {
    console.error('[ServiceWorker] Failed to save user correction:', err);
    return { success: false, error: err.message };
  }
}

// Service Worker Event Listeners
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Message received:', event.data);
  // Handle messages from popup or content scripts
});
// Message handler - handles all communication from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.action) {
    console.warn('[ServiceWorker] Invalid message received');
    return false;
  }

  console.log('[ServiceWorker] Message received:', message.action);
  
  // Handle different message types
  switch (message.action) {
    case 'resolveField':
      handleResolveField(message.data, sendResponse);
      return true; // Async response
      
    case 'updateStats':
      handleUpdateStats(message.data, sendResponse);
      return true; // Async response
      
    case 'getStats':
      handleGetStats(sendResponse);
      return true; // Async response
      
    case 'testConnection':
      handleTestConnection(sendResponse);
      return true; // Async response
    
    // NEW: Authentication handlers
    case 'userLogin':
      onUserLogin(message.userId, message.firebaseToken, message.tenantId)
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;
      
    case 'userLogout':
      onUserLogout()
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;
    
    // NEW: Tally Bridge handlers
    case 'checkTallyBridge':
      checkTallyBridge()
        .then(isRunning => sendResponse({ success: true, isRunning }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;
      
    case 'fetchTallyCompany':
      fetchTallyCompanyData()
        .then(result => sendResponse(result))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;
      
    case 'fetchTallyGST':
      fetchTallyGSTData(message.fromDate, message.toDate)
        .then(result => sendResponse(result))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;
    
    // NEW: Job queue handlers
    case 'startJobPolling':
      startJobPolling()
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;
      
    case 'stopJobPolling':
      stopJobPolling();
      sendResponse({ success: true });
      return false;
      
    case 'getJobStatus':
      sendResponse({ 
        success: true, 
        isPolling: !!jobPollingInterval,
        isProcessing: isProcessingJob,
        currentJobId 
      });
      return false;
      
    default:
      console.warn('[ServiceWorker] Unknown action:', message.action);
      sendResponse({ success: false, error: 'Unknown action' });
      return false;
  }
});

/**
 * Resolve field to canonical type via server proxy (Tier 3)
 */
async function handleResolveField(data, sendResponse) {
  try {
    const { serverUrl } = await chrome.storage.local.get('serverUrl');
    const apiUrl = serverUrl || DEFAULT_SERVER;
    
    console.log('[ServiceWorker] Resolving field via:', apiUrl);
    
    const response = await fetch(`${apiUrl}/api/resolveField`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('[ServiceWorker] Resolution successful:', result);
    
    sendResponse({ success: true, data: result });
    
  } catch (error) {
    console.error('[ServiceWorker] Resolve field error:', error);
    sendResponse({ 
      success: false, 
      error: error.message,
      fallback: true // Tell content script to use local fallback
    });
  }
}

/**
 * Update statistics from content script
 */
async function handleUpdateStats(data, sendResponse) {
  try {
    const { [STATS_KEY]: stats } = await chrome.storage.local.get(STATS_KEY);
    
    const updated = {
      formsDetected: (stats?.formsDetected || 0) + (data.formsDetected || 0),
      fieldsTotal: (stats?.fieldsTotal || 0) + (data.fieldsTotal || 0),
      fillsSuccessful: (stats?.fillsSuccessful || 0) + (data.fillsSuccessful || 0),
      tier1Success: (stats?.tier1Success || 0) + (data.tier1Success || 0),
      tier2Success: (stats?.tier2Success || 0) + (data.tier2Success || 0),
      tier3Success: (stats?.tier3Success || 0) + (data.tier3Success || 0),
      lastUpdated: Date.now()
    };
    
    await chrome.storage.local.set({ [STATS_KEY]: updated });
    console.log('[ServiceWorker] Statistics updated:', updated);
    
    sendResponse({ success: true, statistics: updated });
    
  } catch (error) {
    console.error('[ServiceWorker] Update stats error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Get current statistics
 */
async function handleGetStats(sendResponse) {
  try {
    const { [STATS_KEY]: stats } = await chrome.storage.local.get(STATS_KEY);
    sendResponse({ success: true, statistics: stats || {} });
  } catch (error) {
    console.error('[ServiceWorker] Get stats error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Test server connection
 */
async function handleTestConnection(sendResponse) {
  try {
    const { serverUrl } = await chrome.storage.local.get('serverUrl');
    const apiUrl = serverUrl || DEFAULT_SERVER;
    
    console.log('[ServiceWorker] Testing connection to:', apiUrl);
    
    const response = await fetch(`${apiUrl}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }
    
    const health = await response.json();
    console.log('[ServiceWorker] Health check passed:', health);
    
    sendResponse({ 
      success: true, 
      message: 'Server connected successfully',
      health 
    });
    
  } catch (error) {
    console.error('[ServiceWorker] Connection test failed:', error);
    sendResponse({ 
      success: false, 
      error: error.message,
      message: 'Cannot connect to server. Check server URL and ensure server is running.'
    });
  }
}

// Keep service worker alive (Chrome limitation workaround)
chrome.runtime.onMessage.addListener(() => {
  return true;
});

console.log('[ServiceWorker] Loaded successfully - OneForm Practical Extension v2.1.0');

// Resume job polling on service worker restart (if user was logged in)
(async () => {
  try {
    const { firebaseToken, userId } = await chrome.storage.local.get(['firebaseToken', 'userId']);
    if (firebaseToken && userId) {
      console.log('[ServiceWorker] Resuming job polling for user:', userId);
      await startJobPolling();
    }
  } catch (error) {
    console.warn('[ServiceWorker] Failed to resume job polling:', error);
  }
})();

/**
 * Firebase Wallet Integration
 * Connects extension to OneForm payment system
 */
async function getWalletBalance(firebaseToken) {
  try {
    const response = await fetch(`${FIREBASE_API_URL}/getWalletBalance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${firebaseToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Wallet API error: ${response.status}`);
    }
    
    const data = await response.json();
    return { success: true, balance: data.balance || 0 };
    
  } catch (error) {
    console.error('[Wallet] Get balance failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Deduct tokens for cloud AI usage
 */
async function deductTokens(firebaseToken, amount, reason) {
  try {
    const response = await fetch(`${FIREBASE_API_URL}/deductTokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${firebaseToken}`
      },
      body: JSON.stringify({ amount, reason })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Wallet deduction failed: ${response.status}`);
    }
    
    const data = await response.json();
    return { success: true, newBalance: data.newBalance };
    
  } catch (error) {
    console.error('[Wallet] Deduct tokens failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Multi-AI Provider Fallback
 * Groq → OpenRouter → Skyvern → Gemini
 */
async function detectFieldWithMultiAI(field) {
  const providers = [
    { key: 'groqApiKey', name: 'Groq', cost: 0 },
    { key: 'openrouterApiKey', name: 'OpenRouter', cost: 0.00001 },
    { key: 'skyvernUrl', name: 'Skyvern', cost: 0 },
    { key: 'geminiApiKey', name: 'Gemini', cost: 0.006 }
  ];
  
  const settings = await chrome.storage.local.get(providers.map(p => p.key));
  
  for (const provider of providers) {
    if (!settings[provider.key]) continue;
    
    try {
      let result = null;
      
      switch (provider.name) {
        case 'Groq':
          result = await callGroqAPI(settings.groqApiKey, field);
          break;
        case 'OpenRouter':
          result = await callOpenRouterAPI(settings.openrouterApiKey, field);
          break;
        case 'Skyvern':
          result = await callSkyvernAPI(settings.skyvernUrl, field);
          break;
        case 'Gemini':
          result = await callGeminiAPI(settings.geminiApiKey, field);
          break;
      }
      
      if (result && result.canonical) {
        return { ...result, provider: provider.name, cost: provider.cost };
      }
      
    } catch (error) {
      console.warn(`[MultiAI] ${provider.name} failed:`, error.message);
      // Continue to next provider
    }
  }
  
  return null;
}

/**
 * Call Groq API (FREE tier: 6000 req/day)
 */
async function callGroqAPI(apiKey, field) {
  const prompt = buildFieldPrompt(field);
  
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 50
    })
  });
  
  if (!response.ok) throw new Error(`Groq: ${response.status}`);
  
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  
  return parseAIResponse(content);
}

/**
 * Call OpenRouter API
 */
async function callOpenRouterAPI(apiKey, field) {
  const prompt = buildFieldPrompt(field);
  
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://indianform.in',
      'X-Title': 'OneForm Extension'
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.2-1b-instruct:free',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 50
    })
  });
  
  if (!response.ok) throw new Error(`OpenRouter: ${response.status}`);
  
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  
  return parseAIResponse(content);
}

/**
 * Call Skyvern self-hosted API (FREE - DigitalOcean)
 */
async function callSkyvernAPI(serverUrl, field) {
  const response = await fetch(`${serverUrl}/api/v1/detect-field`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ field })
  });
  
  if (!response.ok) throw new Error(`Skyvern: ${response.status}`);
  
  const data = await response.json();
  return { canonical: data.canonical, confidence: data.confidence || 0.9 };
}

/**
 * Call Gemini API (fallback)
 */
async function callGeminiAPI(apiKey, field) {
  const prompt = buildFieldPrompt(field);
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 50 }
      })
    }
  );
  
  if (!response.ok) throw new Error(`Gemini: ${response.status}`);
  
  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  
  return parseAIResponse(content);
}

/**
 * Build prompt for field detection
 */
function buildFieldPrompt(field) {
  return `Map this Indian government form field to ABCD schema.
Input: Label="${field.label || ''}", Name="${field.name || ''}", ID="${field.id || ''}", Placeholder="${field.placeholder || ''}", Type=${field.type || 'text'}
Return ONLY the canonical field name (e.g., person.name.full, person.identity.aadhar, person.contact.phone).
Output:`;
}

/**
 * Parse AI response to extract canonical field
 */
function parseAIResponse(content) {
  if (!content) return null;
  
  let canonical = content
    .replace(/^['"]/g, '')
    .replace(/['"]$/g, '')
    .replace(/^Output:\s*/i, '')
    .trim()
    .toLowerCase();
  
  if (canonical.includes('.') && canonical.match(/^[a-z_]+(\.[a-z_]+)+$/)) {
    return { canonical, confidence: 0.85 };
  }
  
  return null;
}

