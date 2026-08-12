/**
 * Abstract base class for DOM manipulation features.
 * Extends Feature with common DOM manipulation patterns.
 * 
 * This class provides reusable methods for hiding/showing elements,
 * query selectors, and MutationObserver management.
 */
// Upper bound on mutation records buffered between animation frames. Only
// reached in a background tab, where rAF is paused and nothing is flushing.
const MAX_PENDING_RECORDS = 2000;

class DOMFeature extends Feature {
  constructor(name, config = {}) {
    super(name, config);
    this.observers = [];
    this.targetElements = new Map(); // Track elements we've modified
  }

  /**
   * Query elements with error handling
   */
  query(selector, context = document) {
    try {
      return Array.from(context.querySelectorAll(selector));
    } catch (error) {
      console.error(`FocusTube: Error querying ${selector}:`, error);
      return [];
    }
  }

  /**
   * Hide elements with comprehensive CSS properties
   */
  hideElements(elements) {
    if (!Array.isArray(elements)) {
      elements = [elements];
    }

    elements.forEach(element => {
      if (!element) return;
      
      try {
        element.style.setProperty('display', 'none', 'important');
        element.style.setProperty('visibility', 'hidden', 'important');
        element.style.setProperty('width', '0', 'important');
        element.style.setProperty('max-width', '0', 'important');
        element.style.setProperty('min-width', '0', 'important');
        element.style.setProperty('opacity', '0', 'important');
        element.setAttribute('hidden', 'true');
        element.setAttribute('aria-hidden', 'true');
        element.setAttribute('inert', 'true');
        element.setAttribute(`data-focustube-${this.name}`, 'hidden');
        
        this.targetElements.set(element, 'hidden');
      } catch (error) {
        console.error(`FocusTube: Error hiding element:`, error);
      }
    });
  }

  /**
   * Show elements by removing hiding properties
   */
  showElements(elements) {
    if (!Array.isArray(elements)) {
      elements = [elements];
    }

    elements.forEach(element => {
      if (!element) return;
      
      try {
        element.style.removeProperty('display');
        element.style.removeProperty('visibility');
        element.style.removeProperty('width');
        element.style.removeProperty('max-width');
        element.style.removeProperty('min-width');
        element.style.removeProperty('opacity');
        element.removeAttribute('hidden');
        element.removeAttribute('aria-hidden');
        element.removeAttribute('inert');
        element.removeAttribute(`data-focustube-${this.name}`);
        
        this.targetElements.delete(element);
      } catch (error) {
        console.error(`FocusTube: Error showing element:`, error);
      }
    });
  }

