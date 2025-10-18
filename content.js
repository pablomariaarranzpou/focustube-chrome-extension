// content.js
// Version: 2025-10-18-20:00 - Added hideComments feature with ytd-comments selector
console.log('FocusTube content.js loaded - Version 2025-10-18-20:00');

let HTML = document.documentElement;
let observer = null;

let hideShortsEnabled = true;
let hideSuggestionsEnabled = true;
let hideCommentsEnabled = false;
let hideBlacklistedChannelsEnabled = true;
let hideBlacklistedWordsEnabled = true;
let hideHomePageContentEnabled = false;
let hideAutoplayOverlayEnabled = false; // Added
let hideSidebarEnabled = false; // New: hide left guide/sidebar

let blacklist = [];
let blacklistWords = [];

// CSS injection for sidebar hiding
let sidebarStyleElement = null;

function injectSidebarCSS() {
  if (sidebarStyleElement) return; // Already injected
  
  const css = `
    /* Hide YouTube sidebar/guide */
    #guide,
    #guide-content,
    #guide-inner-content,
    ytd-guide-renderer,
    ytd-mini-guide-renderer,
    #sections,
    ytd-guide-section-renderer,
    tp-yt-app-drawer,
    #contentContainer.tp-yt-app-drawer {
      display: none !important;
      visibility: hidden !important;
      width: 0 !important;
      max-width: 0 !important;
      min-width: 0 !important;
      opacity: 0 !important;
    }
    
    /* Disable guide button */
    #guide-button,
    ytd-masthead #guide-button,
    button#guide-button,
    yt-icon-button#guide-button {
      pointer-events: none !important;
      opacity: 0.3 !important;
    }
    
    /* Adjust layout */
    ytd-app,
    ytd-page-manager,
    #content,
    #page-manager {
      grid-template-columns: 0px 1fr !important;
    }
    
    /* Expand main content */
    ytd-browse,
    ytd-two-column-browse-results-renderer,
    #primary,
    #secondary {
      margin-left: 0 !important;
      padding-left: 0 !important;
    }
  `;
  
  try {
    sidebarStyleElement = document.createElement('style');
    sidebarStyleElement.id = '__focustube_sidebar_css';
    sidebarStyleElement.appendChild(document.createTextNode(css));
    (document.head || document.documentElement).appendChild(sidebarStyleElement);
    console.debug('FocusTube: Sidebar CSS injected');
  } catch (e) {
    console.debug('FocusTube: Error injecting sidebar CSS', e);
  }
}

function removeSidebarCSS() {
  if (sidebarStyleElement && sidebarStyleElement.parentNode) {
    try {
      sidebarStyleElement.parentNode.removeChild(sidebarStyleElement);
      sidebarStyleElement = null;
      console.debug('FocusTube: Sidebar CSS removed');
    } catch (e) {
      console.debug('FocusTube: Error removing sidebar CSS', e);
    }
  }
}

(function preventShortsStandaloneRender() {
  function isShortsPath() {
    try {
      return window.location && window.location.pathname && window.location.pathname.startsWith('/shorts');
    } catch (e) {
      return false;
    }
  }

  if (!isShortsPath()) return;

  try {
    const css = `
      ytd-reel-player-renderer, ytm-reel-player, #shorts-container, .shorts, shorts-container, ytm-shorts-lockup-view-model { display: none !important; visibility: hidden !important; height: 0 !important; max-height: 0 !important; }
      a[href^="/shorts"] { display: none !important; }
    `;
    const style = document.createElement('style');
    style.id = '__focustube_shortcss_early';
    style.appendChild(document.createTextNode(css));
    (document.head || document.documentElement).appendChild(style);
  } catch (e) {
    // ignore
  }
  try { document.documentElement.style.visibility = 'hidden'; } catch (e) {}
  function stopVideoEl(video) {
    try {
      video.autoplay = false;
      video.removeAttribute && video.removeAttribute('autoplay');
      video.muted = true;
      video.pause && video.pause();
    } catch (e) {}
  }

  try {
    document.querySelectorAll && document.querySelectorAll('video').forEach(stopVideoEl);
  } catch (e) {}

  try {
    const _origPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function() {
      try {
        if (isShortsPath()) {
          const el = this;
          if (
            (el.closest && (el.closest('#shorts-container') || el.closest('ytd-reel-player-renderer') || el.closest('ytm-reel-player') || el.closest('ytm-shorts-lockup-view-model')))
          ) {
            try { el.pause && el.pause(); } catch (e) {}
            return Promise.resolve();
          }
        }
      } catch (e) {}
      return _origPlay.apply(this, arguments);
    };
  } catch (e) {
    // ignore if we can't override
  }

  try {
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (!m.addedNodes) continue;
        m.addedNodes.forEach((node) => {
          try {
            if (node.nodeType !== 1) return;
            const el = node;
            if (
              (el.matches && (el.matches('ytd-reel-player-renderer') || el.matches('ytm-reel-player') || el.matches('#shorts-container') || el.matches('ytm-shorts-lockup-view-model'))) ||
              (el.querySelector && (el.querySelector('ytd-reel-player-renderer') || el.querySelector('#shorts-container')))
            ) {
              try { el.style.display = 'none'; } catch (e) {}
              try { el.querySelectorAll && el.querySelectorAll('video').forEach(stopVideoEl); } catch (e) {}
            }
          } catch (e) {}
        });
      }
    });
    mo.observe(document.documentElement || document.body, { childList: true, subtree: true });
    setTimeout(() => { try { document.documentElement.style.visibility = ''; } catch (e) {} }, 700);
  } catch (e) {}
})();

