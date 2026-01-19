/**
 * Feature to hide content on YouTube homepage.
 * Useful for creating a distraction-free landing page.
 */
class HideHomePageContentFeature extends DOMFeature {
  constructor() {
    super('hideHomePageContent', {
      defaultEnabled: false
    });
  }

  async onInit() {
    console.debug('FocusTube: HideHomePageContentFeature initialized');
  }

  async onActivate() {
    if (this.isHomePage()) {
      this.hideHomeContent();
    }
    
    // Re-check on URL changes (SPA navigation)
    this.observeDOM(() => {
      if (this.isHomePage()) {
        this.hideHomeContent();
      }
    });
  }

  /**
   * Hide homepage content
   */
  hideHomeContent() {
    // Hide main contents container
    this.hideById('contents');

    // Hide rich grid renderers
    const gridRenderers = this.query('ytd-rich-grid-renderer');
    this.hideElements(gridRenderers);

    console.debug('FocusTube: Homepage content hidden');
  }

  /**
   * Check if on homepage
   */
  isHomePage() {
    return window.location.pathname === '/';
  }
}
