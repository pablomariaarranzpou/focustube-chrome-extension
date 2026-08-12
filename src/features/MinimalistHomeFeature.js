/**
 * Turns the YouTube homepage into a minimalist, distraction-free landing page
 * by REARRANGING YouTube's own native elements - not rebuilding them:
 *   - hides the recommendation feed (#primary) and the top bar / guide,
 *   - moves the real logo and the real search box (with YouTube's official
 *     search button and voice button) into a centered container on a black
 *     background.
 *
 * Because it relocates the genuine <yt-searchbox> node, search, autocomplete
 * and voice search keep working exactly as YouTube built them. On navigation
 * away from home, every moved node is put back where it came from.
 *
 * Keeps the legacy storage key ('hideHomePageContent') so users who had the
 * old "Hide Home Page Content" feature enabled keep it enabled after the rename.
 */
class MinimalistHomeFeature extends DOMFeature {
  constructor() {
    super('minimalistHome', {
      defaultEnabled: false
    });
    this.OVERLAY_ID = '__focustube_minimalhome';
    this.HTML_CLASS = 'ft-minimalhome';
    // Native nodes we relocate into our hero, with a note of where they came
    // from so we can restore them exactly.
    this.moved = [];
    this.boundOnNavigate = () => this.syncOverlay();
  }

  async onInit() {
    console.debug('FocusTube: MinimalistHomeFeature initialized');
  }

  async onActivate() {
    console.debug('FocusTube: MinimalistHome activated (home=' + this.isHomePage() + ')');
    this.injectCSS('minimalhome', this.buildCSS());
    this.syncOverlay();

    // YouTube is a single-page app: react both to its own navigation event
    // and to DOM mutations (belt-and-suspenders for early loads / re-renders).
    window.addEventListener('yt-navigate-finish', this.boundOnNavigate, true);
    this.observeDOM(() => this.syncOverlay());
  }

  /**
   * Build the hero on the homepage, tear it down everywhere else.
   */
  syncOverlay() {
    if (this.isHomePage()) {
      this.buildHero();
    } else {
      this.teardownHero();
    }
  }

  buildHero() {
    // Desktop-only: the mobile web app (m.youtube.com) uses a completely
    // different DOM (ytm-app / ytm-*), so relocating ytd-masthead nodes would
    // paint an empty hero. Bail out there and leave the page untouched.
    if (!document.querySelector('ytd-app')) {
      this.teardownHero();
      return;
    }

    const host = document.body;
    if (!host) {
      requestAnimationFrame(() => { if (this.isActive) this.syncOverlay(); });
      return;
    }

    let overlay = document.getElementById(this.OVERLAY_ID);
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = this.OVERLAY_ID;
      overlay.innerHTML = `
        <div class="ft-minhome-inner">
          <div class="ft-minhome-logo-slot"></div>
          <div class="ft-minhome-search-slot"></div>
          <div class="ft-minhome-footer">Powered by FocusTube</div>
        </div>`;
      host.appendChild(overlay);
    }

    document.documentElement.classList.add(this.HTML_CLASS);

    // Match YouTube's current theme so the relocated (theme-styled) search box
    // sits on the right background - white in light mode, near-black in dark.
    overlay.classList.toggle('ft-dark', this.isDarkTheme());