function makeElementVisible(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.style.removeProperty('display');
    element.style.removeProperty('visibility');
    element.style.removeProperty('width');
    element.style.removeProperty('max-width');
    element.style.removeProperty('min-width');
    element.style.removeProperty('opacity');
    element.removeAttribute('hidden');
    element.removeAttribute('aria-hidden');
    element.removeAttribute('inert');
  }
}

function makeElementInvisible(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.style.setProperty('display', 'none', 'important');
    element.style.setProperty('visibility', 'hidden', 'important');
    element.style.setProperty('width', '0', 'important');
    element.style.setProperty('max-width', '0', 'important');
    element.style.setProperty('min-width', '0', 'important');
    element.style.setProperty('opacity', '0', 'important');
    element.setAttribute('hidden', 'true');
    element.setAttribute('aria-hidden', 'true');
    element.setAttribute('inert', 'true');
  }
}

function removeElements(elements) {
  elements.forEach((element) => {
    element.style.setProperty('display', 'none', 'important');
    element.style.setProperty('visibility', 'hidden', 'important');
    element.style.setProperty('width', '0', 'important');
    element.style.setProperty('max-width', '0', 'important');
    element.style.setProperty('min-width', '0', 'important');
    element.style.setProperty('opacity', '0', 'important');
    element.setAttribute('hidden', 'true');
    element.setAttribute('aria-hidden', 'true');
    element.setAttribute('inert', 'true');
  });
}

function makeElementsVisible(elements) {
  elements.forEach((element) => {
    element.style.removeProperty('display');
    element.style.removeProperty('visibility');
    element.style.removeProperty('width');
    element.style.removeProperty('max-width');
    element.style.removeProperty('min-width');
    element.style.removeProperty('opacity');
    element.removeAttribute('hidden');
    element.removeAttribute('aria-hidden');
    element.removeAttribute('inert');
  });
}

function removeElementsByAttribute(attributeName, attributeValue) {
  const elements = document.querySelectorAll(`[${attributeName}="${attributeValue}"]`);
  removeElements(elements);
}

function makeElementsVisibleByAttribute(attributeName, attributeValue) {
  const elements = document.querySelectorAll(`[${attributeName}="${attributeValue}"]`);
  makeElementsVisible(elements);
}

function removeElementsByTextContent(textContent) {
  const elements = document.querySelectorAll(`yt-formatted-string`);
  const matchedElements = Array.from(elements).filter(
    (element) => element.textContent.trim() === textContent
  );
  removeElements(matchedElements);
}

function makeElementsVisibleByTextContent(textContent) {
  const elements = document.querySelectorAll(`yt-formatted-string`);
  const matchedElements = Array.from(elements).filter(
    (element) => element.textContent.trim() === textContent
  );
  makeElementsVisible(matchedElements);
}

function removeElementsByRoleAndTitle(role, title) {
  const elements = document.querySelectorAll(`[role="${role}"][title="${title}"]`);
  removeElements(elements);
}

function makeElementsVisibleByRoleAndTitle(role, title) {
  const elements = document.querySelectorAll(`[role="${role}"][title="${title}"]`);
  makeElementsVisible(elements);
}

function muteAndPauseShortsVideos() {
  const shortsContainer = document.getElementById("shorts-container");
  if (shortsContainer) {
    const videos = shortsContainer.querySelectorAll("video");
    videos.forEach((video) => {
      video.muted = true;
      video.pause();
    });
  }
}

function unmuteAndPlayShortsVideos() {
  const shortsContainer = document.getElementById("shorts-container");
  if (shortsContainer) {
    const videos = shortsContainer.querySelectorAll("video");
    videos.forEach((video) => {
      video.muted = false;
      video.play();
    });
  }
}

