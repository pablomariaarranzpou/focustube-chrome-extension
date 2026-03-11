/**
 * UI Controller for popup interface.
 * Manages the interaction between UI elements and feature states.
 * Uses MVC pattern for clean separation of concerns.
 */
class PopupController {
  constructor(messageBus, storageAdapter) {
    this.messageBus = messageBus;
    this.storage = storageAdapter;
    this.featureStates = {};
    this.initialized = false;
  }

  /**
   * Initialize the controller
   */
  async initialize() {
    if (this.initialized) return;

    console.debug('FocusTube: Initializing PopupController');

    // Set up UI localization
    this.localizeUI();

    // Load feature states
    await this.loadStates();

    // Set up event listeners
    this.setupEventListeners();

    // Set up storage change monitoring
    this.setupStorageMonitoring();

    // Track popup opens and show rate-us prompt
    await this.initRateUsCounter();

    this.initialized = true;
    console.debug('FocusTube: PopupController initialized');
  }

  /**
   * Localize UI strings
   */
  localizeUI() {
    // Localize all elements with i18n class
    const elements = document.querySelectorAll('.i18n');
    elements.forEach(el => {
      const messageName = el.getAttribute('data-message');
      if (messageName) {
        el.textContent = chrome.i18n.getMessage(messageName);
      }
    });

    // Localize input placeholders
    const blacklistInput = document.getElementById('blacklistInput');
    if (blacklistInput) {
      blacklistInput.placeholder = chrome.i18n.getMessage('channelNamePlaceholder') || 'Channel name';
    }

    const blacklistWordsInput = document.getElementById('blacklistWordsInput');
    if (blacklistWordsInput) {
      blacklistWordsInput.placeholder = chrome.i18n.getMessage('wordPlaceholder') || 'Word';
    }

    // Set document title
    document.title = chrome.i18n.getMessage('extensionName') || 'FocusTube';
  }

  /**
   * Load feature states from storage
   */
  async loadStates() {
    try {
      const result = await this.storage.get(['focustube_features']);
      const savedStates = result.focustube_features || {};

      // Also load legacy keys for backwards compatibility
      const legacyResult = await this.storage.get([
        'hideShorts',
        'hideSuggestions',
        'hideComments',
        'hideBlacklistedChannels',
        'hideBlacklistedWords',
        'hideHomePageContent',
        'hideAutoplayOverlay',
        'hideSidebar',
        'blacklist',
        'blacklistWords'
      ]);

      // Merge states, preferring new format
      this.featureStates = this.mergeStates(savedStates, legacyResult);
      
      // Update UI
      this.updateUI();

      console.debug('FocusTube: Loaded states:', this.featureStates);
    } catch (error) {
      console.error('FocusTube: Error loading states:', error);
    }
  }

  /**
   * Merge new and legacy state formats
   */
  mergeStates(newStates, legacyStates) {
    const merged = {};

    // Feature toggles
    const featureMap = {
      hideShorts: 'hideShorts',
      hideSuggestions: 'hideSuggestions',
      hideComments: 'hideComments',
      hideBlacklistedChannels: 'hideBlacklistedChannels',
      hideBlacklistedWords: 'hideBlacklistedWords',
      hideHomePageContent: 'hideHomePageContent',
      hideAutoplayOverlay: 'hideAutoplayOverlay',
      hideSidebar: 'hideSidebar'
    };

    Object.entries(featureMap).forEach(([legacyKey, featureName]) => {
      if (newStates[featureName]) {
        merged[featureName] = newStates[featureName].enabled;
      } else if (legacyStates[legacyKey] !== undefined) {
        merged[featureName] = legacyStates[legacyKey];
      } else {
        // Default values
        const defaults = {
          hideShorts: true,
          hideSuggestions: true,
          hideComments: false,
          hideBlacklistedChannels: true,
          hideBlacklistedWords: true,
          hideHomePageContent: false,
          hideAutoplayOverlay: false,
          hideSidebar: false
        };
        merged[featureName] = defaults[featureName];
      }
    });

    // keepHistoryVisible is stored as config on the hideSidebar feature (new format)
    if (newStates.hideSidebar && newStates.hideSidebar.config) {
      merged.keepHistoryVisible = newStates.hideSidebar.config.keepHistoryVisible ?? false;
    } else {
      merged.keepHistoryVisible = false;
    }

    // Filter lists
    merged.blacklist = legacyStates.blacklist || [];
    merged.blacklistWords = legacyStates.blacklistWords || [];

    return merged;
  }

