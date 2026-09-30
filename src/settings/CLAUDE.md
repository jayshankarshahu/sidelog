# settings/ — settings page (`settings.html`, opened from BottomBar)
- `main.tsx` mounts `SettingsApp`. Sidebar categories (`selectedCategory`, default 'general').
- Settings persisted directly in `chrome.storage.local` (bypasses StorageService):
  - `theme`: 'dark'|'light' → also sets `document.documentElement[data-theme]`.
  - `openPreference`: 'sidepanel'|'popup' (default sidepanel).
- `service-worker.ts` listens to `chrome.storage.onChanged` for `openPreference`, calls `sidePanel.setPanelBehavior({openPanelOnActionClick: !isPopup})` and `action.setPopup(...)`, then opens the editor in the new mode.
- **Exports used by other pages:** `getStoredTheme()` (imported by App.tsx and TimelineApp.tsx) and `ThemeMode` type. Moving them requires updating those imports.
- Each storage helper here (`getStorage`, `applyTheme`) duplicates StorageService's approach; throws if chrome storage is unavailable.