    // Relocate the REAL YouTube nodes (idempotent: re-runs on SPA re-renders).
    const logoSlot = overlay.querySelector('.ft-minhome-logo-slot');
    const searchSlot = overlay.querySelector('.ft-minhome-search-slot');
    this.relocate('ytd-masthead ytd-topbar-logo-renderer', logoSlot);
    this.relocate('ytd-masthead #center', searchSlot);
  }

  /**
   * Whether YouTube is currently in dark theme. Read only YouTube's own applied
   * theme (never the OS preference, which can disagree with YT's setting): YT
   * stamps `dark`/`page-dark-theme` on html/ytd-app/ytd-masthead, and adds a
   * `...Dark` class to the very search box we relocate.
   */
  isDarkTheme() {
    return !!document.querySelector(
      'html[dark], ytd-app[dark], ytd-masthead[dark], ytd-masthead[page-dark-theme], ' +
      'yt-searchbox.ytSearchboxComponentHostDark, .ytSearchboxComponentHostDark'
    );
  }

  /**
   * Move a native node into `slot`, remembering its original position so it can
   * be restored later. No-op if already inside the slot or not found yet.
   */
  relocate(selector, slot) {
    const node = document.querySelector(selector);
    if (!node || !slot) return;
    if (node.parentNode === slot) return;

    // Only remember the ORIGINAL home once (first time we move it).
    if (!this.moved.some(m => m.node === node)) {
      this.moved.push({
        node,
        parent: node.parentNode,
        nextSibling: node.nextSibling
      });
    }
    slot.appendChild(node);
  }

  /**
   * Put every relocated node back exactly where it was, remove our container
   * and the page-level class.
   */
  teardownHero() {
    for (const { node, parent, nextSibling } of this.moved) {
      try {
        if (parent && parent.isConnected) {
          parent.insertBefore(node, nextSibling && nextSibling.isConnected ? nextSibling : null);
        }
      } catch (e) { /* ignore */ }
    }
    this.moved = [];

    const overlay = document.getElementById(this.OVERLAY_ID);
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    document.documentElement.classList.remove(this.HTML_CLASS);
  }

  buildCSS() {
    return `
      /* Hide the feed, the top bar and the guide only on the minimalist home. */
      html.${this.HTML_CLASS} #masthead-container,
      html.${this.HTML_CLASS} #guide,
      html.${this.HTML_CLASS} ytd-mini-guide-renderer,
      html.${this.HTML_CLASS} ytd-browse[page-subtype="home"] #primary,
      html.${this.HTML_CLASS} ytd-browse[page-subtype="home"] ytd-rich-grid-renderer {
        display: none !important;
      }

      /* The centered hero. Light theme by default; .ft-dark for dark theme. */
      #${this.OVERLAY_ID} {
        position: fixed;
        inset: 0;
        z-index: 2147483000;
        background: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        box-sizing: border-box;
      }
      #${this.OVERLAY_ID}.ft-dark {
        background: #0f0f0f;
      }
      #${this.OVERLAY_ID} .ft-minhome-inner {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        max-width: 640px;
        margin-top: -6vh;
      }
      #${this.OVERLAY_ID} .ft-minhome-logo-slot {
        margin-bottom: 48px;
        transform: scale(1.6);
        transform-origin: center;
      }
      /* Let the relocated native search box fill the hero and grow a little. */
      #${this.OVERLAY_ID} .ft-minhome-search-slot {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 8px;
        width: 100%;
      }
      #${this.OVERLAY_ID} .ft-minhome-search-slot #center {
        display: flex !important;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        margin: 0 !important;
        max-width: none !important;
      }
      /* Force the full search box visible even at narrow widths, where YouTube
         would normally collapse it to a lone magnifier icon. */
      #${this.OVERLAY_ID} .ft-minhome-search-slot yt-searchbox {
        display: flex !important;
        flex: 1 1 auto;
        min-width: 0;
        max-width: 560px;
      }
      /* The narrow (collapsed) search icon inside #center is redundant here. */
      #${this.OVERLAY_ID} .ft-minhome-search-slot #search-button-narrow {
        display: none !important;
      }
      #${this.OVERLAY_ID} .ft-minhome-footer {
        margin-top: 22px;
        color: #606060;
        font-size: 13px;
        font-weight: 500;
        letter-spacing: 0.2px;
        font-family: "Roboto", "Arial", sans-serif;
      }
      #${this.OVERLAY_ID}.ft-dark .ft-minhome-footer {
        color: #aaaaaa;
      }
    `;
  }

  /**
   * Cleanup: restore nodes, remove listener, then let DOMFeature restore CSS.
   */
  async onDeactivate() {
    window.removeEventListener('yt-navigate-finish', this.boundOnNavigate, true);
    this.teardownHero();
    await super.onDeactivate();
  }

  isHomePage() {
    return window.location.pathname === '/';
  }

  /**
   * Preserve the setting for users who had the old "Hide Home Page Content"
   * feature enabled before this was renamed/repurposed.
   */
  getLegacyStorageKey() {
    return 'hideHomePageContent';
  }
}
