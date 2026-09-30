# services/ — non-UI logic (no React imports)
Dependency direction: NoteService → StorageService (+ DateService, uuid). StorageService → `state` (save indicator). Storage backend is intended to be swappable: keep chrome APIs confined here.

## StorageService.ts (functions, not a class)
- Wraps `chrome.storage.local`; throws `Error('Chrome storage not available')` if absent (NO localStorage fallback despite what AGENT.md says).
- `storageSet` drives `saveStateManager`: saving → saved/error. All writes go through it.
- Module-level `cachedIndex` for `getIndex()`; `setIndex` updates cache. `invalidateCache()` for external changes. Notes are never cached.
- API: `getIndex/setIndex`, `getNote/setNote(noteId)`, `getLastOpenedDate/setLastOpenedDate`.
- Keys: `date-noteId-index`, `last-opened-date`, and raw uuid noteIds. Theme/openPreference keys are accessed directly elsewhere (SettingsApp, service-worker).

## NoteService.ts
- `getSortedIndex()` oldest→newest. `getOrCreateTodayNote()` and `getOrCreateDateNote(date)` (near-duplicate; today's = the latter with `getTodayString()`) create empty note + index entry, return `{note, noteId, currentIndex, sortedIndex}`.
- `getNoteAtIndex(pos)` → `{note,noteId}|null`. `saveNoteContent`, `addTag` (trim+lowercase, dedupe), `removeTag`. Each mutation reads note, writes copy with new `lastEdited`. Read-modify-write without locking.

## DateService.ts
Pure local-time helpers: `getTodayString()` → `yyyy-mm-dd`, `formatDateLabel()` → "Feb 18, 2026", `formatTimestamp(unixMs)`. Always parse `yyyy-mm-dd` manually / with `T00:00:00` to avoid UTC shift.
