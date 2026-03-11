/**
 * Feature to hide YouTube video suggestions/recommendations.
 * Hides related videos in sidebar while preserving comments section.
 */
class HideSuggestionsFeature extends DOMFeature {
  constructor() {
    super('hideSuggestions', {
      defaultEnabled: true,
      preserveComments: true
    });
  }

  async onInit() {
    console.debug('FocusTube: HideSuggestionsFeature initialized');
  }

  async onActivate() {
    this.injectBlockingCSS();
    this.hideSuggestions();
    this.observeDOM(() => this.hideSuggestions());
  }

  /**
   * Inject CSS to hide known suggestion containers
   * This is more efficient and robust than JS-only hiding
   */
  injectBlockingCSS() {
    // Hide sidebar recommendations AND in-player end-of-video suggestions
    const css = `
      #related,
      ytd-watch-next-secondary-results-renderer {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        max-height: 0 !important;
      }
      /* End-screen cards (creator-added) */
      .ytp-ce-element {
        display: none !important;
        visibility: hidden !important;
      }
      /* Video wall grid shown when video finishes */
      .ytp-videowall-still,
      .ytp-modern-videowall-still,
      .ytp-fullscreen-grid-stills-container {
        display: none !important;
        visibility: hidden !important;
      }
    `;
    this.injectCSS('blocking', css);
  }

  /**
   * Hide video suggestions while preserving comments
   */
  hideSuggestions() {
    // Hide related videos section
    this.hideById('related');

    // On watch pages, hide suggestions in secondary but keep comments
    if (this.isWatchPage()) {
      this.hideSecondaryContent();
    }
  }

  /**
   * Hide content in secondary panel
   */
  hideSecondaryContent() {
    const secondary = document.getElementById('secondary');
    if (!secondary) return;

    // Robust strategy from content.js (legacy):
    // Iterate over immediate children and hide everything that is NOT comments
    const children = secondary.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const tagName = child.tagName.toLowerCase();
      
      // Skip comments and live chat
      if (tagName === 'ytd-comments' || tagName === 'ytd-live-chat-frame') {
        // Ensure it's not hidden by us
        if (this.targetElements.has(child)) {
          this.showElements([child]);
        }
        continue;
      }
      
      // Hide everything else (recommendations, playlists, etc.)
      this.hideElements([child]);
    }

    // Also specifically target the recommendations container 
    // This catches cases where the structure might be slightly different
    const watchNext = secondary.querySelector('ytd-watch-next-secondary-results-renderer');
    if (watchNext) {
      this.hideElements([watchNext]);
    }
  }

  /**
   * Check if on watch page
   */
  isWatchPage() {
    return window.location.pathname.includes('/watch');
  }
}
