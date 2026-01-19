/**
 * Configuration registry for extension settings.
 * Provides centralized configuration management with validation.
 */
class ConfigRegistry {
  constructor() {
    this.configs = new Map();
    this.listeners = new Map();
  }

  /**
   * Register a configuration schema
   */
  register(key, schema) {
    this.configs.set(key, {
      schema,
      value: schema.default,
      validators: schema.validators || []
    });
  }

  /**
   * Get configuration value
   */
  get(key) {
    const config = this.configs.get(key);
    return config ? config.value : undefined;
  }

  /**
   * Set configuration value with validation
   */
  set(key, value) {
    const config = this.configs.get(key);
    if (!config) {
      throw new Error(`Configuration key '${key}' not registered`);
    }

    // Run validators
    for (const validator of config.validators) {
      const error = validator(value);
      if (error) {
        throw new Error(`Validation failed for '${key}': ${error}`);
      }
    }

    const oldValue = config.value;
    config.value = value;

    // Notify listeners
    this.notifyListeners(key, value, oldValue);
  }

  /**
   * Add change listener
   */
  onChange(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key).push(callback);
  }

  /**
   * Notify listeners of changes
   */
  notifyListeners(key, newValue, oldValue) {
    const listeners = this.listeners.get(key) || [];
    listeners.forEach(callback => {
      try {
        callback(newValue, oldValue);
      } catch (error) {
        console.error(`FocusTube: Error in config listener for '${key}':`, error);
      }
    });
  }

  /**
   * Get all configurations
   */
  getAll() {
    const result = {};
    this.configs.forEach((config, key) => {
      result[key] = config.value;
    });
    return result;
  }

  /**
   * Reset to defaults
   */
  resetToDefaults() {
    this.configs.forEach((config, key) => {
      this.set(key, config.schema.default);
    });
  }
}

/**
 * Storage adapter for Chrome sync storage.
 * Handles persistence of feature states and configurations.
 */
class StorageAdapter {
  constructor(storageArea = chrome.storage.sync) {
    this.storage = storageArea;
    this.listeners = [];
  }

  /**
   * Get value(s) from storage
   */
  async get(keys) {
    return new Promise((resolve, reject) => {
      this.storage.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * Set value(s) in storage
   */
  async set(items) {
    return new Promise((resolve, reject) => {
      this.storage.set(items, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Remove key(s) from storage
   */
  async remove(keys) {
    return new Promise((resolve, reject) => {
      this.storage.remove(keys, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Clear all storage
   */
  async clear() {
    return new Promise((resolve, reject) => {
      this.storage.clear(() => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Listen for storage changes
   */
  onChange(callback) {
    const listener = (changes, areaName) => {
      if (areaName === 'sync') {
        callback(changes);
      }
    };
    
    chrome.storage.onChanged.addListener(listener);
    this.listeners.push(listener);
  }

  /**
   * Remove all listeners
   */
  removeListeners() {
    this.listeners.forEach(listener => {
      chrome.storage.onChanged.removeListener(listener);
    });
    this.listeners = [];
  }
}

/**
 * Message bus for communication between extension parts.
 * Provides pub/sub pattern for loose coupling.
 */
class MessageBus {
  constructor() {
    this.subscribers = new Map();
    this.setupListener();
  }

  /**
   * Subscribe to a message type
   */
  subscribe(type, handler) {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, []);
    }
    this.subscribers.get(type).push(handler);
    console.debug(`FocusTube: Subscribed to '${type}' messages`);
  }

  /**
   * Unsubscribe from a message type
   */
  unsubscribe(type, handler) {
    const handlers = this.subscribers.get(type);
    if (!handlers) return;

    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  /**
   * Publish a message
   */
  async publish(type, data) {
    const handlers = this.subscribers.get(type) || [];
    
    console.debug(`FocusTube: Publishing '${type}' to ${handlers.length} subscribers`);

    const results = await Promise.allSettled(
      handlers.map(handler => 
        Promise.resolve(handler(data))
      )
    );

    // Log any handler errors
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`FocusTube: Handler ${index} for '${type}' failed:`, result.reason);
      }
    });
  }

  /**
   * Send message to content script
   */
  async sendToContent(message) {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length === 0) {
          reject(new Error('No active tab found'));
          return;
        }

        chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        });
      });
    });
  }

  /**
   * Send message to all tabs
   */
  async broadcast(message) {
    return new Promise((resolve) => {
      chrome.tabs.query({}, (tabs) => {
        const promises = tabs.map(tab => 
          new Promise((resolveTab) => {
            chrome.tabs.sendMessage(tab.id, message, () => {
              // Ignore errors for tabs that don't have content script
              resolveTab();
            });
          })
        );

        Promise.all(promises).then(() => resolve());
      });
    });
  }

  /**
   * Set up Chrome runtime message listener
   */
  setupListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      const { type } = message;
      
      if (!type) {
        sendResponse({ success: false, error: 'Message type required' });
        return false;
      }

      // Publish to subscribers and handle response
      this.publish(type, { message, sender, sendResponse })
        .then(() => {
          // Message was handled by subscribers
        })
        .catch(error => {
          console.error(`FocusTube: Error handling message type '${type}':`, error);
          sendResponse({ success: false, error: error.message });
        });

      return true; // Will respond asynchronously
    });
  }
}
