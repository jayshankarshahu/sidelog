# src/ — extension source
## Entry points
- `main.tsx` → `<App/>` (index.html; used for both popup and side panel)
- `timeline/main.tsx` → `TimelineApp`; `settings/main.tsx` → `SettingsApp`
- `service-worker.ts` → background; not imported by any UI
- `index.css`: global CSS variables (dark default, `[data-theme="light"]` override), reset, font. `App.css`: app shell + entrance animation (`popup-slide-in`, 80ms delay + 350ms — Editor focus timing depends on it).
- `vite-env.d.ts`: Vite types only. `types/index.ts`: `NoteObject`, `NoteIndex`, `NoteIndexEntry`.

## App.tsx flow
`useNotes()` provides current note + navigation + tag ops. Shows spinner until loaded. Renders TopBar (date nav) → Editor (`key={currentNoteId}` forces full remount per note) → optional TagsPanel → BottomBar. Loads theme on mount.

## Subdirectories
| dir | role |
|---|---|
| components/ | editor-page UI |
| hooks/ | `useNotes`, `useSaveState` |
| services/ | storage, note CRUD, dates |
| state/ | save-state singleton |
| slash/ | `/` command menu |
| timeline/ | timeline page |
| settings/ | settings page |

Each has its own CLAUDE.md. Style: one `.css` per component, BEM-ish class names (`block__element`, e.g. `app__editor-area`).
