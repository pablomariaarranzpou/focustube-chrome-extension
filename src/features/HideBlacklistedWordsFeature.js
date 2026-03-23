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
   * Apply word filters to video elements.
   * Checks the entire video element's text content to avoid
   * fragile title selectors that break across YouTube layout variants.
   */
  applyFilters() {
    if (this.filterList.length === 0) return;

    const videoElements = this.query([
      // Desktop
      'ytd-rich-item-renderer',
      'ytd-video-renderer',
      'ytd-compact-video-renderer',
      'ytd-grid-video-renderer',
      'ytd-playlist-video-renderer',
      // Mobile / Tablet
      'ytm-rich-item-renderer',
      'ytm-video-with-context-renderer',
      'ytm-compact-video-renderer',
    ].join(', '));

    videoElements.forEach(video => {
      if (this.matchesFilter(video.textContent)) {
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