function removeShortsShelves() {
  const shelves = document.querySelectorAll("grid-shelf-view-model");
  const shortsShelves = document.querySelectorAll('ytd-reel-shelf-renderer, ytd-rich-section-renderer, ytd-rich-shelf-renderer');
  shortsShelves.forEach(shelf => {
    const title = shelf.querySelector('h2, .yt-shelf-header-layout__title');
    if (title && title.textContent.trim().toLowerCase().includes('shorts')) {
      shelf.remove();
    }
  });

  const gridShelves = document.querySelectorAll('grid-shelf-view-model');
  gridShelves.forEach(shelf => {
    const inner = (shelf && shelf.innerText) ? shelf.innerText.toLowerCase() : '';
    const hasShortsText = inner.includes('shorts');

    const hasShortsAnchor = !!shelf.querySelector('a[href^="/shorts"]');
    const hasShortsComponent = !!shelf.querySelector('ytm-shorts-lockup-view-model, ytm-shorts-lockup-view-model-v2, .shortsLockupViewModelHost');


    const hasShortsInShadow = elementContainsTextInShadow(shelf, 'shorts');

    if (hasShortsText || hasShortsAnchor || hasShortsComponent || hasShortsInShadow) {
      try {
        const snippet = (shelf && shelf.outerHTML) ? shelf.outerHTML.slice(0, 300).replace(/\s+/g, ' ') : '[no outerHTML]';
        if (hasShortsText) console.debug('FocusTube: removed grid-shelf-view-model (innerText match)', snippet);
        else if (hasShortsAnchor) console.debug('FocusTube: removed grid-shelf-view-model (anchor /shorts match)', snippet);
        else if (hasShortsComponent) console.debug('FocusTube: removed grid-shelf-view-model (known component match)', snippet);
        else console.debug('FocusTube: removed grid-shelf-view-model (shadow text match)', snippet);
      } catch (e) {
        console.debug('FocusTube: removed grid-shelf-view-model (matching)', e);
      }
      shelf.remove();
    } else {
      // console.debug('FocusTube: kept grid-shelf-view-model', shelf);
    }
  });
}

// Recursively search for text in all child nodes
function elementContainsText(element, searchText) {
  searchText = searchText.toLowerCase();
  if (!element) return false;
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
  let node;
  while ((node = walker.nextNode())) {
    if (node.textContent && node.textContent.toLowerCase().includes(searchText)) {
      return true;
    }
  }
  return false;
}

// Search for text inside element and any nested shadowRoots
function elementContainsTextInShadow(rootElement, searchText) {
  searchText = searchText.toLowerCase();
  if (!rootElement) return false;

  // First, fast path: check textContent/innerText
  try {
    if (rootElement.innerText && rootElement.innerText.toLowerCase().includes(searchText)) return true;
    if (rootElement.textContent && rootElement.textContent.toLowerCase().includes(searchText)) return true;
  } catch (e) {
  }o

  // Walk light DOM text nodes
  if (elementContainsText(rootElement, searchText)) return true;

  // Now, recursively search any shadowRoots
  const allElements = rootElement.querySelectorAll('*');
  for (let i = 0; i < allElements.length; i++) {
    const el = allElements[i];
    if (el.shadowRoot) {
      // Use TreeWalker on the shadowRoot
      const walker = document.createTreeWalker(el.shadowRoot, NodeFilter.SHOW_TEXT, null, false);
      let node;
      while ((node = walker.nextNode())) {
        if (node.textContent && node.textContent.toLowerCase().includes(searchText)) {
          return true;
        }
      }
      // Also recurse into nested elements inside shadowRoot
      const shadowChildren = el.shadowRoot.querySelectorAll('*');
      for (let j = 0; j < shadowChildren.length; j++) {
        if (elementContainsTextInShadow(shadowChildren[j], searchText)) return true;
      }
    }
  }

  return false;
}

function showShortsShelves() {
  // Can't restore removed shelves, so do nothing
}

function removeYtdVideoRendererWithShortsHref() {
  const videoRendererElements = document.querySelectorAll("ytd-video-renderer");
  videoRendererElements.forEach((videoRendererElement) => {
    const anchorElement = videoRendererElement.querySelector('a[href^="/shorts"]');
    if (anchorElement) {
      videoRendererElement.style.display = "none";
    }
  });
}

function makeYtdVideoRendererWithShortsHrefVisible() {
  const videoRendererElements = document.querySelectorAll("ytd-video-renderer");
  videoRendererElements.forEach((videoRendererElement) => {
    const anchorElement = videoRendererElement.querySelector('a[href^="/shorts"]');
    if (anchorElement) {
      videoRendererElement.style.display = "";
    }
  });
}

function removeElementsByTitle(title) {
  const elements = document.querySelectorAll(`[title="${title}"]`);
  removeElements(elements);
}

function makeElementsVisibleByTitle(title) {
  const elements = document.querySelectorAll(`[title="${title}"]`);
  makeElementsVisible(elements);
}

// Utility to remove elements by tag name (hide for safety)
function removeElementsByTagName(tagName) {
  const elements = document.getElementsByTagName(tagName);
  Array.from(elements).forEach((el) => {
    try {
      el.style.display = 'none';
    } catch (e) {
      // ignore
    }
  });
}

// Utility to make elements visible by tag name
function makeElementsVisibleByTagName(tagName) {
  const elements = document.getElementsByTagName(tagName);
  Array.from(elements).forEach((el) => {
    try {
      el.style.display = '';
    } catch (e) {
      // ignore
    }
  });
}

