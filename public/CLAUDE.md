# public/ — copied as-is to `dist/` by Vite
- `manifest.json` (MV3): name Sidelog, version must match package.json (2.1.0). `action.default_popup` + `side_panel.default_path` both `index.html`. Permissions `storage`, `sidePanel`, `unlimitedStorage` (lifts the ~10 MB `storage.local` cap; adding any permission makes Chrome ask existing users to re-approve on update). Command `_execute_action` = Alt+B. Background `service-worker.js` (type module) — filename fixed by vite.config `entryFileNames`; don't rename.
- `icons/icon{16,48,128}.png` referenced by manifest.
- This CLAUDE.md is deleted from `dist/` after build (`drop-dev-docs` plugin in vite.config.ts) so it never ships.
- Adding a permission or page: edit manifest here and, for pages, vite.config.ts inputs. Bump version in BOTH manifest.json and package.json for releases.
