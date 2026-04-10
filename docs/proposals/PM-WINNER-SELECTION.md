# Product Manager — Feature Selection Verdict

**Date:** 2026-04-03
**Evaluated:** FT-001 through FT-005
**Decision:** Winner selected with full justification

---

## Scoring Matrix

Each proposal scored 1–5 on four dimensions that matter for FocusTube's next feature:

| Dimension | What it measures |
|---|---|
| **User Impact** | How much does this improve the core experience for a distracted student/professional? |
| **Differentiation** | How much does this separate FocusTube from DF YouTube, Unhook, DF Tube, BlockTube? |
| **Implementation Risk** | How likely is it to ship cleanly, stay working through YouTube updates, and not break existing features? |
| **Mission Fit** | Does it directly serve "use YouTube intentionally" — not just adding complexity for power users? |

| Proposal | User Impact | Differentiation | Implementation Risk | Mission Fit | **Total** |
|---|---|---|---|---|---|
| FT-001: Hide Like/Dislike Counts | 4 | 4 | 5 | 5 | **18** |
| FT-002: Hide Auto-Generated Playlists | 3 | 3 | 3 | 3 | **12** |
| FT-003: Force Theater Mode | 4 | 3 | 3 | 4 | **14** |
| FT-004: Distraction Score Indicator | 3 | 5 | 4 | 3 | **15** |
| FT-005: Smart Mode | 5 | 5 | 2 | 4 | **16** |

*(Risk scored inversely: 5 = lowest risk, 1 = highest risk)*

---

## The Verdict: FT-001 — Hide Like/Dislike Counts

**Winner. Implement this next.**

---

## Why FT-001 Wins

### 1. It attacks a distraction mechanism none of the 8 existing features touch

Every current FocusTube feature hides **structural elements**: the Shorts shelf, the sidebar, the comments section, the recommendations column. FT-001 is the first feature to attack the **psychological metadata layer** — the numbers that trigger impulsive clicking before the user has evaluated content.

A user with all 8 features enabled and FT-001 disabled still sees "4.2M views" and "98K likes" on every video card and watch page. That number is doing its job: creating social proof pressure, triggering FOMO, and validating clicks the user didn't consciously choose. FT-001 removes the mechanism, not just the container.

### 2. It's the lowest-risk, highest-confidence implementation

FT-001 is pure CSS hiding on stable selectors. The like/dislike button structure has not materially changed since YouTube removed the public dislike count in 2021. The view count on cards uses `#metadata-line span` — the same container `HideBlacklistedWordsFeature` already queries. There is no override logic, no click simulation, no state management, no interaction with other features.

It will ship in one session and stay working.

Compare this to:
- **FT-005 (Smart Mode):** Architecturally sound idea, but state management between Smart Mode overrides and user preferences is a genuine complexity risk. A bug here breaks multiple features simultaneously.
- **FT-003 (Theater Mode):** CSS + click simulation on a player element YouTube actively controls. History shows YouTube regularly reverts CSS overrides on player interaction.
- **FT-002 (Auto-Generated Playlists):** Requires distinguishing user playlists from algorithmic ones — playlist ID parsing is reliable, but the sidebar playlist UI changes frequently.

### 3. It differentiates on the axis no competitor covers

DF YouTube, Unhook, DF Tube, and BlockTube all work at the **structural level**. They hide containers. None of them have ever targeted the psychological metadata signals within video cards. FT-001 opens a new category: *cognitive load reduction at the decision point*, not just *content removal from the page*.

This is a genuine product positioning moment. The Chrome Web Store listing gains new keywords ("hide youtube view counts", "remove youtube likes", "youtube mindful browsing") that no competing extension currently owns. Reviews will describe an experience no other extension provides.

### 4. It's a natural complement to the already-proposed Hide Video Metadata feature

The earlier proposal (`docs/feature-proposal-hide-video-metadata.md`) targets duration, view counts, and publication dates on video **cards**. FT-001 targets like/dislike counts and view counts on the **watch page** itself. Together, they form a coherent "hide psychological pressure signals" feature set — but they're small enough to ship separately and validate independently.

FT-001 can ship now. If it performs well, Hide Video Metadata follows. They reinforce each other without depending on each other.

### 5. Mission fit is perfect

FocusTube's target user is someone who wants to use YouTube for learning or music — not endless scrolling. The like count and view count serve *YouTube's* goals (maximize engagement), not the user's. Removing them doesn't degrade the user's ability to find good content (title and channel are sufficient signals for intentional use). It only degrades YouTube's ability to manipulate click decisions.

This is FocusTube's philosophy in a single sentence: remove what serves the algorithm, keep what serves the user.

---

## Why the Other Proposals Were Deprioritized

**FT-005 (Smart Mode) — Most innovative, not right now.**
The highest-differentiation idea in the set. Context-aware automatic mode switching would be a qualitative leap for the product. But it requires careful state management between Smart Mode overrides and user preferences, potential UI confusion in the popup, and tight coupling to FeatureManager. It is the right v3.0 or v4.0 feature — not the next one. When the feature set is more mature and the team has capacity for architecture work, revisit this.

**FT-004 (Distraction Score Indicator) — Great retention tool, wrong priority.**
The unique differentiation angle is real: no competitor shows the user what's being blocked. This is a retention and advocacy feature, not a distraction-reduction feature. It makes users feel good about the extension rather than making YouTube less distracting. Valuable, but secondary. Build after the core hiding features are more complete.

**FT-003 (Force Theater Mode) — Good idea, fragile implementation.**
The user problem is real and the differentiation is solid. The risk is YouTube's player layout — it's one of the most-changed parts of the YouTube DOM. CSS-based theater mode enforcement has a documented history of breaking on player interactions. Without a more robust mechanism, this feature would require frequent maintenance. Revisit when a more reliable approach is identified.

**FT-002 (Auto-Generated Playlists) — Too narrow.**
The user problem exists but affects a smaller slice of the target audience. Most FocusTube users are distracted by Shorts, recommendations, and autoplay — not by the sidebar playlist section. The implementation complexity (distinguishing user vs. algorithmic playlists) is medium for relatively niche value. Deprioritized in favor of higher-impact options.

---

## Recommended Build Order

Given the full proposals and the existing Hide Video Metadata proposal, here is the suggested feature roadmap:

| Priority | Feature | Rationale |
|---|---|---|
| **Next** | FT-001: Hide Like/Dislike Counts | Highest confidence, clear differentiation, direct mission fit |
| **After** | Hide Video Metadata (existing proposal) | Natural companion; together they complete the "hide psychological pressure" layer |
| **Then** | FT-004: Distraction Score Indicator | Retention and advocacy; best after the hiding feature set is complete |
| **Later** | FT-003: Force Theater Mode | Good idea, needs a resilience strategy first |
| **Future** | FT-005: Smart Mode | Architectural feature for a more mature product |
| **Backlog** | FT-002: Auto-Generated Playlists | Niche value; revisit based on user demand |

---

## Final Note

FT-001 is not the most impressive idea in this set. It won't generate a press release. But it's the right next step: small, well-targeted, technically clean, and directly serving the user's core need. In a product built on doing less and doing it reliably, that is exactly the right profile for the next feature.

Build FT-001. Ship it. Let users validate whether the psychological metadata removal is as impactful as predicted. Then decide what comes next.
