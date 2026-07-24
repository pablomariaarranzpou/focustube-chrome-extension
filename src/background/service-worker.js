/**
 * Background service worker for Focus Mode.
 * Owns the session/schedule timers via chrome.alarms (survives service worker
 * suspension and browser restarts, since state always lives in chrome.storage
 * and is re-derived on every entry point rather than kept in memory).
 *
 * Focus Mode is a single active mode ('off' | 'always' | 'timer' | 'schedule'),
 * not several independently-combinable toggles - see FocusModeStateComputer.js.
 */
importScripts('../core/FocusModeStateComputer.js');

const SESSION_ALARM = 'focustube_session_alarm';
const HEARTBEAT_ALARM = 'focustube_heartbeat_alarm';
const YOUTUBE_URL_PATTERN = /^https?:\/\/([^/]*\.)?(youtube\.com|m\.youtube\.com)\//;
const VALID_MODES = ['off', 'always', 'timer', 'schedule'];

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

function getSession() {
  return new Promise(resolve => {
    chrome.storage.local.get(['focustube_focus_session'], r => resolve(r.focustube_focus_session || null));
  });
}

function setSession(session) {
  return new Promise(resolve => {
    if (session) {
      chrome.storage.local.set({ focustube_focus_session: session }, resolve);
    } else {
      chrome.storage.local.remove('focustube_focus_session', resolve);
    }
  });
}

function getSchedule() {
  return new Promise(resolve => {
    chrome.storage.sync.get(['focustube_recurring_schedule'], r => resolve(r.focustube_recurring_schedule || []));
  });
}

/**
 * Defaults to 'always' when never set (fresh install), matching the
 * product's "distraction-free by default" stance. onInstalled also seeds
 * this key explicitly (see bottom of file) so the default is a real stored
 * fact, not just an in-memory fallback scattered across call sites.
 */
function getActiveMode() {
  return new Promise(resolve => {
    chrome.storage.sync.get(['focustube_focus_active_mode'], r => {
      resolve(VALID_MODES.includes(r.focustube_focus_active_mode) ? r.focustube_focus_active_mode : 'always');
    });
  });
}

function setActiveMode(mode) {
  return new Promise(resolve => {
    chrome.storage.sync.set({ focustube_focus_active_mode: mode }, resolve);
  });
}

// ---------------------------------------------------------------------------
// Core state machine
// ---------------------------------------------------------------------------

async function reconcile() {
  const session = await getSession();
  if (session && session.active) {
    if (Date.now() >= session.endsAt) {
      await handlePhaseEnd();
    } else {
      chrome.alarms.create(SESSION_ALARM, { when: session.endsAt });
    }
  }
  await updateHeartbeat();
  await broadcastState();
}

async function handlePhaseEnd() {
  const session = await getSession();
  if (!session || !session.active) return;

  if (session.phase === 'focus' && session.breakDurationMin > 0) {
    const breakEndsAt = Date.now() + session.breakDurationMin * 60000;
    await setSession({ ...session, phase: 'break', endsAt: breakEndsAt });
    chrome.alarms.create(SESSION_ALARM, { when: breakEndsAt });
    notify('focusEndNotificationTitle', 'focusEndNotificationBody');
  } else {
    await setSession(null);
    chrome.alarms.clear(SESSION_ALARM);
    if (session.phase === 'break') {
      notify('breakEndNotificationTitle', 'breakEndNotificationBody');
    } else {
      notify('focusEndNotificationTitle', 'focusEndNotificationBody');
    }
  }

  await broadcastState();
}

/**
 * Arms/clears the once-a-minute heartbeat, driven entirely by which mode is
 * currently selected. This is what re-asserts a manual popup override (see
 * Feature.toggle()) back to the Focus-Mode-forced state after ~60s, and what
 * catches a recurring schedule's window boundaries while that mode is active.
 */
