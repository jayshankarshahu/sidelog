# Sidelog — CLAUDE.md
Chrome MV3 extension (v2.0.1): Notion-style daily markdown notes in Side Panel or Popup, tags, timeline, settings. 100% client-side; data lives in `chrome.storage.local`.

## Stack
React 18 + TypeScript (strict, `noUnusedLocals/Parameters`) + Vite 6 · Milkdown 7 (ProseMirror) w/ nord theme · `@prosemirror-adapter/react` · `uuid` · plain per-component CSS (NO Tailwind/CSS frameworks).

## Commands
- `npm run dev` — Vite dev server; storage falls back gracefully only partly (see services/CLAUDE.md)
- `npm run build` — `tsc && vite build` → `dist/` (load unpacked in chrome://extensions)
- No test runner, linter, or formatter configured. Typecheck = `npx tsc --noEmit`.

## Layout
- `index.html` → `src/main.tsx` → `App.tsx`: editor (popup + side panel, same entry)
- `timeline.html` → `src/timeline/`: full-tab timeline/search dashboard
- `settings.html` → `src/settings/`: full-tab settings (theme, open mode)
- `src/service-worker.ts`: background worker, emitted as `service-worker.js` (unhashed; manifest references it)
- `public/manifest.json`: copied verbatim to `dist/`. Permissions: `storage`, `sidePanel`. Shortcut Alt+B (`_execute_action`)
- `docs/`: static GitHub Pages landing site (not part of the build)
- Vite inputs (vite.config.ts): popup, timeline, settings, service-worker. **New HTML page ⇒ add an input there.**

## Architecture (layers, one-way deps)
UI (components/App/timeline/settings) → hooks (`useNotes`) → `NoteService` → `StorageService` → `chrome.storage.local`. `state/SaveStateManager` singleton reports saving/saved/error to UI. `DateService` = pure helpers.

## Data model (`src/types`)
- Index key `date-noteId-index`: `{date:'yyyy-mm-dd', noteId:uuid}[]`, one note per date
- Each note under key `<noteId>`: `{date, noteData(markdown), tags[], lastEdited(ms)}`
- Other keys: `last-opened-date`, `theme` ('dark'|'light'), `openPreference` ('sidepanel'|'popup')

## Conventions
- Markdown string is the source of truth; never mutate DOM directly — use Milkdown/ProseMirror actions.
- Tags are trimmed + lowercased on add.
- Dates are local-time `yyyy-mm-dd` strings; compare lexicographically.
- Theme via `data-theme` attr on `<html>`; colors are CSS vars in `src/index.css`.
- Each page loads theme itself with `getStoredTheme()` (exported from `settings/SettingsApp.tsx`).
- Code style: 4-space indent, semicolons in most files; `slash/` and `state/` use 2-space, no semicolons — match the file you edit.
- Check package.json before adding dependencies.

## Gotchas
- `AGENT.md` describes a Next.js `backend/` (image upload to R2); it is gitignored and NOT in this repo. Image upload in `Editor.tsx` is a stub (object URL).
- No chrome APIs outside extension contexts: `StorageService` throws "Chrome storage not available" under plain `vite dev`.
- `.gitignore` excludes `dist`, `*.zip`, `local-docs`, `backend`.