  /**
   * Hide element by ID
   */
  hideById(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      this.hideElements([element]);
    }
  }

  /**
   * Show element by ID
   */
  showById(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      this.showElements([element]);
    }
  }

  /**
   * Create and start observing DOM mutations
   */
  observeDOM(callback, options = {}) {
    const defaultOptions = {
      childList: true,
      subtree: true,
      attributes: false,
      attributeOldValue: false
    };

    const observerOptions = { ...defaultOptions, ...options };

    // Content scripts run at document_start, so <body> usually does not exist
    // yet on the first call. Bridge on <html> until it appears, then observe
    // <body> as normal.
    //
    // This used to defer to DOMContentLoaded, which left the pending
    // registration outside the feature's lifecycle: deactivating during page
    // load found this.observers still empty, and the listener then attached a
    // live observer to a feature that was already off. Registering the bridge
    // in this.observers means disconnectObservers() can cancel it.
    if (!document.body) {
      const root = document.documentElement;
      if (!root) {
        console.warn(`FocusTube: no document root for ${this.name} observer`);
        return null;
      }

      const bridge = new MutationObserver(() => {
        if (!document.body) return;

        bridge.disconnect();
        this.observers = this.observers.filter((o) => o !== bridge);

        // Deactivated while we were waiting - stay off.
        if (!this.isActive) return;

        this.observeDOM(callback, options);
        // Catch up on everything that rendered before <body> existed.
        try {
          callback([]);
        } catch (e) {
          console.error(`FocusTube: Error in deferred callback for ${this.name}:`, e);
        }
      });

      // Only watches for <body> appearing; feature callbacks never run against
      // <head> churn, so the observed scope in steady state is unchanged.
      bridge.observe(root, { childList: true, subtree: true });
      this.observers.push(bridge);
      return bridge;
    }

    // YouTube emits many small mutation batches per frame, and each one used to
    // cost every active feature a full querySelectorAll sweep of the document.
    // Coalescing them into one call per frame collapses that burst into a
    // single sweep.
    //
    // requestAnimationFrame, not a timer: rAF callbacks run before the browser
    // paints, so elements are still hidden in the same frame they appear in and
    // nothing flashes on screen.
    let pending = [];
    let frame = null;

    const flush = () => {
      frame = null;
      const records = pending;
      pending = [];
      // Deactivated between scheduling and this frame - stay off.
      if (!this.isActive) return;
      try {
        callback(records);
      } catch (error) {
        console.error(`FocusTube: Error in ${this.name} observer:`, error);
      }
    };

    const observer = new MutationObserver((mutations) => {
      // Records are kept, not discarded: HideAutoplayOverlayFeature reads
      // addedNodes off them to spot the countdown overlay.
      for (let i = 0; i < mutations.length; i++) {
        pending.push(mutations[i]);
      }
      // rAF is paused in background tabs, so cap the buffer rather than let a
      // tab left playing in the background grow it without bound. Newest
      // records are the ones worth keeping.
      if (pending.length > MAX_PENDING_RECORDS) {
        pending = pending.slice(-MAX_PENDING_RECORDS);
      }
      if (frame !== null) return;
      frame = requestAnimationFrame(flush);
    });

    // disconnect() stops new records but cannot cancel a frame already
    // scheduled, so expose a canceller for disconnectObservers().
    observer.__focusTubeCancel = () => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      }
      pending = [];
    };

    observer.observe(document.body, observerOptions);
    this.observers.push(observer);

    return observer;
  }

  /**
   * Disconnect all observers for this feature
   */
  disconnectObservers() {
    this.observers.forEach(observer => {
      try {
        // Drop any frame already scheduled, so a switched-off feature cannot
        // still run one more sweep on the next frame.
        if (observer.__focusTubeCancel) {
          observer.__focusTubeCancel();
        }
        observer.disconnect();
      } catch (error) {
        console.error(`FocusTube: Error disconnecting observer:`, error);
      }
    });
    this.observers = [];
  }

  /**
   * Show all elements previously hidden by this feature
   */
  showAllHiddenElements() {
    const elements = Array.from(this.targetElements.keys());
    this.showElements(elements);
  }

  /**
   * Search for text content in element including shadow DOM
   */
  elementContainsText(element, searchText, options = {}) {
    const { caseSensitive = false, includeShadowDOM = true } = options;
    const normalizedSearch = caseSensitive ? searchText : searchText.toLowerCase();

    if (!element) return false;

    // Fast path: check innerText/textContent
    try {
      const text = caseSensitive ? element.textContent : element.textContent?.toLowerCase();
      if (text?.includes(normalizedSearch)) return true;
    } catch (error) {}

    // TreeWalker for light DOM
    try {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
      let node;
      while ((node = walker.nextNode())) {
        const text = caseSensitive ? node.textContent : node.textContent?.toLowerCase();
        if (text?.includes(normalizedSearch)) return true;
      }
    } catch (error) {}

    // Search shadow DOM if requested
    if (includeShadowDOM) {
      return this.searchShadowDOM(element, normalizedSearch, caseSensitive);
    }

    return false;
  }

  /**
   * Recursively search shadow DOM for text
   */
  searchShadowDOM(rootElement, searchText, caseSensitive) {
    try {
      const allElements = rootElement.querySelectorAll('*');
      for (const el of allElements) {
        if (!el.shadowRoot) continue;

        const walker = document.createTreeWalker(el.shadowRoot, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while ((node = walker.nextNode())) {
          const text = caseSensitive ? node.textContent : node.textContent?.toLowerCase();
          if (text?.includes(searchText)) return true;
        }

        // Recurse into nested shadow roots
        const shadowChildren = el.shadowRoot.querySelectorAll('*');
        for (const child of shadowChildren) {
          if (this.searchShadowDOM(child, searchText, caseSensitive)) return true;
        }
      }
    } catch (error) {}

    return false;
  }

  /**
   * Cleanup on deactivation - override in subclasses as needed
   */
  async onDeactivate() {
    this.disconnectObservers();
    this.showAllHiddenElements();
    this.removeAllCSS();
  }
}
