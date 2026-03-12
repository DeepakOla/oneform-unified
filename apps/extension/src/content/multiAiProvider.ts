// @ts-nocheck
/**
 * OneForm Multi-AI Provider Integration
 * 
 * Fallback chain: Admin-configurable priority (default: Groq → OpenRouter → Skyvern → Gemini)
 * 
 * COST STRUCTURE (per field):
 * - Groq (llama-3.1-8b): $0.00005 (FREE tier: 6000 req/day)
 * - OpenRouter (llama-3.2-1b): $0.00001 (cheapest)
 * - Skyvern (self-hosted): FREE (DigitalOcean hosting only)
 * - Gemini Flash: ₹0.10 (fallback only)
 * - Hetzner Ollama: FREE (self-hosted Qwen 2.5)
 * 
 * ADMIN PRIORITY ORDERING:
 * Admin can configure provider priority in Settings > API Settings > AI & Automation
 * Extension fetches priority from Firebase and uses it for fallback chain
 * 
 * CHROME POLICY COMPLIANCE:
 * - NO CAPTCHA automation (operators handle manually)
 * - NO OTP automation (users enter manually)
 * - Form filling ONLY (legal and compliant)
 * 
 * @version 1.1.0
 * @updated 2025-01-09
 */

class MultiAIProvider {
  constructor() {
    this.providers = {
      groq: {
        name: 'Groq',
        endpoint: 'https://api.groq.com/openai/v1/chat/completions',
        model: 'llama-3.1-8b-instant',
        costPerField: 0.00005, // USD
        priority: 1,
        enabled: true
      },
      openrouter: {
        name: 'OpenRouter',
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
        model: 'meta-llama/llama-3.2-1b-instruct:free',
        costPerField: 0.00001,
        priority: 2,
        enabled: false // Requires API key
      },
      skyvern: {
        name: 'Skyvern (Self-hosted)',
        endpoint: null, // Set from config: https://skyvern.indianform.in
        model: 'N/A',
        costPerField: 0, // Self-hosted
        priority: 3,
        enabled: false, // Requires server URL
        fullAutomation: false // Premium feature for paying customers
      },
      gemini: {
        name: 'Gemini Flash',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
        model: 'gemini-1.5-flash',
        costPerField: 0.006, // ₹0.10 ≈ $0.006
        priority: 4,
        enabled: false // Requires API key
      },
      ollama: {
        name: 'Hetzner Ollama (Qwen 2.5)',
        endpoint: null, // Set from admin: https://your-hetzner.com/api/chat
        model: 'qwen2.5-coder:7b',
        costPerField: 0, // Self-hosted
        priority: 5,
        enabled: false // Requires Hetzner URL
      }
    };
    
    this.currentProvider = null;
    this.adminPriorityOrder = null; // Fetched from Firebase admin settings
    this.stats = {
      totalCalls: 0,
      successCount: 0,
      failCount: 0,
      totalCost: 0,
      byProvider: {}
    };
    
    // Initialize stats for each provider
    Object.keys(this.providers).forEach(p => {
      this.stats.byProvider[p] = { calls: 0, success: 0, fail: 0, cost: 0 };
    });
  }

  /**
   * Initialize providers with API keys from storage and admin settings
   */
  async init() {
    try {
      const config = await chrome.storage.local.get([
        'groqApiKey',
        'openrouterApiKey',
        'skyvernUrl',
        'skyvernFullAutomation',
        'geminiApiKey',
        'ollamaUrl',
        'aiProviderStats',
        'adminPriorityOrder', // Admin-configured priority from Firebase
        'lastAdminSettingsSync'
      ]);
      
      // Configure each provider
      if (config.groqApiKey) {
        this.providers.groq.apiKey = config.groqApiKey;
        this.providers.groq.enabled = true;
      }
      
      if (config.openrouterApiKey) {
        this.providers.openrouter.apiKey = config.openrouterApiKey;
        this.providers.openrouter.enabled = true;
      }
      
      if (config.skyvernUrl) {
        this.providers.skyvern.endpoint = config.skyvernUrl;
        this.providers.skyvern.enabled = true;
        this.providers.skyvern.fullAutomation = config.skyvernFullAutomation || false;
      }
      
      if (config.ollamaUrl) {
        this.providers.ollama.endpoint = config.ollamaUrl;
        this.providers.ollama.enabled = true;
      }
      
      if (config.geminiApiKey) {
        this.providers.gemini.apiKey = config.geminiApiKey;
        this.providers.gemini.enabled = true;
      }
      
      // Load admin-configured priority order
      if (config.adminPriorityOrder && Array.isArray(config.adminPriorityOrder)) {
        this.adminPriorityOrder = config.adminPriorityOrder;
        // Update provider priorities based on admin order
        config.adminPriorityOrder.forEach((providerKey, index) => {
          if (this.providers[providerKey]) {
            this.providers[providerKey].priority = index + 1;
          }
        });
        console.log('[MultiAI] Using admin priority order:', this.adminPriorityOrder);
      }
      
      // Check if we need to sync admin settings (every 5 minutes)
      const lastSync = config.lastAdminSettingsSync || 0;
      const fiveMinutes = 5 * 60 * 1000;
      if (Date.now() - lastSync > fiveMinutes) {
        this._syncAdminSettings(); // Non-blocking
      }
      
      // Load saved stats
      if (config.aiProviderStats) {
        this.stats = { ...this.stats, ...config.aiProviderStats };
      }
      
      console.log('[MultiAI] Initialized. Enabled providers:', 
        Object.keys(this.providers).filter(p => this.providers[p].enabled));
      
    } catch (error) {
      console.error('[MultiAI] Init failed:', error);
    }
  }
  
