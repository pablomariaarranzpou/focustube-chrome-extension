/**
 * Abstract base class for DOM manipulation features.
 * Extends Feature with common DOM manipulation patterns.
 * 
 * This class provides reusable methods for hiding/showing elements,
 * query selectors, and MutationObserver management.
 */
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
    
    // Safety check for document.body
    if (!document.body) {
      console.warn(`FocusTube: document.body not ready for ${this.name} observer, waiting for DOMContentLoaded`);
      document.addEventListener('DOMContentLoaded', () => {
        this.observeDOM(callback, options);
        // Force an initial check once DOM is ready, as we missed the initial load
        try {
          callback([]); 
        } catch (e) {
          console.error(`FocusTube: Error in deferred callback for ${this.name}:`, e);
        }
      });
      return null;
    }

    const observer = new MutationObserver((mutations) => {
      try {
        callback(mutations);
      } catch (error) {
        console.error(`FocusTube: Error in ${this.name} observer:`, error);
      }
    });

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
