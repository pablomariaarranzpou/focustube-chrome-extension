// content.js

let HTML = document.documentElement;
let observer = null;

let hideShortsEnabled = true;
let hideSuggestionsEnabled = true;
let hideBlacklistedChannelsEnabled = true;
let hideBlacklistedWordsEnabled = true;
let hideHomePageContentEnabled = false;
let hideAutoplayOverlayEnabled = false; // Added

let blacklist = [];
let blacklistWords = [];

function makeElementVisible(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.style.display = "";
  }
}

function makeElementInvisible(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.style.display = "none";
  }
}

function removeElements(elements) {
  elements.forEach((element) => {
    element.style.display = "none";
  });
}

function makeElementsVisible(elements) {
  elements.forEach((element) => {
    element.style.display = "";
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

function removeElementsByTagName(tagName) {
  const elements = document.querySelectorAll(tagName);
  removeElements(elements);
}

function makeElementsVisibleByTagName(tagName) {
  const elements = document.querySelectorAll(tagName);
  makeElementsVisible(elements);
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
    const channelNameElement = videoRendererElement.querySelector("#channel-name #text a");
    if (channelNameElement) {
      const channelName = channelNameElement.textContent.trim();
      if (isChannelInBlacklist(channelName)) {
        videoRendererElement.style.display = "none";
      }
    }
  });
}

function makeVisibleBlacklistedVideos() {
  const videoRendererElements = document.querySelectorAll("ytd-rich-item-renderer");
  videoRendererElements.forEach((videoRendererElement) => {
    const channelNameElement = videoRendererElement.querySelector("#channel-name #text a");
    if (channelNameElement) {
      const channelName = channelNameElement.textContent.trim();
      if (isChannelInBlacklist(channelName)) {
        videoRendererElement.style.display = "";
      }
    }
  });
}

function removeBlacklistedWordsVideos() {
  const videoRendererElements = document.querySelectorAll("ytd-rich-item-renderer");
  videoRendererElements.forEach((videoRendererElement) => {
    const videoTitleElement = videoRendererElement.querySelector("#video-title");
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
    const videoTitleElement = videoRendererElement.querySelector("#video-title");
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

function handleDOMChangesBasedOnSwitches() {
  if (hideShortsEnabled) {
    removeElementsByAttribute("is-shorts", "");
    removeElementsByTextContent("Shorts");
    removeElementsByRoleAndTitle("", "Shorts");
    removeElementsByTagName("ytd-reel-shelf-renderer");
    removeYtdVideoRendererWithShortsHref();
    removeElementsByTitle("Shorts");
  } else {
    makeElementsVisibleByAttribute("is-shorts", "");
    makeElementsVisibleByTextContent("Shorts");
    makeElementsVisibleByRoleAndTitle("", "Shorts");
    makeElementsVisibleByTagName("ytd-reel-shelf-renderer");
    makeYtdVideoRendererWithShortsHrefVisible();
    makeElementsVisibleByTitle("Shorts");
  }

  if (hideSuggestionsEnabled) {
    makeElementInvisible("related");
    makeElementInvisible("secondary");
  } else {
    makeElementVisible("related");
    makeElementVisible("secondary");
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
}

function observeDOMChanges() {
  if (observer) {
    return;
  }

  chrome.storage.sync.get(
    [
      "hideShorts",
      "hideSuggestions",
      "hideBlacklistedChannels",
      "blacklist",
      "blacklistWords",
      "hideBlacklistedWords",
      "hideHomePageContent",
      "hideAutoplayOverlay", // Added
    ],
    (result) => {
      const defaultStates = {
        hideShorts: true,
        hideSuggestions: true,
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

      console.log("Initial States:", {
        hideShortsEnabled,
        hideSuggestionsEnabled,
        hideBlacklistedChannelsEnabled,
        hideBlacklistedWordsEnabled,
        hideHomePageContentEnabled,
        hideAutoplayOverlayEnabled,
      });

      blacklist = result.blacklist ?? [];
      blacklistWords = result.blacklistWords ?? [];

      handleDOMChangesBasedOnSwitches();

      observer = new MutationObserver(() => {
        handleDOMChangesBasedOnSwitches();
        HTML = document.documentElement;
      });

      const config = { childList: true, subtree: true };
      observer.observe(document.body, config);
    }
  );
}

function init() {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "switchChange") {
      console.log("Received switchChange message:", message);
      if (message.switchType === "hideShorts") {
        hideShortsEnabled = message.state;
      } else if (message.switchType === "hideSuggestions") {
        hideSuggestionsEnabled = message.state;
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
        hideAutoplayOverlayEnabled = message.state; // Added
      }
      console.log("Updated States:", {
        hideShortsEnabled,
        hideSuggestionsEnabled,
        hideBlacklistedChannelsEnabled,
        hideBlacklistedWordsEnabled,
        hideHomePageContentEnabled,
        hideAutoplayOverlayEnabled, // Added
      });
      handleDOMChangesBasedOnSwitches();
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync") {
      for (let [key, { newValue }] of Object.entries(changes)) {
        if (key === "hideShorts") hideShortsEnabled = newValue;
        if (key === "hideSuggestions") hideSuggestionsEnabled = newValue;
        if (key === "hideBlacklistedChannels") hideBlacklistedChannelsEnabled = newValue;
        if (key === "blacklist") blacklist = newValue;
        if (key === "blacklistWords") blacklistWords = newValue;
        if (key === "hideBlacklistedWords") hideBlacklistedWordsEnabled = newValue;
        if (key === "hideHomePageContent") hideHomePageContentEnabled = newValue;
        if (key === "hideAutoplayOverlay") hideAutoplayOverlayEnabled = newValue; // Added
      }
      console.log("Storage changed, updated states:", {
        hideShortsEnabled,
        hideSuggestionsEnabled,
        hideBlacklistedChannelsEnabled,
        hideBlacklistedWordsEnabled,
        hideHomePageContentEnabled,
        hideAutoplayOverlayEnabled, // Added
      });
      handleDOMChangesBasedOnSwitches();
    }
  });

  observeDOMChanges();
}

init();
