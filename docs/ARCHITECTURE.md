# FocusTube - Refactored Architecture

## Overview

This project has been completely refactored from a monolithic, tightly-coupled design into a modern, scalable, class-based architecture. The new design emphasizes:

- **Separation of Concerns**: Each feature is isolated in its own class
- **Open/Closed Principle**: Add new features without modifying existing code
- **Template Method Pattern**: Consistent lifecycle for all features
- **Mediator Pattern**: Centralized feature coordination
- **Dependency Injection**: Loose coupling between components

## Architecture

### Core Classes

#### 1. `Feature` (Base Class)
Located in `src/core/Feature.js`

Abstract base class for all features. Implements the Template Method pattern with lifecycle hooks:

```javascript
class Feature {
  // State Management
  enabled: boolean    // User preference from storage
  isActive: boolean   // Current execution state (running/stopped)
  
  // Lifecycle Methods
  async initialize()    // One-time setup
  async activate()      // Enable feature
  async deactivate()    // Disable feature
  async toggle(state)   // Toggle on/off
  
  // Hooks to override
  async onBeforeInit()
  async onInit()
  async onAfterInit()
  async onActivate()
  async onDeactivate()
}
```

**Key Features:**
- **State Separation**: Distinguishes between configuration (`enabled`) and runtime state (`isActive`) to ensure reliable activation on page reloads.
- **Automatic CSS Injection**: helper methods for injecting and tracking style elements.
- **Sync/Async Hybrid**: Supports both immediate synchronous execution (for `document_start`) and async operations.
- **Error Handling**: Built-in try-catch blocks prevent feature failures from cascading.

#### 2. `DOMFeature` (Extends Feature)
Located in `src/core/DOMFeature.js`

Specialized base class for DOM manipulation features.

**Capabilities:**
- Element querying with error handling
- Hide/show elements with comprehensive CSS properties
- MutationObserver management
- Shadow DOM text search
- Automatic cleanup on deactivation

**Common Methods:**
```javascript
query(selector)                    // Query with error handling
hideElements(elements)             // Hide with all CSS properties
showElements(elements)             // Show by removing properties
observeDOM(callback, options)      // Set up mutation observer
elementContainsText(el, text)      // Search including shadow DOM
```

#### 3. `FilterFeature` (Extends DOMFeature)
Located in `src/core/FilterFeature.js`

Base class for content filtering features (blacklists, etc.)

**Capabilities:**
- Manage filter lists
- Add/remove items dynamically
- Persist filters to storage
- Apply filters on DOM changes

**Abstract Methods:**
```javascript
matchesFilter(item)     // Check if item matches filter
applyFilters()          // Apply all filters to page
```

#### 4. `FeatureManager` (Mediator)
Located in `src/core/FeatureManager.js`

Central coordinator for all features. Implements the Mediator pattern.

**Responsibilities:**
- Register and manage feature instances
- Initialize all features
- Handle messages from popup
- Persist/restore feature states
- Provide statistics

**Key Methods:**
```javascript
register(feature)                  // Register a feature
registerAll(features)              // Register multiple features
initializeAll()                    // Initialize all registered
toggleFeature(name, enabled)       // Toggle feature state
updateFeatureConfig(name, config)  // Update feature config
handleMessage(message)             // Handle extension messages
```

### Feature Implementations

All features are located in `src/features/`:

1. **HideShortsFeature** - Hide YouTube Shorts
2. **HideSuggestionsFeature** - Hide video recommendations
3. **HideCommentsFeature** - Hide comments section
4. **HideSidebarFeature** - Hide left sidebar/guide
5. **HideAutoplayOverlayFeature** - Hide autoplay overlay
6. **HideHomePageContentFeature** - Hide homepage content
7. **HideBlacklistedChannelsFeature** - Filter by channel
8. **HideBlacklistedWordsFeature** - Filter by keywords

### Utility Classes

Located in `src/utils/ConfigRegistry.js`:

1. **ConfigRegistry** - Centralized configuration with validation
2. **StorageAdapter** - Chrome storage wrapper with promises
3. **MessageBus** - Pub/sub messaging between components

### UI Layer

Located in `src/ui/PopupController.js`:

**PopupController** - MVC controller for popup interface
- Manages UI state
- Handles user interactions
- Communicates with content script
- Supports i18n localization

## Adding New Features

Adding a new feature requires NO modification of existing code:

### Step 1: Create Feature Class

```javascript
// src/features/MyNewFeature.js
class MyNewFeature extends DOMFeature {
  constructor() {
    super('myNewFeature', {
      defaultEnabled: false,
      // your config options
    });
  }

  async onInit() {
    // One-time initialization
    console.debug('MyNewFeature initialized');
  }

  async onActivate() {
    // Enable the feature
    this.applyMyChanges();
    this.observeDOM(() => this.applyMyChanges());
  }

  async onDeactivate() {
    // Cleanup is automatic via parent class
    await super.onDeactivate();
  }

  applyMyChanges() {
    // Your feature logic here
    const elements = this.query('.some-selector');
    this.hideElements(elements);
  }
}
```

### Step 2: Register in Content Script

```javascript
// src/content-main.js
featureManager.registerAll([
  // ... existing features
  new MyNewFeature()  // Add your feature
]);
```

### Step 3: Add to Manifest

```json
// manifest.json
"content_scripts": [{
  "js": [
    // ... existing files
    "src/features/MyNewFeature.js",
    "src/content-main.js"
  ]
}]
```

### Step 4: Add UI (Optional)

```html
<!-- front.html -->
<label class="toggle-container">
  <input type="checkbox" id="myNewFeatureCheckbox" class="toggle-input">
  <span class="toggle-slider"></span>
  <span class="ml-3">My New Feature</span>
</label>
```

