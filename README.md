# FocusTube Chrome Extension - Refactored Architecture

## 🎯 Overview

FocusTube helps you focus on YouTube by hiding distracting elements like Shorts, suggestions, and more. **Version 3.0** introduces a complete architectural overhaul with a modern, scalable, class-based design.

## ✨ What's New in v3.0

### Major Refactoring
- **1000+ lines** of monolithic code → **Clean, modular architecture**
- **Tightly coupled** functions → **Self-contained feature classes**
- **Procedural** code → **Object-oriented with design patterns**
- **Hard to extend** → **Add features without modifying existing code**

### Architecture Highlights
- ✅ **SOLID Principles**: Single responsibility, open/closed, Liskov substitution
- ✅ **Design Patterns**: Template Method, Mediator, Observer, Strategy
- ✅ **Separation of Concerns**: Core, Features, UI, Utils
- ✅ **Inheritance Hierarchy**: Feature → DOMFeature → FilterFeature
- ✅ **Extensibility**: Add new features by creating one class file

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

## 📁 Project Structure

```
focustube-chrome-extension/
├── manifest.json              # Extension configuration
├── front.html                 # Popup interface (refactored)
├── ARCHITECTURE.md            # Detailed architecture documentation
├── QUICKSTART.md              # Quick start guide
├── src/
│   ├── core/                  # Core architecture classes
│   │   ├── Feature.js         # Abstract base class for all features
│   │   ├── DOMFeature.js      # Base for DOM manipulation
│   │   ├── FilterFeature.js   # Base for content filtering
│   │   └── FeatureManager.js  # Central feature coordinator
│   ├── features/              # Feature implementations
│   │   ├── HideShortsFeature.js
│   │   ├── HideSuggestionsFeature.js
│   │   ├── HideCommentsFeature.js
│   │   ├── HideSidebarFeature.js
│   │   ├── HideAutoplayOverlayFeature.js
│   │   ├── HideHomePageContentFeature.js
│   │   ├── HideBlacklistedChannelsFeature.js
│   │   └── HideBlacklistedWordsFeature.js
│   ├── ui/                    # User interface layer
│   │   └── PopupController.js # MVC controller for popup
│   ├── utils/                 # Utility classes
│   │   └── ConfigRegistry.js  # Config, storage, messaging
│   └── content-main.js        # Main entry point
└── _locales/                  # Internationalization
```

## 🏗️ Architecture

### Class Hierarchy

```
Feature (Abstract)
    ↓
DOMFeature (DOM manipulation utilities)
    ↓
FilterFeature (Content filtering utilities)
    ↓
Concrete Features (HideShortsFeature, etc.)
```

### Design Patterns

1. **Template Method Pattern**
   - Feature class defines lifecycle: `initialize()` → `activate()` → `deactivate()`
   - Subclasses override hooks: `onInit()`, `onActivate()`, `onDeactivate()`

2. **Mediator Pattern**
   - FeatureManager coordinates all features
   - Single point of control and communication

3. **Observer Pattern**
   - MutationObserver for DOM changes
   - Storage changes propagate automatically

4. **Strategy Pattern**
   - Each feature implements its own hiding strategy
   - Strategies are interchangeable

### Core Classes

#### Feature (Base)
```javascript
class Feature {
  async initialize()   // One-time setup
  async activate()     // Enable feature
  async deactivate()   // Disable feature
  async toggle(state)  // Toggle on/off
  
  // Override these hooks
  async onInit()
  async onActivate()
  async onDeactivate()
}
```

#### DOMFeature
```javascript
class DOMFeature extends Feature {
  query(selector)              // Query with error handling
  hideElements(elements)       // Hide with comprehensive CSS
  showElements(elements)       // Show elements
  observeDOM(callback)         // Set up mutation observer
  elementContainsText(el, txt) // Search including shadow DOM
}
```

#### FeatureManager
```javascript
class FeatureManager {
  register(feature)               // Register a feature
  initializeAll()                 // Initialize all features
  toggleFeature(name, enabled)    // Toggle feature
  handleMessage(message)          // Handle popup messages
  getStats()                      // Get statistics
}
```

## 🔧 Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `focustube-chrome-extension` folder
6. The extension is now installed!

## 💻 Development

### Adding a New Feature

**Step 1**: Create feature class (`src/features/MyFeature.js`)

