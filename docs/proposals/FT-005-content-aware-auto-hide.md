# Feature Proposal: Content-Aware Auto-Hide (Smart Mode)

**Proposal ID:** FT-005
**Date:** 2026-04-03
**Status:** Hypothesis

---

## The User Problem

FocusTube's current model is binary: features are either on or off. The user decides once in the popup and forgets. This works well for always-on protections (hide Shorts, block keywords) but creates friction for context-dependent use cases.

Consider a user's actual YouTube session:

1. They open YouTube to watch a specific tutorial they found via Google → **intentional, want zero distractions**
2. They finish and browse the homepage to discover what's new → **exploratory, some recommendations are fine**
3. They search for "Python async explained" → **intentional again, want results but no sidebar pull**
4. They click a video → **back to focus mode**

With today's FocusTube, the user either has everything hidden all the time (too restrictive for step 2) or nothing hidden and must manually toggle before each video (too much friction, never happens). **The extension can't distinguish intent from URL.**

But the URL can. YouTube's URL structure perfectly encodes user intent:
- `/watch?v=...` → the user chose a specific video
- `/results?search_query=...` → the user is looking for something
- `/` or `/feed/trending` → the user is browsing without a destination

This feature reads that signal and applies different protection levels automatically, matching the extension's behavior to the user's real intent in each moment — without the user having to touch the popup.

---

## The Feature

A toggle: **"Smart mode"** that activates context-aware feature management. When enabled, FocusTube automatically switches between three protection profiles based on the current YouTube page:

**Watch Mode** (triggered on `/watch?v=...`):
- All enabled features activate: suggestions hidden, autoplay disabled, sidebar hidden
- Maximum protection — the user chose a video, distractions are irrelevant

**Search Mode** (triggered on `/results?search_query=...`):
- Shorts hidden, blacklists applied
- Sidebar and homepage content features stay off — the user needs to evaluate results
- Autoplay irrelevant (not on a video)

**Browse Mode** (triggered on `/`, `/feed/`, `/feed/trending`, `/feed/subscriptions`):
- User-configurable. Default: same as Search Mode (moderate protection)
- Optional: Full protection (all features on) for users who never want homepage content
- Optional: Pause protection (all features off) for users who allow themselves scheduled discovery time

**Navigation detection:** Listens to `yt-navigate-finish` event (same as `HideAutoplayOverlayFeature`) which fires on every YouTube SPA navigation.

**Default state:** Off (opt-in). This is an orchestration layer that changes the behavior of other features — users should consciously choose it.

---

## Differentiation from Competitors

| Extension | Mode switching | Intelligence |
|---|---|---|
| **DF YouTube** | Manual popup only | No URL awareness |
| **Unhook** | Manual per-feature toggles | No context detection |
| **DF Tube** | Manual toggle | Static, no adaptation |
| **BlockTube** | Manual per-channel/word | No URL awareness |

**FocusTube's edge:** Every competing extension treats YouTube as a single context. They have one set of rules that apply everywhere. FocusTube would be the first to recognize that **the same user has different needs on different YouTube pages in the same session** and adapt without requiring manual intervention.

This is a qualitative leap in the product's intelligence. It moves FocusTube from "a collection of toggles" to "an assistant that understands your intent." The tagline writes itself: *"FocusTube knows when you're focused and when you're exploring."*

It also resolves the #1 reason users disable features: "I need to turn things off to browse normally." Smart Mode eliminates that friction entirely.

---

## Technical Feasibility

**Architecture:** This is an **orchestration feature**, not a standard content-hider. It does not extend `DOMFeature` in the traditional sense — it manages the activation state of other features at runtime.

**Implementation approach:**