// Aggressive CSS injection to prevent flashes for stubborn Shorts shelves
let __focustube_shortcss_el = null;
function injectShortsHideCSS() {
  try {
    if (__focustube_shortcss_el) return; // already injected
    const css = `
      grid-shelf-view-model, ytd-reel-shelf-renderer, ytd-rich-section-renderer, ytd-rich-shelf-renderer, #shorts-container, .shorts, shorts-container { display: none !important; visibility: hidden !important; height: 0 !important; max-height: 0 !important; }
      a[href^="/shorts"] { display: none !important; }
      `;
    const style = document.createElement('style');
    style.id = '__focustube_shortcss';
    style.appendChild(document.createTextNode(css));
    (document.head || document.documentElement).appendChild(style);
    __focustube_shortcss_el = style;
  } catch (e) {
    console.debug('FocusTube: injectShortsHideCSS failed', e);
  }
}

function removeShortsHideCSS() {
  try {
    if (!__focustube_shortcss_el) return;
    __focustube_shortcss_el.remove();
    __focustube_shortcss_el = null;
  } catch (e) {
    console.debug('FocusTube: removeShortsHideCSS failed', e);
  }
}

function isChannelInBlacklist(channelName) {
  return blacklist.includes(channelName);
}

function isWordInBlacklistWords(word) {
  return blacklistWords.some((blacklistWord) =>
    word.toLowerCase().includes(blacklistWord.toLowerCase())
  );
}

function removeBlacklistedVideos() {
  const videoRendererElements = document.querySelectorAll("ytd-rich-item-renderer");
  videoRendererElements.forEach((videoRendererElement) => {
    const channelLink = videoRendererElement.querySelector('.yt-content-metadata-view-model__metadata-row:first-child a');
    if (channelLink && channelLink.href.includes('/@')) {
      const channelName = channelLink.textContent.trim();
      if (isChannelInBlacklist(channelName)) {
        videoRendererElement.style.display = "none";
      }
    }
  });
}

function makeVisibleBlacklistedVideos() {
  const videoRendererElements = document.querySelectorAll("ytd-rich-item-renderer");
  videoRendererElements.forEach((videoRendererElement) => {
    const channelLink = videoRendererElement.querySelector('.yt-content-metadata-view-model__metadata-row:first-child a');
    if (channelLink && channelLink.href.includes('/@')) {
      const channelName = channelLink.textContent.trim();
      if (isChannelInBlacklist(channelName)) {
        videoRendererElement.style.display = "";
      }
    }
  });
}

function removeBlacklistedWordsVideos() {
  const videoRendererElements = document.querySelectorAll("ytd-rich-item-renderer");
  videoRendererElements.forEach((videoRendererElement) => {
    const videoTitleElement = videoRendererElement.querySelector('h3 a span');
    if (videoTitleElement) {
      const videoTitle = videoTitleElement.textContent.trim();
      if (isWordInBlacklistWords(videoTitle)) {
        videoRendererElement.style.display = "none";
      }
    }
  });
}

function makeVisibleBlacklistedWordsVideos() {
  const videoRendererElements = document.querySelectorAll("ytd-rich-item-renderer");
  videoRendererElements.forEach((videoRendererElement) => {
    const videoTitleElement = videoRendererElement.querySelector('h3 a span');
    if (videoTitleElement) {
      const videoTitle = videoTitleElement.textContent.trim();
      if (isWordInBlacklistWords(videoTitle)) {
        videoRendererElement.style.display = "";
      }
    }
  });
}

function removeHomePageContent() {
  if (window.location.pathname === "/") {
    const contentsElement = document.getElementById("contents");
    if (contentsElement) {
      contentsElement.style.display = "none";
    }
    const sections = document.querySelectorAll("ytd-rich-grid-renderer");
    sections.forEach((section) => {
      section.style.display = "none";
    });
  }
}

function showHomePageContent() {
  if (window.location.pathname === "/") {
    const contentsElement = document.getElementById("contents");
    if (contentsElement) {
      contentsElement.style.display = "";
    }
    const sections = document.querySelectorAll("ytd-rich-grid-renderer");
    sections.forEach((section) => {
      section.style.display = "";
    });
  }
}

// Added functions to remove and show autoplay overlay
function removeAutoplayOverlay() {
  const classNames = [
    "ytp-autonav-endscreen-countdown-container",
    "ytp-autonav-endscreen-small-mode",
    "ytp-autonav-endscreen-upnext-no-alternative-header",
    "ytp-player-content",
    "ytp-next-button",
  ];
  classNames.forEach((className) => {
    const elements = document.getElementsByClassName(className);
    Array.from(elements).forEach((element) => {
      element.style.display = "none";
    });
  });

  // Disable autoplay
  const autoplayToggle = document.querySelector(".ytp-autonav-toggle-button");
  if (autoplayToggle && autoplayToggle.getAttribute("aria-checked") === "true") {
    autoplayToggle.click();
  }
}

function showAutoplayOverlay() {
  const classNames = [
    "ytp-autonav-endscreen-countdown-container",
    "ytp-autonav-endscreen-small-mode",
    "ytp-autonav-endscreen-upnext-no-alternative-header",
    "ytp-player-content",
  ];
  classNames.forEach((className) => {
    const elements = document.getElementsByClassName(className);
    Array.from(elements).forEach((element) => {
      element.style.display = "";
    });
  });

  // Enable autoplay
  const autoplayToggle = document.querySelector(".ytp-autonav-toggle-button");
  if (autoplayToggle && autoplayToggle.getAttribute("aria-checked") === "false") {
    autoplayToggle.click();
  }
}

