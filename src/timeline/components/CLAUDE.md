# timeline/components/
Presentational; all state lives in `../TimelineApp.tsx` and arrives via props (controlled inputs).
- `SearchBar.tsx`: props for query + `dateFrom/dateTo` and their setters. Dates are `yyyy-mm-dd` strings; '' = unset.
- `TagFilter.tsx`: takes `{tag,count}[]` and `activeTag`; chips render `#tag (n)`, active one highlighted + `aria-pressed`; clicking it clears (null).
- `TimelineView.tsx`: exports `TimelineEntry {date; note: NoteObject|null}`; maps entries to `NoteCard`. `null` note ⇒ "no note" gap day.
- `NoteCard.tsx` (largest, ~156 lines): props `{date, note, searchQuery}`; collapsed preview strips markdown to plain text, expanded view uses its own simple markdown→HTML renderer (NOT Milkdown); uses `formatDateLabel`/`formatTimestamp`. Both renderers unescape markdown backslash escapes (`\#tag`) last.
CSS: `<Name>.css` per component; shared vars from `src/index.css` and `../timeline-base.css`.
