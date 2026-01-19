/**
 * Example Feature: Hide YouTube Chapters
 * 
 * This is a simple example demonstrating how to create a new feature
 * in the refactored FocusTube architecture.
 * 
 * This feature hides the chapter markers that appear in video timelines.
 * 
 * To enable this feature:
 * 1. Add this file to manifest.json in the content_scripts.js array
 * 2. Register in src/content-main.js: new HideChaptersFeature()
 * 3. Add UI toggle to front.html (optional)
 * 4. Reload extension
 */

class HideChaptersFeature extends DOMFeature {
  /**
   * Constructor - Define feature name and configuration
   */
  constructor() {
    super('hideChapters', {
      defaultEnabled: false,  // Disabled by default
      hideMarkers: true,      // Custom config option
      hideMenu: true          // Custom config option
    });
    
    // Define selectors for chapter elements
    this.chapterSelectors = [
      '.ytp-chapter-hover-bar',           // Chapter hover bar
      '.ytp-chapters-container',          // Chapters container
      'ytd-macro-markers-list-renderer',  // Chapter markers list
      '.ytd-macro-markers-list-item-renderer' // Individual chapter items
    ];
  }

  /**
   * onInit - One-time initialization
   * Called once when extension loads
   */
  async onInit() {
    console.debug('FocusTube: HideChaptersFeature initialized');
    // You can perform one-time setup here
    // Load additional configuration, set up event listeners, etc.
  }

  /**
   * onActivate - Enable the feature
   * Called when user toggles feature ON
   */
  async onActivate() {
    console.debug('FocusTube: HideChaptersFeature activated');
    
    // Apply chapter hiding immediately
    this.hideChapterElements();
    
    // Watch for dynamically loaded chapters
    // observeDOM is provided by DOMFeature parent class
    this.observeDOM(() => {
      this.hideChapterElements();
    });
    
    // Optional: Inject custom CSS for persistent hiding
    if (this.config.hideMarkers) {
      this.injectChapterCSS();
    }
  }

  /**
   * onDeactivate - Disable the feature
   * Called when user toggles feature OFF
   * Parent class automatically handles cleanup (observers, CSS, hidden elements)
   */
  async onDeactivate() {
    console.debug('FocusTube: HideChaptersFeature deactivated');
    
    // Parent class cleanup handles:
    // - Disconnecting observers
    // - Removing injected CSS
    // - Showing previously hidden elements
    await super.onDeactivate();
    
    // Add any custom cleanup here if needed
  }

  /**
   * Hide chapter elements on the page
   * Uses DOMFeature methods: query() and hideElements()
   */
  hideChapterElements() {
    // Query all chapter elements
    // query() is from DOMFeature - it's query() with error handling
    const chapterElements = this.query(this.chapterSelectors.join(', '));
    
    if (chapterElements.length > 0) {
      // hideElements() is from DOMFeature
      // It hides with comprehensive CSS and tracks elements for cleanup
      this.hideElements(chapterElements);
      console.debug(`FocusTube: Hidden ${chapterElements.length} chapter elements`);
    }
    
    // Example: Conditionally hide based on config
    if (this.config.hideMenu) {
      const menuItems = this.query('.ytp-menuitem[aria-label*="Chapter"]');
      this.hideElements(menuItems);
    }
  }

  /**
   * Inject CSS for persistent chapter hiding
   * Uses Feature method: injectCSS()
   */
  injectChapterCSS() {
    const css = `
      /* Hide chapter markers */
      ${this.chapterSelectors.join(',\n      ')} {
        display: none !important;
        visibility: hidden !important;
      }
      
      /* Hide chapter menu items */
      .ytp-menuitem[aria-label*="Chapter"] {
        display: none !important;
      }
    `;
    
    // injectCSS() is from Feature base class
    // It tracks CSS for automatic cleanup on deactivation
    this.injectCSS('chapters', css);
  }

  /**
   * Custom method: Check if video has chapters
   * This demonstrates adding custom functionality
   */
  hasChapters() {
    const chapterContainer = document.querySelector('.ytp-chapters-container');
    return chapterContainer !== null;
  }

  /**
   * Example: Override to add custom state
   * This shows how to extend state management
   */
  getState() {
    return {
      ...super.getState(),
      hasChapters: this.hasChapters(),
      lastChecked: Date.now()
    };
  }
}

/**
 * USAGE NOTES:
 * 
 * This example demonstrates:
 * 
 * 1. INHERITANCE
 *    - Extends DOMFeature for DOM manipulation utilities
 *    - Could extend Feature for basic features
 *    - Could extend FilterFeature for filtering features
 * 
 * 2. LIFECYCLE HOOKS
 *    - onInit(): One-time setup
 *    - onActivate(): Enable feature
 *    - onDeactivate(): Disable feature (cleanup handled by parent)
 * 
 * 3. PARENT CLASS UTILITIES
 *    From DOMFeature:
 *    - query(selector): Query with error handling
 *    - hideElements(elements): Hide with comprehensive CSS
 *    - showElements(elements): Show elements
 *    - observeDOM(callback): Watch for page changes
 *    - hideById(id): Hide element by ID
 *    - showById(id): Show element by ID
 * 
 *    From Feature:
 *    - injectCSS(id, css): Inject CSS with cleanup tracking
 *    - removeCSS(id): Remove injected CSS
 *    - getState(): Get current state
 *    - setState(state): Restore state
 * 
 * 4. CONFIGURATION
 *    - Define in constructor: { defaultEnabled, customOptions }
 *    - Access via: this.config.optionName
 *    - Update via FeatureManager: updateFeatureConfig()
 * 
 * 5. AUTOMATIC CLEANUP
 *    - Parent class handles observer disconnection
 *    - Parent class removes injected CSS
 *    - Parent class shows hidden elements
 *    - Just call: await super.onDeactivate()
 * 
 * 6. ERROR HANDLING
 *    - Parent methods have try-catch blocks
 *    - Errors logged with console.error
 *    - Feature continues working despite errors
 * 
 * TO ENABLE THIS FEATURE:
 * 
 * 1. Add to manifest.json:
 *    "js": [
 *      ...
 *      "src/features/HideChaptersFeature.js",
 *      "src/content-main.js"
 *    ]
 * 
 * 2. Register in src/content-main.js:
 *    featureManager.registerAll([
 *      ...
 *      new HideChaptersFeature()
 *    ]);
 * 
 * 3. Add UI (optional) in front.html:
 *    <label class="toggle-container">
 *      <input type="checkbox" id="hideChaptersCheckbox" class="toggle-input">
 *      <span class="toggle-slider"></span>
 *      <span class="ml-3">Hide Chapters</span>
 *    </label>
 * 
 * 4. Update PopupController checkboxMap (optional):
 *    hideChaptersCheckbox: 'hideChapters'
 * 
 * That's it! No modification of existing features required.
 */
