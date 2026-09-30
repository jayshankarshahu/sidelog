# hooks/
## useNotes.ts — the app's state controller (used only by App.tsx)
Returns `{currentNote, currentNoteId, currentIndex, totalNotes, isLoading, allTags, goToPrev, goToNext, goToDate, saveContent, addTag, removeTag}`.
- Init: opens `last-opened-date` note if set, else today's (created if missing). Then scans ALL notes to build `allTags` (sorted, unique) — O(n) storage reads at startup.
- `currentIndex` = position in date-sorted index (oldest→newest); prev/next walk that list, so gaps between dates are skipped. `goToDate` creates a note if the date has none.
- Every navigation writes `last-opened-date`.
- `saveContent`: optimistic local state update, 500ms debounce (`DEBOUNCE_MS`), sets `saving` immediately then `saved`/`error` after `NoteService.saveNoteContent`. Debounce timer is a ref; a pending save is NOT flushed on navigation/unmount (known risk: closing within 500ms loses edits — `/bye` command waits via `waitForSaved`).
- `saveContent` closes over `currentNoteId`; Editor remount-per-note keeps this correct.
- Tag ops: call NoteService, replace `currentNote`, update `allTags` (add only; removal does not prune `allTags`).

## useSaveState.ts
Subscribes React state to `saveStateManager`. Returns `'saving'|'saved'|'error'`.