```javascript
// src/ui/PopupController.js
// Add to checkboxMap in setupEventListeners()
myNewFeatureCheckbox: 'myNewFeature'
```

That's it! No modification of existing features required.

## Design Patterns Used

### 1. Template Method Pattern
The `Feature` class defines the skeleton of feature lifecycle, with hooks for subclasses to customize behavior.

**Benefits:**
- Consistent lifecycle across all features
- Code reuse through inheritance
- Extension points without modification

### 2. Mediator Pattern
`FeatureManager` acts as a mediator coordinating all features.

**Benefits:**
- Loose coupling between features
- Centralized communication logic
- Single point of control

### 3. Observer Pattern
Features use MutationObserver for DOM changes, ConfigRegistry for config changes.

**Benefits:**
- Reactive updates to page changes
- Decoupled notification system

### 4. Strategy Pattern
Different features implement different strategies for hiding content.

**Benefits:**
- Interchangeable algorithms
- Easy to add new strategies

### 5. Factory Pattern
Feature instantiation in content-main.js acts as a factory.

**Benefits:**
- Centralized object creation
- Easy to modify feature creation logic

## File Structure

```
focustube-chrome-extension/
├── manifest.json              # Extension manifest (updated)
├── front.html                 # Popup UI (refactored)
├── src/
│   ├── core/                  # Core architecture classes
│   │   ├── Feature.js         # Base feature class
│   │   ├── DOMFeature.js      # DOM manipulation base
│   │   ├── FilterFeature.js   # Filtering base
│   │   └── FeatureManager.js  # Feature coordinator
│   ├── features/              # Feature implementations
│   │   ├── HideShortsFeature.js
│   │   ├── HideSuggestionsFeature.js
│   │   ├── HideCommentsFeature.js
│   │   ├── HideSidebarFeature.js
│   │   ├── HideAutoplayOverlayFeature.js
│   │   ├── HideHomePageContentFeature.js
│   │   ├── HideBlacklistedChannelsFeature.js
│   │   └── HideBlacklistedWordsFeature.js
│   ├── ui/                    # UI controllers
│   │   └── PopupController.js # Popup MVC controller
│   ├── utils/                 # Utility classes
│   │   └── ConfigRegistry.js  # Config, storage, messaging
│   └── content-main.js        # Main entry point
└── _locales/                  # Internationalization
    └── [language codes]/
        └── messages.json
```

## Benefits of New Architecture

### 1. Scalability
- Add features without touching existing code
- Each feature is independent
- Easy to test features in isolation

### 2. Maintainability
- Clear separation of concerns
- Self-documenting through class structure
- Easy to locate and fix bugs

### 3. Extensibility
- Multiple inheritance paths (Feature → DOMFeature → FilterFeature)
- Override only what you need
- Lifecycle hooks provide extension points

### 4. Code Reuse
- Common DOM operations in DOMFeature
- Common filtering logic in FilterFeature
- Utility classes for cross-cutting concerns

### 5. Type Safety (Future)
- Architecture is ready for TypeScript
- Clear interfaces and contracts
- Type definitions can be added easily

## Migration from Legacy Code

The legacy code has been preserved:
- `content.js` - Original monolithic content script
- `popup.js` - Original popup script
- `front.html` - Original popup HTML

The new code provides the same functionality with better architecture:
- `src/*` - New modular code
- `front.html` - New popup
- `manifest.json` - Updated to use new files

To switch back to legacy (not recommended):
1. Change `manifest.json` to use `content.js` and `front.html`
2. Change version back to 2.4.1

## Testing

### Manual Testing
1. Load unpacked extension in Chrome
2. Navigate to YouTube
3. Toggle features in popup
4. Verify functionality

### Debugging
Access feature manager in console:
```javascript
// In content script context
window.__focusTubeManager.getStats()
window.__focusTubeManager.get('hideShorts')

// In popup context
window.__focusTubePopup.featureStates
```

## Future Enhancements

### Easy to Add
1. **TypeScript Migration** - Architecture is ready
2. **Unit Tests** - Each class is testable
3. **New Features** - Just extend base classes
4. **Analytics** - Add observer to FeatureManager
5. **Feature Dependencies** - Add to FeatureManager
6. **Feature Priorities** - Add to Feature class
7. **Conditional Features** - Add validators
8. **Feature Groups** - Add grouping to manager

### Examples

**Add Analytics:**
```javascript
featureManager.subscribe('featureToggled', (feature) => {
  analytics.track('feature_toggled', {
    name: feature.name,
    enabled: feature.enabled
  });
});
```

**Add Feature Dependency:**
```javascript
class DependentFeature extends Feature {
  async onActivate() {
    const required = this.manager.get('requiredFeature');
    if (!required.enabled) {
      throw new Error('Required feature not enabled');
    }
    // ... rest of activation
  }
}
```

## Performance Considerations

### Optimizations Implemented
1. **Lazy Initialization** - Features initialize only when needed
2. **Debounced DOM Observers** - Prevent excessive calls
3. **CSS-First Hiding** - Faster than JavaScript
4. **Parallel Initialization** - Features init concurrently
5. **Element Tracking** - Fast cleanup on deactivation

### Memory Management
- MutationObservers disconnected on deactivation
- CSS elements removed on deactivation
- Element references cleared
- Event listeners properly removed

## Backward Compatibility

The new architecture maintains backward compatibility:
- Loads legacy storage keys
- Converts to new format automatically
- Popup works with old and new content scripts
- Message format unchanged

## Conclusion

This refactoring transforms a 1000+ line monolithic file into a modular, extensible architecture. Each class has a single responsibility, and new features can be added by creating a new class file - no modification of existing code required.

The architecture follows SOLID principles and common design patterns, making the codebase professional, maintainable, and ready for future growth.
