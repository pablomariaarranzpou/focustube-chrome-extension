/**
 * Applies Focus Mode's gate to the content features: when the gate is open,
 * each gated feature follows its own Settings preference (`enabled`); when
 * closed, everything is suppressed and the page shows normally - Settings
 * are simply not applied. Never mutates the user's persisted preferences.
 *
 * The mode ('off' | 'always' | 'timer' | 'schedule') answers only WHEN
 * FocusTube acts - see FocusModeStateComputer.js.
 *
 * Extends Feature directly (not DOMFeature) since it manipulates sibling
 * features rather than the DOM. Must be registered LAST in content-main.js's
 * registerAll([...]) call: by the time its onInit() runs, every gated feature
 * must already be initialized (suppressSync no-ops on uninitialized features).
 */
class FocusModeFeature extends Feature {
  constructor(featureManager) {
    super('focusMode', { defaultEnabled: false });
    this.featureManager = featureManager;
    this.recurringSchedule = [];
    // Optimistic default: "distraction-free by default". setAdditionalData()
    // overrides this with the real stored value as soon as it's read.
    this.activeMode = 'always';
  }

  getLegacyStorageKey() {
    return null; // No legacy boolean key for this orchestrator
  }

  getAdditionalStorageKeys() {
    return ['focustube_recurring_schedule', 'focustube_focus_active_mode'];
  }

  /**
   * Called by FeatureManager once the recurring schedule / active mode have
   * been read as part of the existing document_start chrome.storage.sync.get call.
   */
  setAdditionalData(key, value) {
    if (key === 'focustube_recurring_schedule') {
      this.recurringSchedule = value || [];
    } else if (key === 'focustube_focus_active_mode') {
      this.activeMode = value || 'off';
    }
  }

  async onInit() {
    // Pass 1 - synchronous, flash-free: active mode and recurring schedule are
    // already available (both live in chrome.storage.sync, read alongside
    // everything else). Session state (a different storage area) is assumed
    // inactive for this pass.
    this._apply(computeFocusGate(this.activeMode, null, this.recurringSchedule, Date.now()));

    // Pass 2 - near-instant correction once the session state resolves
    // (only matters when activeMode === 'timer').
    chrome.storage.local.get(['focustube_focus_session'], (r) => {
      this._apply(computeFocusGate(this.activeMode, r.focustube_focus_session || null, this.recurringSchedule, Date.now()));
    });

    console.debug('FocusTube: FocusModeFeature initialized');
  }

  async onActivate() {}
  async onDeactivate() {}

  /**
   * Called when a 'focusModeStateChanged' broadcast arrives from the background.
   */
  applyState(snapshot) {
    if (snapshot.mode) {
      this.activeMode = snapshot.mode;
    }
    this._apply(snapshot);
  }

  _apply(gate) {
    for (const name of FOCUS_MODE_GATED_FEATURES) {
      const feature = this.featureManager.get(name);
      if (!feature) continue;
      if (gate.gateOpen) {
        feature.releaseSuppressionSync('focusMode');
      } else {
        feature.suppressSync('focusMode');
      }
    }
    this.isActive = !!gate.gateOpen;
  }
}
