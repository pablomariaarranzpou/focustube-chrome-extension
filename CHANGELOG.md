# Changelog

## [2.5.8] - 2026-08-25

### Added
- **Manual language override.** The popup previously only ever followed the browser's auto-detected language. A small flag/globe icon now sits in the popup's corner - click it for a scrollable list of all 45 languages, endonyms with real flag SVGs (twemoji, not emoji). Picking one stores the override and reloads; picking the language already showing (detected or overridden) does nothing, since there's no separate "Auto" entry to disagree with it - whichever language is on screen is always the one highlighted. Deliberately not a native `<select>`: opening one and moving the mouse over its OS-rendered dropdown flickers its `:hover` style on and off, since the browser thinks the pointer left the closed box - nothing on the `<select>` itself can fix that. Replaced with a real popover panel the code fully owns. The override also covers session-end notifications, and is a popup/notification-only feature - `chrome.i18n`'s resolution of the extension's own name/description (shown in `chrome://extensions`, the toolbar tooltip, the right-click menu) is fixed by the browser and can't be overridden by extension code, so those three surfaces still follow the browser's language regardless.
- **A banner explaining when Settings aren't actually applying.** Toggling something on the Settings tab does nothing if Focus Mode's gate is closed - Off, Timer with no session running, Timer on a break, or Schedule outside every configured window - and previously nothing in the popup said so. A small localized banner now shows above both tabs whenever that's the case, naming which of those four situations it is, with a one-click "Switch to Always" action (the one mode whose gate can never be closed).
- **A small logo + name back above the popup.** Removed a few versions ago as redundant (opening the popup means you already just clicked the toolbar icon), brought back smaller and centered - a quiet 20px icon and the name, not a full-width header - after feedback that the popup felt unbranded. Centering it as its own row also gives the language picker's corner icon more room at the top without widening the popup.

### Fixed
- A batch of Chrome Web Store review findings: a `beforeunload` listener with no real purpose was costing every YouTube page its back/forward-cache eligibility for nothing; the content script's startup log had been stuck reporting "Version 2.4.8" for several releases because the number was hardcoded instead of read from the manifest (now uses `chrome.runtime.getManifest().version`, and its `console.log` calls now match every other file's `console.debug`); the "Rate FocusTube" pill was hardcoded English instead of localized; the GitHub link's octopus emoji is gone (plain text, matching the website's own convention); the blacklist "Remove" buttons were hardcoded English (the underlying key is now named `removeButton`, reused instead of duplicated); a blacklist section's title sat flush against the button above it; two sub-option toggle labels (`keepHistoryVisible`, `quickBlacklistButton`) were a visibly different gray from every other toggle label; the Help link now opens the support page in whichever language the popup is actually showing - including a manual override - and correctly falls back to the base language for a regional variant (`es-MX`) instead of silently falling back to English.
- **Release-readiness check caught two real i18n bugs no existing test covers**, since `check-ui-text.js` validates the *width* of whatever text a locale provides but never checks whether a locale is missing a key entirely: 40 locale files carried a dead `remove` key nothing in the code has referenced since it was renamed to `removeButton` - removed. Estonian (`et`) was missing 11 keys that real UI elements depend on (Hide Suggestions, Disable Autoplay, both blacklist section headings, both "Edit Blacklisted..." buttons, both "Hide Blacklisted..." toggles, both input placeholders, and the Add button) - `chrome.i18n.getMessage()` only falls back to the default locale when a *locale* is entirely missing, not per-key, so every one of those rendered as blank text for Estonian users. Filled in and reordered to match every other locale's key order.

### Website
- Google Ads conversion tracking (`gtag.js`) fires on any click through to the Chrome Web Store listing, wired to the real conversion label.
- Rebuilt the mobile header with a proper hamburger/dropdown nav, and added the Support link that was previously footer-only.

---

## [2.5.7] - 2026-08-21

### Added
- **A Help button in the popup.** There was no way to reach help from inside the extension itself. A `Help` pill now sits next to `Rate FocusTube` and `GitHub`, linking to `focustube.io/support`, translated across all 45 locales. Checked the row against the longest translations (Latvian *Palīdzība*, Czech *Nápověda*, Russian *Помощь*) — it stays inside the popup's 400px width.
- `homepage_url` in `manifest.json`, pointing at `https://focustube.io`. Used by Chrome for the "Website" link on the Web Store listing and for Search Console site verification — the two were easy to conflate with the dashboard's separate Support URL field, which is set manually there and isn't part of this repo.

