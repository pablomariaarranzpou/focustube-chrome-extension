/**
 * Feature to filter videos by keyword blacklist.
 * Hides videos containing specified words in their titles.
 */
class HideBlacklistedWordsFeature extends FilterFeature {
  constructor() {
    super('hideBlacklistedWords', {
      defaultEnabled: true,
      caseSensitive: false
    });
  }

  async onInit() {
    console.debug('FocusTube: HideBlacklistedWordsFeature initialized');
  }

  /**
   * Check if text contains blacklisted words
   */
  matchesFilter(text) {
    if (!text) return false;
    
    const normalizedText = this.config.caseSensitive 
      ? text 
      : text.toLowerCase();

    return this.filterList.some(word => {
      const normalizedWord = this.config.caseSensitive 
        ? word 
        : word.toLowerCase();
      return normalizedText.includes(normalizedWord);
    });
  }

  /**
   * Apply word filters to video elements
   */
  applyFilters() {
    const videoElements = this.query('ytd-rich-item-renderer');
    
    videoElements.forEach(video => {
      const titleElement = video.querySelector('h3 a span');
      
      if (!titleElement) return;

      const videoTitle = titleElement.textContent.trim();
      
      if (this.matchesFilter(videoTitle)) {
        this.hideElements([video]);
      }
    });

    console.debug(`FocusTube: Applied word blacklist (${this.filterList.length} words)`);
  }

  /**
   * Legacy compatibility: Update blacklist words
   */
  async updateBlacklistWords(newWords) {
    this.updateFilterList(newWords);
    await this.saveFilterList();
  }

  /**
   * Override to use legacy storage key "blacklistWords" for backwards compatibility
   */
  getFilterListStorageKey() {
    return 'blacklistWords';
  }

  /**
   * Load from legacy storage key if needed
   */
  async loadFilterList() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['blacklistWords', 'hideBlacklistedWords_list'], (result) => {
        // Prefer legacy key for backwards compatibility, then new key
        this.filterList = result.blacklistWords || result.hideBlacklistedWords_list || [];
        console.debug(`FocusTube: Loaded ${this.filterList.length} blacklisted words`);
        resolve();
      });
    });
  }
}
