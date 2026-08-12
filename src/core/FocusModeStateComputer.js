/**
 * Pure computation of Focus Mode's gate: whether the user's Settings should
 * currently be APPLIED to YouTube or not. No Chrome API dependency - loaded
 * both by the background service worker (via importScripts) and by content
 * scripts, so every entry point can re-derive state from storage alone.
 *
 * The mode answers only WHEN FocusTube acts; Settings answer WHAT is hidden:
 *   - 'off':      gate closed - everything shows, Settings are ignored.
 *   - 'always':   gate open - Settings apply all the time.
 *   - 'timer':    gate open only while a focus session's focus phase is running.
 *   - 'schedule': gate open only during a configured recurring block.
 */

/**
 * Features whose visual application is gated by the mode. Everything that
 * hides/filters content on the page belongs here; UI helpers (like the quick
 * block button) do not.
 */
const FOCUS_MODE_GATED_FEATURES = [
  'hideShorts',
  'hideSuggestions',
  'hideComments',
  'minimalistHome',
  'hideSidebar',
  'hideAutoplayOverlay',
  'hideBlacklistedChannels',
  'hideBlacklistedWords'
];

/**
 * Finds the recurring schedule block (if any) active right now.
 * @param {Array} schedule - list of { id, days, startMinutes, endMinutes, enabled }
 * @param {number} nowMs
 */
function findActiveScheduleBlock(schedule, nowMs) {
  const now = new Date(nowMs);
  const day = now.getDay();
  const minutes = now.getHours() * 60 + now.getMinutes();

  return (schedule || []).find(b => {
    if (!b.enabled) return false;
    const yesterday = (day + 6) % 7;
    if (b.startMinutes <= b.endMinutes) {
      return b.days.includes(day) && minutes >= b.startMinutes && minutes < b.endMinutes;
    }
    // Block wraps past midnight: active if still in yesterday's tail or today's head
    return (b.days.includes(yesterday) && minutes < b.endMinutes) ||
           (b.days.includes(day) && minutes >= b.startMinutes);
  }) || null;
}

/**
 * @param {'off'|'always'|'timer'|'schedule'} activeMode - focustube_focus_active_mode
 * @param {object|null} session - focustube_focus_session from chrome.storage.local
 * @param {Array|null} schedule - focustube_recurring_schedule from chrome.storage.sync
 * @param {number} nowMs - Date.now()
 */
function computeFocusGate(activeMode, session, schedule, nowMs) {
  const base = { mode: activeMode || 'off', sessionPhase: null, sessionEndsAt: null, recurringActiveBlockId: null };

  if (activeMode === 'always') {
    return { ...base, gateOpen: true };
  }

  if (activeMode === 'timer') {
    const running = !!(session && session.active && nowMs < session.endsAt);
    return {
      ...base,
      // Break phase = distractions allowed (that's the point of a break)
      gateOpen: running && session.phase === 'focus',
      sessionPhase: running ? session.phase : null,
      sessionEndsAt: running ? session.endsAt : null
    };
  }

  if (activeMode === 'schedule') {
    const activeBlock = findActiveScheduleBlock(schedule, nowMs);
    return { ...base, gateOpen: !!activeBlock, recurringActiveBlockId: activeBlock ? activeBlock.id : null };
  }

  // 'off' or anything unrecognized
  return { ...base, gateOpen: false };
}