  /**
   * Sync admin settings from Firebase
   * Called periodically to update provider priority
   */
  async _syncAdminSettings() {
    try {
      // Get Firebase auth token from extension
      const authData = await chrome.storage.local.get(['firebaseToken', 'firebaseProjectId']);
      
      if (!authData.firebaseToken || !authData.firebaseProjectId) {
        console.log('[MultiAI] No Firebase auth, skipping admin sync');
        return;
      }
      
      // Fetch admin settings from Firebase Firestore
      const projectId = authData.firebaseProjectId || 'oneform-builder';
      const response = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/settings/apiSettings`,
        {
          headers: {
            'Authorization': `Bearer ${authData.firebaseToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        
        // Parse Firestore document format
        if (data.fields?.automation?.mapValue?.fields?.priorityOrder?.arrayValue?.values) {
          const priorityOrder = data.fields.automation.mapValue.fields.priorityOrder.arrayValue.values
            .map(v => v.stringValue)
            .filter(Boolean);
          
          if (priorityOrder.length > 0) {
            await chrome.storage.local.set({
              adminPriorityOrder: priorityOrder,
              lastAdminSettingsSync: Date.now()
            });
            
            // Update local priorities
            this.adminPriorityOrder = priorityOrder;
            priorityOrder.forEach((providerKey, index) => {
              if (this.providers[providerKey]) {
                this.providers[providerKey].priority = index + 1;
              }
            });
            
            console.log('[MultiAI] Synced admin priority order:', priorityOrder);
          }
        }
        
        // Check Skyvern full automation setting
        if (data.fields?.automation?.mapValue?.fields?.skyvern?.mapValue?.fields?.fullAutomation?.booleanValue) {
          const fullAutomation = data.fields.automation.mapValue.fields.skyvern.mapValue.fields.fullAutomation.booleanValue;
          this.providers.skyvern.fullAutomation = fullAutomation;
          await chrome.storage.local.set({ skyvernFullAutomation: fullAutomation });
          console.log('[MultiAI] Skyvern full automation:', fullAutomation);
        }
      }
    } catch (error) {
      console.warn('[MultiAI] Admin settings sync failed:', error.message);
    }
  }

  /**
   * Detect field type using AI fallback chain
   * @param {Object} field - Field info (label, name, id, placeholder, type)
   * @returns {Promise<Object>} - { canonical, confidence, provider, cost }
   */
  async detectFieldType(field) {
    const enabledProviders = Object.keys(this.providers)
      .filter(p => this.providers[p].enabled)
      .sort((a, b) => this.providers[a].priority - this.providers[b].priority);
    
    if (enabledProviders.length === 0) {
      console.log('[MultiAI] No AI providers enabled');
      return null;
    }
    
    // Try each provider in priority order
    for (const providerKey of enabledProviders) {
      try {
        const result = await this._callProvider(providerKey, field);
        
        if (result && result.canonical) {
          this.stats.totalCalls++;
          this.stats.successCount++;
          this.stats.byProvider[providerKey].calls++;
          this.stats.byProvider[providerKey].success++;
          this.stats.byProvider[providerKey].cost += this.providers[providerKey].costPerField;
          this.stats.totalCost += this.providers[providerKey].costPerField;
          
          await this._saveStats();
          
          return {
            canonical: result.canonical,
            confidence: result.confidence || 0.85,
            provider: providerKey,
            cost: this.providers[providerKey].costPerField
          };
        }
        
      } catch (error) {
        console.warn(`[MultiAI] ${providerKey} failed:`, error.message);
        this.stats.byProvider[providerKey].fail++;
        // Continue to next provider
      }
    }
    
    // All providers failed
    this.stats.totalCalls++;
    this.stats.failCount++;
    await this._saveStats();
    
    return null;
  }

