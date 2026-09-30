# timeline/ — full-tab timeline (`timeline.html`, opened from BottomBar)
`main.tsx` mounts `TimelineApp`. Independent of `useNotes`; reads storage directly.

## TimelineApp.tsx (stateful container)
- Mount: theme via `getStoredTheme()`; runs `migrateManualTagsToHashtags()`; loads EVERY note via `StorageService.getIndex/getNote` (sequential), sorted newest first. No pagination — perf cost scales with note count.
- State: `searchQuery`, `dateFrom`, `dateTo`, `activeTag`, `expandedDates` (Set of dates whose NoteCard is open; kept across filter changes). Toolbar "Expand all"/"Collapse all" act on the currently visible note cards and disable when there is nothing to do. `activeTag` initialises from `?tag=` (editor chips link here) and is mirrored back with `history.replaceState` (cleared → param removed).
- `tagInfos` = stored (hashtag-derived) `note.tags` of ALL notes → count, sorted desc. An unknown `?tag=` is listed with count 0 so it shows active/clearable; results show the empty state.
- Filter pipeline (useMemo): tag → date range (string compare) → search (case-insensitive substring of markdown OR any tag; `#foo` matches tags starting with `foo`, since stored markdown may contain `\#foo`).
- `timelineEntries`: `{date, note|null}`. With search active, gap-filling is skipped (matches only). Otherwise `getDateRange()` fills every calendar day between newest/oldest filtered note with `note:null` (empty-day placeholders); whitespace-only notes (`hasContent`) count as empty.

## components/ (each with .css; `timeline-base.css` = shared tokens/layout)
- `SearchBar`: text search + From/To date inputs. `TagFilter`: tag chips w/ counts, click toggles `activeTag`.
- `TimelineView`: renders `TimelineEntry[]` (exports the type); groups/spacing for gaps. `NoteCard`: one day's note — rendered markdown, tags, formatted date; empty-day variant when note null.
