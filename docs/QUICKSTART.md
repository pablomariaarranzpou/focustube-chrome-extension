# FocusTube - Quick Start Guide

## What Changed?

Your FocusTube extension has been completely refactored with a modern, scalable architecture. The functionality remains the same, but the code is now:

- **Modular**: Each feature is a separate class
- **Extensible**: Add new features without touching existing code
- **Maintainable**: Clear structure and separation of concerns
- **Professional**: Uses industry-standard design patterns

## Installation

1. **Load the Extension**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `focustube-chrome-extension` folder

2. **Verify Installation**
   - You should see "FocusTube" in your extensions
   - Click the extension icon to open the popup
   - All features should be available

## Using the Extension

### Features Available

1. **Hide Shorts** - Removes YouTube Shorts from all pages
2. **Hide Suggestions** - Hides recommended videos
3. **Hide Comments** - Removes comment sections
4. **Hide Sidebar** - Hides left navigation panel (desktop only)
5. **Hide Autoplay Overlay** - Removes end-of-video autoplay
6. **Hide Home Page Content** - Clean homepage
7. **Channel Blacklist** - Hide specific channels
8. **Word Blacklist** - Hide videos with specific keywords

### Toggle Features

Click the extension icon and use the toggles to enable/disable features. Changes apply immediately on YouTube pages.

### Manage Blacklists

1. Click "Channel Blacklist ▼" or "Word Blacklist ▼" to expand
2. Enter channel name or keyword
3. Click "Add"
4. Remove items by clicking "Remove" next to them

## For Developers

### Project Structure

```
src/
├── core/           # Base classes (Feature, DOMFeature, etc.)
├── features/       # Feature implementations
├── ui/            # Popup controller
├── utils/         # Utilities (storage, messaging, config)
└── content-main.js # Entry point
```

### Adding a New Feature

1. **Create Feature Class** (`src/features/YourFeature.js`):

```javascript
class YourFeature extends DOMFeature {
  constructor() {
    super('yourFeature', { defaultEnabled: false });
  }

  async onInit() {
    console.debug('YourFeature initialized');
  }

  async onActivate() {
    // Your feature logic
    const elements = this.query('.selector');
    this.hideElements(elements);
  }
}
```

2. **Register Feature** (in `src/content-main.js`):

```javascript
featureManager.registerAll([
  // ... existing features
  new YourFeature()
]);
```

3. **Add to Manifest** (`manifest.json`):

```json
"js": [
  ...
  "src/features/YourFeature.js",
  "src/content-main.js"
]
```

4. **Add UI** (optional, in `front.html`):

```html
<label class="toggle-container">
  <input type="checkbox" id="yourFeatureCheckbox" class="toggle-input">
  <span class="toggle-slider"></span>
  <span class="ml-3">Your Feature</span>
</label>
```

That's it! Reload the extension to test.

### Key Classes

- **Feature**: Base class for all features
- **DOMFeature**: For DOM manipulation features
- **FilterFeature**: For content filtering features
- **FeatureManager**: Coordinates all features

### Debugging

Open browser console on YouTube:

```javascript
// Get feature manager
window.__focusTubeManager

// Check stats
window.__focusTubeManager.getStats()

// Get specific feature
window.__focusTubeManager.get('hideShorts')

// Check feature state
window.__focusTubeManager.get('hideShorts').enabled
```

## Architecture Highlights

### Design Patterns Used

1. **Template Method**: Feature lifecycle (init → activate → deactivate)
2. **Mediator**: FeatureManager coordinates all features
3. **Observer**: MutationObserver for DOM changes
4. **Strategy**: Different hiding strategies per feature

### SOLID Principles

- **Single Responsibility**: Each class has one job
- **Open/Closed**: Extend with new features without modifying existing code
- **Liskov Substitution**: Features are interchangeable
- **Interface Segregation**: Clear, focused interfaces
- **Dependency Inversion**: Depend on abstractions (base classes)

## Backward Compatibility

The new architecture is fully backward compatible:
- Legacy storage keys are loaded and converted
- Old popup still works (though new one is recommended)
- Messages use same format

## Common Tasks

### Enable/Disable Feature Programmatically

```javascript
// In content script
window.__focusTubeManager.toggleFeature('hideShorts', true);  // Enable
window.__focusTubeManager.toggleFeature('hideShorts', false); // Disable
```

### Update Feature Configuration

```javascript
window.__focusTubeManager.updateFeatureConfig('hideShorts', {
  blockShortsPath: true,
  aggressiveBlocking: true
});
```

### Listen for Feature Changes

```javascript
// Subscribe to feature toggle events
// (You'd add this to FeatureManager)
featureManager.on('featureToggled', (feature) => {
  console.log(`${feature.name} is now ${feature.enabled ? 'enabled' : 'disabled'}`);
});
```

## Testing

1. **Load Extension**: Follow installation steps
2. **Open YouTube**: Navigate to youtube.com
3. **Toggle Features**: Use popup to enable/disable
4. **Verify**: Check that features work as expected
5. **Check Console**: Look for any errors

## Troubleshooting

### Features Not Working

1. Check if extension is enabled in `chrome://extensions/`
2. Refresh YouTube page
3. Check browser console for errors
4. Verify manifest.json includes all required files

### Popup Not Opening

1. Check for JavaScript errors in popup console (right-click → Inspect)
2. Verify front.html loads correctly
3. Check manifest.json popup path

### Storage Issues

Clear extension storage:
```javascript
chrome.storage.sync.clear(() => {
  console.log('Storage cleared');
  location.reload();
});
```

## Performance

The new architecture is optimized for performance:
- Features initialize in parallel
- DOM observers are efficient and debounced
- CSS-first approach for faster hiding
- Proper cleanup prevents memory leaks

## Next Steps

1. **Read ARCHITECTURE.md** for detailed documentation
2. **Explore src/features/** to see how features work
3. **Try adding a simple feature** to learn the system
4. **Consider TypeScript migration** for type safety

## Support

For issues or questions:
1. Check ARCHITECTURE.md for detailed docs
2. Review existing feature implementations
3. Use browser console for debugging
4. Check Chrome extension logs

## License

[Your license here]

---

**Version**: 3.0.0 (Refactored)
**Last Updated**: 2026-01-18
