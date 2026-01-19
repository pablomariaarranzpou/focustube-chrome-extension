/**
 * Abstract base class for filtering features.
 * Provides common functionality for blacklist-based filtering.
 */
class FilterFeature extends DOMFeature {
  constructor(name, config = {}) {
    super(name, config);
    this.filterList = [];
  }

  /**
   * Update filter list
   */
  updateFilterList(newList) {
    this.filterList = Array.isArray(newList) ? newList : [];
    
    if (this.enabled) {
      this.applyFilters();
    }
  }

  /**
   * Check if item matches any filter
   */
  matchesFilter(item) {
    throw new Error(`${this.constructor.name} must implement matchesFilter()`);
  }

  /**
   * Apply filters - must be implemented by subclasses
   */
  applyFilters() {
    throw new Error(`${this.constructor.name} must implement applyFilters()`);
  }

  /**
   * Get current filter list
   */
  getFilterList() {
    return [...this.filterList];
  }

  /**
   * Add item to filter list
   */
  addToFilter(item) {
    if (!this.filterList.includes(item)) {
      this.filterList.push(item);
      if (this.enabled) {
        this.applyFilters();
      }
    }
  }

  /**
   * Remove item from filter list
   */
  removeFromFilter(item) {
    const index = this.filterList.indexOf(item);
    if (index > -1) {
      this.filterList.splice(index, 1);
      if (this.enabled) {
        // Re-apply to potentially show previously hidden items
        this.showAllHiddenElements();
        this.applyFilters();
      }
    }
  }

  /**
   * Clear filter list
   */
  clearFilter() {
    this.filterList = [];
    if (this.enabled) {
      this.showAllHiddenElements();
    }
  }

  async onActivate() {
    await this.loadFilterList();
    this.applyFilters();
    this.observeDOM(() => this.applyFilters());
  }

  /**
   * Load filter list from storage
   */
  async loadFilterList() {
    const storageKey = `${this.name}_list`;
    
    return new Promise((resolve) => {
      chrome.storage.sync.get([storageKey], (result) => {
        this.filterList = result[storageKey] || [];
        console.debug(`FocusTube: Loaded ${this.filterList.length} items for ${this.name}`);
        resolve();
      });
    });
  }

  /**
   * Save filter list to storage
   */
  async saveFilterList() {
    const storageKey = `${this.name}_list`;
    
    return new Promise((resolve) => {
      chrome.storage.sync.set({ [storageKey]: this.filterList }, () => {
        console.debug(`FocusTube: Saved ${this.filterList.length} items for ${this.name}`);
        resolve();
      });
    });
  }

  getState() {
    return {
      ...super.getState(),
      filterList: this.filterList
    };
  }

  async setState(state) {
    await super.setState(state);
    if (state.filterList) {
      this.filterList = state.filterList;
    }
  }

  /**
   * Get storage key for the filter list.
   * Can be overridden by subclasses for legacy compatibility.
   */
  getFilterListStorageKey() {
    return `${this.name}_list`;
  }

  /**
   * Override to provide additional storage keys (filter lists)
   */
  getAdditionalStorageKeys() {
    return [this.getFilterListStorageKey()];
  }

  /**
   * Load additional data (filter lists) from storage
   */
  async loadAdditionalData(key, value) {
    if (key === this.getFilterListStorageKey()) {
      this.filterList = value || [];
      console.debug(`FocusTube: ${this.name} loaded filter list:`, this.filterList.length, 'items');
      
      // Re-apply filters if feature is enabled
      if (this.enabled) {
        this.applyFilters();
      }
    }
  }
}
