/**
 * Base class for all YouTube modification features.
 * Implements the Template Method pattern to provide a consistent lifecycle
 * for feature initialization, activation, and deactivation.
 * 
 * This abstract class enforces separation of concerns and provides extension points
 * for concrete feature implementations without requiring modification of base behavior.
 */
class Feature {
  /**
   * @param {string} name - Unique identifier for the feature
   * @param {object} config - Configuration object with default state
   */
  constructor(name, config = {}) {
    if (this.constructor === Feature) {
      throw new Error('Feature is an abstract class and cannot be instantiated directly');
    }
    
    this.name = name;
    this.enabled = config.defaultEnabled ?? false;
    this.isActive = false; // Track actual execution state separately from preference
    this.config = config;
    this.initialized = false;
    this.styleElements = new Map(); // Track injected CSS for cleanup
  }

  /**
   * Template method: Orchestrates feature initialization SYNCHRONOUSLY
   * Like content.js - no async/await, executes immediately
   */
  initializeSync() {
    if (this.initialized) {
      console.debug(`FocusTube: ${this.name} already initialized`);
      return;
    }

    console.debug(`FocusTube: Initializing ${this.name} synchronously`);
    
    try {
      // Call lifecycle hooks - they should be sync or self-contained
      this.onBeforeInit();
      this.onInit();
      this.onAfterInit();
      this.initialized = true;
      
      // Activate immediately if enabled (like content.js does)
      if (this.enabled) {
        // Force activation even if enabled flag is true (it might represent config, not active state)
        if (!this.isActive) {
          this.activateSync();
        }
      }
    } catch (error) {
      console.error(`FocusTube: Error initializing ${this.name}:`, error);
      throw error;
    }
  }

  /**
   * Template method: Orchestrates feature initialization (async version)
   * Calls lifecycle hooks in the proper order
   */
  async initialize() {
    if (this.initialized) {
      console.debug(`FocusTube: ${this.name} already initialized`);
      return;
    }

    console.debug(`FocusTube: Initializing ${this.name}`);
    
    try {
      await this.onBeforeInit();
      await this.onInit();
      await this.onAfterInit();
      this.initialized = true;
      
      if (this.enabled && !this.isActive) {
        await this.activate();
      }
    } catch (error) {
      console.error(`FocusTube: Error initializing ${this.name}:`, error);
      throw error;
    }
  }

  /**
   * Template method: Activates the feature SYNCHRONOUSLY
   * Like content.js - no async/await, executes immediately
   */
  activateSync() {
    if (!this.initialized) {
      console.warn(`FocusTube: Cannot activate ${this.name} - not initialized yet`);
      return;
    }

    if (this.isActive) {
      console.debug(`FocusTube: ${this.name} already active`);
      return;
    }

    console.debug(`FocusTube: Activating ${this.name} synchronously`);
    this.enabled = true; // Ensure preference key is set
    this.isActive = true;
    
    try {
      this.onActivate();
    } catch (error) {
      console.error(`FocusTube: Error activating ${this.name}:`, error);
      this.enabled = false;
      this.isActive = false;
      throw error;
    }
  }

  /**
   * Template method: Activates the feature (async version)
   */
  async activate() {
    if (!this.initialized) {
      console.warn(`FocusTube: Cannot activate ${this.name} - not initialized yet`);
      return;
    }

    if (this.isActive) {
      console.debug(`FocusTube: ${this.name} already active`);
      return;
    }

    console.debug(`FocusTube: Activating ${this.name}`);
    this.enabled = true;
    this.isActive = true;
    
    try {
      await this.onActivate();
    } catch (error) {
      console.error(`FocusTube: Error activating ${this.name}:`, error);
      this.enabled = false;
      this.isActive = false;
      throw error;
    }
  }

