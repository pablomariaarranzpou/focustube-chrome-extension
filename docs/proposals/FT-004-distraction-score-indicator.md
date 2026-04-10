# Feature Proposal: Distraction Score Indicator

**Proposal ID:** FT-004
**Date:** 2026-04-03
**Status:** Hypothesis

---

## The User Problem

FocusTube's value is almost entirely invisible. When the extension is working, the user sees... less. Fewer Shorts. No sidebar. No autoplay. The problem is that **the absence of distraction doesn't feel like an achievement** — it feels like nothing. Users who installed the extension to "focus more" have no feedback loop confirming it's working.

This creates two compounding problems:

1. **Doubt:** "Is this extension actually doing anything? My YouTube looks kind of the same." This leads to users disabling features "just to check" — and not re-enabling them.
2. **Low retention:** Without tangible evidence of value, users forget the extension exists. It becomes invisible in a bad way — not "seamlessly protecting me" but "I forgot I installed it."

The psychological need being missed is **visible progress**. The same users who installed FocusTube are often using productivity apps like Toggl, Forest, or Notion — tools that make effort and progress quantifiable. They respond to numbers. "FocusTube blocked 47 Shorts, 12 recommended videos, and 3 blacklisted channels in the last hour" is motivating in the same way a step counter is motivating — it makes the invisible work tangible.

**The secondary effect:** It reinforces that distractions were *there* and would have been clicked without protection. Users stop taking the extension for granted.

---

## The Feature

A toggle: **"Show distraction counter"** that displays a small, unobtrusive badge on YouTube pages showing real-time counts of what FocusTube has hidden in the current session.

**Badge content:**
```
🚫 Shorts: 47  |  📵 Recommendations: 23  |  🔕 Blocked: 8
```

**Visual design:**
- Fixed position: bottom-right corner of the page
- Low opacity (0.6), increases to 1.0 on hover
- Small font, minimal footprint — does not obscure content
- Single line, collapsible to just the total count with a click
- Automatically resets at the start of each browsing session (tab open)

**What gets counted:**
| Counter | Triggered by |
|---|---|
| Shorts hidden | `HideShortsFeature.hideElements()` calls |
| Recommendations hidden | `HideSuggestionsFeature` + `HideHomePageContentFeature` |
| Channels blocked | `HideBlacklistedChannelsFeature` filter matches |
| Keywords blocked | `HideBlacklistedWordsFeature` filter matches |
| Autoplay cancellations | `HideAutoplayOverlayFeature.cancelAndHide()` |

**Persistence:** Session counts stored in `chrome.storage.local` (cleared on browser restart). Cumulative totals (optional) stored in `chrome.storage.sync` for cross-device persistence.

**Default state:** Off (opt-in). The badge is intentionally not the default — some users will find it distracting. It's a tool for users who want the feedback loop.

---

## Differentiation from Competitors

| Extension | Feedback mechanism | What's missing |
|---|---|---|
| **DF YouTube** | None | Users have no idea how many elements were removed |
| **Unhook** | None | Invisible operation |
| **DF Tube** | None | No stats, no reinforcement |
| **BlockTube** | None | Silent blocking |

**FocusTube's edge:** No competing YouTube focus extension provides any form of visible feedback about what it's blocking. This is an entirely unoccupied space. The counter also creates a new growth mechanism: users screenshot their stats and share them ("FocusTube saved me from 234 Shorts this week") — organic social proof that no competitor benefits from.

This feature also **strengthens every other feature**. A user who sees "Autoplay: 3 cancelled" in an hour is more likely to keep that feature enabled. The counter turns silent protection into visible advocacy.

---

## Technical Feasibility

**Architecture:** This is not a standard `DOMFeature` subclass in the usual sense. It is a **cross-feature observer** — a badge injected into the page that receives increment signals from other features.

**Two implementation approaches:**

**Option A: Centralized counter in FeatureManager (preferred)**
- Add a `CounterService` singleton that features can call: `CounterService.increment('shorts')`
- `FeatureManager` initializes `CounterService` if the indicator feature is enabled
- Each feature calls `CounterService.increment(type)` in their `hideElements()` or filter logic
- Requires modifying existing feature files (small — one line per feature)