// New: functions to hide/show the left YouTube guide/sidebar
function removeYouTubeSidebar() {
  // Inject CSS for persistent hiding
  injectSidebarCSS();
  
  try {
    // Hide the sidebar itself - comprehensive selectors
    const sidebarSelectors = [
      '#guide',
      '#guide-content',
      '#guide-inner-content',
      'ytd-guide-renderer',
      'ytd-mini-guide-renderer',
      '#sections',
      'ytd-guide-section-renderer',
      'tp-yt-app-drawer',
      '#contentContainer', // Mobile sidebar
    ];
    
    sidebarSelectors.forEach((sel) => {
      const els = document.querySelectorAll(sel);
      Array.from(els).forEach((el) => {
        try { 
          el.style.setProperty('display', 'none', 'important'); 
          el.style.setProperty('visibility', 'hidden', 'important');
          el.style.setProperty('width', '0', 'important');
          el.style.setProperty('max-width', '0', 'important');
          el.style.setProperty('min-width', '0', 'important');
          el.style.setProperty('opacity', '0', 'important');
          el.setAttribute('hidden', 'true');
        } catch (e) {}
      });
    });

    // Disable the guide button (make it non-clickable but keep visible)
    const guideButtonSelectors = [
      '#guide-button',
      'ytd-masthead #guide-button',
      'button#guide-button',
      'yt-icon-button#guide-button',
      '[aria-label*="Guide"]',
      '[aria-label*="Menu"]',
    ];
    guideButtonSelectors.forEach((sel) => {
      const els = document.querySelectorAll(sel);
      Array.from(els).forEach((el) => {
        try { 
          el.style.setProperty('pointer-events', 'none', 'important');
          el.style.setProperty('opacity', '0.3', 'important');
          el.disabled = true;
          el.setAttribute('disabled', 'true');
        } catch (e) {}
      });
    });

    // Adjust layout to remove whitespace
    const layoutSelectors = [
      'ytd-app',
      'ytd-page-manager',
      '#content',
      '#page-manager',
    ];
    
    layoutSelectors.forEach((sel) => {
      const els = document.querySelectorAll(sel);
      Array.from(els).forEach((el) => {
        try {
          // Force full width layout
          if (el.style.gridTemplateColumns !== undefined) {
            el.style.setProperty('grid-template-columns', '0px 1fr', 'important');
          }
        } catch (e) {}
      });
    });

    // Force the main content to expand
    const contentSelectors = [
      'ytd-browse',
      'ytd-two-column-browse-results-renderer',
      '#primary',
      '#secondary',
    ];
    
    contentSelectors.forEach((sel) => {
      const els = document.querySelectorAll(sel);
      Array.from(els).forEach((el) => {
        try {
          el.style.setProperty('margin-left', '0', 'important');
          el.style.setProperty('padding-left', '0', 'important');
        } catch (e) {}
      });
    });

    console.debug('FocusTube: Sidebar hidden');
  } catch (e) {
    console.debug('FocusTube: Error hiding sidebar', e);
  }
}

function showYouTubeSidebar() {
  // Remove injected CSS
  removeSidebarCSS();
  
  try {
    // Show the sidebar - comprehensive selectors
    const sidebarSelectors = [
      '#guide',
      '#guide-content',
      '#guide-inner-content',
      'ytd-guide-renderer',
      'ytd-mini-guide-renderer',
      '#sections',
      'ytd-guide-section-renderer',
      'tp-yt-app-drawer',
      '#contentContainer',
    ];
    
    sidebarSelectors.forEach((sel) => {
      const els = document.querySelectorAll(sel);
      Array.from(els).forEach((el) => {
        try { 
          el.style.removeProperty('display');
          el.style.removeProperty('visibility');
          el.style.removeProperty('width');
          el.style.removeProperty('max-width');
          el.style.removeProperty('min-width');
          el.style.removeProperty('opacity');
          el.removeAttribute('hidden');
        } catch (e) {}
      });
    });

    // Re-enable the guide button
    const guideButtonSelectors = [
      '#guide-button',
      'ytd-masthead #guide-button',
      'button#guide-button',
      'yt-icon-button#guide-button',
      '[aria-label*="Guide"]',
      '[aria-label*="Menu"]',
    ];
    guideButtonSelectors.forEach((sel) => {
      const els = document.querySelectorAll(sel);
      Array.from(els).forEach((el) => {
        try { 
          el.style.removeProperty('pointer-events');
          el.style.removeProperty('opacity');
          el.disabled = false;
          el.removeAttribute('disabled');
        } catch (e) {}
      });
    });

    // Restore layout
    const layoutSelectors = [
      'ytd-app',
      'ytd-page-manager',
      '#content',
      '#page-manager',
    ];
    
    layoutSelectors.forEach((sel) => {
      const els = document.querySelectorAll(sel);
      Array.from(els).forEach((el) => {
        try {
          el.style.removeProperty('grid-template-columns');
        } catch (e) {}
      });
    });

    // Restore content margins
    const contentSelectors = [
      'ytd-browse',
      'ytd-two-column-browse-results-renderer',
      '#primary',
      '#secondary',
    ];
    
    contentSelectors.forEach((sel) => {
      const els = document.querySelectorAll(sel);
      Array.from(els).forEach((el) => {
        try {
          el.style.removeProperty('margin-left');
          el.style.removeProperty('padding-left');
        } catch (e) {}
      });
    });

    console.debug('FocusTube: Sidebar shown');
  } catch (e) {
    console.debug('FocusTube: Error showing sidebar', e);
  }
}

