/**
 * Central manager for all features.
 * Implements the Mediator pattern to coordinate feature lifecycle,
 * state management, and communication between features.
 * 
 * This class provides a single point of control for the extension,
 * making it easy to add new features without modifying existing code.
 */
class FeatureManager {
  constructor() {
    this.features = new Map();
    this.initialized = false;
    this.storageKey = 'focustube_features';
  }

  /**
   * Register a feature instance
   */
  register(feature) {
    if (!(feature instanceof Feature)) {
      throw new Error('Can only register Feature instances');
    }

    if (this.features.has(feature.name)) {
      console.warn(`FocusTube: Feature ${feature.name} already registered, overwriting`);
    }

    this.features.set(feature.name, feature);
    console.debug(`FocusTube: Registered feature ${feature.name}`);
    
    return this;
  }

  /**
   * Register multiple features at once
   */
  registerAll(features) {
    features.forEach(feature => this.register(feature));
    return this;
  }

  /**
   * Get a feature by name
   */
  get(featureName) {
    return this.features.get(featureName);
  }

  /**
   * Check if a feature is registered
   */
  has(featureName) {
    return this.features.has(featureName);
  }

  /**
   * Initialize all registered features SYNCHRONOUSLY like content.js
   * This reads storage with a callback and immediately hides elements before YouTube renders them.
   */
  initializeAllSync() {
    if (this.initialized) {
      console.debug('FocusTube: FeatureManager already initialized');
      return;
    }

    console.debug('FocusTube: Initializing all features synchronously...');

    // Collect all storage keys dynamically from registered features
    const storageKeys = [this.storageKey]; // New format key
    const legacyKeyMap = new Map(); // Map legacy key -> feature name
    const additionalKeysMap = new Map(); // Map additional key -> feature name
    
    // Ask each feature for its legacy keys
    for (const [name, feature] of this.features.entries()) {
      const legacyKey = feature.getLegacyStorageKey();
      if (legacyKey) {
        storageKeys.push(legacyKey);
        legacyKeyMap.set(legacyKey, name);
      }
      
      const additionalKeys = feature.getAdditionalStorageKeys();
      if (additionalKeys && additionalKeys.length > 0) {
        storageKeys.push(...additionalKeys);
        additionalKeys.forEach(key => additionalKeysMap.set(key, name));
      }
    }
    
    console.debug('FocusTube: Loading from storage keys:', storageKeys);
    
    // Use callback pattern (synchronous execution) like content.js
    chrome.storage.sync.get(storageKeys, (result) => {
      console.debug('FocusTube: Storage result:', result);
      
      const savedStates = result[this.storageKey] || {};
      
      // Load from legacy keys (for backwards compatibility)
      // Set enabled flag directly
      for (const [legacyKey, featureName] of legacyKeyMap.entries()) {
        const feature = this.get(featureName);
        if (feature && result[legacyKey] !== undefined) {
          console.debug(`FocusTube: Loading ${featureName} from legacy key ${legacyKey}:`, result[legacyKey]);
          feature.enabled = result[legacyKey];
        }
      }

      // Load from new format (overrides legacy if present)
      for (const [name, state] of Object.entries(savedStates)) {
        const feature = this.get(name);
        if (feature && state.enabled !== undefined) {
          feature.enabled = state.enabled;
          if (state.config) {
            feature.config = { ...feature.config, ...state.config };
          }
        }
      }
      
      // Load additional storage keys (like filter lists)
      for (const [additionalKey, featureName] of additionalKeysMap.entries()) {
        const feature = this.get(featureName);
        if (feature && result[additionalKey] !== undefined) {
          console.debug(`FocusTube: Loading ${featureName} additional data from ${additionalKey}`);
          // Set filter lists directly
          if (feature.filterList !== undefined) {
            feature.filterList = result[additionalKey] || [];
          }
        }
      }
      
      // Now initialize features TRULY synchronously like content.js
      // Use initializeSync() which doesn't return promises
      for (const feature of this.features.values()) {
        try {
          feature.initializeSync();
        } catch (error) {
          console.error(`FocusTube: Failed to initialize ${feature.name}:`, error);
        }
      }
      
      this.initialized = true;
      console.debug('FocusTube: All features initialized synchronously');
      console.debug('FocusTube: Feature states:', Array.from(this.features.values()).map(f => ({ 
        name: f.name, 
        enabled: f.enabled,
        isActive: f.isActive, 
        initialized: f.initialized 
      })));
    });
  }

