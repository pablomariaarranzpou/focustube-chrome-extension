# Feature Proposal: Force Theater Mode

**Proposal ID:** FT-003
**Date:** 2026-04-03
**Status:** Hypothesis

---

## The User Problem

The default YouTube watch page layout places the video in the left ~70% of the screen, with a column of 15–20 recommended videos permanently visible on the right. This is not a neutral design choice — YouTube has optimized this layout to maximize session length. The recommendations are visible from the moment the video starts, not just when it ends.

The distraction mechanism is **peripheral attention capture**: the user is watching a tutorial but the right sidebar is always in peripheral vision. Titles like "10 Things You Didn't Know About..." or thumbnails with exaggerated expressions are designed to catch the eye during low-engagement moments in the current video (a slow section, a loading pause). The user glances right, finds something interesting, and opens it in a new tab "for later" — which becomes now.

**The current workaround users have:** Manually clicking the theater mode button (the rectangle icon below the video) on every single video, every single session. This is forgotten 90% of the time. The user must actively fight the default layout every visit.

**What this feature does:** Makes theater mode the default, automatically, every time a video loads. Zero effort required from the user. The focus-friendly layout becomes the path of least resistance.

---

## The Feature

A toggle: **"Force theater mode"** that:

- Automatically activates YouTube's native theater mode on every video page load
- Expands the video player to full width, pushing the recommendation sidebar off-screen
- Re-activates on SPA navigation (when the user clicks to a new video)
- On deactivation: restores the normal layout

**Optional sub-option (v2):** "Show recommendations after video ends" — when the video finishes, temporarily reveal the sidebar for the "next video decision" moment rather than triggering autoplay.

**Synergy with existing features:** Works alongside `HideSuggestionsFeature`. If both are enabled, theater mode handles the layout and HideSuggestions handles any residual recommendation elements. If only this feature is on, the sidebar is pushed off-screen but not destroyed — the user can scroll or resize to reach it.

**Default state:** Off (opt-in). This is a layout change with visible impact; users should consciously choose it.

---

## Differentiation from Competitors

| Extension | What it does | What it can't do |
|---|---|---|
| **DF YouTube** | Hides sidebar navigation (left guide) | Doesn't affect watch-page recommendation column (right side) |
| **Unhook** | Can hide recommendations | Requires manual toggle; no automatic theater mode enforcement |
| **DF Tube** | Hides suggested videos | Doesn't change player layout; videos remain visible until scrolled |
| **BlockTube** | Channel/word blocking | No layout control whatsoever |

**FocusTube's edge:** The distinction between **hiding recommendations** (DF Tube, Unhook) and **removing them from the visual field via layout** (this feature) is significant. CSS-hidden recommendations are still in the DOM and technically in the visual layout — the blank space remains. Theater mode eliminates the space entirely. Additionally, no competitor **automatically enforces** theater mode — they all require the user to set it manually per session. FocusTube makes the intentional layout permanent.

---

## Technical Feasibility

**Base class:** `DOMFeature`

**Approach — Two complementary methods:**

**Method 1: Click the native theater mode button (most reliable)**
```javascript
// YouTube's theater mode toggle button
const theaterButton = document.querySelector('.ytp-size-button');
// Check if NOT already in theater mode
const isTheater = document.querySelector('#player-theater-container') !== null
                  || document.querySelector('ytd-watch-flexy[theater]') !== null;
if (!isTheater && theaterButton) theaterButton.click();
```

**Method 2: CSS enforcement (instant, no flash)**
```css
/* Force theater mode layout */
ytd-watch-flexy:not([fullscreen]) #player-container-inner {
  width: 100% !important;
  max-width: 100% !important;
}
ytd-watch-flexy:not([fullscreen]) #columns {
  flex-direction: column !important;
}
ytd-watch-flexy:not([fullscreen]) #secondary {
  display: none !important;
}
/* Add theater attribute to root element */
ytd-watch-flexy {
  --ytd-watch-flexy-max-player-width: 100% !important;
}
```

**Combined approach:** Inject CSS immediately in `onActivate()` for instant effect, then click the native button to sync YouTube's internal state (prevents YouTube from reverting the layout on interaction).

**Navigation handling:** Listen to `yt-navigate-finish` event (same pattern as `HideAutoplayOverlayFeature`) to re-apply theater mode after SPA navigation to a new video.

**Key selectors:**
```
.ytp-size-button                      → Theater mode toggle button
ytd-watch-flexy[theater]              → Watch page in theater mode (attribute present when active)
#player-theater-container             → Theater container element
#secondary                            → Recommendation sidebar column
ytd-watch-next-secondary-results-renderer  → Secondary results in sidebar
```

**New permissions required:** None.

**Complexity:** Medium. The CSS approach is straightforward but YouTube can override it on interaction. The click approach is reliable but depends on button availability timing. Using both together provides resilience.

---

## Implementation Checklist

1. Create `src/features/ForceTheaterModeFeature.js` extending `DOMFeature`
2. Register in `src/content-main.js` inside `featureManager.registerAll([...])`
3. Add script tag in `manifest.json` under `content_scripts[0].js`
4. Add toggle in `front.html` following existing toggle pattern
5. Map checkbox in `src/ui/PopupController.js` → `checkboxMap`
6. Add i18n key `forceTheaterMode` in `_locales/en/messages.json` and 45 other language files

---

## UX Design

- **Toggle label:** `Force theater mode`
- **i18n key:** `forceTheaterMode`
- **Popup placement:** After "Disable Autoplay" — grouped with watch-page behavior features
- **Default state:** Off
- **Sub-options:** None for v1. Future v2: "Show recommendations after video ends" nested checkbox (same pattern as `keepHistoryVisible` under "Hide Sidebar")

---

## Hypothesis

> **If we automatically enforce theater mode on every video page load, users who enable this toggle will spend less time watching unintended videos in a session, because the visual column of recommendations is removed from peripheral view without requiring any per-session manual action.**

Validated if: user reviews mention "I no longer get distracted by the right sidebar" or session length on intended content increases.

---

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| YouTube reverts layout when user interacts with player (fullscreen, resize) | Medium | Re-apply CSS on `yt-navigate-finish`; use MutationObserver on `ytd-watch-flexy` attributes |
| CSS approach conflicts with `HideSuggestionsFeature` when both enabled | Low | Both hide `#secondary` — redundant but harmless. Document that they complement each other. |
| Theater mode button not available on initial page load (player not ready) | Medium | Use `observeDOM` to detect player readiness; retry click with timeout like `HideAutoplayOverlayFeature` does |
| Mobile YouTube doesn't have theater mode | High | Scope feature to desktop only (add `desktopOnly: true` in config), same as `HideSidebarFeature` |
| Conflicts with embedded players or YouTube Music | Low | Check for `ytd-watch-flexy` presence before activating; skip iframes without watch page structure |