// New: functions to hide/show video suggestions WITHOUT hiding comments
function hideSuggestedVideos() {
  try {
    // Hide the related videos section in the sidebar (desktop)
    const related = document.getElementById('related');
    if (related) {
      related.style.display = 'none';
    }
    
    // On watch pages, hide only the video suggestions inside #secondary, NOT comments
    const secondary = document.getElementById('secondary');
    if (secondary && window.location.pathname.includes('/watch')) {
      // Instead of hiding the entire #secondary, hide only the related videos container
      const relatedChipCloud = secondary.querySelector('ytd-watch-next-secondary-results-renderer');
      if (relatedChipCloud) {
        relatedChipCloud.style.display = 'none';
      }
      
      // Also hide items container but preserve comments
      const items = secondary.querySelector('#items');
      if (items) {
        // Hide individual suggested video items, but not comment sections
        const videoItems = items.querySelectorAll('ytd-compact-video-renderer, ytd-shelf-renderer');
        videoItems.forEach(item => {
          try { item.style.display = 'none'; } catch (e) {}
        });
      }
    }
  } catch (e) {
    console.debug('FocusTube: hideSuggestedVideos error', e);
  }
}

function showSuggestedVideos() {
  try {
    // Show the related videos section
    const related = document.getElementById('related');
    if (related) {
      related.style.display = '';
    }
    
    // Show suggestions in secondary
    const secondary = document.getElementById('secondary');
    if (secondary) {
      const relatedChipCloud = secondary.querySelector('ytd-watch-next-secondary-results-renderer');
      if (relatedChipCloud) {
        relatedChipCloud.style.display = '';
      }
      
      const items = secondary.querySelector('#items');
      if (items) {
        const videoItems = items.querySelectorAll('ytd-compact-video-renderer, ytd-shelf-renderer');
        videoItems.forEach(item => {
          try { item.style.display = ''; } catch (e) {}
        });
      }
    }
  } catch (e) {
    console.debug('FocusTube: showSuggestedVideos error', e);
  }
}

// New: functions to hide/show YouTube comments
function hideComments() {
  try {
    const commentsElements = document.querySelectorAll('ytd-comments');
    commentsElements.forEach(comments => {
      try { 
        comments.style.display = 'none';
        console.debug('FocusTube: Comments hidden');
      } catch (e) {}
    });
  } catch (e) {
    console.debug('FocusTube: hideComments error', e);
  }
}

function showComments() {
  try {
    const commentsElements = document.querySelectorAll('ytd-comments');
    commentsElements.forEach(comments => {
      try { 
        comments.style.display = '';
        console.debug('FocusTube: Comments shown');
      } catch (e) {}
    });
  } catch (e) {
    console.debug('FocusTube: showComments error', e);
  }
}

function handleDOMChangesBasedOnSwitches() {
  if (hideShortsEnabled) {
    removeElementsByAttribute("is-shorts", "");
    removeElementsByTextContent("Shorts");
    // Removed problematic removeElementsByRoleAndTitle call with empty role
    removeElementsByTagName("ytd-reel-shelf-renderer");
    removeYtdVideoRendererWithShortsHref();
    removeElementsByTitle("Shorts");
    makeElementInvisible("shorts-container");
    muteAndPauseShortsVideos();
    removeShortsShelves();
    injectShortsHideCSS();
    console.debug('FocusTube: hideShortsEnabled is ON — injected aggressive CSS fallback');
  } else {
    makeElementsVisibleByAttribute("is-shorts", "");
    makeElementsVisibleByTextContent("Shorts");
    // Removed problematic makeElementsVisibleByRoleAndTitle call with empty role
    makeElementsVisibleByTagName("ytd-reel-shelf-renderer");
    makeYtdVideoRendererWithShortsHrefVisible();
    makeElementsVisibleByTitle("Shorts");
    makeElementVisible("shorts-container");
    unmuteAndPlayShortsVideos();
    showShortsShelves();
    // Remove the aggressive CSS when feature is disabled
    removeShortsHideCSS();
    console.debug('FocusTube: hideShortsEnabled is OFF — removed aggressive CSS fallback');
  }

  if (hideSuggestionsEnabled) {
    hideSuggestedVideos();
  } else {
    showSuggestedVideos();
    console.debug('FocusTube: hideSuggestions is OFF - suggestions visible');
  }

  if (hideCommentsEnabled) {
    hideComments();
  } else {
    showComments();
    console.debug('FocusTube: hideComments is OFF - comments visible');
  }

  if (hideBlacklistedChannelsEnabled) {
    removeBlacklistedVideos();
  } else {
    makeVisibleBlacklistedVideos();
  }

  if (hideBlacklistedWordsEnabled) {
    removeBlacklistedWordsVideos();
  } else {
    makeVisibleBlacklistedWordsVideos();
  }

  if (hideHomePageContentEnabled) {
    removeHomePageContent();
  } else {
    showHomePageContent();
  }

  if (hideAutoplayOverlayEnabled) {
    removeAutoplayOverlay(); // Added
  } else {
    showAutoplayOverlay(); // Added
  }

  // Sidebar / guide (left column) hide/show
  if (hideSidebarEnabled) {
    removeYouTubeSidebar();
  } else {
    showYouTubeSidebar();
  }
}

