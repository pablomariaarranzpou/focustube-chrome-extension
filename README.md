# FocusTube - Hide YouTube Shorts, Recommendations, Suggestions & Block Words

## 🎯 Overview

FocusTube helps you focus on YouTube by hiding distracting elements like Shorts, suggestions, and more.

## 🚀 Features

### Content Hiding
- **Hide Shorts** - Remove YouTube Shorts from all pages
- **Hide Suggestions** - Hide recommended videos
- **Hide Comments** - Remove comment sections
- **Hide Sidebar** - Hide left navigation (desktop only)
- **Hide Autoplay Overlay** - Remove end-of-video autoplay
- **Hide Home Page Content** - Clean, distraction-free homepage

### Content Filtering
- **Channel Blacklist** - Hide videos from specific channels
- **Word Blacklist** - Hide videos containing specific keywords

## 🔧 Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `focustube-chrome-extension` folder
6. The extension is now installed!

## � Development

### Project Structure

```
focustube-chrome-extension/
├── manifest.json              # Extension configuration
├── front.html                 # Popup interface
├── src/
│   ├── core/                  # Core architecture classes
│   │   ├── Feature.js         # Abstract base class
│   │   └── FeatureManager.js  # Central feature coordinator
│   ├── features/              # Feature implementations
│   ├── ui/                    # User interface layer
│   ├── utils/                 # Utility classes
│   └── content-main.js        # Main entry point
```

### Architecture

The project uses a modular, class-based architecture:
- **Feature**: Abstract base class for all features
- **DOMFeature**: Base class for DOM manipulation features
- **FilterFeature**: Base class for content filtering
- **FeatureManager**: Coordinates initialization and state

### Adding a New Feature

1. **Create** a new class file in `src/features/` (e.g., `MyFeature.js`) extending `DOMFeature`.
2. **Implement** the `onActivate()` and `onDeactivate()` methods.
3. **Register** the feature in `src/content-main.js`.
4. **Add** the file path to `manifest.json`.

### Debugging

You can use the browser console on YouTube pages:
- Access the manager: `window.__focusTubeManager`
- Check stats: `window.__focusTubeManager.getStats()`

## ☕ Support the Project

If you find this extension useful and want to support its development:

- ⭐ **Star** this repository on GitHub to help others find it.
- 🐛 **Report bugs** or suggest new features in the [Issues](https://github.com/focustube-chrome-extension/issues) section.
- 💻 **Code Contributions**: Pull requests are welcome! (Remember to follow the GPLv3 license).
- 🗣️ **Share** the tool with friends or colleagues who need focus.

## �📄 License

This project is licensed under the **GNU General Public License v3.0**.

This means:
- You can freely use, modify, and distribute this software.
- If you distribute a modified version, **you must also open source your modifications** under the same GPLv3 license.
- This protects the project from being turned into a closed-source proprietary extension without giving back to the community.

---

**Made with ❤️**

**Version**: 2.4.2
