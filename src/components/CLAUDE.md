# components/ — editor-page UI
Each `X.tsx` has a sibling `X.css` (BEM: `top-bar__…`, `bottom-bar__…`). Function components typed `React.FC<Props>`.

- `Editor.tsx`: Milkdown wrapper. Layers: `Editor` (placeholder when empty; MilkdownProvider + ProsemirrorAdapterProvider) → `EditorCore` (useEditor with `nord`, `commonmark`, `history`, `listener`, slash plugin).
  - `listenerCtx.markdownUpdated` → `onContentChange` (via refs to avoid stale closures — keep that pattern).
  - Paste: plain text w/o `text/html` is preventDefault'd, appended to current markdown with `\n\n`, then `replaceAll()` re-parses; HTML pastes use ProseMirror defaults.
  - `focusEnd()` runs 500ms after ready (waits for CSS entrance animation) → cursor to end of doc.
  - Listens for DOM event `sidelog:image-upload` (`detail:{file, resolve}`); currently a STUB resolving an object URL after 1s. Real upload API not implemented.
  - Parent remounts it per note via `key`; don't add noteId-change logic inside.
- `TopBar.tsx`: date label, prev/next arrows (`canGoPrev/Next`), date picker → `onJumpToDate`.
- `BottomBar.tsx`: buttons to today (`goToDate(getTodayString())`), tags toggle w/ count, open timeline/settings via `window.open(chrome.runtime.getURL('x.html'))` (falls back to `/x.html` in dev), save-state indicator (`useSaveState`).
- `TagsPanel.tsx`: inline panel; add tag input with suggestions from `allTags`; remove chips. `TagsModal.tsx`: modal variant of the same (check usage before deleting either).
- `ThemeToggle.tsx`: light/dark switch; persists `theme` to chrome storage and sets `data-theme`.

Rules: components stay presentational — call hooks/services only through props from `App.tsx` (exceptions: ThemeToggle, BottomBar's `useSaveState`).