### Website
- The support page (`docs/support/`) inherited the landing page's hero, which produced five different left edges down one page and a 67px headline on what is a help document. Rebuilt onto the site's own `.wrap` (1080px) top to bottom — header, hero, content and footer now share one container and one left edge, matching every other page on the site, instead of three independently-sized ones stacked vertically (a real defect on wide screens, where it read as a visible zigzag). Reading width is capped on the prose itself rather than the container, so line length stays comfortable without breaking alignment.
- Added a sticky on-page index from 1024px up, since a single centred column of text reads as a bare strip once the screen is wide enough to have nothing beside it.
- Fixed a callout box that specificity was pinning flush against the text above it (`.qa p` was overriding its margin), and a step that overstated when a reload is actually needed — FocusTube applies changes to open tabs live; a reload is only required for a tab that was already open when the extension was installed or updated.

---

## [2.5.6] - 2026-08-17

### Fixed
- **The popup opened far too wide in some languages, leaving the settings card stranded inside an oversized window.** Chrome sizes an extension popup by measuring its content and opening the window at that width, and the popup never declared a width of its own — it only said "no narrower than 400px, no wider than 600px" and let the content decide. In English the content fits inside 400px, so the popup landed on the lower bound and looked right. In languages with longer labels it did not: the "Blacklisted Words" heading alone measures 502px in Filipino, which dragged the whole window out to 566px in Filipino and to the full 600px in Tamil and Swahili, while the card itself stayed 400px wide — hence the empty grey margins either side. Only the Settings tab was affected, because that is where those long labels live.
  - The popup now declares a fixed 400px width, so the window is the same on every machine and in every language, and long labels wrap onto a second line instead of stretching the window.
  - Verified across English, German, Russian, Filipino, Swahili and Tamil — including Tamil, whose longest label is nearly twice the length of the English one — and on both tabs, with no horizontal overflow in any of them.

### Added
- **A limit on how long UI text may be, and a check that enforces it.** Pinning the popup width stops the window moving, but nothing stopped a translation from wrapping onto a fourth line and looking broken anyway. A label may now wrap onto a second line and never a third; the budgets live in `scripts/ui-text-budgets.js` and `node scripts/check-ui-text.js` checks all 45 locales against them, so an over-long translation is caught instead of shipping. A plain character limit would not have worked — Swahili's heading is 55 characters and fits, Tamil's was 54 characters and did not — so the check estimates rendered width from per-language character measurements taken in Chrome.

### Changed
- Shortened three Tamil labels that were over the new limit: the two blacklist headings (which ran to three lines) and the quick-block sub-option. They now use the same wording for "blacklisted" as the rest of that file, without the "Concentration Mode" prefix that made them overflow. Worth a native speaker's eye — the existing Tamil term for "blacklisted" reads oddly and was kept only for consistency.

---

## [2.5.5] - 2026-08-14

### Fixed
- **Settings toggles could render side by side instead of stacked.** `.toggle-container` has been `display: inline-flex` since the first commit — a `<label>` is inline by default, and `inline-flex` doesn't change that, so nothing actually forced each row onto its own line. It always looked fine on a normal dev screen because every row happens to be wide enough to fill a line on its own; on a narrower render (reported on macOS Chrome), two short rows fit side by side instead. Changed to `display: flex` with `width: 100%`, so every row always spans the full popup width regardless of content, viewport, or platform.

---

## [2.5.4] - 2026-08-14

### Fixed
- **Japanese users never got the translated extension.** The locale folder was named `_locales/jp`, but `jp` is a country code, not a language code — Chrome only recognizes `ja` for Japanese, so it silently ignored the folder and fell back everyone on `ja` to the default English strings. Renamed `_locales/jp` → `_locales/ja`.
- Removed `_locales/fl` — not a real Chrome locale (Dutch is `nl`, which already exists), so it was dead weight nobody could ever reach.

### Store Listing
- Rewrote the Chrome Web Store description in all 45 supported languages to cover what was missing: Focus Mode, the Quick Blacklist Button, and the "keep History visible" sidebar option. Applied manually via the Developer Dashboard — this doesn't ship inside the extension package.

---

## [2.5.3] - 2026-08-13

### Fixed
- **"Hide Sidebar" did nothing after a page load.** With "keep History visible" on, the sidebar was left showing Home, Subscriptions and every channel you are subscribed to, and it stayed that way. YouTube builds the sidebar in pieces and the part holding History is not there at first, and the extension was waiting to find History before hiding anything, so on a normal load it never got started. The sidebar is now cleared as soon as it appears and History shows up on its own once YouTube adds it.

---

## [2.5.2] - 2026-08-12

### Fixed
- **Shorts in the normal feed left a broken card behind.** When YouTube serves a Short as an ordinary video in the home feed, only its thumbnail was being removed. The card stayed, so you were left with a title, channel name and view count with nothing to click and nothing to watch, and hovering it still started the little preview player. The whole card is now hidden, like the ones in the Shorts shelf always were.
- **A switched-off feature could keep hiding content until you reloaded.** Turning a toggle off while YouTube was still loading left its DOM watcher running for the rest of the page. The watcher was registered outside the feature's lifecycle, so switching the feature off had nothing to cancel, and it then attached itself to a feature that was already off.
  - Watchers now start as soon as the page body exists instead of waiting for the whole document, so features apply a little earlier too.
  - Removes the `document.body not ready` warnings that every feature logged on each page load.

