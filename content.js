let HTML = document.documentElement;
let observer = null;

let hideShortsEnabled = true;
let hideSuggestionsEnabled = true;
let hideBlacklistedChannelsEnabled = true;
let hideBlacklistedWordsEnabled = true;

let initialSwitchStateStored = false;


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
  const matchedElements = Array.from(elements).filter((element) => element.textContent.trim() === textContent);
  removeElements(matchedElements);
}

function makeElementsVisibleByTextContent(textContent) {
  const elements = document.querySelectorAll(`yt-formatted-string`);
  const matchedElements = Array.from(elements).filter((element) => element.textContent.trim() === textContent);
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
  const videoRendererElements = document.querySelectorAll('ytd-video-renderer');
  videoRendererElements.forEach((videoRendererElement) => {
    const anchorElement = videoRendererElement.querySelector('a[href^="/shorts"]');
    if (anchorElement) {
      videoRendererElement.style.display = "none";
    }
  });
}

function makeYtdVideoRendererWithShortsHrefVisible() {
  const videoRendererElements = document.querySelectorAll('ytd-video-renderer');
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

function removeBlacklistedVideos() {
  const videoRendererElements = document.querySelectorAll('ytd-rich-grid-row ytd-rich-item-renderer');
  videoRendererElements.forEach((videoRendererElement) => {
    const channelNameElement = videoRendererElement.querySelector('#text-container yt-formatted-string a');
    if (channelNameElement) {
      const channelName = channelNameElement.textContent.trim();
      if (isChannelInBlacklist(channelName)) {
        videoRendererElement.style.display = "none";
      }
    }
  });
}

function makeVisibleBlacklistedVideos() {
  const videoRendererElements = document.querySelectorAll('ytd-rich-grid-row ytd-rich-item-renderer');
  videoRendererElements.forEach((videoRendererElement) => {
    const channelNameElement = videoRendererElement.querySelector('#text-container yt-formatted-string a');
    if (channelNameElement) {
      const channelName = channelNameElement.textContent.trim();
      if (isChannelInBlacklist(channelName)) {
        videoRendererElement.style.display = "";
      }
    }
  });
}

function isChannelInBlacklist(channelName) {
  return blacklist.includes(channelName);
}

function removeBlacklistedWordsVideos() {
  const videoRendererElements = document.querySelectorAll('ytd-rich-grid-row ytd-rich-item-renderer');
  videoRendererElements.forEach((videoRendererElement) => {
    const videoTitleElement = videoRendererElement.querySelector('#video-title');
    if (videoTitleElement) {
      const videoTitle = videoTitleElement.textContent.trim();
      if (isWordInBlacklistWords(videoTitle)) {
        videoRendererElement.style.display = "none";
      }
    }
  });
}

function makeVisibleBlacklistedWordsVideos() {
  const videoRendererElements = document.querySelectorAll('ytd-rich-grid-row ytd-rich-item-renderer');
  videoRendererElements.forEach((videoRendererElement) => {
    const videoTitleElement = videoRendererElement.querySelector('#video-title');
    if (videoTitleElement) {
      const videoTitle = videoTitleElement.textContent.trim();
      if (isWordInBlacklistWords(videoTitle)) {
        videoRendererElement.style.display = ""; // Empty string to make it visible
      }
    }
  });
}

function makeElementsVisibleByTitle(title) {
  const elements = document.querySelectorAll(`[title="${title}"]`);
  makeElementsVisible(elements);
}

function isWordInBlacklistWords(word) {
  return blacklistWords.some(blacklistWord => word.toLowerCase().includes(blacklistWord.toLowerCase()));
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
  }else{
    makeVisibleBlacklistedVideos();

  } if (hideBlacklistedWordsEnabled) {
    removeBlacklistedWordsVideos();
  } else {
    makeVisibleBlacklistedWordsVideos();
  }
}

function handleInitialStateMessage(message) {
  hideShortsEnabled = message.state.hideShorts;
  hideSuggestionsEnabled = message.state.hideSuggestions;
  hideBlacklistedChannelsEnabled = message.state.hideBlacklistedChannels;
  hideBlacklistedWordsEnabled = message.state.hideBlacklistedWords;
  blacklist = message.state.blacklist;
  blacklistWords = message.state.blacklistWords;
  

  handleDOMChangesBasedOnSwitches();
}

function observeDOMChanges() {
  if (observer) {
    return;
  }

  chrome.storage.sync.get(
    ["hideShorts", "hideSuggestions", "hideBlacklistedChannels", "blacklist", "blacklistWords", "hideBlacklistedWords"],
    (result) => {
      hideShortsEnabled = result.hideShorts ?? true;
      hideSuggestionsEnabled = result.hideSuggestions ?? true;
      hideBlacklistedChannelsEnabled = result.hideBlacklistedChannels ?? true;
      hideBlacklistedWordsEnabled = result.hideBlacklistedWords ?? true;
      blacklist = result.blacklist ?? [];
      blacklistWords = result.blacklistWords ?? [];

      handleDOMChangesBasedOnSwitches();

      observer = new MutationObserver(() => {
        handleDOMChangesBasedOnSwitches();
        HTML = document.documentElement;
        console.log("DOM changed");
      });

      const config = { childList: true, subtree: true };
      observer.observe(document.body, config);
    }
  );
}

async function init() {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "initialState") {
      handleInitialStateMessage(message);
    } else if (message.type === "switchChange") {
      if (message.switchType === "hideShorts") {
        hideShortsEnabled = message.state;
      } else if (message.switchType === "hideSuggestions") {
        hideSuggestionsEnabled = message.state;
      } else if (message.switchType === "hideBlacklistedChannels") {
        hideBlacklistedChannelsEnabled = message.state;
      } else if (message.switchType === "blacklist") {
        blacklist = message.state;
      }else if (message.switchType === "blacklistWords") {
        blacklistWords = message.state;
      } else if (message.switchType === "hideBlacklistedWords") {
        hideBlacklistedWordsEnabled = message.state;
      }
      handleDOMChangesBasedOnSwitches();
    }
  });

  observeDOMChanges();
}

init();