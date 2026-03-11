/**
 * Feature to hide autoplay overlay and prevent automatic navigation
 * to the next video when the current one ends.
 *
 * The overlay (.ytp-autonav-endscreen-countdown-overlay) is ALREADY in the DOM
 * with display:none. YouTube toggles its inline style to show it when a video ends.
 * We watch that specific element for style changes and click Cancel immediately.
 */
class HideAutoplayOverlayFeature extends DOMFeature {
  constructor() {
    super('hideAutoplayOverlay', {
      defaultEnabled: false,
      disableAutoplay: true
    });
    this._navHandler = null;
    this._overlayObserver = null;
  }

  async onInit() {
    console.debug('FocusTube: HideAutoplayOverlayFeature initialized');
  }

  async onActivate() {
    // CSS targets the PARENT overlay wrapper (what YouTube actually toggles)
    this.injectCSS('autonav', `
      .ytp-autonav-endscreen-countdown-overlay,
      .ytp-autonav-endscreen-countdown-container,
      .ytp-next-button {
        display: none !important;
        visibility: hidden !important;
      }
    `);

    this.disableAutoplay();
    this.cancelAndHide();

    // The overlay is already in DOM. Set up a targeted observer on it.
    if (!this._setupOverlayObserver()) {
      // Overlay not in DOM yet (player hasn't rendered) — wait for it
      this.observeDOM((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType !== Node.ELEMENT_NODE) continue;
            if (
              node.classList?.contains('ytp-autonav-endscreen-countdown-overlay') ||
              node.querySelector?.('.ytp-autonav-endscreen-countdown-overlay')
            ) {
              this._setupOverlayObserver();
              return;
            }
          }
        }
      });
    }

    // Re-setup after SPA navigation (player can be recreated)
    this._navHandler = () => {
      this.disableAutoplay();
      this._setupOverlayObserver();
      setTimeout(() => {
        this.disableAutoplay();
        this._setupOverlayObserver();
      }, 1500);
    };
    document.addEventListener('yt-navigate-finish', this._navHandler);
  }

  /**
   * Set up a MutationObserver directly on the overlay element.
   * When YouTube changes its style/class to show it, we click Cancel.
   * Returns true if the overlay was found and observer was set up.
   */
  _setupOverlayObserver() {
    if (this._overlayObserver) {
      this._overlayObserver.disconnect();
    }

    const overlay = document.querySelector('.ytp-autonav-endscreen-countdown-overlay');
    if (!overlay) return false;

    console.debug('FocusTube: Overlay element found, watching for style changes');

    this._overlayObserver = new MutationObserver(() => {
      // YouTube just changed the overlay's style/class → it's starting the countdown
      console.debug('FocusTube: Overlay style changed — cancelling autonav');
      this.cancelAndHide();
    });

    // Only watch this one element's attributes — very lightweight
    this._overlayObserver.observe(overlay, {
      attributes: true,
      attributeFilter: ['style', 'class']
    });

    return true;
  }

  async onDeactivate() {
    if (this._navHandler) {
      document.removeEventListener('yt-navigate-finish', this._navHandler);
      this._navHandler = null;
    }

    if (this._overlayObserver) {
      this._overlayObserver.disconnect();
      this._overlayObserver = null;
    }

    this.enableAutoplay();
    await super.onDeactivate();
  }

  /**
   * Click Cancel to stop YouTube's JS countdown timer,
   * and forcefully hide the container via inline styles.
   */
  cancelAndHide() {
    // Click Cancel — works even if the button is inside a display:none container
    const cancelBtn = document.querySelector('.ytp-autonav-endscreen-upnext-cancel-button');
    if (cancelBtn) {
      try {
        cancelBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
        cancelBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
        cancelBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        console.debug('FocusTube: Autonav Cancel clicked');
      } catch (e) {}
    }

    // Force overlay hidden via inline style (backup for CSS)
    const overlay = document.querySelector('.ytp-autonav-endscreen-countdown-overlay');
    if (overlay) {
      try {
        overlay.style.setProperty('display', 'none', 'important');
      } catch (e) {}
    }
  }

  disableAutoplay() {
    const toggle = document.querySelector('.ytp-autonav-toggle-button');
    if (!toggle) return;
    if (toggle.getAttribute('aria-checked') === 'true') {
      try {
        toggle.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        console.debug('FocusTube: Autoplay toggle disabled');
      } catch (e) {}
    }
  }

  enableAutoplay() {
    const toggle = document.querySelector('.ytp-autonav-toggle-button');
    if (!toggle) return;
    if (toggle.getAttribute('aria-checked') === 'false') {
      try { toggle.click(); } catch (e) {}
    }
  }
}