**Option B: MutationObserver on hidden elements (no changes to existing features)**
- The indicator feature watches `data-focustube-hidden` attributes (already set by `DOMFeature.hideElements()`)
- Counts newly added `[data-focustube-hidden]` elements in the DOM
- No changes to existing feature files
- Slightly less accurate (counts DOM nodes, not user-facing items)

**Recommended: Option B for v1** (zero changes to existing features), **Option A for v2** (precise counts per feature type).

**Badge DOM injection:**
```javascript
// Create badge element
const badge = document.createElement('div');
badge.id = '__focustube_counter';
badge.style.cssText = `
  position: fixed !important;
  bottom: 16px !important;
  right: 16px !important;
  z-index: 9999 !important;
  background: rgba(0,0,0,0.75) !important;
  color: white !important;
  font-size: 12px !important;
  padding: 6px 10px !important;
  border-radius: 6px !important;
  opacity: 0.6 !important;
  font-family: monospace !important;
`;
document.body.appendChild(badge);
```

**Counter MutationObserver (Option B):**
```javascript
const observer = new MutationObserver((mutations) => {
  let newHidden = 0;
  mutations.forEach(m => m.addedNodes.forEach(node => {
    if (node.querySelectorAll) {
      newHidden += node.querySelectorAll('[data-focustube-hidden]').length;
    }
    if (node.getAttribute?.('data-focustube-hidden')) newHidden++;
  }));
  if (newHidden > 0) updateCount(newHidden);
});
observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-focustube-hidden'] });
```

**New permissions required:** None. Uses existing `storage` permission for session persistence.

**Complexity:** Low-Medium. The badge DOM element is trivial. The counting mechanism depends on chosen approach — Option B (attribute observation) is entirely self-contained with no changes to other files.

---

## Implementation Checklist

1. Create `src/features/DistractionCounterFeature.js` extending `DOMFeature`
2. Register in `src/content-main.js` inside `featureManager.registerAll([...])`
3. Add script tag in `manifest.json` under `content_scripts[0].js`
4. Add toggle in `front.html` following existing toggle pattern
5. Map checkbox in `src/ui/PopupController.js` → `checkboxMap`
6. Add i18n key `showDistractionCounter` in `_locales/en/messages.json` and 45 other language files

---

## UX Design

- **Toggle label:** `Show distraction counter`
- **i18n key:** `showDistractionCounter`
- **Popup placement:** At the bottom of the toggle list — it's a meta-feature about the extension, not a content-hiding feature
- **Default state:** Off
- **Sub-options:** None for v1

**Badge behavior:**
- Click to collapse/expand (just show total vs. breakdown)
- Hover to increase opacity from 0.6 → 1.0
- Auto-hides if count is 0 (nothing has been blocked yet in this session)

---

## Hypothesis

> **If users can see a real-time count of what FocusTube has blocked in their current session, they will be less likely to disable features "just to check" and more likely to recommend the extension to others, because the value being provided is concrete and visible rather than invisible and assumed.**

Validated if: retention improves (fewer users who enable then disable features) and reviews include references to specific numbers ("blocked 300 Shorts this week").

---

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Badge itself becomes a distraction (user watches the number instead of the video) | Medium | Make default opacity 0.6, not prominently placed. Collapsible to single total. User can disable it. |
| Option B (attribute watching) overcounts — catches element re-hides, not unique items | Medium | Track element IDs or use a `Set` to avoid double-counting the same element |
| Badge persists when user navigates away from YouTube | Low | `onDeactivate()` removes badge from DOM; inject on every page, clean up on every deactivation |
| Cumulative counts feel overwhelming ("I spent too much time on YouTube") | Low | Keep counts per session only in v1; avoid lifetime totals that could feel guilt-inducing |
| Performance: MutationObserver on full document with attribute filtering | Low | `attributeFilter: ['data-focustube-hidden']` limits the observation scope significantly |
