// popup.js

function updateSwitchState(switchType, state) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [switchType]: state }, resolve);
  });
}

async function handleSwitchChange(switchType, checkbox) {
  const state = checkbox.checked;
  await updateSwitchState(switchType, state);
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: "switchChange",
        switchType: switchType,
        state: state,
      });
    }
  });
}

function handleCheckboxStates(states) {
  const defaultStates = {
    hideShorts: true,
    hideSuggestions: true,
    hideBlacklistedChannels: true,
    hideBlacklistedWords: true,
    hideHomePageContent: false,
    hideAutoplayOverlay: false, // Added
  };

  const checkboxMappings = {
    hideShortsCheckbox: "hideShorts",
    hideSuggestionsCheckbox: "hideSuggestions",
    hideBlacklistedCheckbox: "hideBlacklistedChannels",
    hideBlacklistedWordsCheckbox: "hideBlacklistedWords",
    hideHomePageContentCheckbox: "hideHomePageContent",
    hideAutoplayOverlayCheckbox: "hideAutoplayOverlay", // Added
  };

  Object.entries(checkboxMappings).forEach(([checkboxId, switchType]) => {
    const checkbox = document.getElementById(checkboxId);
    if (checkbox) {
      checkbox.checked =
        states[switchType] !== undefined ? states[switchType] : defaultStates[switchType];
      checkbox.addEventListener("change", () => handleSwitchChange(switchType, checkbox));
    }
  });

  updateBlacklistList(states.blacklist ?? []);
  updateBlacklistWordsList(states.blacklistWords ?? []);
}

function createBlacklistItem(channelId) {
  const blacklistItem = document.createElement("div");
  blacklistItem.className = "blacklist-item";
  blacklistItem.innerHTML = `<div class="channel-id">${channelId}</div><button class="remove-button">Remove</button>`;
  blacklistItem.querySelector(".remove-button").addEventListener("click", () => {
    chrome.storage.sync.get("blacklist", (result) => {
      const updatedBlacklist = result.blacklist.filter((id) => id !== channelId);
      updateBlacklist(updatedBlacklist);
      blacklistItem.remove();
      sendMessageToContentScript({
        type: "switchChange",
        switchType: "blacklist",
        state: updatedBlacklist,
      });
    });
  });
  return blacklistItem;
}

function createBlacklistWordsItem(word) {
  const blacklistWordsItem = document.createElement("div");
  blacklistWordsItem.className = "blacklist-item";
  blacklistWordsItem.innerHTML = `<div class="word">${word}</div><button class="remove-button">Remove</button>`;
  blacklistWordsItem.querySelector(".remove-button").addEventListener("click", () => {
    chrome.storage.sync.get("blacklistWords", (result) => {
      const updatedBlacklistWords = result.blacklistWords.filter((w) => w !== word);
      updateBlacklistWords(updatedBlacklistWords);
      blacklistWordsItem.remove();
      sendMessageToContentScript({
        type: "switchChange",
        switchType: "blacklistWords",
        state: updatedBlacklistWords,
      });
    });
  });
  return blacklistWordsItem;
}

function sendMessageToContentScript(message) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      chrome.tabs.sendMessage(tabs[0].id, message);
    }
  });
}

function updateBlacklist(blacklist) {
  chrome.storage.sync.set({ blacklist: blacklist });
}

function updateBlacklistWords(blacklistWords) {
  chrome.storage.sync.set({ blacklistWords: blacklistWords });
}

function updateBlacklistList(blacklist) {
  const blacklistList = document.getElementById("blacklistList");
  blacklistList.innerHTML = "";
  blacklist.forEach((channelId) =>
    blacklistList.appendChild(createBlacklistItem(channelId))
  );
}

function updateBlacklistWordsList(blacklistWords) {
  const blacklistWordsList = document.getElementById("blacklistListWords");
  blacklistWordsList.innerHTML = "";
  blacklistWords.forEach((word) =>
    blacklistWordsList.appendChild(createBlacklistWordsItem(word))
  );
}

function monitorStorageChanges() {
  chrome.storage.onChanged.addListener((changes, namespace) => {
    for (let [key, { newValue }] of Object.entries(changes)) {
      if (key === "blacklist") {
        updateBlacklistList(newValue);
      } else if (key === "blacklistWords") {
        updateBlacklistWordsList(newValue);
      } else {
        const checkboxId = `${key}Checkbox`;
        const checkbox = document.getElementById(checkboxId);
        if (checkbox) checkbox.checked = newValue;
      }
    }
  });
}

function toggleVisibility(elementId) {
  const element = document.getElementById(elementId);
  element.style.display = element.style.display === "none" ? "block" : "none";
}

async function startPopup() {
  document.addEventListener("DOMContentLoaded", () => {

    const elements = document.querySelectorAll('.i18n');
      elements.forEach(el => {
        const messageName = el.getAttribute('data-message');
        el.textContent = chrome.i18n.getMessage(messageName);
      });
      const blacklistInput = document.getElementById('blacklistInput');
      if (blacklistInput) {
        blacklistInput.placeholder = chrome.i18n.getMessage('channelNamePlaceholder');
      }
      const blacklistWordsInput = document.getElementById('blacklistWordsInput');
      if (blacklistWordsInput) {
        blacklistWordsInput.placeholder = chrome.i18n.getMessage('wordPlaceholder');
      }

      // Set document title
      document.title = chrome.i18n.getMessage('extensionName');
    blacklistContainer.style.display = "none";
    wordsBlacklistContainer.style.display = "none";
    document
      .getElementById("toggleBlacklistButton")
      .addEventListener("click", () => toggleVisibility("blacklistContainer"));
    document
      .getElementById("toggleBlacklistWordsButton")
      .addEventListener("click", () => toggleVisibility("wordsBlacklistContainer"));

    document
      .getElementById("blacklistButton")
      .addEventListener("click", handleAddToBlacklist);
    document
      .getElementById("blacklistButtonWords")
      .addEventListener("click", handleAddToBlacklistWords);

    monitorStorageChanges();
    chrome.storage.sync.get(
      [
        "hideSuggestions",
        "hideShorts",
        "hideBlacklistedChannels",
        "hideBlacklistedWords",
        "hideHomePageContent",
        "hideAutoplayOverlay",
        "blacklist",
        "blacklistWords",
      ],
      handleCheckboxStates
    );
  });
}

startPopup();

function handleAddToBlacklist() {
  const blacklistInput = document.getElementById("blacklistInput");
  const channelId = blacklistInput.value.trim();
  if (channelId) {
    chrome.storage.sync.get("blacklist", (result) => {
      const updatedBlacklist = result.blacklist
        ? [...result.blacklist, channelId]
        : [channelId];
      updateBlacklist(updatedBlacklist);
      blacklistInput.value = "";
      sendMessageToContentScript({ action: "updateBlacklist" });
    });
  }
}

function handleAddToBlacklistWords() {
  const blacklistWordsInput = document.getElementById("blacklistWordsInput");
  const word = blacklistWordsInput.value.trim();
  if (word) {
    chrome.storage.sync.get("blacklistWords", (result) => {
      const updatedBlacklistWords = result.blacklistWords
        ? [...result.blacklistWords, word]
        : [word];
      updateBlacklistWords(updatedBlacklistWords);
      blacklistWordsInput.value = "";
      sendMessageToContentScript({ action: "updateBlacklistWords" });
    });
  }
}