  /**
   * Update UI based on current states
   */
  updateUI() {
    // Update checkboxes
    const checkboxMap = {
      hideShortsCheckbox: 'hideShorts',
      hideSuggestionsCheckbox: 'hideSuggestions',
      hideCommentsCheckbox: 'hideComments',
      hideBlacklistedCheckbox: 'hideBlacklistedChannels',
      hideBlacklistedWordsCheckbox: 'hideBlacklistedWords',
      hideHomePageContentCheckbox: 'hideHomePageContent',
      hideAutoplayOverlayCheckbox: 'hideAutoplayOverlay',
      hideSidebarCheckbox: 'hideSidebar',
      keepHistoryVisibleCheckbox: 'keepHistoryVisible'
    };

    Object.entries(checkboxMap).forEach(([checkboxId, featureName]) => {
      const checkbox = document.getElementById(checkboxId);
      if (checkbox) {
        checkbox.checked = this.featureStates[featureName] ?? false;
      }
    });

    // Show/hide sidebar sub-options based on current state
    this.updateSidebarSubOptions(this.featureStates.hideSidebar ?? false);

    // Update blacklists
    this.updateBlacklistUI(this.featureStates.blacklist || []);
    this.updateBlacklistWordsUI(this.featureStates.blacklistWords || []);
  }

  /**
   * Show or hide the sidebar sub-options div
   */
  updateSidebarSubOptions(sidebarEnabled) {
    const subOptions = document.getElementById('sidebarSubOptions');
    if (subOptions) {
      subOptions.style.display = sidebarEnabled ? 'block' : 'none';
    }
  }

  /**
   * Set up event listeners for UI interactions
   */
  setupEventListeners() {
    // Toggle buttons for collapsible sections
    const toggleBlacklistButton = document.getElementById('toggleBlacklistButton');
    if (toggleBlacklistButton) {
      toggleBlacklistButton.addEventListener('click', () => {
        this.toggleVisibility('blacklistContainer');
      });
    }

    const toggleBlacklistWordsButton = document.getElementById('toggleBlacklistWordsButton');
    if (toggleBlacklistWordsButton) {
      toggleBlacklistWordsButton.addEventListener('click', () => {
        this.toggleVisibility('wordsBlacklistContainer');
      });
    }

    // Add to blacklist buttons
    const blacklistButton = document.getElementById('blacklistButton');
    if (blacklistButton) {
      blacklistButton.addEventListener('click', () => this.handleAddToBlacklist());
    }

    const blacklistWordsButton = document.getElementById('blacklistButtonWords');
    if (blacklistWordsButton) {
      blacklistWordsButton.addEventListener('click', () => this.handleAddToBlacklistWords());
    }

    // Checkbox listeners
    const checkboxMap = {
      hideShortsCheckbox: 'hideShorts',
      hideSuggestionsCheckbox: 'hideSuggestions',
      hideCommentsCheckbox: 'hideComments',
      hideBlacklistedCheckbox: 'hideBlacklistedChannels',
      hideBlacklistedWordsCheckbox: 'hideBlacklistedWords',
      hideHomePageContentCheckbox: 'hideHomePageContent',
      hideAutoplayOverlayCheckbox: 'hideAutoplayOverlay',
      hideSidebarCheckbox: 'hideSidebar'
    };

    Object.entries(checkboxMap).forEach(([checkboxId, featureName]) => {
      const checkbox = document.getElementById(checkboxId);
      if (checkbox) {
        checkbox.addEventListener('change', () => {
          this.handleFeatureToggle(featureName, checkbox.checked);
        });
      }
    });

    // Show/hide sidebar sub-options when hideSidebar is toggled
    const hideSidebarCheckbox = document.getElementById('hideSidebarCheckbox');
    if (hideSidebarCheckbox) {
      hideSidebarCheckbox.addEventListener('change', () => {
        this.updateSidebarSubOptions(hideSidebarCheckbox.checked);
      });
    }

    // keepHistoryVisible sub-option: sends updateConfig to hideSidebar feature
    const keepHistoryVisibleCheckbox = document.getElementById('keepHistoryVisibleCheckbox');
    if (keepHistoryVisibleCheckbox) {
      keepHistoryVisibleCheckbox.addEventListener('change', () => {
        this.handleKeepHistoryVisible(keepHistoryVisibleCheckbox.checked);
      });
    }

    // Hide collapsible sections initially
    const blacklistContainer = document.getElementById('blacklistContainer');
    const wordsBlacklistContainer = document.getElementById('wordsBlacklistContainer');
    if (blacklistContainer) blacklistContainer.style.display = 'none';
    if (wordsBlacklistContainer) wordsBlacklistContainer.style.display = 'none';
  }

  /**
   * Handle keepHistoryVisible toggle - updates hideSidebar feature config
   */
  async handleKeepHistoryVisible(enabled) {
    this.featureStates.keepHistoryVisible = enabled;

    try {
      await this.sendToActiveTab({
        type: 'updateConfig',
        featureName: 'hideSidebar',
        config: { keepHistoryVisible: enabled }
      });
    } catch (error) {
      console.error('FocusTube: Error updating keepHistoryVisible:', error);
    }
  }