```javascript
class SmartModeFeature extends DOMFeature {
  constructor(featureManager) {
    super('smartMode', { defaultEnabled: false });
    this.featureManager = featureManager;
    this._handleNavigation = this._handleNavigation.bind(this);
  }

  async onActivate() {
    window.addEventListener('yt-navigate-finish', this._handleNavigation);
    this._handleNavigation(); // Apply immediately on activation
  }

  async onDeactivate() {
    window.removeEventListener('yt-navigate-finish', this._handleNavigation);
    // Restore all features to their user-configured states
    await this._restoreUserStates();
    await super.onDeactivate();
  }

  _detectMode() {
    const path = window.location.pathname;
    const search = window.location.search;
    if (path === '/watch') return 'watch';
    if (path === '/results') return 'search';
    if (path === '/' || path.startsWith('/feed/')) return 'browse';
    return 'other';
  }

  async _handleNavigation() {
    const mode = this._detectMode();
    switch (mode) {
      case 'watch':   await this._applyWatchMode();  break;
      case 'search':  await this._applySearchMode(); break;
      case 'browse':  await this._applyBrowseMode(); break;
    }
  }

  async _applyWatchMode() {
    // Activate: hideSuggestions, hideAutoplayOverlay, hideSidebar
    // Keep: hideBlacklistedChannels, hideBlacklistedWords, hideShorts
  }

  async _applySearchMode() {
    // Deactivate: hideSuggestions (no sidebar on search), hideAutoplayOverlay
    // Keep: hideShorts, blacklists active
  }

  async _applyBrowseMode() {
    // Based on user config: full protection or light protection
  }
}
```

**Critical design concern:** Smart Mode temporarily overrides user-configured feature states. When the user disables Smart Mode (or navigates away from YouTube), all features must return to their user-configured enabled/disabled states. This requires saving a snapshot of user states before Smart Mode activates and restoring it on deactivation.

**Storage:** Snapshot of pre-Smart-Mode states stored in `chrome.storage.local` (session-only).

**New permissions required:** None.

**Complexity:** Medium-High. The feature itself is straightforward (URL detection + feature toggling), but it requires careful state management to avoid:
- Overwriting user's manual feature toggles permanently
- Conflicting with popup interactions while Smart Mode is active
- Race conditions between `yt-navigate-finish` and feature activation

This is the most architecturally complex of the 5 proposals. Requires coordination with `FeatureManager.toggleFeature()` that respects Smart Mode's temporary overrides vs. user's permanent preferences.

---

## Implementation Checklist

1. Create `src/features/SmartModeFeature.js` extending `DOMFeature` (receives `featureManager` reference)
2. Modify `src/content-main.js` to pass `featureManager` to `SmartModeFeature` instance
3. Add script tag in `manifest.json` under `content_scripts[0].js`
4. Add toggle in `front.html` following existing toggle pattern
5. Map checkbox in `src/ui/PopupController.js` → `checkboxMap`
6. Add i18n key `smartMode` in `_locales/en/messages.json` and 45 other language files

**Note:** Step 2 requires a small change to content-main.js — the feature needs a reference to FeatureManager to call `toggleFeature()`. This is a unique requirement not shared by any current feature.

---

## UX Design

- **Toggle label:** `Smart mode`
- **i18n key:** `smartMode`
- **Popup placement:** At the top of the toggle list — it's a meta-feature that affects all others. Or in a separate "Smart" section above the individual toggles.
- **Default state:** Off
- **Sub-options (v2):** 
  - "Browse mode: Full protection" vs "Browse mode: Light protection" radio buttons
  - "Discovery window: Allow 15 min of browsing mode per day"
- **Visual indicator in popup:** When Smart Mode is active, individual feature toggles could show "(auto)" next to their label to indicate Smart Mode is managing them

---

## Hypothesis

> **If FocusTube automatically applies maximum protection when watching a video and reduces restrictions when searching or browsing, users who previously disabled features because they "needed them off sometimes" will keep Smart Mode on permanently, because the extension now matches their intent without requiring manual intervention.**

Validated if: reviews mention "I never have to touch the popup anymore" or users report keeping more features enabled than before.

---

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Smart Mode permanently changes user feature states (state management bug) | Medium | Always save snapshot before activating; restore on deactivation. Use `chrome.storage.local` (not sync) for snapshots so they're session-only |
| Popup shows features as off while Smart Mode has temporarily disabled them — confusing | High | Add "(Smart Mode active)" label in popup when Smart Mode is on; dim individual toggles |
| Race condition: user toggles a feature in popup while Smart Mode is mid-navigation | Medium | Smart Mode checks if the user manually overrode a feature and respects that override |
| `yt-navigate-finish` fires inconsistently on some YouTube versions | Low | `HideAutoplayOverlayFeature` already uses this event successfully — proven pattern |
| FeatureManager dependency makes SmartModeFeature tightly coupled | Medium | Pass `featureManager` reference at construction time (dependency injection pattern); acceptable coupling for an orchestration feature |
