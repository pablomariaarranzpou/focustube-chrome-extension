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
    if (this.config.keepHistoryVisible) {
      this.filterToHistoryOnly();
      this.observeDOM(() => this.filterToHistoryOnly());
    } else {
      this.hideSidebarElements();
    }
  }

  /**
   * Inject CSS to hide sidebar - does most of the work
   */
  injectSidebarCSS() {
    let css;

    if (this.config.keepHistoryVisible) {
      // Entries start hidden and the JS filter marks the one to keep, rather
      // than starting visible and being hidden afterwards.
      //
      // Features activate inside the async chrome.storage callback, so on a
      // fresh load YouTube has already painted the whole guide by the time the
      // filter first runs. Leaving the entries to JS alone meant every channel
      // in the sidebar flashed on screen on every page load before vanishing.
      // Defaulting to hidden means the worst case is an empty sidebar for a
      // moment, which matches what the feature is for.
      css = `
        ytd-mini-guide-renderer,
        #guide-content #header,
        ytd-guide-renderer #footer {
          display: none !important;
        }

        ytd-guide-renderer ytd-guide-section-renderer:not([data-ft-keep]),
        ytd-guide-renderer ytd-guide-entry-renderer:not([data-ft-keep]) {
          display: none !important;
        }
      `;
    } else {
      css = `
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
    }

    this.injectCSS('sidebar', css);
  }

  /**
   * Show only the History entry in the guide, hiding everything else.
   * Uses JS so it works even when the DOM is lazy-loaded or inside
   * collapsed collapsible sections.
   */
  filterToHistoryOnly() {
    const guide = document.querySelector('ytd-guide-renderer');
    if (!guide) return;

    // Find the history entry - try href first, fall back to title attribute
    const allEntries = Array.from(guide.querySelectorAll('ytd-guide-entry-renderer'));
    const historyEntry = allEntries.find(e => e.querySelector('a[href="/feed/history"]')) ||
                         allEntries.find(e => e.querySelector('a[title="History"], a[title="Historial"]'));

    if (!historyEntry) {
      // Not in DOM yet - expand any collapsed sections and wait for the next observe tick
      guide.querySelectorAll('ytd-guide-collapsible-section-entry-renderer').forEach(c => {
        const items = c.querySelector('#section-items');
        if (items) items.style.setProperty('display', 'block', 'important');
      });
      return;
    }

    // --- Sections: mark the one holding history, unmark the rest ---
    // The CSS above hides anything without data-ft-keep, so marking is all the
    // filtering that is needed and nothing is ever visible-then-hidden.
    guide.querySelectorAll('ytd-guide-section-renderer').forEach(section => {
      if (section.contains(historyEntry)) {
        section.setAttribute('data-ft-keep', '');
        section.style.removeProperty('display');
        section.style.removeProperty('visibility');
      } else {
        section.removeAttribute('data-ft-keep');
      }
    });

    // --- Entries: keep history only ---
    allEntries.forEach(entry => {
      if (entry === historyEntry) {
        entry.setAttribute('data-ft-keep', '');
        entry.style.removeProperty('display');
      } else {
        entry.removeAttribute('data-ft-keep');
      }
    });

    // --- Decorative elements in the visible section ---
    const historySection = historyEntry.closest('ytd-guide-section-renderer');
    if (historySection) {
      historySection.querySelectorAll('h3').forEach(h => {
        h.style.setProperty('display', 'none', 'important');
      });
      historySection.querySelectorAll('ytd-guide-collapsible-section-entry-renderer > #header').forEach(h => {
        h.style.setProperty('display', 'none', 'important');
      });
    }

    // --- Expand collapsible parent if history is inside one ---
    const collapsible = historyEntry.closest('ytd-guide-collapsible-section-entry-renderer');
    if (collapsible) {
      const sectionItems = collapsible.querySelector('#section-items');
      if (sectionItems) {
        sectionItems.style.setProperty('display', 'block', 'important');
      }
    }
  }

  /**
   * Set accessibility attributes on sidebar elements (full-hide mode only)
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
   * Restore sidebar
   */
  async onDeactivate() {
    // Remove any inline styles applied by filterToHistoryOnly. The entries
    // themselves are hidden by the injected CSS, which super.onDeactivate()
    // removes, so clearing the markers is enough to leave the guide as found.
    const guide = document.querySelector('ytd-guide-renderer');
    if (guide) {
      guide.querySelectorAll('ytd-guide-section-renderer, ytd-guide-entry-renderer, h3, #header, #section-items').forEach(el => {
        el.style.removeProperty('display');
        el.style.removeProperty('visibility');
      });
      guide.querySelectorAll('[data-ft-keep]').forEach(el => el.removeAttribute('data-ft-keep'));
    }

    // Restore aria attributes
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
