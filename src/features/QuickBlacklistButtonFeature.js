/**
 * Injects a block/unblock button next to every channel name in the feed.
 *
 * Behaviour:
 * - Channel NOT in blacklist  → grey ⊘, hover shows "Blacklist with FocusTube"
 * - Channel already blocked   → amber ⊘, hover shows "Remove from FocusTube"
 * - After blocking            → ✓ "Blocked!" (600ms), then card hides IF
 *                               HideBlacklistedChannelsFeature is active
 * - After removing            → ⊘ resets to grey; card becomes visible if
 *                               HideBlacklistedChannelsFeature was hiding it
 *
 * Writes to the 'blacklist' storage key shared with HideBlacklistedChannelsFeature.
 * Always enabled by default — independent toggle in popup lets users turn it off.
 */
class QuickBlacklistButtonFeature extends DOMFeature {
  constructor() {
    super('quickBlacklistButton', {
      defaultEnabled: true
    });
    this._onNavigate = this._onNavigate.bind(this);
    this._onStorageChange = this._onStorageChange.bind(this);
    // In-memory cache of the current blacklist — avoids per-card storage reads
    this._blacklist = new Set();
  }

  async onInit() {
    console.debug('FocusTube: QuickBlacklistButtonFeature initialized');
  }

  async onActivate() {
    // Load blacklist into cache first, then inject buttons
    await this._loadBlacklist();
    this.injectCSS('btn', this._buttonCSS());
    this._injectButtons();
    this.observeDOM(() => this._injectButtons());
    window.addEventListener('yt-navigate-finish', this._onNavigate);
    // Keep cache in sync when blacklist changes (popup edits, other tabs, etc.)
    chrome.storage.onChanged.addListener(this._onStorageChange);
  }

