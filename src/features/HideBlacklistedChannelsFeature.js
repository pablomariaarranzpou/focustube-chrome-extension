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
    const videoElements = this.query(
      'ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ' +
      'ytd-grid-video-renderer, ytm-rich-item-renderer, ytm-video-with-context-renderer'
    );

    videoElements.forEach(video => {
      const channelName = this._extractChannelName(video);
      if (!channelName) return;
      if (this.matchesFilter(channelName)) {
        this.hideElements([video]);
      }
    });

    console.debug(`FocusTube: Applied channel blacklist (${this.filterList.length} channels)`);
  }

  /**
   * Extract the visible channel name from a video card.
   * Tries layouts in priority order to avoid matching hidden elements.
   */
  _extractChannelName(card) {
    // 1. New homepage layout (2024+): yt-lockup-view-model
    const newLayout = card.querySelector(
      '.ytContentMetadataViewModelMetadataRow a[href^="/@"], ' +
      '.ytContentMetadataViewModelMetadataRow a[href*="/channel/"]'
    );
    if (newLayout) return newLayout.textContent.trim();

    // 2. Search results: visible channel is in #channel-info .long-byline.
    //    The one in ytd-video-meta-block #byline-container has hidden="" — skip it.
    const searchResult = card.querySelector(
      '#channel-info ytd-channel-name.long-byline a[href^="/@"], ' +
      '#channel-info ytd-channel-name.long-byline a[href*="/channel/"]'
    );
    if (searchResult) return searchResult.textContent.trim();

    // 3. Generic fallback for other layouts
    const fallback = card.querySelector(
      '#channel-name a[href^="/@"], #channel-name a[href*="/channel/"]'
    );
    return fallback ? fallback.textContent.trim() : null;
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
