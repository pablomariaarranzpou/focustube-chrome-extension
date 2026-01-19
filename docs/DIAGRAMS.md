# FocusTube Architecture Diagrams

## Class Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                         Feature                              │
│  (Abstract Base Class)                                       │
│                                                              │
│  Properties:                                                 │
│  - name: string                                             │
│  - enabled: boolean                                         │
│  - config: object                                           │
│  - styleElements: Map                                       │
│                                                              │
│  Methods:                                                    │
│  + initialize()                                             │
│  + activate()                                               │
│  + deactivate()                                             │
│  + toggle(state)                                            │
│  + injectCSS(id, css)                                       │
│  + removeCSS(id)                                            │
│  + getState()                                               │
│  + setState(state)                                          │
│                                                              │
│  Hooks (must override):                                     │
│  # onInit()                                                 │
│  # onActivate()                                             │
│  # onDeactivate()                                           │
└──────────────────────────────────────────────────────────────┘
                           │
                           │ extends
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      DOMFeature                              │
│  (Base for DOM Manipulation)                                │
│                                                              │
│  Additional Properties:                                     │
│  - observers: Array<MutationObserver>                       │
│  - targetElements: Map<Element, string>                     │
│                                                              │
│  Additional Methods:                                        │
│  + query(selector)                                          │
│  + hideElements(elements)                                   │
│  + showElements(elements)                                   │
│  + hideById(id)                                             │
│  + showById(id)                                             │
│  + observeDOM(callback, options)                            │
│  + elementContainsText(element, text)                       │
│  + disconnectObservers()                                    │
└──────────────────────────────────────────────────────────────┘
                           │
                           │ extends
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    FilterFeature                             │
│  (Base for Content Filtering)                               │
│                                                              │
│  Additional Properties:                                     │
│  - filterList: Array<string>                                │
│                                                              │
│  Additional Methods:                                        │
│  + updateFilterList(list)                                   │
│  + addToFilter(item)                                        │
│  + removeFromFilter(item)                                   │
│  + clearFilter()                                            │
│  + loadFilterList()                                         │
│  + saveFilterList()                                         │
│                                                              │
│  Abstract Methods (must override):                          │
│  # matchesFilter(item)                                      │
│  # applyFilters()                                           │
└──────────────────────────────────────────────────────────────┘
                           │
                           │ extends
                           ▼
         ┌─────────────────┴─────────────────┐
         │                                    │
         ▼                                    ▼
┌──────────────────────┐          ┌──────────────────────┐
│ HideBlacklisted      │          │ HideBlacklisted      │
│ ChannelsFeature      │          │ WordsFeature         │
└──────────────────────┘          └──────────────────────┘
```

## Feature Implementations

```
DOMFeature
    │
    ├── HideShortsFeature
    │   └── Hides YouTube Shorts across the platform
    │
    ├── HideSuggestionsFeature
    │   └── Hides video recommendations
    │
    ├── HideCommentsFeature
    │   └── Hides comment sections
    │
    ├── HideSidebarFeature
    │   └── Hides left navigation sidebar
    │
    ├── HideAutoplayOverlayFeature
    │   └── Hides end-of-video autoplay overlay
    │
    └── HideHomePageContentFeature
        └── Hides content on YouTube homepage

FilterFeature
    │
    ├── HideBlacklistedChannelsFeature
    │   └── Filters videos by channel blacklist
    │
    └── HideBlacklistedWordsFeature
        └── Filters videos by keyword blacklist
```

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Chrome Extension                        │
└─────────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
        ▼                                     ▼
┌──────────────────┐              ┌──────────────────┐
│  Popup (UI)      │              │  Content Script  │
│                  │              │                  │
│  front.html      │◄────────────►│  content-main.js │
│  PopupController │   Messages   │  FeatureManager  │
└──────────────────┘              └──────────────────┘
        │                                     │
        │ Updates                             │ Manages
        ▼                                     ▼
┌──────────────────┐              ┌──────────────────┐
│  Storage         │              │  Features        │
│                  │              │  (8 instances)   │
│  Chrome Sync     │              │                  │
└──────────────────┘              └──────────────────┘
                                            │
                                            │ Modifies
                                            ▼
                                  ┌──────────────────┐
                                  │  YouTube DOM     │
                                  └──────────────────┘
```

