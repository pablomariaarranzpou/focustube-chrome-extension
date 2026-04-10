# Feature Proposal: Hide Video Metadata

**Type:** New Feature  
**Proposed by:** Codebase Architect × Product Manager collaboration  
**Date:** 2026-04-03  
**Status:** Hypothesis / Pre-implementation

---

## The Idea

Add a toggle — **"Hide Video Metadata"** — that removes video duration, view count, and publication date from video cards across YouTube (homepage, search results, recommendations, sidebar).

---

## The Problem It Solves

FocusTube's existing features attack distraction at the structural level: hide the Shorts shelf, hide the sidebar, hide the homepage. But one important distraction vector remains untouched: **the metadata on individual video cards**.

Users who installed FocusTube to focus still fall into two well-documented psychological traps when browsing search results or the homepage:

1. **The "just 5 minutes" trap** — seeing a short duration ("4:32") makes a video feel low-cost to click. The user clicks "just one," and 40 minutes pass.
2. **The social proof trap** — "14M views" or "Trending" signals that a video is worth watching *right now*, bypassing the user's own content judgment and feeding FOMO-driven clicking.

These are not edge cases. They are core mechanisms YouTube uses to drive session length. Hiding them forces the user to decide based on the title and channel alone — a much more intentional signal.

---

## Why This Fits the FocusTube Philosophy

| Principle | How this feature satisfies it |
|---|---|
| Zero internet, zero tracking | Pure DOM manipulation. No fetch, no API, no external data. |
| Zero dependencies | Implemented with `hideElements()` from `DOMFeature` + CSS selectors. |
| Works on any Chromium browser | Targets standard `ytd-*` / `ytm-*` selectors already used in the codebase. |
| Simplicity over power | One toggle, zero configuration. The user either wants it or doesn't. |
| Opt-in | Off by default. Users who want metadata keep it. |
| Reduces distraction | Directly disables two psychological levers YouTube uses to drive impulsive clicks. |

---

## Why This Over the Other Candidates

The following ideas were evaluated and deprioritized:

- **Focus Mode (nuclear button):** Orchestrates existing toggles rather than adding new value. A useful shortcut, but not a new capability.
- **Time-based rules:** High value concept, but requires a time-picker UI that conflicts with "simplicity over power." Adds cognitive load at setup time.
- **Import/Export settings:** Valuable for power users with large blacklists, but zero distraction-reduction benefit for new users. A secondary quality-of-life feature, not a core one.
- **Whitelist channels mode:** Technically heavier (inverse logic of blacklist), risks user confusion alongside the existing blacklist feature, and serves a narrower use case.
- **Keyboard shortcuts:** Needs a new `commands` permission in `manifest.json`. Minor UX improvement that doesn't reduce distraction.
- **Search-only mode:** Interesting but overlaps heavily with "Hide Homepage Content" + "Hide Suggestions" already existing.

**Hide Video Metadata wins because:**
- It addresses a distraction mechanism none of the current 8 features touch.
- It requires zero new permissions (only `storage` is needed, already present).
- It has a clear, immediately understandable use case: "I don't want to be tempted by short videos or viral counts."
- It requires the least implementation complexity of all viable candidates.

---

## Proposed UX

**Popup toggle label:** `Hide video metadata`  
**Sub-options (optional, v2):** None — keep it a single toggle for now.  
**Default state:** Off (opt-in).  
**Placement in popup:** After "Disable Autoplay", before "Hide Sidebar" — grouped with the "individual element" hiders rather than the structural ones.

**What gets hidden:**
- Video duration badge (bottom-right of thumbnails)
- View count text under video titles
- Publication date ("3 days ago", "2 years ago")

**What stays visible:**
- Thumbnail image
- Video title
- Channel name

This preserves enough information for an intentional decision while removing the metrics that drive impulsive clicking.

---

## Technical Feasibility

### Architecture fit

This is a standard `DOMFeature` subclass — the simplest kind of feature in the codebase. No special lifecycle hooks, no config panels, no filter lists.

```
Feature
└── DOMFeature
    └── HideVideoMetadataFeature  ← new
```

### Selectors (to be verified against current YouTube DOM)

| Element | Desktop selector | Mobile selector |
|---|---|---|
| Duration badge | `ytd-thumbnail-overlay-time-status-renderer` | `ytm-thumbnail-overlay-time-status-renderer` |
| View count | `#metadata-line span` (inside `ytd-video-meta-block`) | `.ytm-video-meta-block` |
| Publication date | `#metadata-line span:last-child` | same container |

> **Note:** Selectors must be verified against the live YouTube DOM before implementation. YouTube frequently changes its structure. Cross-reference with `HideBlacklistedWordsFeature.js` and `HideShortsFeature.js` for currently working selector patterns.

### Implementation checklist

1. Create `src/features/HideVideoMetadataFeature.js` extending `DOMFeature`
2. Register in `src/content-main.js` inside `featureManager.registerAll([...])`
3. Add script tag in `manifest.json` under `content_scripts[0].js`
4. Add toggle in `front.html` (follow existing toggle pattern)
5. Map checkbox in `src/ui/PopupController.js` → `checkboxMap`
6. Add i18n key `hideVideoMetadata` in `_locales/en/messages.json` and the other 45 language files

### No new permissions required

Current `manifest.json` already has `storage` + YouTube host permissions. This feature needs nothing more.

---

## Risks and Tradeoffs

| Risk | Mitigation |
|---|---|
| YouTube DOM changes break selectors | Already a known issue across all features. The `observeDOM` pattern handles dynamic content. |
| Users might miss duration for legitimate reasons (e.g., avoiding 3-hour videos) | Feature is opt-in and easily toggled off. Document clearly what gets hidden. |
| Mobile YouTube (`m.youtube.com`) has different selectors | The codebase already handles `ytm-*` selectors. Include mobile selectors from day one. |
| New YouTube layout (`yt-lockup-view-model`) may need additional selectors | Verify at implementation time, same as other features do. |

---

## Success Hypothesis

> **If we hide video duration, view counts, and publication dates, users who enable this toggle will report feeling less compelled to click on videos impulsively, because the "quick watch" and "viral content" signals that bypass intentional judgment are removed.**

This is testable qualitatively through user reviews and feedback in the Chrome Web Store. A surge in positive mentions of "I only click on things I actually searched for now" would validate the hypothesis.

---

## Store & Growth Angle

This feature adds a new keyword vector for the Chrome Web Store listing:
- "hide youtube view counts"
- "remove youtube duration"
- "youtube intentional browsing"
- "youtube mindful mode"

It also strengthens the "FocusTube goes further than other focus extensions" positioning — most competitors only hide structural elements (sidebar, autoplay), not the psychological metadata layer.
