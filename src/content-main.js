/**
 * New modular content script using class-based architecture.
 * This file orchestrates all features through the FeatureManager.
 * 
 * Architecture:
 * - Feature: Base class for all features (Template Method pattern)
 * - DOMFeature: Base for DOM manipulation features
 * - FilterFeature: Base for content filtering features
 * - FeatureManager: Central coordinator (Mediator pattern)
 * - Individual feature classes: Implement specific functionality
 * 
 * Adding new features:
 * 1. Create a new class extending Feature/DOMFeature/FilterFeature
 * 2. Implement required lifecycle hooks (onInit, onActivate, onDeactivate)
 * 3. Register in the featureManager below
 * 4. Add to manifest.json if needed
 * 
 * No modification of existing code required!
 */

// Load dependencies - Order matters for inheritance
// Core classes
// @ts-ignore
// <script src="src/core/Feature.js"></script>
// <script src="src/core/DOMFeature.js"></script>
// <script src="src/core/FilterFeature.js"></script>
// <script src="src/core/FeatureManager.js"></script>
// Feature implementations
// <script src="src/features/HideShortsFeature.js"></script>
// <script src="src/features/HideSuggestionsFeature.js"></script>
// <script src="src/features/HideCommentsFeature.js"></script>
// <script src="src/features/HideSidebarFeature.js"></script>
// <script src="src/features/HideAutoplayOverlayFeature.js"></script>
// <script src="src/features/HideHomePageContentFeature.js"></script>
// <script src="src/features/HideBlacklistedChannelsFeature.js"></script>
// <script src="src/features/HideBlacklistedWordsFeature.js"></script>

console.log('FocusTube content script loaded - Version 2026-01-18 (Refactored)');

// Global feature manager
let featureManager = null;

/**
 * Initialize the extension - runs IMMEDIATELY, not waiting for DOM
 */
function initializeFocusTube() {
  try {
    console.log('FocusTube: Starting initialization...');

    // Create feature manager
    featureManager = new FeatureManager();

    // Register all features
    featureManager.registerAll([
      new HideShortsFeature(),
      new HideSuggestionsFeature(),
      new HideCommentsFeature(),
      new HideSidebarFeature(),
      new HideAutoplayOverlayFeature(),
      new HideHomePageContentFeature(),
      new HideBlacklistedChannelsFeature(),
      new HideBlacklistedWordsFeature()
    ]);

    // Set up message handling for popup communication
    featureManager.setupMessageListener();
    console.log('FocusTube: Message listener set up');

    // Initialize synchronously - this loads from storage and activates features
    // Using chrome.storage.sync.get with callback (synchronous pattern like content.js)
    featureManager.initializeAllSync();

    // Make manager globally available for debugging
    window.__focusTubeManager = featureManager;

    console.log('FocusTube: Initialization complete');

  } catch (error) {
    console.error('FocusTube: Initialization failed:', error);
  }
}

// Wrap execution in try-catch to log top-level errors
try {
  // Start IMMEDIATELY - don't wait for DOM
  initializeFocusTube();
} catch (e) {
  console.error('FocusTube: Critical error starting content script:', e);
}

// Handle cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (window.__focusTubeManager) {
    window.__focusTubeManager.cleanup();
  }
});
