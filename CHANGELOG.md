# Changelog

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
