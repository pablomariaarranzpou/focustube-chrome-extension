/**
 * Feature to hide autoplay overlay at end of videos.
 * Prevents automatic video suggestions and can disable autoplay.
 */
class HideAutoplayOverlayFeature extends DOMFeature {
  constructor() {
    super('hideAutoplayOverlay', {
      defaultEnabled: false,
      disableAutoplay: true
    });
  }

  async onInit() {
    console.debug('FocusTube: HideAutoplayOverlayFeature initialized');
  }

  async onActivate() {
    this.hideOverlay();
    
    if (this.config.disableAutoplay) {
      this.disableAutoplay();
    }
    
    this.observeDOM(() => this.hideOverlay());
  }

  async onDeactivate() {
    await super.onDeactivate();
    
    if (this.config.disableAutoplay) {
      this.enableAutoplay();
    }
  }

  /**
   * Hide autoplay overlay elements
   */
  hideOverlay() {
    const overlayClasses = [
      'ytp-autonav-endscreen-countdown-container',
      'ytp-autonav-endscreen-small-mode',
      'ytp-autonav-endscreen-upnext-no-alternative-header',
      'ytp-player-content',
      'ytp-next-button'
    ];

    overlayClasses.forEach(className => {
      const elements = document.getElementsByClassName(className);
      this.hideElements(Array.from(elements));
    });
  }

  /**
   * Disable YouTube autoplay
   */
  disableAutoplay() {
    const autoplayToggle = document.querySelector('.ytp-autonav-toggle-button');
    if (!autoplayToggle) return;

    const isEnabled = autoplayToggle.getAttribute('aria-checked') === 'true';
    if (isEnabled) {
      try {
        autoplayToggle.click();
        console.debug('FocusTube: Autoplay disabled');
      } catch (error) {
        console.error('FocusTube: Error disabling autoplay:', error);
      }
    }
  }

  /**
   * Enable YouTube autoplay
   */
  enableAutoplay() {
    const autoplayToggle = document.querySelector('.ytp-autonav-toggle-button');
    if (!autoplayToggle) return;

    const isDisabled = autoplayToggle.getAttribute('aria-checked') === 'false';
    if (isDisabled) {
      try {
        autoplayToggle.click();
        console.debug('FocusTube: Autoplay enabled');
      } catch (error) {
        console.error('FocusTube: Error enabling autoplay:', error);
      }
    }
  }
}
