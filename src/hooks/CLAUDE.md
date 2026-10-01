# hooks/
## useNotes.ts — the app's state controller (used only by App.tsx)
Returns `{currentNote, currentNoteId, currentIndex, totalNotes, isLoading, allTags, tagCounts, goToPrev, goToNext, goToDate, saveContent}`.
- Init: runs `NoteService.migrateManualTagsToHashtags()` (no-op once flagged), then opens `last-opened-date` note if set, else today's (created if missing). Then reads ALL notes and derives each one's hashtags into `tagsByNote` (ref: noteId → tags) — O(n) storage reads at startup.
- `tagCounts` = notes-per-tag over `tagsByNote`; `allTags` = its keys, most-used first then alphabetical. Unused tags drop out automatically. `setNoteTags(id, tags)` updates one entry and only re-renders if that note's tags changed.
- `currentNote.tags` is always re-derived from `noteData` when a note is loaded (`withDerivedTags`), never trusted from storage.
- `currentIndex` = position in date-sorted index (oldest→newest); prev/next walk that list, so gaps between dates are skipped. `goToDate` creates a note if the date has none.
- Every navigation writes `last-opened-date`.
- `saveContent(markdown)`: optimistic local update INCLUDING `tags = extractHashtags(markdown)` and `setNoteTags` (so `allTags` includes unsaved edits); 500ms debounce (`DEBOUNCE_MS`), sets `saving` immediately then `saved`/`error` after `NoteService.saveNoteContent` (which stores derived tags; result re-applied). Debounce timer is a ref; a pending save is NOT flushed on navigation/unmount (known risk: closing within 500ms loses edits — `/bye` command waits via `waitForSaved`).
- `saveContent` closes over `currentNoteId`; Editor remount-per-note keeps this correct.
- Current-note tags lag the editor by Milkdown's listener debounce; HashtagMenu compensates (see hashtag/CLAUDE.md).

## useSaveState.ts
Subscribes React state to `saveStateManager`. Returns `'saving'|'saved'|'error'`.
