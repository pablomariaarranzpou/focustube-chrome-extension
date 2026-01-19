/**
 * Feature to hide YouTube sidebar/guide (left navigation panel).
 * Desktop-only feature that doesn't affect mobile drawer.
 */
class HideSidebarFeature extends DOMFeature {
  constructor() {
    super('hideSidebar', {
      defaultEnabled: false,
      desktopOnly: true
    });
  }

  async onInit() {
    console.debug('FocusTube: HideSidebarFeature initialized');
  }

  async onActivate() {
    this.injectSidebarCSS();
    this.hideSidebarElements();
  }

  /**
   * Inject CSS to hide sidebar - does most of the work
   */
  injectSidebarCSS() {
    const css = `
      /* Hide YouTube sidebar/guide - desktop only */
      #guide,
      #guide-content,
      #guide-inner-content,
      ytd-guide-renderer,
      ytd-mini-guide-renderer,
      ytd-guide-section-renderer {
        display: none !important;
        visibility: hidden !important;
        width: 0 !important;
        max-width: 0 !important;
        min-width: 0 !important;
        opacity: 0 !important;
      }
      
      /* Disable guide button */
      #guide-button,
      ytd-masthead #guide-button {
        pointer-events: none !important;
        opacity: 0.3 !important;
      }
      
      /* Adjust layout - only on main pages, not channel pages */
      ytd-app:not(:has(ytd-browse[page-subtype="channels"])),
      ytd-page-manager:not(:has(ytd-browse[page-subtype="channels"])),
      #page-manager:not(:has(ytd-browse[page-subtype="channels"])) {
        grid-template-columns: 0px 1fr !important;
      }
      
      /* Expand main content - avoid channel pages */
      body:not(:has(ytd-browse[page-subtype="channels"])) ytd-two-column-browse-results-renderer,
      body:not(:has(ytd-browse[page-subtype="channels"])) #primary,
      body:not(:has(ytd-browse[page-subtype="channels"])) #secondary {
        margin-left: 0 !important;
        padding-left: 0 !important;
      }
    `;
    this.injectCSS('sidebar', css);
  }

  /**
   * Set accessibility attributes on sidebar elements
   */
  hideSidebarElements() {
    const sidebarSelectors = ['#guide', 'ytd-guide-renderer'];
    
    sidebarSelectors.forEach(selector => {
      const elements = this.query(selector);
      elements.forEach(element => {
        try {
          element.setAttribute('hidden', 'true');
          element.setAttribute('aria-hidden', 'true');
        } catch (error) {}
      });
    });

    console.debug('FocusTube: Sidebar hidden (desktop only)');
  }

  /**
   * Restore sidebar accessibility attributes
   */
  async onDeactivate() {
    const sidebarSelectors = ['#guide', 'ytd-guide-renderer'];
    
    sidebarSelectors.forEach(selector => {
      const elements = this.query(selector);
      elements.forEach(element => {
        try {
          element.removeAttribute('hidden');
          element.removeAttribute('aria-hidden');
        } catch (error) {}
      });
    });

    await super.onDeactivate();
    console.debug('FocusTube: Sidebar shown (desktop only)');
  }
}
