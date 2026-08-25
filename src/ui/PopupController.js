/**
 * Day-of-week message keys, indexed by JS Date.getDay() (0=Sun..6=Sat).
 */
const FOCUS_DAY_KEYS = ['daySun', 'dayMon', 'dayTue', 'dayWed', 'dayThu', 'dayFri', 'daySat'];

/**
 * Endonym for every locale the popup can be manually switched to - each
 * language's own name for itself, not its English name, same convention
 * the website's own language switcher already uses (and the same list:
 * copied from docs/i18n/content.json's "name" field, not re-typed by hand).
 * Chrome's two extra English variants (en_AU, en_GB) aren't included - they
 * have no distinct translation to switch to, "English" already covers them.
 */
const LANGUAGE_NAMES = {
  en: 'English', es: 'Español', es_419: 'Español (Latinoamérica)',
  fr: 'Français', de: 'Deutsch', it: 'Italiano', pt_PT: 'Português (Portugal)',
  pt_BR: 'Português (Brasil)', nl: 'Nederlands', ca: 'Català', ro: 'Română',
  pl: 'Polski', cs: 'Čeština', sk: 'Slovenčina', sl: 'Slovenščina',
  hr: 'Hrvatski', sr: 'Српски', ru: 'Русский', el: 'Ελληνικά', tr: 'Türkçe',
  hu: 'Magyar', et: 'Eesti', lv: 'Latviešu', lt: 'Lietuvių', sv: 'Svenska',
  no: 'Norsk', da: 'Dansk', id: 'Bahasa Indonesia', ms: 'Bahasa Melayu',
  fil: 'Filipino', ja: '日本語', ko: '한국어', he: 'עברית', ar: 'العربية',
  fa: 'فارسی', hi: 'हिन्दी', gu: 'ગુજરાતી', mr: 'मराठी', kn: 'ಕನ್ನಡ',
  ta: 'தமிழ்', te: 'తెలుగు', sw: 'Kiswahili', am: 'አማርኛ',
};

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

    // Focus Mode state
    this.recurringSchedule = [];
    this.selectedDays = new Set();
    this.countdownInterval = null;
    this.focusSession = null; // current session snapshot from the background, or null

    // Set once loadLanguageOverride() resolves, before anything renders. Null
    // means "no manual override" - every getMsg() call falls through to
    // chrome.i18n.getMessage() exactly as before this feature existed.
    this.overrideMessages = null;
  }

  /**
   * Initialize the controller
   */
  async initialize() {
    if (this.initialized) return;

    console.debug('FocusTube: Initializing PopupController');

    // Must resolve before anything below reads a string, or the popup would
    // render once in the wrong language and then flash to the override.
    await this.loadLanguageOverride();

    // Set up UI localization
    this.localizeUI();

    this.setupLanguageSelector();

    // Tabs: Settings / Focus Mode
    this.setupTabs();

    // Load feature states
    await this.loadStates();

    // Set up event listeners
    this.setupEventListeners();

    // Set up storage change monitoring
    this.setupStorageMonitoring();

    // Focus Mode: duration/schedule UI + live session state
    await this.initFocusMode();

    // Track popup opens and show rate-us prompt
    await this.initRateUsCounter();

    this.initialized = true;
    console.debug('FocusTube: PopupController initialized');
  }

  /**
   * Load a manually-chosen language override, if the user has set one via
   * the language picker (see setupLanguageSelector()). Leaves
   * this.overrideMessages null on no override, or on any failure - a
   * broken fetch must never leave the popup without text, so this always
   * falls back to Chrome's own auto-detected language rather than throwing.
   */
  async loadLanguageOverride() {
    try {
      const result = await this.storage.get(['ft_lang_override']);
      const code = result.ft_lang_override;
      if (!code) {
        this.overrideMessages = null;
        this._overrideCode = null;
        return;
      }
      const response = await fetch(chrome.runtime.getURL(`_locales/${code}/messages.json`));
      this.overrideMessages = await response.json();
      this._overrideCode = code;
    } catch (error) {
      console.debug('FocusTube: Language override failed to load, using Chrome default', error);
      this.overrideMessages = null;
      this._overrideCode = null;
    }
  }

  /**
   * Every string in the popup should go through here rather than calling
   * chrome.i18n.getMessage() directly, so a manual override (if any) takes
   * precedence. With no override set this returns exactly what
   * chrome.i18n.getMessage() would - nobody who never touches the language
   * picker sees any change in behavior.
   */
  getMsg(key) {
    const overridden = this.overrideMessages && this.overrideMessages[key];
    return (overridden && overridden.message) || chrome.i18n.getMessage(key);
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
        el.textContent = this.getMsg(messageName);
      }
    });

    // Localize input placeholders
    const blacklistInput = document.getElementById('blacklistInput');
    if (blacklistInput) {
      blacklistInput.placeholder = this.getMsg('channelNamePlaceholder') || 'Channel name';
    }

    const blacklistWordsInput = document.getElementById('blacklistWordsInput');
    if (blacklistWordsInput) {
      blacklistWordsInput.placeholder = this.getMsg('wordPlaceholder') || 'Word';
    }

    // Set document title
    document.title = this.getMsg('extensionName') || 'FocusTube';

    this.localizeHelpLink();
  }

  /**
   * Point the Help link at the support page in whatever language this popup
   * is actually showing - the manual override if one is set, otherwise
   * whatever language Chrome is already rendering it in. getUILanguage()
   * returns the same locale chrome.i18n resolves for everything else, so
   * with no override this always matches what the user is reading.
   * Keys are the site's own folder names (docs/generate.js FOLDERS) - the
   * two English regional variants and any locale the site hasn't got its
   * own folder for fall back to the English root.
   */
  localizeHelpLink() {
    const helpLink = document.getElementById('helpLink');
    if (!helpLink) return;

    const SITE_FOLDER = {
      am: 'am', ar: 'ar', ca: 'ca', cs: 'cs', da: 'da', de: 'de', el: 'el',
      es: 'es', 'es-419': 'es-419', et: 'et', fa: 'fa', fil: 'fil', fr: 'fr',
      gu: 'gu', he: 'he', hi: 'hi', hr: 'hr', hu: 'hu', id: 'id', it: 'it',
      ja: 'ja', kn: 'kn', ko: 'ko', lt: 'lt', lv: 'lv', mr: 'mr', ms: 'ms',
      nl: 'nl', no: 'no', pl: 'pl', 'pt-br': 'pt-br', 'pt-pt': 'pt-pt',
      ro: 'ro', ru: 'ru', sk: 'sk', sl: 'sl', sr: 'sr', sv: 'sv', sw: 'sw',
      ta: 'ta', te: 'te', tr: 'tr',
    };

    // With a manual override, use that locale directly - it's already an
    // exact _locales/ folder name, unlike getUILanguage()'s browser-reported
    // tag, so no base-language fallback is needed here.
    const overrideCode = this.overrideMessages ? this._overrideCode : null;

    // getUILanguage() reports the browser's actual locale, which is often
    // more specific than anything in _locales/ - a browser set to Mexican
    // or Argentinian Spanish reports "es-MX" / "es-AR", not "es". Chrome's
    // own chrome.i18n.getMessage() falls back to the base language in that
    // case (which is why the popup's own text was already correctly in
    // Spanish); an exact-only lookup here missed that and fell through to
    // English every time, even though everything else on screen was right.
    const uiLang = (overrideCode || chrome.i18n.getUILanguage() || '').toLowerCase();
    const base = uiLang.split('-')[0];
    const folder = SITE_FOLDER[uiLang] || SITE_FOLDER[base];
    helpLink.href = folder
      ? `https://focustube.io/${folder}/support/`
      : 'https://focustube.io/support/';
  }

  /**
   * Populate and wire the manual language picker. "Auto" (empty value)
   * clears the override and falls back to Chrome's own detected language;
   * anything else stores the chosen locale and reloads the popup so every
   * string - including ones rendered by code this method has no reach into
   * (blacklist items, schedule blocks, mode descriptions) - re-renders from
   * a clean, consistent state rather than being patched in place one at a
   * time and risking something being missed.
   */
  setupLanguageSelector() {
    const select = document.getElementById('langOverrideSelect');
    if (!select) return;

    const autoOption = document.createElement('option');
    autoOption.value = '';
    autoOption.textContent = 'Auto';
    select.appendChild(autoOption);

    Object.entries(LANGUAGE_NAMES).forEach(([code, name]) => {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = name;
      select.appendChild(option);
    });

    this.storage.get(['ft_lang_override']).then(result => {
      select.value = result.ft_lang_override || '';
    });

    select.addEventListener('change', async () => {
      const code = select.value;
      if (code) {
        await this.storage.set({ ft_lang_override: code });
      } else {
        await this.storage.remove(['ft_lang_override']);
      }
      window.location.reload();
    });
  }

  /**
   * Wire up the Settings / Focus Mode tab switcher
   */
  setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        document.querySelectorAll('.tab-button').forEach(b => b.classList.toggle('active', b === btn));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.id === target));
      });
    });
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
        'quickBlacklistButton',
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
      hideHomePageContent: 'minimalistHome',
      hideAutoplayOverlay: 'hideAutoplayOverlay',
      hideSidebar: 'hideSidebar',
      quickBlacklistButton: 'quickBlacklistButton'
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
          minimalistHome: false,
          hideAutoplayOverlay: false,
          hideSidebar: false,
          quickBlacklistButton: true
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
      minimalistHomeCheckbox: 'minimalistHome',
      hideAutoplayOverlayCheckbox: 'hideAutoplayOverlay',
      hideSidebarCheckbox: 'hideSidebar',
      keepHistoryVisibleCheckbox: 'keepHistoryVisible',
      quickBlacklistButtonCheckbox: 'quickBlacklistButton'
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
      minimalistHomeCheckbox: 'minimalistHome',
      hideAutoplayOverlayCheckbox: 'hideAutoplayOverlay',
      hideSidebarCheckbox: 'hideSidebar',
      quickBlacklistButtonCheckbox: 'quickBlacklistButton'
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
      <button class="remove-button"></button>
    `;

    const removeButton = div.querySelector('.remove-button');
    removeButton.textContent = this.getMsg('removeButton');
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
      <button class="remove-button"></button>
    `;

    const removeButton = div.querySelector('.remove-button');
    removeButton.textContent = this.getMsg('removeButton');
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
  // Focus Mode – session timer + recurring schedule
  // ---------------------------------------------------------------------------

  async initFocusMode() {
    try {
      const configResult = await this.storage.get(['focustube_focus_config']);
      const config = configResult.focustube_focus_config || { focusDurationMin: 25, breakDurationMin: 5 };

      const focusInput = document.getElementById('focusDurationInput');
      const breakInput = document.getElementById('breakDurationInput');
      if (focusInput) focusInput.value = config.focusDurationMin;
      if (breakInput) breakInput.value = config.breakDurationMin;

      const scheduleResult = await this.storage.get(['focustube_recurring_schedule']);
      this.recurringSchedule = scheduleResult.focustube_recurring_schedule || [];
      this.updateScheduleUI();

      this.setupFocusModeEventListeners();

      // Ask the background service worker for the live state - never
      // sendToActiveTab, since Focus Mode must work with no YouTube tab open.
      // Use the recomputed `computed` snapshot (timestamp-validated) rather than
      // the raw stored session, which may be momentarily stale right at expiry.
      const state = await this.sendToBackground({ type: 'getFocusModeState' });
      if (state && state.success) {
        this.handleFocusModeStateChanged(state.computed || { mode: 'off', forced: false });
      }

      // Live-update if a phase transition fires while the popup happens to be open
      this.messageBus.subscribe('focusModeStateChanged', ({ message }) => {
        this.handleFocusModeStateChanged(message);
      });
    } catch (error) {
      console.error('FocusTube: Error initializing Focus Mode UI:', error);
    }
  }

  setupFocusModeEventListeners() {
    // Mode selector: exactly one of off/always/timer/schedule is active at a
    // time. Clicking a button switches the background's single source of
    // truth - never something the popup can leave in an ambiguous state.
    document.querySelectorAll('#modeSelector .mode-button').forEach(button => {
      button.addEventListener('click', () => this.setFocusMode(button.dataset.mode));
    });

    const startButton = document.getElementById('startFocusSessionButton');
    if (startButton) startButton.addEventListener('click', () => this.startFocusSession());

    const stopButton = document.getElementById('stopFocusSessionButton');
    if (stopButton) stopButton.addEventListener('click', () => this.stopFocusSession());

    document.querySelectorAll('#dayChips .day-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const day = Number(chip.dataset.day);
        if (this.selectedDays.has(day)) {
          this.selectedDays.delete(day);
          chip.classList.remove('selected');
        } else {
          this.selectedDays.add(day);
          chip.classList.add('selected');
        }
      });
    });

    const addScheduleButton = document.getElementById('addScheduleButton');
    if (addScheduleButton) addScheduleButton.addEventListener('click', () => this.addScheduleBlock());
  }

  async setFocusMode(mode) {
    // Timer/Schedule can fire an end-of-session alert, which needs the
    // (optional) notifications permission. Ask for it here, inside the click
    // gesture, before any await - it's a no-op if already granted.
    if (mode === 'timer' || mode === 'schedule') this.requestNotificationsPermission();
    const response = await this.sendToBackground({ type: 'setFocusMode', mode });
    if (response && response.success) {
      this.updateModeSelectorUI(mode);
    }
  }

  /**
   * Requests the optional `notifications` permission. It is kept out of the
   * install-time permission list so publishing updates never disables the
   * extension for existing users; instead it is requested on demand the first
   * time the user starts a timed/scheduled focus session. Sessions still work
   * without it - the user just won't get the OS alert when one ends.
   */
  requestNotificationsPermission() {
    try {
      if (chrome.permissions && chrome.permissions.request) {
        chrome.permissions.request(
          { permissions: ['notifications'] },
          () => void chrome.runtime.lastError
        );
      }
    } catch (error) {
      /* not supported / dismissed - notifications just stay off */
    }
  }

  /**
   * Shows the selected mode's button as active and its content panel,
   * hiding the other three - only one mode's controls are ever visible.
   */
  updateModeSelectorUI(mode) {
    document.querySelectorAll('#modeSelector .mode-button').forEach(button => {
      button.classList.toggle('active', button.dataset.mode === mode);
    });
    ['off', 'always', 'timer', 'schedule'].forEach(m => {
      const panel = document.getElementById(`modeContent${m.charAt(0).toUpperCase()}${m.slice(1)}`);
      if (panel) panel.classList.toggle('active', m === mode);
    });
  }

  /**
   * Send a message directly to the background service worker. Unlike
   * sendToActiveTab(), this does not require any YouTube tab to be open.
   */
  async sendToBackground(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('FocusTube: Background message error:', chrome.runtime.lastError);
          resolve({ success: false });
        } else {
          resolve(response);
        }
      });
    });
  }

  async startFocusSession() {
    // Inside the click gesture: ask for the optional notifications permission
    // so we can alert the user when the session ends (no-op if already granted).
    this.requestNotificationsPermission();

    const focusInput = document.getElementById('focusDurationInput');
    const breakInput = document.getElementById('breakDurationInput');

    const focusDurationMin = Math.max(1, Number(focusInput?.value) || 25);
    const breakDurationMin = Math.max(0, Number(breakInput?.value) || 0);

    const response = await this.sendToBackground({
      type: 'startFocusSession',
      focusDurationMin,
      breakDurationMin
    });

    if (response && response.success) {
      this.focusSession = response.session;
      this.renderFocusSessionUI();
      this.updateModeSelectorUI('timer'); // starting a session IS choosing Timer mode
    }
  }

  async stopFocusSession() {
    const response = await this.sendToBackground({ type: 'stopFocusSession' });
    if (response && response.success) {
      this.focusSession = null;
      this.renderFocusSessionUI();
    }
  }

  /**
   * Handle a live 'focusModeStateChanged' broadcast from the background
   * (e.g. a phase transition firing, or a mode switch from elsewhere while
   * the popup happens to be open). Keeps the mode selector and the session
   * countdown in sync with whichever single mode is currently active.
   */
  handleFocusModeStateChanged(snapshot) {
    this.focusSession = snapshot.sessionEndsAt
      ? { active: true, phase: snapshot.sessionPhase, endsAt: snapshot.sessionEndsAt }
      : null;
    this.renderFocusSessionUI();

    if (snapshot.mode) {
      this.updateModeSelectorUI(snapshot.mode);
    }
  }

  /**
   * Show idle vs. running controls and (re)start the client-side countdown tick.
   * The countdown is always computed from the absolute endsAt timestamp, never
   * from counting ticks, so it stays accurate regardless of popup open/close.
   */
  renderFocusSessionUI() {
    const idleControls = document.getElementById('focusIdleControls');
    const runningControls = document.getElementById('focusRunningControls');
    const phaseLabel = document.getElementById('focusPhaseLabel');

    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }

    const running = !!(this.focusSession && this.focusSession.active);
    if (idleControls) idleControls.style.display = running ? 'none' : 'block';
    if (runningControls) runningControls.style.display = running ? 'block' : 'none';

    if (!running) return;

    if (phaseLabel) {
      const key = this.focusSession.phase === 'break' ? 'breakPhaseLabel' : 'focusPhaseLabel';
      phaseLabel.textContent = this.getMsg(key);
    }

    this.tickCountdown();
    this.countdownInterval = setInterval(() => this.tickCountdown(), 1000);
  }

  tickCountdown() {
    const countdownEl = document.getElementById('focusSessionCountdown');
    if (!countdownEl || !this.focusSession) return;

    const remainingMs = this.focusSession.endsAt - Date.now();
    const remainingSec = Math.max(0, Math.round(remainingMs / 1000));
    const minutes = Math.floor(remainingSec / 60);
    const seconds = remainingSec % 60;
    countdownEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  /**
   * Add a recurring schedule block. Writes straight to chrome.storage.sync
   * (same pattern as blacklist/blacklistWords) - the background service
   * worker reacts to the storage change itself, no dedicated message needed.
   */
  async addScheduleBlock() {
    const startInput = document.getElementById('scheduleStartInput');
    const endInput = document.getElementById('scheduleEndInput');
    if (!startInput || !endInput || this.selectedDays.size === 0) return;

    const block = {
      id: crypto.randomUUID(),
      days: Array.from(this.selectedDays).sort(),
      startMinutes: this.parseTimeToMinutes(startInput.value),
      endMinutes: this.parseTimeToMinutes(endInput.value),
      enabled: true
    };

    this.recurringSchedule.push(block);
    await this.storage.set({ focustube_recurring_schedule: this.recurringSchedule });
    this.updateScheduleUI();

    // Reset selection for the next entry
    this.selectedDays.clear();
    document.querySelectorAll('#dayChips .day-chip.selected').forEach(chip => chip.classList.remove('selected'));
  }

  async removeScheduleBlock(id) {
    this.recurringSchedule = this.recurringSchedule.filter(b => b.id !== id);
    await this.storage.set({ focustube_recurring_schedule: this.recurringSchedule });
    this.updateScheduleUI();
  }

  updateScheduleUI() {
    const listElement = document.getElementById('scheduleList');
    if (!listElement) return;

    listElement.innerHTML = '';

    if (this.recurringSchedule.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'text-sm text-gray-500';
      empty.textContent = this.getMsg('noScheduleBlocksMessage');
      listElement.appendChild(empty);
      return;
    }

    this.recurringSchedule.forEach(block => {
      listElement.appendChild(this.createScheduleItem(block));
    });
  }

  createScheduleItem(block) {
    const dayLabels = block.days
      .slice()
      .sort()
      .map(d => this.getMsg(FOCUS_DAY_KEYS[d]))
      .join(', ');
    const timeRange = `${this.formatMinutesToTime(block.startMinutes)} - ${this.formatMinutesToTime(block.endMinutes)}`;

    const div = document.createElement('div');
    div.className = 'blacklist-item schedule-item';
    div.innerHTML = `
      <div>
        <span class="schedule-days">${this.escapeHtml(dayLabels)}</span>
        <span class="schedule-time">${this.escapeHtml(timeRange)}</span>
      </div>
      <button class="remove-button i18n" data-message="removeButton"></button>
    `;

    const removeButton = div.querySelector('.remove-button');
    removeButton.textContent = this.getMsg('removeButton');
    removeButton.addEventListener('click', () => this.removeScheduleBlock(block.id));

    return div;
  }

  parseTimeToMinutes(value) {
    const [h, m] = (value || '00:00').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  formatMinutesToTime(totalMinutes) {
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
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