  /**
   * Toggle visibility of an element
   */
  toggleVisibility(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.style.display = element.style.display === 'none' ? 'block' : 'none';
    }
  }

  /**
   * Handle feature toggle
   */
  async handleFeatureToggle(featureName, enabled) {
    console.debug(`FocusTube: Toggle ${featureName} = ${enabled}`);

    // Update local state
    this.featureStates[featureName] = enabled;

    // Save to storage (legacy format for compatibility)
    try {
      await this.storage.set({ [featureName]: enabled });
      console.debug(`FocusTube: Saved ${featureName} = ${enabled} to storage`);
    } catch (error) {
      console.error(`FocusTube: Error saving ${featureName}:`, error);
    }

    // Send message to content script
    try {
      await this.sendToActiveTab({
        type: 'toggleFeature',
        featureName: featureName,
        state: enabled
      });
    } catch (error) {
      console.error(`FocusTube: Error toggling ${featureName}:`, error);
    }
  }

  /**
   * Handle adding channel to blacklist
   */
  async handleAddToBlacklist() {
    const input = document.getElementById('blacklistInput');
    if (!input) return;

    const channelName = input.value.trim();
    if (!channelName) return;

    // Add to blacklist
    const blacklist = this.featureStates.blacklist || [];
    if (!blacklist.includes(channelName)) {
      blacklist.push(channelName);
      this.featureStates.blacklist = blacklist;

      // Save to storage
      await this.storage.set({ blacklist });

      // Update UI
      this.updateBlacklistUI(blacklist);

      // Notify content script
      await this.sendToActiveTab({
        type: 'updateConfig',
        featureName: 'hideBlacklistedChannels',
        config: { filterList: blacklist }
      });
    }

    input.value = '';
  }

  /**
   * Handle adding word to blacklist
   */
  async handleAddToBlacklistWords() {
    const input = document.getElementById('blacklistWordsInput');
    if (!input) return;

    const word = input.value.trim();
    if (!word) return;

    // Add to blacklist
    const blacklistWords = this.featureStates.blacklistWords || [];
    if (!blacklistWords.includes(word)) {
      blacklistWords.push(word);
      this.featureStates.blacklistWords = blacklistWords;

      // Save to storage
      await this.storage.set({ blacklistWords });

      // Update UI
      this.updateBlacklistWordsUI(blacklistWords);

      // Notify content script
      await this.sendToActiveTab({
        type: 'updateConfig',
        featureName: 'hideBlacklistedWords',
        config: { filterList: blacklistWords }
      });
    }

    input.value = '';
  }

  /**
   * Update blacklist UI
   */
  updateBlacklistUI(blacklist) {
    const listElement = document.getElementById('blacklistList');
    if (!listElement) return;

    listElement.innerHTML = '';
    blacklist.forEach(channelName => {
      const item = this.createBlacklistItem(channelName);
      listElement.appendChild(item);
    });
  }

  /**
   * Update blacklist words UI
   */
  updateBlacklistWordsUI(blacklistWords) {
    const listElement = document.getElementById('blacklistListWords');
    if (!listElement) return;

    listElement.innerHTML = '';
    blacklistWords.forEach(word => {
      const item = this.createBlacklistWordsItem(word);
      listElement.appendChild(item);
    });
  }

  /**
   * Create blacklist item element
   */
  createBlacklistItem(channelName) {
    const div = document.createElement('div');
    div.className = 'blacklist-item';
    div.innerHTML = `
      <div class="channel-id">${this.escapeHtml(channelName)}</div>
      <button class="remove-button">Remove</button>
    `;

    const removeButton = div.querySelector('.remove-button');
    removeButton.addEventListener('click', async () => {
      await this.removeFromBlacklist(channelName);
    });

    return div;
  }

  /**
   * Create blacklist words item element
   */
  createBlacklistWordsItem(word) {
    const div = document.createElement('div');
    div.className = 'blacklist-item';
    div.innerHTML = `
      <div class="word">${this.escapeHtml(word)}</div>
      <button class="remove-button">Remove</button>
    `;

    const removeButton = div.querySelector('.remove-button');
    removeButton.addEventListener('click', async () => {
      await this.removeFromBlacklistWords(word);
    });

    return div;
  }

  /**
   * Remove channel from blacklist
   */
  async removeFromBlacklist(channelName) {
    const blacklist = this.featureStates.blacklist || [];
    const updated = blacklist.filter(name => name !== channelName);
    this.featureStates.blacklist = updated;

    await this.storage.set({ blacklist: updated });
    this.updateBlacklistUI(updated);

    await this.sendToActiveTab({
      type: 'updateConfig',
      featureName: 'hideBlacklistedChannels',
      config: { filterList: updated }
    });
  }

  /**
   * Remove word from blacklist
   */
  async removeFromBlacklistWords(word) {
    const blacklistWords = this.featureStates.blacklistWords || [];
    const updated = blacklistWords.filter(w => w !== word);
    this.featureStates.blacklistWords = updated;

    await this.storage.set({ blacklistWords: updated });
    this.updateBlacklistWordsUI(updated);

    await this.sendToActiveTab({
      type: 'updateConfig',
      featureName: 'hideBlacklistedWords',
      config: { filterList: updated }
    });
  }

  /**
   * Set up storage change monitoring
   */
  setupStorageMonitoring() {
    this.storage.onChange((changes) => {
      // Update UI when storage changes (e.g., from another instance)
      if (changes.blacklist) {
        this.featureStates.blacklist = changes.blacklist.newValue;
        this.updateBlacklistUI(changes.blacklist.newValue);
      }
      if (changes.blacklistWords) {
        this.featureStates.blacklistWords = changes.blacklistWords.newValue;
        this.updateBlacklistWordsUI(changes.blacklistWords.newValue);
      }
    });
  }

  /**
   * Send message to active tab
   */
  async sendToActiveTab(message) {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length === 0) {
          reject(new Error('No active tab'));
          return;
        }

        chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
          if (chrome.runtime.lastError) {
            console.warn('FocusTube: Message error (tab may not have content script):', chrome.runtime.lastError);
            resolve({ success: false });
          } else {
            resolve(response);
          }
        });
      });
    });
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ---------------------------------------------------------------------------
  // Rate Us – Exposure counter
  // ---------------------------------------------------------------------------
  /**
   * Manages the "Rate us" prompt:
   *  - increments popupOpenCount on every open
   *  - shows a full card when count reaches RATE_US_THRESHOLD
   *  - after the user acts (rated / later), switches to a subtle always-visible pill
   */
  async initRateUsCounter() {
    const STORE_REVIEW_URL =
      'https://chromewebstore.google.com/detail/focustube/bolmmhkapeekgcjopdmnbmnhgaapbpdb/reviews';
    // Show modal on these open-counts (3 chances total)
    const SHOW_AT = [3, 5, 10];
    const MAX_SHOWN = SHOW_AT.length; // 3

    const overlay  = document.getElementById('rateUsOverlay');
    const link     = document.getElementById('rateUsPillLink');
    const rateBtn  = document.getElementById('rateNowBtn');
    const laterBtn = document.getElementById('rateLaterBtn');
    const closeBtn = document.getElementById('rateCloseBtn');

    if (!overlay) return;
    if (link) link.href = STORE_REVIEW_URL;

    // Use chrome.storage.local directly – no quota limits, synchronous-ish reads
    const local = chrome.storage.local;

    const read = () => new Promise(resolve =>
      local.get(['ft_opens', 'ft_shown', 'ft_state'], r => resolve(r || {}))
    );
    const write = items => new Promise(resolve =>
      local.set(items, resolve)
    );

    let data = await read();

    const state = data.ft_state || 'pending'; // 'pending' | 'rated' | 'never'
    const shown = data.ft_shown || 0;
    const opens = (data.ft_opens || 0) + 1;

    // Persist incremented opens count first
    await write({ ft_opens: opens });

    // Already resolved → nothing extra to do
    if (state === 'rated' || state === 'never') {
      return;
    }

    // Show modal if this open-count is in our list AND we haven't exhausted chances
    if (shown >= MAX_SHOWN || !SHOW_AT.includes(opens)) return;

    // ── Show blocking modal ──
    overlay.style.display = 'flex';

    const dismiss = async () => {
      overlay.style.display = 'none';
      const newShown = shown + 1;
      await write({ ft_shown: newShown });
      if (newShown >= MAX_SHOWN) {
        await write({ ft_state: 'never' });
      }
    };

    if (rateBtn) {
      rateBtn.addEventListener('click', async () => {
        window.open(STORE_REVIEW_URL, '_blank');
        overlay.style.display = 'none';
        await write({ ft_state: 'rated', ft_shown: shown + 1 });
      });
    }

    if (laterBtn) laterBtn.addEventListener('click', dismiss);
    if (closeBtn)  closeBtn.addEventListener('click', dismiss);
  }

  /** Persist the rate-us state */
  async _saveRateState(state) {
    chrome.storage.local.set({ ft_state: state });
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  const storage = new StorageAdapter();
  const messageBus = new MessageBus();
  const controller = new PopupController(messageBus, storage);
  
  await controller.initialize();
  
  // Make available for debugging
  window.__focusTubePopup = controller;
});