async function updateHeartbeat() {
  const mode = await getActiveMode();
  let shouldRun = false;

  if (mode === 'always') {
    shouldRun = true;
  } else if (mode === 'timer') {
    const session = await getSession();
    shouldRun = !!(session && session.active);
  } else if (mode === 'schedule') {
    const schedule = await getSchedule();
    shouldRun = (schedule || []).some(b => b.enabled);
  }

  if (shouldRun) {
    chrome.alarms.create(HEARTBEAT_ALARM, { periodInMinutes: 1 });
  } else {
    chrome.alarms.clear(HEARTBEAT_ALARM);
  }
}

async function broadcastState() {
  const [mode, session, schedule] = await Promise.all([getActiveMode(), getSession(), getSchedule()]);
  const snapshot = computeFocusGate(mode, session, schedule, Date.now());
  const message = { type: 'focusModeStateChanged', ...snapshot };

  chrome.tabs.query({}, tabs => {
    tabs.forEach(tab => {
      if (!tab.id || !tab.url || !YOUTUBE_URL_PATTERN.test(tab.url)) return;
      chrome.tabs.sendMessage(tab.id, message, () => void chrome.runtime.lastError);
    });
  });

  chrome.runtime.sendMessage(message, () => void chrome.runtime.lastError);
}

function notify(titleKey, bodyKey) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL('128.png'),
    title: chrome.i18n.getMessage(titleKey),
    message: chrome.i18n.getMessage(bodyKey)
  });
}

// ---------------------------------------------------------------------------
// Message handling - only responds to the message types it owns, so it never
// races a content script's listener for the same chrome.runtime.onMessage channel.
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message.type !== 'string') return false;

  if (message.type === 'setFocusMode') {
    const mode = VALID_MODES.includes(message.mode) ? message.mode : 'off';

    getActiveMode().then(async (previousMode) => {
      // Leaving 'timer' mode invalidates any session tied to it - otherwise
      // it would keep ticking (and eventually notify) in the background even
      // though the user is no longer "in" that mode.
      if (previousMode === 'timer' && mode !== 'timer') {
        await setSession(null);
        chrome.alarms.clear(SESSION_ALARM);
      }
      await setActiveMode(mode);
      await updateHeartbeat();
      await broadcastState();
      sendResponse({ success: true, mode });
    });
    return true;
  }

  if (message.type === 'startFocusSession') {
    const focusDurationMin = Number(message.focusDurationMin) || 25;
    const breakDurationMin = Number(message.breakDurationMin) || 0;
    const startedAt = Date.now();
    const endsAt = startedAt + focusDurationMin * 60000;
    const session = { active: true, phase: 'focus', startedAt, endsAt, focusDurationMin, breakDurationMin };

    setSession(session).then(() => {
      chrome.storage.sync.set({ focustube_focus_config: { focusDurationMin, breakDurationMin } });
      chrome.alarms.create(SESSION_ALARM, { when: endsAt });
      return setActiveMode('timer'); // starting a timer IS choosing Timer mode
    }).then(updateHeartbeat)
      .then(broadcastState)
      .then(() => sendResponse({ success: true, session }));
    return true;
  }

  if (message.type === 'stopFocusSession') {
    setSession(null).then(() => {
      chrome.alarms.clear(SESSION_ALARM);
      return updateHeartbeat();
    }).then(broadcastState)
      .then(() => sendResponse({ success: true }));
    return true;
  }

  if (message.type === 'getFocusModeState') {
    Promise.all([getActiveMode(), getSession(), getSchedule()]).then(([mode, session, schedule]) => {
      sendResponse({ success: true, session, computed: computeFocusGate(mode, session, schedule, Date.now()) });
    });
    return true;
  }

  return false; // Not ours - let the intended recipient respond
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  if (changes.focustube_recurring_schedule) {
    updateHeartbeat().then(broadcastState);
  }
});

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === SESSION_ALARM) {
    handlePhaseEnd();
  } else if (alarm.name === HEARTBEAT_ALARM) {
    broadcastState();
  }
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Ship "distraction-free by default": seed the mode as 'always' so it's
    // an explicit stored fact from the start, not just a fallback.
    chrome.storage.sync.set({ focustube_focus_active_mode: 'always' }, reconcile);
  } else {
    reconcile();
  }
});
chrome.runtime.onStartup.addListener(reconcile);