## Feature Lifecycle

```
┌─────────────┐
│   Create    │  new HideShortsFeature()
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Register   │  featureManager.register(feature)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Initialize  │  feature.initialize()
│             │    ├─ onBeforeInit()
│             │    ├─ onInit()
│             │    └─ onAfterInit()
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Activate   │  feature.activate() [if enabled]
│             │    └─ onActivate()
│             │         ├─ Apply changes
│             │         ├─ Inject CSS
│             │         └─ Set up observers
└──────┬──────┘
       │
       │ ◄────┐ Toggle on/off
       ▼      │
┌─────────────┐
│   Active    │  Feature is running
│             │    └─ Observing DOM changes
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Deactivate  │  feature.deactivate()
│             │    └─ onDeactivate()
│             │         ├─ Disconnect observers
│             │         ├─ Remove CSS
│             │         └─ Show hidden elements
└─────────────┘
```

## Feature Manager Flow

```
┌──────────────────────────────────────────────────────────┐
│                    FeatureManager                         │
│                                                           │
│  ┌────────────────────────────────────────────────┐     │
│  │         features: Map<name, Feature>           │     │
│  └────────────────────────────────────────────────┘     │
│                                                           │
│  ┌────────────────────────────────────────────────┐     │
│  │  register(feature)                             │     │
│  │    └─ features.set(name, feature)              │     │
│  └────────────────────────────────────────────────┘     │
│                                                           │
│  ┌────────────────────────────────────────────────┐     │
│  │  initializeAll()                               │     │
│  │    ├─ loadStates()                             │     │
│  │    └─ Promise.all(features.initialize())       │     │
│  └────────────────────────────────────────────────┘     │
│                                                           │
│  ┌────────────────────────────────────────────────┐     │
│  │  toggleFeature(name, enabled)                  │     │
│  │    ├─ feature.toggle(enabled)                  │     │
│  │    └─ saveStates()                             │     │
│  └────────────────────────────────────────────────┘     │
│                                                           │
│  ┌────────────────────────────────────────────────┐     │
│  │  handleMessage(message)                        │     │
│  │    ├─ toggleFeature                            │     │
│  │    ├─ updateConfig                             │     │
│  │    └─ getStates                                │     │
│  └────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────┘
```

## Message Flow

```
┌──────────────┐                                ┌──────────────┐
│    Popup     │                                │   Content    │
│              │                                │   Script     │
│              │  chrome.runtime.sendMessage    │              │
│  User clicks │───────────────────────────────►│  Message     │
│  toggle      │  { type, featureName, state }  │  received    │
│              │                                │              │
│              │                                │      │       │
│              │                                │      ▼       │
│              │                                │  ┌─────────┐ │
│              │                                │  │ Feature │ │
│              │                                │  │ Manager │ │
│              │                                │  └────┬────┘ │
│              │                                │       │      │
│              │                                │       ▼      │
│              │                                │  ┌─────────┐ │
│              │                                │  │ Feature │ │
│              │                                │  │.toggle()│ │
│              │                                │  └────┬────┘ │
│              │                                │       │      │
│              │        sendResponse            │       ▼      │
│   Update UI  │◄───────────────────────────────│  Changes    │
│              │  { success: true }             │  applied    │
└──────────────┘                                └──────────────┘

         │                                              │
         │                                              │
         ▼                                              ▼
┌──────────────┐                                ┌──────────────┐
│   Storage    │                                │  YouTube     │
│              │                                │   DOM        │
│  chrome.     │                                │              │
│  storage.    │                                │  Elements    │
│  sync        │                                │  hidden/     │
│              │                                │  shown       │
└──────────────┘                                └──────────────┘
```

## Data Flow