```javascript
class MyFeature extends DOMFeature {
  constructor() {
    super('myFeature', { defaultEnabled: false });
  }

  async onInit() {
    console.debug('MyFeature initialized');
  }

  async onActivate() {
    // Your feature logic
    const elements = this.query('.unwanted-selector');
    this.hideElements(elements);
    
    // React to page changes
    this.observeDOM(() => {
      const newElements = this.query('.unwanted-selector');
      this.hideElements(newElements);
    });
  }
}
```

**Step 2**: Register in `src/content-main.js`

```javascript
featureManager.registerAll([
  // ... existing features
  new MyFeature()  // Add here
]);
```

**Step 3**: Add to `manifest.json`

```json
"js": [
  ...
  "src/features/MyFeature.js",
  "src/content-main.js"
]
```

**Step 4**: Add UI (optional) in `front.html`

```html
<label class="toggle-container">
  <input type="checkbox" id="myFeatureCheckbox" class="toggle-input">
  <span class="toggle-slider"></span>
  <span class="ml-3">My Feature</span>
</label>
```

That's it! No modification of existing code required. 🎉

### Key Benefits

#### Before (Legacy):
- 1000+ line monolithic file
- Functions tightly coupled
- Hard to add features without breaking things
- Difficult to test
- No clear structure

#### After (Refactored):
- Modular, self-contained classes
- Clear inheritance hierarchy
- Add features without touching existing code
- Easy to test each feature
- Self-documenting architecture

### Development Workflow

1. **Create** feature class extending appropriate base
2. **Implement** required lifecycle hooks
3. **Register** feature with FeatureManager
4. **Test** independently
5. **Deploy** without touching other features

## 🐛 Debugging

Access debug tools in browser console (on YouTube pages):

```javascript
// Get feature manager
window.__focusTubeManager

// Check statistics
window.__focusTubeManager.getStats()
// → { total: 8, enabled: 5, disabled: 3, ... }

// Get specific feature
const shorts = window.__focusTubeManager.get('hideShorts')

// Check if enabled
shorts.enabled // → true/false

// Toggle feature programmatically
window.__focusTubeManager.toggleFeature('hideShorts', false)

// In popup console
window.__focusTubePopup.featureStates
```

## 📚 Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Comprehensive architecture documentation
- **[QUICKSTART.md](QUICKSTART.md)** - Quick start guide for developers
- **Code Comments** - Extensive inline documentation

## 🎨 Design Principles

### SOLID Principles

1. **Single Responsibility**: Each class has one clear purpose
2. **Open/Closed**: Open for extension, closed for modification
3. **Liskov Substitution**: Features are interchangeable
4. **Interface Segregation**: Focused, minimal interfaces
5. **Dependency Inversion**: Depend on abstractions (base classes)

### Code Quality

- ✅ Clear separation of concerns
- ✅ Consistent naming conventions
- ✅ Comprehensive error handling
- ✅ Memory leak prevention
- ✅ Performance optimizations

## 🔄 Backward Compatibility

The refactored version maintains full backward compatibility:
- ✅ Legacy storage keys are loaded and converted
- ✅ Message format unchanged
- ✅ All existing features work identically
- ✅ User settings are preserved

## 🚦 Performance

Optimizations implemented:
- Parallel feature initialization
- Efficient DOM observation with debouncing
- CSS-first approach for faster hiding
- Proper cleanup prevents memory leaks
- Minimal runtime overhead

## 📝 Version History

### v3.0.0 (2026-01-18) - Major Refactoring
- Complete architectural overhaul
- Class-based design with inheritance
- Design patterns implementation
- Modular, extensible structure
- Comprehensive documentation

### v2.4.1 (Previous)
- Legacy monolithic implementation
- All features functional
- Single file architecture

## 🤝 Contributing

Contributions are welcome! The new architecture makes it easy:

1. **Fork** the repository
2. **Create** a new feature class
3. **Test** your feature
4. **Submit** a pull request

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed guidelines.

## 📜 License

[Your license here]

## 🙏 Acknowledgments

- Original FocusTube concept and functionality
- Refactored architecture by [Your Name]
- Design patterns inspiration from Gang of Four

## 📞 Support

- **Issues**: Use GitHub Issues
- **Docs**: See ARCHITECTURE.md and QUICKSTART.md
- **Console**: Use browser console for debugging

---

**Made with ❤️ and SOLID principles**

**Version**: 3.0.0
**Architecture**: Class-based, Modular, Extensible
**Patterns**: Template Method, Mediator, Observer, Strategy
