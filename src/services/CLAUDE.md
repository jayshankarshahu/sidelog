# services/ — non-UI logic (no React imports)
Dependency direction: NoteService → StorageService (+ DateService, HashtagService, uuid). StorageService → `state` (save indicator). Storage backend is intended to be swappable: keep chrome storage APIs confined here.

## StorageService.ts (functions, not a class)
- Wraps `chrome.storage.local` (manifest has `unlimitedStorage`, so no ~10 MB cap); throws `Error('Chrome storage not available')` if absent (NO localStorage fallback despite what AGENT.md says).
- `storageSet` drives `saveStateManager`: saving → saved/error. Awaits promise-form `set()`; a rejection OR `runtime.lastError` → `error` + rethrow. All writes go through it.
- Module-level `cachedIndex` for `getIndex()`; `setIndex` updates cache. `invalidateCache()` for external changes. Notes are never cached.
- API: `getIndex/setIndex`, `getNote/setNote(noteId)`, `getLastOpenedDate/setLastOpenedDate`, `getHashtagsMigrated/setHashtagsMigrated`.
- Keys: `date-noteId-index`, `last-opened-date`, `hashtags-migrated`, and raw uuid noteIds. Theme/openPreference keys are accessed directly elsewhere (SettingsApp, service-worker).

## NoteService.ts
- `getSortedIndex()` oldest→newest. `getOrCreateTodayNote()` and `getOrCreateDateNote(date)` (near-duplicate; today's = the latter with `getTodayString()`) create empty note + index entry, return `{note, noteId, currentIndex, sortedIndex}`.
- `getNoteAtIndex(pos)` → `{note,noteId}|null`.
- `saveNoteContent(id, md)` → stored note|null; writes `tags = extractHashtags(md)` and new `lastEdited`. Read-modify-write without locking. There is no tag add/remove API: tags only come from text.
- `migrateManualTagsToHashtags()`: once (flag `hashtags-migrated`), for each note appends legacy `tags` missing from the text as a trailing `\n\n#a #b` line (via `normalizeTag`: spaces → `-`, invalid chars dropped; tags that normalize to '' are dropped) and stores derived tags. Keeps `lastEdited`. Called by useNotes init and TimelineApp load; idempotent.

## HashtagService.ts (pure, import-free — loaded by `scripts/check-hashtags.mjs`)
- `extractHashtags(md)` → sorted, deduped, lowercase tags. Rule: `#` at start or after whitespace + `[\p{L}\p{N}\p{M}_-]+`; trailing `-`/`_` and punctuation dropped. Blanks fenced + inline code first. Accepts serializer escapes `\#tag` (line start) and `\_`.
- `findHashtagRanges(text)` (plain text offsets, for decorations), `getHashtagQuery(textBefore)` (partial at cursor or null), `hashtagTailLength`, `normalizeTag`, `TAG_CHAR`.
- Update `scripts/check-hashtags.mjs` cases when changing rules; run `npm run check:hashtags`.

## NavigationService.ts
`getExtensionPageUrl(page, params?)`, `openExtensionPage(page, params?)` (`chrome.tabs.create`, or `window.open('/page')` in dev), `openTimelineForTag(tag)` → `timeline.html?tag=…`. Use these instead of inlining URLs.

## DateService.ts
Pure local-time helpers: `getTodayString()` → `yyyy-mm-dd`, `formatDateLabel()` → "Feb 18, 2026", `formatTimestamp(unixMs)`. Always parse `yyyy-mm-dd` manually / with `T00:00:00` to avoid UTC shift.
