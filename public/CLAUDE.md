# public/ — copied as-is to `dist/` by Vite
- `manifest.json` (MV3): name Sidelog, version must match package.json (2.0.1). `action.default_popup` + `side_panel.default_path` both `index.html`. Permissions `storage`, `sidePanel`. Command `_execute_action` = Alt+B. Background `service-worker.js` (type module) — filename fixed by vite.config `entryFileNames`; don't rename.
- `icons/icon{16,48,128}.png` referenced by manifest.
- Adding a permission or page: edit manifest here and, for pages, vite.config.ts inputs. Bump version in BOTH manifest.json and package.json for releases.