function observeDOMChanges() {
  if (observer) {
    return;
  }

  // Hide shorts container immediately to prevent flash
  makeElementInvisible("shorts-container");
  muteAndPauseShortsVideos();
    // Initial call to remove any existing shelves
    removeShortsShelves();

  chrome.storage.sync.get(
    [
      "hideShorts",
      "hideSuggestions",
      "hideComments",
      "hideBlacklistedChannels",
      "blacklist",
      "blacklistWords",
      "hideBlacklistedWords",
      "hideHomePageContent",
      "hideAutoplayOverlay", // Added
      "hideSidebar",
    ],
    (result) => {
      const defaultStates = {
        hideShorts: true,
        hideSuggestions: true,
        hideComments: false,
        hideBlacklistedChannels: true,
        hideBlacklistedWords: true,
        hideHomePageContent: false,
        hideAutoplayOverlay: false, // Added
      };

      hideShortsEnabled =
        result.hideShorts !== undefined ? result.hideShorts : defaultStates.hideShorts;
      hideSuggestionsEnabled =
        result.hideSuggestions !== undefined
          ? result.hideSuggestions
          : defaultStates.hideSuggestions;
      hideCommentsEnabled =
        result.hideComments !== undefined
          ? result.hideComments
          : defaultStates.hideComments;
      hideBlacklistedChannelsEnabled =
        result.hideBlacklistedChannels !== undefined
          ? result.hideBlacklistedChannels
          : defaultStates.hideBlacklistedChannels;
      hideBlacklistedWordsEnabled =
        result.hideBlacklistedWords !== undefined
          ? result.hideBlacklistedWords
          : defaultStates.hideBlacklistedWords;
      hideHomePageContentEnabled =
        result.hideHomePageContent !== undefined
          ? result.hideHomePageContent
          : defaultStates.hideHomePageContent;
      hideAutoplayOverlayEnabled =
        result.hideAutoplayOverlay !== undefined
          ? result.hideAutoplayOverlay
          : defaultStates.hideAutoplayOverlay;
      hideSidebarEnabled =
        result.hideSidebar !== undefined ? result.hideSidebar : false;

      console.log("Initial States:", {
        hideShortsEnabled,
        hideSuggestionsEnabled,
        hideCommentsEnabled,
        hideBlacklistedChannelsEnabled,
        hideBlacklistedWordsEnabled,
        hideHomePageContentEnabled,
        hideAutoplayOverlayEnabled,
        hideSidebarEnabled,
      });

      blacklist = result.blacklist ?? [];
      blacklistWords = result.blacklistWords ?? [];

      handleDOMChangesBasedOnSwitches();

      observer = new MutationObserver(() => {
        handleDOMChangesBasedOnSwitches();
        removeShortsShelves();
        HTML = document.documentElement;
      });

      const config = { childList: true, subtree: true };
      observer.observe(document.body, config);

      // Additional scan after a short delay to handle edge cases with dynamic loading
      setTimeout(() => {
        handleDOMChangesBasedOnSwitches();
      }, 1000);
    }
  );
}