  /**
   * Initialize all registered features (async version - kept for compatibility)
   */
  async initializeAll() {
    if (this.initialized) {
      console.debug('FocusTube: FeatureManager already initialized');
      return;
    }

    console.debug('FocusTube: Initializing all features...');

    // Load saved states from storage
    await this.loadStates();

    // Initialize features in parallel for better performance
    const initPromises = Array.from(this.features.values()).map(async (feature) => {
      try {
        await feature.initialize();
      } catch (error) {
        console.error(`FocusTube: Failed to initialize ${feature.name}:`, error);
      }
    });

    await Promise.all(initPromises);
    
    this.initialized = true;
    console.debug('FocusTube: All features initialized');
  }

  /**
   * Toggle a feature by name
   */
  async toggleFeature(featureName, enabled) {
    const feature = this.get(featureName);
    if (!feature) {
      console.error(`FocusTube: Feature ${featureName} not found`);
      return;
    }

    await feature.toggle(enabled);
    await this.saveStates();
  }

  /**
   * Update feature configuration
   */
  async updateFeatureConfig(featureName, config) {
    const feature = this.get(featureName);
    if (!feature) {
      console.error(`FocusTube: Feature ${featureName} not found`);
      return;
    }

    feature.config = { ...feature.config, ...config };
    
    // Re-apply feature if it's active
    if (feature.isActive) {
      await feature.deactivate();
      await feature.activate();
    }
    
    await this.saveStates();
  }

  /**
   * Get states of all features
   */
  getAllStates() {
    const states = {};
    this.features.forEach((feature, name) => {
      states[name] = feature.getState();
    });
    return states;
  }

