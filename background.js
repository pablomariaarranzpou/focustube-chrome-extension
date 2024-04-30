chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === "switchChange") {
    updateSwitchState(message.switchType, message.state);
    await sendMessageToActiveTab({
      type: "switchChange",
      switchType: message.switchType,
      state: message.state,
    });
  } else if (message.type === "getCheckboxStates") {
    const checkboxStates = await getCheckboxStates();
    sendResponse(checkboxStates);
  } else if (message.type === "addToBlacklist") {
    await addToBlacklist(message.channelId);
  }
});

async function updateSwitchState(switchType, state) {
  const update = {};
  update[switchType] = state;
  await new Promise((resolve) => {
    chrome.storage.sync.set(update, () => {
      resolve();
    });
  });
}

async function sendMessageToActiveTab(message) {
  const tabs = await new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs);
    });
  });

  const activeTabId = tabs[0].id;
  if (activeTabId) {
    await new Promise((resolve) => {
      chrome.tabs.sendMessage(activeTabId, message, () => {
        resolve();
      });
    });
  }
}

async function getCheckboxStates() {
  return await new Promise((resolve) => {
    chrome.storage.sync.get(
      ["hideShorts", "hideSuggestions", "hideBlacklistedChannels", "blacklist", "blacklistWords", "hideBlacklistedWords"],
      (result) => {
        resolve(result);
      }
    );
  });
}

async function addToBlacklist(channelId) {
  const result = await new Promise((resolve) => {
    chrome.storage.sync.get("blacklist", (result) => {
      resolve(result);
    });
  });

  const updatedBlacklist = result.blacklist || [];
  updatedBlacklist.push(channelId);

  await new Promise((resolve) => {
    chrome.storage.sync.set({ blacklist: updatedBlacklist }, () => {
      resolve();
    });
  });

  await sendMessageToActiveTab({
    type: "switchChange",
    switchType: "blacklist",
    state: updatedBlacklist,
  });
}