// Adapt caption container to video player size changes
function setupCaptionContainerAdapter() {
  let resizeObserver = null;
  let lastKnownWidth = 0;
  let lastKnownHeight = 0;

  function updateCaptionContainer() {
    try {
      const captionContainer = document.querySelector('#ytp-caption-window-container');
      const ytdPlayer = document.querySelector('#ytd-player');
      const moviePlayer = document.querySelector('#movie_player');
      const videoElement = document.querySelector('.html5-video-container video');

      if (!captionContainer) return;

      // Get dimensions from the most reliable source
      let width = 0;
      let height = 0;

      if (videoElement && videoElement.style.width && videoElement.style.height) {
        width = parseFloat(videoElement.style.width);
        height = parseFloat(videoElement.style.height);
      } else if (moviePlayer) {
        const rect = moviePlayer.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
      } else if (ytdPlayer) {
        const rect = ytdPlayer.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
      }

      // Only update if dimensions have changed significantly (avoid unnecessary updates)
      if (width > 0 && height > 0 && 
          (Math.abs(width - lastKnownWidth) > 1 || Math.abs(height - lastKnownHeight) > 1)) {
        
        lastKnownWidth = width;
        lastKnownHeight = height;

        // Force recalculation of caption positioning
        captionContainer.style.width = `${width}px`;
        captionContainer.style.height = `${height}px`;
        
        // Trigger reflow by accessing a property
        void captionContainer.offsetWidth;

        console.debug(`FocusTube: Caption container adapted to ${width}x${height}px`);
      }
    } catch (e) {
      console.debug('FocusTube: Error updating caption container', e);
    }
  }

  function observePlayer() {
    // Clean up existing observer
    if (resizeObserver) {
      resizeObserver.disconnect();
    }

    const ytdPlayer = document.querySelector('#ytd-player');
    const moviePlayer = document.querySelector('#movie_player');
    const playerContainer = document.querySelector('#player-container');

    if (!ytdPlayer && !moviePlayer && !playerContainer) {
      // Retry after a short delay
      setTimeout(observePlayer, 500);
      return;
    }

    // Create ResizeObserver to watch for size changes
    resizeObserver = new ResizeObserver((entries) => {
      updateCaptionContainer();
    });

    // Observe all relevant elements
    if (ytdPlayer) resizeObserver.observe(ytdPlayer);
    if (moviePlayer) resizeObserver.observe(moviePlayer);
    if (playerContainer) resizeObserver.observe(playerContainer);

    // Initial update
    updateCaptionContainer();

    console.debug('FocusTube: Caption container adapter initialized');
  }

  // Start observing
  observePlayer();

  // Also watch for DOM changes that might add/remove the player
  const domObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) { // Element node
          const el = node;
          if (el.id === 'ytd-player' || 
              el.id === 'movie_player' || 
              el.id === 'ytp-caption-window-container' ||
              el.querySelector && (el.querySelector('#ytd-player') || 
                                   el.querySelector('#movie_player') ||
                                   el.querySelector('#ytp-caption-window-container'))) {
            observePlayer();
            break;
          }
        }
      }
    }
  });

  domObserver.observe(document.body, { childList: true, subtree: true });
}

function init() {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "switchChange") {
      console.log("Received switchChange message:", message);
      if (message.switchType === "hideShorts") {
        hideShortsEnabled = message.state;
      } else if (message.switchType === "hideSuggestions") {
        hideSuggestionsEnabled = message.state;
      } else if (message.switchType === "hideComments") {
        hideCommentsEnabled = message.state;
      } else if (message.switchType === "hideBlacklistedChannels") {
        hideBlacklistedChannelsEnabled = message.state;
      } else if (message.switchType === "blacklist") {
        blacklist = message.state;
      } else if (message.switchType === "blacklistWords") {
        blacklistWords = message.state;
      } else if (message.switchType === "hideBlacklistedWords") {
        hideBlacklistedWordsEnabled = message.state;
      } else if (message.switchType === "hideHomePageContent") {
        hideHomePageContentEnabled = message.state;
      } else if (message.switchType === "hideAutoplayOverlay") {
        hideAutoplayOverlayEnabled = message.state;
      } else if (message.switchType === "hideSidebar") {
        hideSidebarEnabled = message.state;
      }
      console.log("Updated States:", {
        hideShortsEnabled,
        hideSuggestionsEnabled,
        hideCommentsEnabled,
        hideBlacklistedChannelsEnabled,
        hideBlacklistedWordsEnabled,
        hideHomePageContentEnabled,
        hideAutoplayOverlayEnabled,
        hideSidebarEnabled,
      });
      handleDOMChangesBasedOnSwitches();
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync") {
      for (let [key, { newValue }] of Object.entries(changes)) {
        if (key === "hideShorts") hideShortsEnabled = newValue;
        if (key === "hideSuggestions") hideSuggestionsEnabled = newValue;
        if (key === "hideComments") hideCommentsEnabled = newValue;
        if (key === "hideBlacklistedChannels") hideBlacklistedChannelsEnabled = newValue;
        if (key === "blacklist") blacklist = newValue;
        if (key === "blacklistWords") blacklistWords = newValue;
        if (key === "hideBlacklistedWords") hideBlacklistedWordsEnabled = newValue;
        if (key === "hideHomePageContent") hideHomePageContentEnabled = newValue;
        if (key === "hideAutoplayOverlay") hideAutoplayOverlayEnabled = newValue;
        if (key === "hideSidebar") hideSidebarEnabled = newValue;
      }
      console.log("Storage changed, updated states:", {
        hideShortsEnabled,
        hideSuggestionsEnabled,
        hideCommentsEnabled,
        hideBlacklistedChannelsEnabled,
        hideBlacklistedWordsEnabled,
        hideHomePageContentEnabled,
        hideAutoplayOverlayEnabled,
        hideSidebarEnabled,
      });
      handleDOMChangesBasedOnSwitches();
    }
  });

  observeDOMChanges();
  setupCaptionContainerAdapter();
}

init();
