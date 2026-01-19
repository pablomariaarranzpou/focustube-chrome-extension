/**
 * Feature to hide YouTube Shorts across the platform.
 * Implements comprehensive Shorts blocking including:
 * - Shorts shelves in feed
 * - Shorts video cards
 * - Direct /shorts paths
 * - Shorts components in various contexts
 */
class HideShortsFeature extends DOMFeature {
  constructor() {
    super('hideShorts', {
      defaultEnabled: true,
      blockShortsPath: true,
      aggressiveBlocking: true
    });
    
    this.shortsSelectors = [
      'ytd-reel-shelf-renderer',
      'ytd-rich-section-renderer',
      'ytd-rich-shelf-renderer',
      'ytd-reel-player-renderer',
      'ytm-reel-player',
      '#shorts-container',
      '.shorts',
      'shorts-container',
      'ytm-shorts-lockup-view-model',
      'ytm-shorts-lockup-view-model-v2',
      '.shortsLockupViewModelHost',
      'a[href^="/shorts"]'
    ];
  }

  async onInit() {
    console.debug('FocusTube: HideShortsFeature initialized');
  }

  async onActivate() {
    // Inject aggressive CSS for preventing flashes
    this.injectBlockingCSS();
    
    // Handle current page
    this.handleCurrentPage();
    
    // Set up path blocking if on /shorts
    this.handleShortsPath();
    
    // Observe for dynamically loaded content
    this.observeDOM(() => this.handleDynamicContent());
  }

  async onDeactivate() {
    await super.onDeactivate();
    this.restoreShortsVideos();
  }

  /**
   * Inject CSS to block Shorts elements
   */
  injectBlockingCSS() {
    const css = `
      ${this.shortsSelectors.join(',\n      ')} {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        max-height: 0 !important;
      }
    `;
    this.injectCSS('blocking', css);
  }

  /**
   * Handle content on current page load
   */
  handleCurrentPage() {
    this.hideShortsShelves();
    this.hideShortsVideoCards();
    this.hideSidebarShorts();
    this.muteShortsVideos();
  }

  /**
   * Handle dynamically loaded content
   */
  handleDynamicContent() {
    this.hideShortsShelves();
    this.hideShortsVideoCards();
    this.hideSidebarShorts();
    this.muteShortsVideos();
  }

  /**
   * Hide Shorts entry in the sidebar
   */
  hideSidebarShorts() {
    // 1. Hide by title "Shorts" (Desktop sidebar)
    // Often on ytd-guide-entry-renderer or a tag
    const titleElements = this.query('[title="Shorts"]');
    this.hideElements(titleElements);

    // 2. Hide by text content "Shorts" (Mobile or specific layouts)
    // Matches logic from content.js removeElementsByTextContent
    // We look for yt-formatted-string specifically as per content.js
    const formattedStrings = this.query('yt-formatted-string');
    const shortsStrings = formattedStrings.filter(el => el.textContent.trim() === 'Shorts');
    
    // For these text elements, we try to hide the parent guide entry if possible to behave better than legacy
    // ensuring we don't leave empty icons. If not found, fall back to hiding the element itself.
    shortsStrings.forEach(el => {
      // Try to find the row container
      const parentEntry = el.closest('ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer');
      if (parentEntry) {
        this.hideElements([parentEntry]);
      } else {
        this.hideElements([el]);
      }
    });

    // 3. Hide by is-shorts attribute (legacy support)
    const isShortsElements = this.query('[is-shorts]');
    this.hideElements(isShortsElements);
  }

  /**
   * Hide Shorts shelves/sections
   */
  hideShortsShelves() {
    // Hide rich shelves with "Shorts" title
    const richShelves = this.query('ytd-reel-shelf-renderer, ytd-rich-section-renderer, ytd-rich-shelf-renderer');
    richShelves.forEach(shelf => {
      const title = shelf.querySelector('h2, .yt-shelf-header-layout__title');
      if (title && title.textContent.toLowerCase().includes('shorts')) {
        this.hideElements([shelf]);
      }
    });

    // Hide grid shelves containing Shorts
    const gridShelves = this.query('grid-shelf-view-model');
    gridShelves.forEach(shelf => {
      // Logic copied from content.js removeShortsShelves()
      const inner = (shelf && shelf.innerText) ? shelf.innerText.toLowerCase() : '';
      const hasShortsText = inner.includes('shorts');
  
      const hasShortsAnchor = !!shelf.querySelector('a[href^="/shorts"]');
      const hasShortsComponent = !!shelf.querySelector('ytm-shorts-lockup-view-model, ytm-shorts-lockup-view-model-v2, .shortsLockupViewModelHost');
  
      // Use DOMFeature's shadow DOM search which mirrors elementContainsTextInShadow
      const hasShortsInShadow = this.elementContainsText(shelf, 'shorts', { includeShadowDOM: true });
  
      if (hasShortsText || hasShortsAnchor || hasShortsComponent || hasShortsInShadow) {
        this.hideElements([shelf]);
        // Also apply the specific attributes from content.js just in case
        shelf.setAttribute('data-focustube-hidden', 'true');
      }
    });
  }