```
┌──────────────────────────────────────────────────────────┐
│                     Storage Layer                         │
│                  (chrome.storage.sync)                    │
│                                                           │
│  focustube_features: {                                   │
│    hideShorts: { enabled: true, config: {...} },        │
│    hideSuggestions: { enabled: true, ... },             │
│    ...                                                   │
│  }                                                        │
└────────────────────┬─────────────────────────────────────┘
                     │
                     │ Load/Save
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│                   FeatureManager                          │
│                                                           │
│  features: Map {                                         │
│    'hideShorts' => HideShortsFeature { enabled: true }  │
│    'hideSuggestions' => HideSuggestionsFeature {...}    │
│    ...                                                   │
│  }                                                        │
└────────────────────┬─────────────────────────────────────┘
                     │
                     │ Coordinate
                     │
         ┌───────────┼───────────┐
         │           │           │
         ▼           ▼           ▼
    ┌────────┐  ┌────────┐  ┌────────┐
    │Feature1│  │Feature2│  │Feature3│
    │ active │  │inactive│  │ active │
    └───┬────┘  └────────┘  └───┬────┘
        │                        │
        │ Modify DOM             │ Modify DOM
        │                        │
        ▼                        ▼
┌──────────────────────────────────────────────────────────┐
│                      YouTube DOM                          │
│                                                           │
│  <ytd-app>                                               │
│    <video-element> [hidden by Feature1]                 │
│    <suggestions> [visible]                              │
│    <shorts> [hidden by Feature3]                        │
│  </ytd-app>                                              │
└──────────────────────────────────────────────────────────┘
```

## Adding a New Feature (Visual Guide)

```
Step 1: Create Class
┌────────────────────────────────────┐
│  src/features/MyFeature.js         │
│                                    │
│  class MyFeature extends           │
│    DOMFeature {                    │
│    constructor() {...}             │
│    async onActivate() {...}        │
│  }                                 │
└────────────────────────────────────┘
                │
                │
Step 2: Register     │
┌────────────────────▼──────────────┐
│  src/content-main.js              │
│                                   │
│  featureManager.registerAll([    │
│    ...existingFeatures,          │
│    new MyFeature() ◄─── Add here │
│  ]);                              │
└───────────────────────────────────┘
                │
                │
Step 3: Manifest     │
┌────────────────────▼──────────────┐
│  manifest.json                    │
│                                   │
│  "js": [                          │
│    "src/core/Feature.js",        │
│    ...                           │
│    "src/features/MyFeature.js", │◄─ Add here
│    "src/content-main.js"        │
│  ]                               │
└──────────────────────────────────┘

✓ Feature is now active!
  No changes to existing code needed.
```

## Extension Points

```
Feature Class
    │
    ├─► onBeforeInit()   ─── Do preparation work
    │
    ├─► onInit()         ─── Main initialization
    │
    ├─► onAfterInit()    ─── Post-initialization
    │
    ├─► onActivate()     ─── Enable feature logic
    │
    └─► onDeactivate()   ─── Cleanup (optional, auto-handled)

DOMFeature adds:
    │
    ├─► query()           ─── Custom element selection
    │
    ├─► hideElements()    ─── Custom hiding logic
    │
    └─► observeDOM()      ─── Custom DOM observation

FilterFeature adds:
    │
    ├─► matchesFilter()   ─── Custom matching logic
    │
    └─► applyFilters()    ─── Custom filter application
```

## Performance Characteristics

```
Operation                  Complexity    Notes
────────────────────────────────────────────────────────
Feature initialization     O(n)          Parallel execution
Feature toggle            O(1)          Direct map access
DOM observation           O(m)          m = mutations
Element hiding            O(k)          k = elements
Filter application        O(e×f)        e=elements, f=filters
State persistence         O(n)          n = features
Message handling          O(1)          Direct routing

Memory per feature:       ~1-2 KB       Observers + state
Total overhead:           ~16-24 KB     8 features + manager
```

## Thread Safety

```
┌─────────────────────────────────────────────────────────┐
│              Main Thread (Content Script)                │
│                                                          │
│  FeatureManager ──┬──► Feature 1 ──► DOM API           │
│                   ├──► Feature 2 ──► DOM API           │
│                   └──► Feature 3 ──► DOM API           │
│                                                          │
│  MutationObserver ──────────────────► Callbacks        │
│                                                          │
│  Note: All operations are single-threaded              │
│        No race conditions possible                      │
│        Observers are serialized                         │
└─────────────────────────────────────────────────────────┘
```