---

## [2.5.1] - 2026-08-12

### Changed
- **"Hide Home Page Content" is now "Minimalist Home Page"** — instead of just blanking the feed, it rearranges YouTube's own homepage into a centered, distraction-free hero: the real YouTube logo and the genuine search box (with its native search and voice buttons), on a plain background. Search still works exactly as YouTube built it — nothing is rebuilt by hand.
  - Matches YouTube's current light/dark theme automatically.
  - Desktop only; on the mobile web app (`m.youtube.com`) the toggle is a no-op and the page is left untouched.
  - Users who had the old toggle enabled keep it enabled after the rename — no re-configuration needed.

### Fixed
- The Amharic (`am`) locale had several strings mistakenly left in Bulgarian; they're now properly translated.

### Notes
- Fully localised across all 46 supported languages.

### Website
- New "Minimalist Home Page" section on the landing page, with a before/after animation, in all 43 site languages.
- Fixed the Focus Mode demo: the pointer now actually lands on the FocusTube toolbar icon and on the popup controls it clicks. The targets were positioned in percentages while the icon sits at a fixed pixel offset, so the click missed by ~35px and the popup appeared to open on its own.
- Each carousel slide now names and explains the feature it demonstrates, next to the animation.
- SEO: canonical URLs, Open Graph/Twitter cards, `SoftwareApplication` structured data, `sitemap.xml` and `robots.txt`.

---

## [2.5.0] - 2026-08-10

### Added
- **Focus Mode** — a single "Mode" that decides *when* your FocusTube Settings apply, without ever changing what you have configured:
  - **Off** — everything on YouTube shows, no matter what is in Settings.
  - **Always** — your Settings apply all the time (default on a fresh install).
  - **Timer** — a countdown focus session with optional breaks; breaks intentionally let distractions back in.
  - **Schedule** — turn Focus Mode on only on the days and times you choose (recurring windows).
- Reorganised popup: a compact header with a **Mode** tab and a **Settings** tab. Settings still control *what* gets hidden; Mode controls *when* those settings are enforced.
- Non-destructive gate: switching modes suppresses/releases features live and never overwrites your saved preferences.
- Small localized hint at the bottom of the popup: refresh the tab if you don't see changes right away.

### Changed
- Added the `alarms` permission to power Timer sessions and recurring schedules.
- End-of-session reminders use the `notifications` permission, requested **on demand** the first time you start a timed/scheduled session (it's an optional permission, so updating the extension never disables it or forces existing users to re-accept anything). Sessions work fine without it — you just don't get the OS alert.

### Notes
- Fully localised across all supported languages.

---

## [2.4.8] - 2026-04-16

### Added
- **Quick Blacklist Button** — a block button now appears inline next to every channel name in the YouTube feed (homepage, search results, recommendations). Click it once to instantly add a channel to your FocusTube blacklist without opening the popup.
  - Button is always visible alongside the channel name.
  - Hovering expands the label: "Blacklist with FocusTube" / "Remove from FocusTube".
  - **Amber state**: if a channel is already blacklisted the button turns amber, allowing one-click removal directly from the feed.
  - **Green flash**: brief confirmation animation on block/unblock.
  - If "Hide Blacklisted Channels" is ON, the card disappears automatically after blocking.
  - If "Hide Blacklisted Channels" is OFF, the button stays amber so you can manage the list without hiding content.
  - Toggle to enable/disable the button from the popup (enabled by default).
  - Works on the new 2024+ YouTube layout as well as search results and classic feed cards.
  - Fully localised in all 46 supported languages.

---

## [2.4.7] - 2026-04-15

### Fixed
- Version bump and manifest alignment after sidebar sub-option additions.

---

## [2.4.6] - 2026-01-18

### Added
- **Keep History visible** sub-option under "Hide Sidebar" — when hiding the YouTube sidebar you can now choose to keep the Watch History section accessible.
- **Rate Us** prompt: shown at popup opens 3, 5, and 10 to invite users to leave a review on the Chrome Web Store.
- Permanent GitHub and Rate Us pill links in the popup header.

### Fixed
- Sidebar hide now correctly targets the full left-nav guide panel.

---

## [2.4.5] - 2025-12-01

### Added
- Rate us prompt, GitHub link in popup.
- Keep History visible option when sidebar is hidden.

---

## [2.4.4] and earlier

- Initial feature set: Hide Shorts, Suggestions, Comments, Blacklisted Channels, Blacklisted Words, Home Page Content, Autoplay Overlay, Sidebar.
- Multi-language support (46 locales).
- Chrome MV3 architecture with vanilla JS content scripts and `chrome.storage.sync`.
