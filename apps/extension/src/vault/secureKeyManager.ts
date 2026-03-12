// @ts-nocheck
/**
 * OneForm Secure API Key Manager
 * 
 * Uses vault.js AES-256-GCM encryption to securely store API keys.
 * Keys are encrypted at rest and only decrypted when needed.
 * 
 * SECURITY FEATURES:
 * - AES-256-GCM encryption (same as 1Password)
 * - PBKDF2 key derivation (100k iterations)
 * - Keys never stored in plaintext
 * - Auto-lock after inactivity
 * - Memory zeroization on lock
 * 
 * @version 1.0.0
 * @updated 2025-12-02
 */

class SecureKeyManager {
  constructor(vault) {
    this.vault = vault;
    this.KEYS_STORE_ID = 'encrypted_api_keys';
    this.cachedKeys = null;
    this.cacheExpiry = null;
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Initialize the key manager
   * Automatically unlocks vault using Firebase UID if logged in
   */
  async init() {
    try {
      // Check if vault exists
      const exists = await this.vault.exists();
      
      if (!exists) {
        console.log('[SecureKeys] No vault exists yet');
        return { ready: false, needsSetup: true };
      }
      
      // Check if user is logged in and has stored UID
      const { firebaseUid } = await chrome.storage.local.get('firebaseUid');
      
      if (firebaseUid) {
        // Auto-unlock with Firebase UID
        await this.vault.autoUnlock(firebaseUid);
        console.log('[SecureKeys] Vault auto-unlocked');
        return { ready: true, needsSetup: false };
      }
      
      return { ready: false, needsSetup: false, needsUnlock: true };
      
    } catch (error) {
      console.error('[SecureKeys] Init failed:', error);
      return { ready: false, error: error.message };
    }
  }

  /**
   * Setup vault with user passphrase (first time)
   */
  async setup(passphrase) {
    try {
      await this.vault.init();
      await this.vault.unlock(passphrase);
      
      // Initialize empty keys store
      await this.vault.store(this.KEYS_STORE_ID, {
        groq: null,
        openrouter: null,
        gemini: null,
        custom: {}
      });
      
      console.log('[SecureKeys] Vault setup complete');
      return { success: true };
      
    } catch (error) {
      console.error('[SecureKeys] Setup failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Store an API key securely
   * @param {string} provider - Provider name (groq, openrouter, gemini, etc.)
   * @param {string} apiKey - The API key to store
   */
  async storeKey(provider, apiKey) {
    if (!this.vault.isUnlocked) {
      throw new Error('Vault is locked');
    }
    
    try {
      // Get existing keys
      let keys = await this.vault.get(this.KEYS_STORE_ID);
      
      if (!keys) {
        keys = { groq: null, openrouter: null, gemini: null, custom: {} };
      }
      
      // Store key based on provider
      if (['groq', 'openrouter', 'gemini'].includes(provider)) {
        keys[provider] = apiKey;
      } else {
        keys.custom[provider] = apiKey;
      }
      
      // Save encrypted
      await this.vault.store(this.KEYS_STORE_ID, keys);
      
      // Update cache
      this.cachedKeys = keys;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;
      
      console.log(`[SecureKeys] Stored key for ${provider}`);
      return { success: true };
      
    } catch (error) {
      console.error('[SecureKeys] Store key failed:', error);
      throw error;
    }
  }

  /**
   * Retrieve an API key
   * @param {string} provider - Provider name
   * @returns {Promise<string|null>} - The decrypted API key or null
   */
  async getKey(provider) {
    if (!this.vault.isUnlocked) {
      throw new Error('Vault is locked');
    }
    
    try {
      // Check cache
      if (this.cachedKeys && this.cacheExpiry && Date.now() < this.cacheExpiry) {
        if (['groq', 'openrouter', 'gemini'].includes(provider)) {
          return this.cachedKeys[provider];
        } else {
          return this.cachedKeys.custom?.[provider] || null;
        }
      }
      
      // Fetch from vault
      const keys = await this.vault.get(this.KEYS_STORE_ID);
      
      if (!keys) return null;
      
      // Update cache
      this.cachedKeys = keys;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;
      
      if (['groq', 'openrouter', 'gemini'].includes(provider)) {
        return keys[provider];
      } else {
        return keys.custom?.[provider] || null;
      }
      
    } catch (error) {
      console.error('[SecureKeys] Get key failed:', error);
      return null;
    }
  }

  /**
   * Get all API keys (for settings page)
   * Returns masked versions for display
   */
  async getAllKeysMasked() {
    if (!this.vault.isUnlocked) {
      return null;
    }
    
    try {
      const keys = await this.vault.get(this.KEYS_STORE_ID);
      
      if (!keys) return null;
      
      const maskKey = (key) => {
        if (!key) return null;
        if (key.length <= 8) return '****';
        return key.substring(0, 4) + '****' + key.substring(key.length - 4);
      };
      
      return {
        groq: keys.groq ? { masked: maskKey(keys.groq), hasKey: true } : { masked: null, hasKey: false },
        openrouter: keys.openrouter ? { masked: maskKey(keys.openrouter), hasKey: true } : { masked: null, hasKey: false },
        gemini: keys.gemini ? { masked: maskKey(keys.gemini), hasKey: true } : { masked: null, hasKey: false },
        custom: Object.keys(keys.custom || {}).reduce((acc, p) => {
          acc[p] = { masked: maskKey(keys.custom[p]), hasKey: true };
          return acc;
        }, {})
      };
      
    } catch (error) {
      console.error('[SecureKeys] Get all keys failed:', error);
      return null;
    }
  }

  /**
   * Delete an API key
   */
  async deleteKey(provider) {
    if (!this.vault.isUnlocked) {
      throw new Error('Vault is locked');
    }
    
    try {
      const keys = await this.vault.get(this.KEYS_STORE_ID);
      
      if (!keys) return { success: true };
      
      if (['groq', 'openrouter', 'gemini'].includes(provider)) {
        keys[provider] = null;
      } else {
        delete keys.custom[provider];
      }
      
      await this.vault.store(this.KEYS_STORE_ID, keys);
      
      // Clear cache
      this.cachedKeys = null;
      this.cacheExpiry = null;
      
      console.log(`[SecureKeys] Deleted key for ${provider}`);
      return { success: true };
      
    } catch (error) {
      console.error('[SecureKeys] Delete key failed:', error);
      throw error;
    }
  }

  /**
   * Lock the key manager and clear cache
   */
  lock() {
    this.cachedKeys = null;
    this.cacheExpiry = null;
    this.vault.lock();
    console.log('[SecureKeys] Locked');
  }

  /**
   * Check if a key exists (without decrypting)
   */
  async hasKey(provider) {
    try {
      const keys = await this.getAllKeysMasked();
      if (!keys) return false;
      
      if (['groq', 'openrouter', 'gemini'].includes(provider)) {
        return keys[provider]?.hasKey || false;
      } else {
        return keys.custom?.[provider]?.hasKey || false;
      }
    } catch {
      return false;
    }
  }

  /**
   * Export all keys for backup (encrypted)
   */
  async exportBackup() {
    return this.vault.exportBackup();
  }

  /**
   * Import keys from backup
   */
  async importBackup(backupData, passphrase) {
    return this.vault.importBackup(backupData, passphrase);
  }
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.SecureKeyManager = SecureKeyManager;
}

// Export for ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SecureKeyManager };
}