  /**
   * Template method: Deactivates the feature
   */
  async deactivate() {
    if (!this.isActive) {
      console.debug(`FocusTube: ${this.name} already inactive`);
      return;
    }

    console.debug(`FocusTube: Deactivating ${this.name}`);
    this.enabled = false;
    this.isActive = false;
    
    try {
      await this.onDeactivate();
    } catch (error) {
      console.error(`FocusTube: Error deactivating ${this.name}:`, error);
      throw error;
    }
  }

  /**
   * Toggle feature state
   */
  async toggle(state) {
    if (state === this.isActive) return;
    
    if (state) {
      await this.activate();
    } else {
      await this.deactivate();
    }
  }

  // Lifecycle hooks - Override these in subclasses
  
  /**
   * Hook: Called before initialization
   * Use for preparation tasks like checking prerequisites
   */
  async onBeforeInit() {}

  /**
   * Hook: Main initialization logic
   * Must be implemented by subclasses
   */
  async onInit() {
    throw new Error(`${this.constructor.name} must implement onInit()`);
  }

  /**
   * Hook: Called after successful initialization
   * Use for post-initialization setup
   */
  async onAfterInit() {}

  /**
   * Hook: Called when feature is activated
   * Must be implemented by subclasses
   */
  async onActivate() {
    throw new Error(`${this.constructor.name} must implement onActivate()`);
  }

  /**
   * Hook: Called when feature is deactivated
   * Must be implemented by subclasses
   */
  async onDeactivate() {
    throw new Error(`${this.constructor.name} must implement onDeactivate()`);
  }

  /**
   * Utility: Inject CSS with automatic cleanup tracking
   */
  injectCSS(cssId, cssContent) {
    if (this.styleElements.has(cssId)) {
      console.debug(`FocusTube: CSS ${cssId} already injected`);
      return;
    }

    try {
      const style = document.createElement('style');
      style.id = `__focustube_${this.name}_${cssId}`;
      style.appendChild(document.createTextNode(cssContent));
      (document.head || document.documentElement).appendChild(style);
      this.styleElements.set(cssId, style);
      console.debug(`FocusTube: Injected CSS for ${this.name}:${cssId}`);
    } catch (error) {
      console.error(`FocusTube: Error injecting CSS ${cssId}:`, error);
    }
  }

  /**
   * Utility: Remove injected CSS
   */
  removeCSS(cssId) {
    const styleElement = this.styleElements.get(cssId);
    if (!styleElement) return;

    try {
      if (styleElement.parentNode) {
        styleElement.parentNode.removeChild(styleElement);
      }
      this.styleElements.delete(cssId);
      console.debug(`FocusTube: Removed CSS for ${this.name}:${cssId}`);
    } catch (error) {
      console.error(`FocusTube: Error removing CSS ${cssId}:`, error);
    }
  }

  /**
   * Utility: Clean up all injected CSS
   */
  removeAllCSS() {
    for (const cssId of this.styleElements.keys()) {
      this.removeCSS(cssId);
    }
  }

  /**
   * Get current state for persistence
   */
  getState() {
    return {
      name: this.name,
      enabled: this.enabled,
      config: this.config
    };
  }

  /**
   * Restore state from persistence
   */
  async setState(state) {
    // During initial load, just set the enabled flag without triggering toggle
    // This prevents double activation during initialization
    if (state.enabled !== undefined && !this.initialized) {
      this.enabled = state.enabled;
    } else if (state.enabled !== undefined) {
      await this.toggle(state.enabled);
    }
    
    if (state.config !== undefined) {
      this.config = { ...this.config, ...state.config };
    }
  }

  /**
   * Get legacy storage key for backwards compatibility.
   * Override in child classes if the feature has a different legacy key.
   * Return null if no legacy key exists.
   */
  getLegacyStorageKey() {
    // By default, legacy key is the same as feature name
    return this.name;
  }

  /**
   * Get additional storage keys this feature depends on (e.g., filter lists).
   * Override in child classes if the feature needs additional keys.
   * Returns array of key names.
   */
  getAdditionalStorageKeys() {
    return [];
  }
}