  async onDeactivate() {
    window.removeEventListener('yt-navigate-finish', this._onNavigate);
    chrome.storage.onChanged.removeListener(this._onStorageChange);
    this._removeAllButtons();
    await super.onDeactivate();
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  _onNavigate() {
    setTimeout(() => this._injectButtons(), 300);
  }

  _onStorageChange(changes, area) {
    if (area !== 'sync') return;
    if (!changes.blacklist) return;
    // Refresh cache
    this._blacklist = new Set(changes.blacklist.newValue || []);
    // Re-render all existing buttons to reflect new blacklist state
    document.querySelectorAll('.__ft_block_btn').forEach(btn => {
      const name = btn.dataset.channelName;
      if (name) this._updateButtonState(btn, this._blacklist.has(name));
    });
  }

  _loadBlacklist() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['blacklist'], (result) => {
        this._blacklist = new Set(result.blacklist || []);
        resolve();
      });
    });
  }

  _injectButtons() {
    const cards = this.query(
      'ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ' +
      'ytd-grid-video-renderer, ytm-rich-item-renderer, ytm-video-with-context-renderer'
    );
    cards.forEach(card => this._injectButton(card));
  }

  _injectButton(card) {
    if (card.querySelector('.__ft_block_btn')) return; // idempotent

    const channelLink = this._findChannelLink(card);
    if (!channelLink) return;

    const channelName = channelLink.textContent.trim();
    if (!channelName) return;

    const isBlocked = this._blacklist.has(channelName);

    const btn = document.createElement('button');
    btn.className = '__ft_block_btn';
    btn.dataset.channelName = channelName;
    this._updateButtonState(btn, isBlocked);

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const name = btn.dataset.channelName;
      if (this._blacklist.has(name)) {
        this._removeFromBlacklist(name, btn, card);
      } else {
        this._addToBlacklist(name, btn, card);
      }
    });

    channelLink.insertAdjacentElement('afterend', btn);
  }

  /**
   * Set button appearance based on whether the channel is blocked.
   * isBlocked=true  → amber ⊘ "Remove from FocusTube"
   * isBlocked=false → grey  ⊘ "Blacklist with FocusTube"
   */
  _updateButtonState(btn, isBlocked) {
    btn.disabled = false;
    if (isBlocked) {
      btn.classList.add('__ft_block_btn--blocked');
      btn.setAttribute('aria-label', `Remove channel: ${btn.dataset.channelName}`);
      btn.innerHTML = `<span class="__ft_block_icon">⊘</span><span class="__ft_block_label">Remove from FocusTube</span>`;
    } else {
      btn.classList.remove('__ft_block_btn--blocked');
      btn.setAttribute('aria-label', `Block channel: ${btn.dataset.channelName}`);
      btn.innerHTML = `<span class="__ft_block_icon">⊘</span><span class="__ft_block_label">Blacklist with FocusTube</span>`;
    }
  }

  _findChannelLink(card) {
    // 1. New homepage layout (2024+): yt-lockup-view-model
    const newLayout = card.querySelector(
      '.ytContentMetadataViewModelMetadataRow a[href^="/@"], ' +
      '.ytContentMetadataViewModelMetadataRow a[href*="/channel/"]'
    );
    if (newLayout) return newLayout;

    // 2. Search results: visible channel is in #channel-info .long-byline.
    //    The one in ytd-video-meta-block #byline-container has hidden="" — skip it.
    const searchResult = card.querySelector(
      '#channel-info ytd-channel-name.long-byline a[href^="/@"], ' +
      '#channel-info ytd-channel-name.long-byline a[href*="/channel/"]'
    );
    if (searchResult) return searchResult;

    // 3. Generic fallback
    return card.querySelector('#channel-name a[href^="/@"], #channel-name a[href*="/channel/"]');
  }

  _addToBlacklist(channelName, btn, card) {
    // Optimistic UI
    btn.innerHTML = `<span class="__ft_block_icon">✓</span><span class="__ft_block_label">Blocked!</span>`;
    btn.classList.add('__ft_block_btn--done');
    btn.disabled = true;

    chrome.storage.sync.get(['blacklist'], (result) => {
      const list = result.blacklist || [];
      if (!list.includes(channelName)) {
        list.push(channelName);
        chrome.storage.sync.set({ blacklist: list }, () => {
          console.debug(`FocusTube: Quick-blocked channel "${channelName}"`);
        });
      }
      this._blacklist.add(channelName);

      // BUG FIX: only hide the card if HideBlacklistedChannelsFeature is active.
      // If the user has that feature OFF, the channel is saved but the card stays.
      const hideFeature = window.__focusTubeManager?.get('hideBlacklistedChannels');
      const shouldHide = hideFeature?.isActive === true;

      setTimeout(() => {
        if (card && shouldHide) {
          card.style.setProperty('display', 'none', 'important');
        } else if (card) {
          // Feature is off: reset button to amber "blocked" state so user
          // can see the channel is now in the list
          btn.classList.remove('__ft_block_btn--done');
          this._updateButtonState(btn, true);
        }
      }, 600);
    });
  }

  _removeFromBlacklist(channelName, btn, card) {
    // Optimistic UI
    btn.innerHTML = `<span class="__ft_block_icon">✓</span><span class="__ft_block_label">Removed!</span>`;
    btn.classList.add('__ft_block_btn--done');
    btn.disabled = true;

    chrome.storage.sync.get(['blacklist'], (result) => {
      const list = (result.blacklist || []).filter(n => n !== channelName);
      chrome.storage.sync.set({ blacklist: list }, () => {
        console.debug(`FocusTube: Quick-unblocked channel "${channelName}"`);
      });
      this._blacklist.delete(channelName);

      // If the hide feature was hiding this card, restore it
      const hideFeature = window.__focusTubeManager?.get('hideBlacklistedChannels');
      if (hideFeature?.isActive && card) {
        card.style.removeProperty('display');
        card.style.removeProperty('visibility');
        card.style.removeProperty('opacity');
        card.removeAttribute('hidden');
        card.removeAttribute('aria-hidden');
        card.removeAttribute('inert');
        card.removeAttribute('data-focustube-hideBlacklistedChannels');
      }

      setTimeout(() => {
        btn.classList.remove('__ft_block_btn--done');
        this._updateButtonState(btn, false);
      }, 600);
    });
  }

  _removeAllButtons() {
    document.querySelectorAll('.__ft_block_btn').forEach(btn => btn.remove());
  }

  _buttonCSS() {
    return `
      /* Base: always visible, grey, icon only */
      .__ft_block_btn {
        display: inline-flex !important;
        align-items: center !important;
        gap: 4px !important;
        vertical-align: middle !important;
        margin-left: 6px !important;
        padding: 2px 4px !important;
        border: none !important;
        border-radius: 8px !important;
        background: transparent !important;
        color: #909090 !important;
        font-size: 11px !important;
        font-family: "Roboto", "Arial", sans-serif !important;
        font-weight: 500 !important;
        line-height: 1 !important;
        white-space: nowrap !important;
        cursor: pointer !important;
        transition: background 0.15s, color 0.15s, padding 0.15s !important;
        position: static !important;
      }

      .__ft_block_icon {
        font-size: 13px !important;
        line-height: 1 !important;
        flex-shrink: 0 !important;
        display: inline-flex !important;
        align-items: center !important;
      }

      /* Label hidden at rest, shown on button hover */
      .__ft_block_label {
        display: none !important;
        font-size: 11px !important;
        line-height: 1 !important;
        white-space: nowrap !important;
      }

      /* Default hover: red tint — "block this channel" */
      .__ft_block_btn:hover {
        background: rgba(220, 38, 38, 0.1) !important;
        color: #ef4444 !important;
        padding: 2px 7px 2px 5px !important;
      }

      .__ft_block_btn:hover .__ft_block_label {
        display: inline !important;
      }

      /* Already-blocked state: amber icon — channel is in the list */
      .__ft_block_btn--blocked {
        color: #d97706 !important;
      }

      /* Already-blocked hover: show removal affordance */
      .__ft_block_btn--blocked:hover {
        background: rgba(217, 119, 6, 0.1) !important;
        color: #b45309 !important;
        padding: 2px 7px 2px 5px !important;
      }

      /* Confirmed action state: green ✓ */
      .__ft_block_btn--done {
        color: #16a34a !important;
        background: rgba(22, 163, 74, 0.08) !important;
        cursor: default !important;
        padding: 2px 7px 2px 5px !important;
      }

      .__ft_block_btn--done .__ft_block_label {
        display: inline !important;
      }
    `;
  }
}
