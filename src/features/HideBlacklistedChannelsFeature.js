/**
 * Feature to filter videos by channel blacklist.
 * Hides videos from specified channels.
 */
class HideBlacklistedChannelsFeature extends FilterFeature {
  constructor() {
    super('hideBlacklistedChannels', {
      defaultEnabled: true
    });
  }

  async onInit() {
    console.debug('FocusTube: HideBlacklistedChannelsFeature initialized');
  }

  /**
   * Check if channel is in blacklist
   */
  matchesFilter(channelName) {
    return this.filterList.includes(channelName);
  }

  /**
   * Apply channel filters to video elements
   */
  applyFilters() {
    const videoElements = this.query('ytd-rich-item-renderer');
    
    videoElements.forEach(video => {
      const channelLink = video.querySelector(
        '.yt-content-metadata-view-model__metadata-row:first-child a'
      );
      
      if (!channelLink || !channelLink.href.includes('/@')) return;

      const channelName = channelLink.textContent.trim();
      
      if (this.matchesFilter(channelName)) {
        this.hideElements([video]);
      }
    });

    console.debug(`FocusTube: Applied channel blacklist (${this.filterList.length} channels)`);
  }

  /**
   * Legacy compatibility: Update blacklist
   */
  async updateBlacklist(newBlacklist) {
    this.updateFilterList(newBlacklist);
    await this.saveFilterList();
  }

  /**
   * Override to use legacy storage key "blacklist" for backwards compatibility
   */
  getFilterListStorageKey() {
    return 'blacklist';
  }

  /**
   * Load from legacy storage key if needed
   */
  async loadFilterList() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['blacklist', 'hideBlacklistedChannels_list'], (result) => {
        // Prefer legacy key for backwards compatibility, then new key
        this.filterList = result.blacklist || result.hideBlacklistedChannels_list || [];
        console.debug(`FocusTube: Loaded ${this.filterList.length} blacklisted channels`);
        resolve();
      });
    });
  }
}