  /**
   * Determine if a shelf is a Shorts shelf
   */
  isShortShelf(shelf) {
    // Check text content
    const hasText = this.elementContainsText(shelf, 'shorts', { caseSensitive: false });
    
    // Check for Shorts links
    const hasLink = !!shelf.querySelector('a[href^="/shorts"]');
    
    // Check for Shorts components
    const hasComponent = !!shelf.querySelector(
      'ytm-shorts-lockup-view-model, ytm-shorts-lockup-view-model-v2, .shortsLockupViewModelHost'
    );

    return hasText || hasLink || hasComponent;
  }

  /**
   * Hide video cards that link to Shorts
   */
  hideShortsVideoCards() {
    const videoCards = this.query('ytd-video-renderer, ytd-grid-video-renderer');
    videoCards.forEach(card => {
      const shortsLink = card.querySelector('a[href^="/shorts"]');
      if (shortsLink) {
        this.hideElements([card]);
      }
    });
  }

  /**
   * Mute and pause Shorts videos
   */
  muteShortsVideos() {
    const shortsContainer = document.getElementById('shorts-container');
    if (!shortsContainer) return;

    const videos = shortsContainer.querySelectorAll('video');
    videos.forEach(video => {
      try {
        video.muted = true;
        video.pause();
        video.autoplay = false;
        video.removeAttribute('autoplay');
      } catch (error) {}
    });
  }

  /**
   * Restore muted videos when feature is disabled
   */
  restoreShortsVideos() {
    const shortsContainer = document.getElementById('shorts-container');
    if (!shortsContainer) return;

    const videos = shortsContainer.querySelectorAll('video');
    videos.forEach(video => {
      try {
        video.muted = false;
        // Don't auto-play, let user control
      } catch (error) {}
    });
  }

  /**
   * Handle blocking Shorts on /shorts path
   */
  handleShortsPath() {
    if (!this.isShortsPath() || !this.config.blockShortsPath) return;

    console.debug('FocusTube: Blocking Shorts on /shorts path');

    // Hide page immediately
    try {
      document.documentElement.style.visibility = 'hidden';
    } catch (error) {}

    // Override HTMLMediaElement.play() to prevent Shorts videos from playing
    this.overrideVideoPlay();

    // Observe and block Shorts components
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (!mutation.addedNodes) continue;
        
        mutation.addedNodes.forEach(node => {
          if (node.nodeType !== 1) return;
          
          const element = node;
          if (this.isShortsElement(element)) {
            this.hideElements([element]);
            this.stopVideos(element);
          }
        });
      }
    });

    observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true
    });

    this.observers.push(observer);

    // Show page after a delay
    setTimeout(() => {
      try {
        document.documentElement.style.visibility = '';
      } catch (error) {}
    }, 700);
  }

  /**
   * Check if element is a Shorts element
   */
  isShortsElement(element) {
    return element.matches && (
      element.matches('ytd-reel-player-renderer') ||
      element.matches('ytm-reel-player') ||
      element.matches('#shorts-container') ||
      element.matches('ytm-shorts-lockup-view-model')
    );
  }

  /**
   * Stop all videos in an element
   */
  stopVideos(element) {
    const videos = element.querySelectorAll('video');
    videos.forEach(video => {
      try {
        video.autoplay = false;
        video.removeAttribute('autoplay');
        video.muted = true;
        video.pause();
      } catch (error) {}
    });
  }

  /**
   * Override HTMLMediaElement.play() to block Shorts videos
   */
  overrideVideoPlay() {
    try {
      const originalPlay = HTMLMediaElement.prototype.play;
      const self = this;

      HTMLMediaElement.prototype.play = function() {
        try {
          if (self.isShortsPath() && self.enabled) {
            const element = this;
            const isInShortsContainer = element.closest && (
              element.closest('#shorts-container') ||
              element.closest('ytd-reel-player-renderer') ||
              element.closest('ytm-reel-player') ||
              element.closest('ytm-shorts-lockup-view-model')
            );

            if (isInShortsContainer) {
              element.pause();
              return Promise.resolve();
            }
          }
        } catch (error) {}
        
        return originalPlay.apply(this, arguments);
      };
    } catch (error) {
      console.error('FocusTube: Error overriding video play:', error);
    }
  }

  /**
   * Check if current path is /shorts
   */
  isShortsPath() {
    try {
      return window.location.pathname.startsWith('/shorts');
    } catch (error) {
      return false;
    }
  }
}
