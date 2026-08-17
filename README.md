# FocusTube - Hide YouTube Shorts, Recommendations, Suggestions & Block Words

## Overview

FocusTube is a Chrome extension that helps you stay focused on YouTube by hiding distracting elements like Shorts, suggestions, autoplay overlays, end-screen cards, and more. Lightweight, privacy-friendly, and fully configurable.

**Available on the [Chrome Web Store](https://chromewebstore.google.com/detail/focustube/bolmmhkapeekgcjopdmnbmnhgaapbpdb)**

## Features

### Content Hiding

- **Hide Shorts** — Remove YouTube Shorts from all pages (home, search, sidebar)
- **Hide Suggestions** — Hide recommended videos in the sidebar, end-screen cards, and the video wall grid that appears when a video finishes
- **Hide Comments** — Remove the comments section entirely
- **Hide Sidebar** — Hide the left navigation panel (guide). Includes a sub-option to **keep History visible** while hiding everything else
- **Hide Autoplay Overlay** — Prevent the "Up next" countdown overlay and block automatic navigation to the next video
- **Minimalist Home Page** — Rearranges YouTube's own homepage into a centered, distraction-free hero (real logo + native search box, no feed)

### Content Filtering

- **Channel Blacklist** — Hide videos from specific channels by name
- **Word Blacklist** — Hide videos whose title contains specific keywords

### Localization

Fully translated into **46 languages**: Amharic, Arabic, Catalan, Czech, Danish, Dutch, English, English (AU), English (GB), Estonian, Farsi, Filipino, Finnish, French, German, Greek, Gujarati, Hebrew, Hindi, Croatian, Hungarian, Indonesian, Italian, Japanese, Kannada, Korean, Latvian, Lithuanian, Malay, Marathi, Norwegian, Polish, Portuguese (BR), Portuguese (PT), Romanian, Russian, Slovak, Slovenian, Serbian, Spanish, Spanish (LatAm), Swahili, Swedish, Tamil, Telugu, Turkish.

## Installation

### Chrome Web Store

Install directly from the [Chrome Web Store](https://chromewebstore.google.com/detail/focustube/bolmmhkapeekgcjopdmnbmnhgaapbpdb).

### Manual (Developer Mode)

1. Clone or download this repository
2. Open Chrome → `chrome://extensions/`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked**
5. Select the project folder
6. The extension icon appears in the toolbar

## Project Structure

```
focustube-chrome-extension/
├── manifest.json                 # Extension manifest (MV3)
├── front.html                    # Popup UI
├── _locales/                     # i18n translations (46 languages)
│   ├── en/messages.json
│   ├── es/messages.json
│   └── ...
├── src/
│   ├── core/
│   │   ├── Feature.js            # Abstract base class (Template Method)
│   │   ├── DOMFeature.js         # Base for DOM manipulation features
│   │   ├── FilterFeature.js      # Base for content filtering features
│   │   └── FeatureManager.js     # Central coordinator (Mediator)
│   ├── features/
│   │   ├── HideShortsFeature.js
│   │   ├── HideSuggestionsFeature.js
│   │   ├── HideCommentsFeature.js
│   │   ├── HideSidebarFeature.js
│   │   ├── HideAutoplayOverlayFeature.js
│   │   ├── HideHomePageContentFeature.js
│   │   ├── HideBlacklistedChannelsFeature.js
│   │   └── HideBlacklistedWordsFeature.js
│   ├── ui/
│   │   └── PopupController.js    # Popup interaction logic
│   ├── utils/
│   │   └── ConfigRegistry.js
│   └── content-main.js           # Entry point, registers all features
```

## Architecture

The extension uses a modular, class-based architecture with clear separation of concerns:

- **Feature** — Abstract base class implementing the Template Method pattern. Provides lifecycle hooks (`onInit`, `onActivate`, `onDeactivate`) and CSS injection utilities.
- **DOMFeature** — Extends Feature with DOM-specific tools: `observeDOM()` (MutationObserver wrapper), `hideElements()` / `showElements()`, and shadow DOM text search.
- **FilterFeature** — Extends DOMFeature for features that filter content based on user-defined lists (channels, words).
- **FeatureManager** — Mediator that coordinates initialization, state persistence (`chrome.storage.sync`), and message passing between the popup and content scripts.
- **PopupController** — MVC controller for the popup UI. Reads/writes feature states and sends toggle/config messages to the active tab.

### Data Flow

```
Popup (front.html + PopupController)
  ↕ chrome.runtime.sendMessage
Content Script (content-main.js → FeatureManager → Features)
  ↕ chrome.storage.sync
Persistence
```

### Adding a New Feature

1. Create a class in `src/features/` extending `DOMFeature` or `FilterFeature`
2. Implement `onInit()`, `onActivate()`, and `onDeactivate()`
3. Register it in `src/content-main.js` inside `featureManager.registerAll([])`
4. Add the file path to the `content_scripts.js` array in `manifest.json`
5. Add a toggle in `front.html` and wire it in `PopupController.js`
6. Add localization keys to `_locales/*/messages.json`

### Debugging

Open the browser console on any YouTube page:

```js
window.__focusTubeManager              // Feature manager instance
window.__focusTubeManager.getStats()   // { total, enabled, disabled, initialized }
window.__focusTubeManager.getAllStates() // Full state of every feature
```

### Releasing a New Version

```
node scripts/bump-version.js 2.5.5
```

Updates `manifest.json` (the real, shipped version) and your local `package.json`/`package-lock.json`, and warns if anything else in the repo still quotes the old number. Still manual afterward: write the `CHANGELOG.md` entry, then commit and open a PR — merging to `main` triggers the release build.

## Tech Stack

- **Manifest V3** — Chrome Extension platform
- **Vanilla JavaScript** — No frameworks, no build step
- **Tailwind CSS** (bundled) — Popup styling
- **Chrome Storage Sync API** — Settings persist across devices

## Support the Project

- **Star** this repository on GitHub
- **Rate** the extension on the [Chrome Web Store](https://chromewebstore.google.com/detail/focustube/bolmmhkapeekgcjopdmnbmnhgaapbpdb/reviews)
- **Report bugs** or suggest features in [Issues](https://github.com/pablomariaarranzpou/focustube-chrome-extension/issues)
- **Pull requests** are welcome (GPLv3 license applies)

## License

This project is licensed under the **GNU General Public License v3.0**.

You can freely use, modify, and distribute this software. If you distribute a modified version, you must also open source your modifications under the same GPLv3 license.

---

**Version**: 2.5.5
