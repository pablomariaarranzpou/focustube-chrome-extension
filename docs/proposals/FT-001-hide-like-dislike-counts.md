# Feature Proposal: Hide Like/Dislike Counts

**Proposal ID:** FT-001
**Date:** 2026-04-03
**Status:** Hypothesis

---

## The User Problem

When a user lands on a YouTube watch page, two numbers compete for their attention before they've heard a single second of audio: the like count and the view count. "98K likes" and "4.2M views" are not neutral data — they are social proof signals engineered to validate the impulse to stay and watch.

The psychological mechanism is well-studied: high engagement metrics trigger **conformity bias** ("millions of people watched this, so it must be worth my time") and **status anxiety** ("if I haven't seen what everyone saw, I'm behind"). The trap fires *before* the user has evaluated whether the content is relevant to their actual goal.

A student looking up a Python tutorial clicks on a "14M views" video about a tangentially related topic because the number signals authority. A user who opened YouTube for one cooking video scrolls the feed and impulsively clicks "1.2M likes" on something unrelated. In both cases, the number — not the title or channel — drove the decision.

This is amplified on video cards in the homepage and search results, where view counts appear directly beneath the title. The user's eye reads `title → channel → 3M views` as a single trust signal. Removing the count forces the evaluation back to `title → channel` — two genuinely informative signals, neither engineered to trigger FOMO.

---

## The Feature

A single toggle: **"Hide engagement metrics"** that removes from the page:

- Like count on the watch page (the number next to the thumbs-up button)
- Dislike count (where visible)
- View count on the watch page (below the title)
- View count on video cards in the homepage, search results, and sidebar
- Publication date ("3 days ago") — optional sub-option, off by default

**What stays visible:** Thumbnail, title, channel name. Enough information for an intentional decision. Not enough to be gamed by social proof.

**Default state:** Off (opt-in).

---

## Differentiation from Competitors

| Extension | What it does | What it can't do |
|---|---|---|
| **DF YouTube** | Hides sidebar, feed, homepage grid | Doesn't touch metadata on video cards or watch page |
| **Unhook** | Hides recommendations, autoplay | No granularity over individual metadata fields |
| **DF Tube** | General distraction removal | Counts remain visible on watched videos |
| **BlockTube** | Blocks channels and keywords | Doesn't address social proof signals within the watch experience |

**FocusTube's edge:** The only extension that specifically targets the psychological metadata layer — the numbers that manipulate click decisions — rather than hiding structural elements (sidebars, feeds). A user can have the sidebar hidden by DF YouTube and still be pulled into a video because "4M views." This feature removes the hook at the point where the decision is made.

---

## Technical Feasibility

**Base class:** `DOMFeature`

**Key selectors (desktop):**
```
#like-button-renderer  yt-formatted-string          → like count text
#dislike-button-renderer  yt-formatted-string        → dislike count text
.ytd-video-primary-info-renderer  .view-count        → watch page view count
ytd-video-meta-block  #metadata-line span            → card view count + date
ytd-compact-video-renderer  #metadata-line span      → sidebar card metadata
ytd-rich-item-renderer  #metadata-line span          → homepage card metadata
```

**Key selectors (mobile):**
```
.ytm-video-meta-block                                → mobile card metadata
```

**Approach:**
1. `injectCSS('engagement-metrics', ...)` to hide via CSS for instant effect (avoids flash)
2. `observeDOM()` to re-apply on SPA navigation and dynamically loaded cards
3. No config panel needed — single toggle

**New permissions required:** None. Uses existing `storage` + YouTube host permissions.

**Complexity:** Low. Stable selectors, pure CSS hiding, no override logic.

---

## Implementation Checklist

1. Create `src/features/HideEngagementMetricsFeature.js` extending `DOMFeature`
2. Register in `src/content-main.js` inside `featureManager.registerAll([...])`
3. Add script tag in `manifest.json` under `content_scripts[0].js`
4. Add toggle in `front.html` following existing toggle pattern
5. Map checkbox in `src/ui/PopupController.js` → `checkboxMap`
6. Add i18n key `hideEngagementMetrics` in `_locales/en/messages.json` and 45 other language files

---

## UX Design

- **Toggle label:** `Hide engagement metrics`
- **i18n key:** `hideEngagementMetrics`
- **Popup placement:** After "Disable Autoplay", before "Hide Sidebar" — grouped with individual-element hiders
- **Default state:** Off
- **Sub-options:** None for v1. Optional future: "Also hide publication date" checkbox

---

## Hypothesis

> **If we remove like counts, dislike counts, and view counts from video cards and the watch page, users who enable this toggle will report making more intentional content decisions — clicking videos because of what they are, not because millions of others did.**

Validated if: user reviews mention "I stopped clicking random viral videos" or "I only watch what I actually searched for now."

---

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| YouTube changes selector structure for like/dislike buttons | Medium | Use `observeDOM` + multiple fallback selectors; same risk exists for all features |
| Users want to see like counts for quality assessment (e.g., "is this tutorial outdated?") | Low | Feature is opt-in; users who want counts keep them |
| Mobile YouTube (`m.youtube.com`) has different metadata structure | Medium | Include `ytm-*` selectors from day one, same pattern as `HideBlacklistedWordsFeature` |
| CSS-only hiding leaves counts in DOM (screen readers, extensions) | Low | Acceptable; FocusTube uses CSS hiding as primary method across all features |