  /**
   * Call a specific AI provider
   */
  async _callProvider(providerKey, field) {
    const provider = this.providers[providerKey];
    
    switch (providerKey) {
      case 'groq':
        return this._callGroq(provider, field);
      case 'openrouter':
        return this._callOpenRouter(provider, field);
      case 'skyvern':
        return this._callSkyvern(provider, field);
      case 'gemini':
        return this._callGemini(provider, field);
      default:
        throw new Error(`Unknown provider: ${providerKey}`);
    }
  }

  /**
   * Call Groq API
   */
  async _callGroq(provider, field) {
    const prompt = this._buildPrompt(field);
    
    const response = await fetch(provider.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 50
      })
    });
    
    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    
    return this._parseResponse(content);
  }

  /**
   * Call OpenRouter API
   */
  async _callOpenRouter(provider, field) {
    const prompt = this._buildPrompt(field);
    
    const response = await fetch(provider.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://indianform.in',
        'X-Title': 'OneForm Extension'
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 50
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    
    return this._parseResponse(content);
  }

  /**
   * Call Skyvern self-hosted API
   */
  async _callSkyvern(provider, field) {
    if (!provider.endpoint) {
      throw new Error('Skyvern endpoint not configured');
    }
    
    const response = await fetch(`${provider.endpoint}/api/v1/detect-field`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        field: {
          label: field.label,
          name: field.name,
          id: field.id,
          placeholder: field.placeholder,
          type: field.type
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Skyvern API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      canonical: data.canonical || data.canonicalField,
      confidence: data.confidence || 0.90
    };
  }

  /**
   * Call Gemini API (fallback)
   */
  async _callGemini(provider, field) {
    const prompt = this._buildPrompt(field);
    
    const response = await fetch(`${provider.endpoint}?key=${provider.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 50
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    return this._parseResponse(content);
  }

  /**
   * Build prompt for field detection
   */
  _buildPrompt(field) {
    return `Map this Indian government form field to ABCD schema.
Input:
- Label: "${field.label || ''}"
- Name: "${field.name || ''}"
- ID: "${field.id || ''}"
- Placeholder: "${field.placeholder || ''}"
- Type: ${field.type || 'text'}

Return ONLY the canonical field name. Examples:
- person.name.full
- person.identity.aadhar
- person.parent.father_name
- person.address.pincode
- person.contact.phone
- person.contact.email
- person.dob
- person.gender
- person.category.caste
- education.highest_degree
- bank.account_number
- bank.ifsc

Output:`;
  }

  /**
   * Parse AI response to extract canonical field
   */
  _parseResponse(content) {
    if (!content) return null;
    
    // Clean response
    let canonical = content
      .replace(/^['"]/g, '')
      .replace(/['"]$/g, '')
      .replace(/^Output:\s*/i, '')
      .trim()
      .toLowerCase();
    
    // Validate it looks like a canonical field
    if (canonical.includes('.') && canonical.match(/^[a-z_]+(\.[a-z_]+)+$/)) {
      return {
        canonical,
        confidence: 0.85
      };
    }
    
    return null;
  }

  /**
   * Save stats to storage
   */
  async _saveStats() {
    try {
      await chrome.storage.local.set({ aiProviderStats: this.stats });
    } catch (error) {
      console.error('[MultiAI] Failed to save stats:', error);
    }
  }

  /**
   * Get usage statistics
   */
  getStats() {
    return {
      ...this.stats,
      enabledProviders: Object.keys(this.providers).filter(p => this.providers[p].enabled),
      totalCostINR: Math.round(this.stats.totalCost * 83 * 100) / 100 // USD to INR
    };
  }

  /**
   * Test a specific provider
   */
  async testProvider(providerKey) {
    if (!this.providers[providerKey]) {
      return { success: false, error: 'Unknown provider' };
    }
    
    if (!this.providers[providerKey].enabled) {
      return { success: false, error: 'Provider not configured' };
    }
    
    try {
      const testField = {
        label: 'Full Name',
        name: 'fullName',
        id: 'txtFullName',
        placeholder: 'Enter your full name',
        type: 'text'
      };
      
      const result = await this._callProvider(providerKey, testField);
      
      if (result && result.canonical === 'person.name.full') {
        return { success: true, result, latency: 0 };
      } else if (result) {
        return { success: true, result, warning: 'Unexpected mapping' };
      } else {
        return { success: false, error: 'No mapping returned' };
      }
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.MultiAIProvider = MultiAIProvider;
}

// Export for ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MultiAIProvider };
}