  /**
   * Save feature states to Chrome storage
   */
  async saveStates() {
    const states = this.getAllStates();
    
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.sync.set({ [this.storageKey]: states }, () => {
          if (chrome.runtime.lastError) {
            console.error('FocusTube: Error saving states:', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            console.debug('FocusTube: States saved successfully');
            resolve();
          }
        });
      } catch (error) {
        console.error('FocusTube: Error in saveStates:', error);
        reject(error);
      }
    });
  }

  /**
   * Load feature states from Chrome storage
   */
  async loadStates() {
    try {
      // Collect all storage keys dynamically from registered features
      const storageKeys = [this.storageKey]; // New format key
      const legacyKeyMap = new Map(); // Map legacy key -> feature name
      const additionalKeysMap = new Map(); // Map additional key -> feature name
      
      // Ask each feature for its legacy keys
      for (const [name, feature] of this.features.entries()) {
        const legacyKey = feature.getLegacyStorageKey();
        if (legacyKey) {
          storageKeys.push(legacyKey);
          legacyKeyMap.set(legacyKey, name);
        }
        
        const additionalKeys = feature.getAdditionalStorageKeys();
        if (additionalKeys && additionalKeys.length > 0) {
          storageKeys.push(...additionalKeys);
          additionalKeys.forEach(key => additionalKeysMap.set(key, name));
        }
      }
      
      console.debug('FocusTube: Loading from storage keys:', storageKeys);
      
      // Get data from storage - promisify it properly
      const result = await new Promise((resolve) => {
        chrome.storage.sync.get(storageKeys, (result) => {
          resolve(result);
        });
      });
      
      const savedStates = result[this.storageKey] || {};
      
      console.debug('FocusTube: Storage result:', result);

      // Load from legacy keys (for backwards compatibility)
      // Just set the enabled flag directly, don't trigger toggle yet
      for (const [legacyKey, featureName] of legacyKeyMap.entries()) {
        const feature = this.get(featureName);
        if (feature && result[legacyKey] !== undefined) {
          console.debug(`FocusTube: Loading ${featureName} from legacy key ${legacyKey}:`, result[legacyKey]);
          feature.enabled = result[legacyKey];
        }
      }

      // Load from new format (overrides legacy if present)
      for (const [name, state] of Object.entries(savedStates)) {
        const feature = this.get(name);
        if (feature && state.enabled !== undefined) {
          feature.enabled = state.enabled;
          if (state.config) {
            feature.config = { ...feature.config, ...state.config };
          }
        }
      }
      
      // Load additional storage keys (like filter lists)
      for (const [additionalKey, featureName] of additionalKeysMap.entries()) {
        const feature = this.get(featureName);
        if (feature && result[additionalKey] !== undefined) {
          console.debug(`FocusTube: Loading ${featureName} additional data from ${additionalKey}`);
          // Set filter lists directly
          if (feature.filterList !== undefined) {
            feature.filterList = result[additionalKey] || [];
          }
        }
      }
    } catch (error) {
      console.error('FocusTube: Error in loadStates:', error);
      // Don't throw - allow initialization to continue with defaults
    }
  }

  /**
   * Handle messages from popup or other extension parts
   */
  handleMessage(message, sender, sendResponse) {
    const { type, featureName, state, config } = message;

    switch (type) {
      case 'toggleFeature':
        this.toggleFeature(featureName, state)
          .then(() => sendResponse({ success: true }))
          .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Async response

      case 'updateConfig':
        this.updateFeatureConfig(featureName, config)
          .then(() => sendResponse({ success: true }))
          .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Async response

      case 'getStates':
        sendResponse({ success: true, states: this.getAllStates() });
        return false;

      case 'switchChange': // Legacy compatibility
        const { switchType } = message;
        this.toggleFeature(switchType, state)
          .then(() => sendResponse({ success: true }))
          .catch(error => sendResponse({ success: false, error: error.message }));
        return true;

      default:
        console.warn(`FocusTube: Unknown message type: ${type}`);
        sendResponse({ success: false, error: 'Unknown message type' });
        return false;
    }
  }

  /**
   * Set up message listener
   */
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      return this.handleMessage(message, sender, sendResponse);
    });
    
    // Set up storage change listener (for persistence across reloads)
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync') {
        console.debug('FocusTube: Storage changed:', changes);
        
        // Build a map of storage keys to features
        const keyToFeatureMap = new Map();
        for (const [name, feature] of this.features.entries()) {
          const legacyKey = feature.getLegacyStorageKey();
          if (legacyKey) {
            keyToFeatureMap.set(legacyKey, feature);
          }
          
          const additionalKeys = feature.getAdditionalStorageKeys();
          if (additionalKeys && additionalKeys.length > 0) {
            additionalKeys.forEach(key => keyToFeatureMap.set(key, feature));
          }
        }
        
        // Handle changes
        for (const [key, { newValue }] of Object.entries(changes)) {
          const feature = keyToFeatureMap.get(key);
          
          if (feature && feature.initialized) {
            // Check if this is a legacy toggle key (boolean value)
            if (typeof newValue === 'boolean' && key === feature.getLegacyStorageKey()) {
              console.debug(`FocusTube: Updating ${feature.name} from storage change:`, newValue);
              feature.toggle(newValue).catch(error => {
                console.error(`FocusTube: Error toggling ${feature.name}:`, error);
              });
            } 
            // Check if this is an additional data key
            else if (feature.getAdditionalStorageKeys().includes(key)) {
              console.debug(`FocusTube: Updating ${feature.name} additional data from ${key}`);
              if (typeof feature.loadAdditionalData === 'function') {
                feature.loadAdditionalData(key, newValue).catch(error => {
                  console.error(`FocusTube: Error loading additional data for ${feature.name}:`, error);
                });
              }
            }
          }
        }
      }
    });
  }

  /**
   * Get feature statistics
   */
  getStats() {
    const total = this.features.size;
    const enabled = Array.from(this.features.values()).filter(f => f.enabled).length;
    const initialized = Array.from(this.features.values()).filter(f => f.initialized).length;

    return {
      total,
      enabled,
      disabled: total - enabled,
      initialized,
      uninitialized: total - initialized
    };
  }

  /**
   * Cleanup all features
   */
  async cleanup() {
    console.debug('FocusTube: Cleaning up all features...');
    
    const cleanupPromises = Array.from(this.features.values()).map(async (feature) => {
      try {
        if (feature.enabled) {
          await feature.deactivate();
        }
      } catch (error) {
        console.error(`FocusTube: Error cleaning up ${feature.name}:`, error);
      }
    });

    await Promise.all(cleanupPromises);
    console.debug('FocusTube: Cleanup complete');
  }
}
