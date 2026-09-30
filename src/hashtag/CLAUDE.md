# hashtag/ — `#tag` suggestions + highlight in the editor (sibling of slash/)
Style: 2-space indent, no semicolons (like slash/). Tag rules live in `services/HashtagService.ts` — don't duplicate regexes here.

- `index.ts`: `useHashtag()` → `{plugin, config}` (needs `ProsemirrorAdapterProvider`). Reuses `slashFactory('sidelogHashtag')` as a generic props+view plugin. Editor does `.config(hashtag.config)…use(hashtag.plugin).use(hashtagHighlight)`.
  - `handleKeyDown` forwards ArrowUp/ArrowDown/Enter/Tab/Escape (no modifiers) to `keydownHandlerRef`, which returns false when the menu is closed so typing/Enter are never blocked.
  - `hashtagSourceRef.current = {allTags, tagCounts, noteTags}`: written by Editor.tsx every render from useNotes (ref, because plugin views are created once per mount).
- `HashtagMenu.tsx` (+css): open state DERIVED each render from `view.state` (`getHashtagContext`: empty selection, not in code block / inline code, `getHashtagQuery` on text before cursor). `SlashProvider` only positions it (custom `shouldShow`, `strategy: 'fixed'`).
  - Suggestions: `allTags` prefix matches (case-insensitive, exact match excluded), max 8, usage order. Tags whose only use is this note's (debounced, possibly stale) snapshot are dropped unless the live doc still contains them (excluding the token being typed) — prevents suggesting half-typed partials.
  - Enter/Tab/click → `tr.insertText('#tag ', start, cursor+tail)` replaces the whole token (space only if next char isn't whitespace). Escape dismisses for that token (`dismissedStart`); a new token reopens.
- `highlight.ts`: `hashtagHighlight` `$prose` plugin; inline decorations `.sidelog-hashtag` over `findHashtagRanges` per text block (skips code blocks + `inlineCode`). View-only — markdown unchanged. Style in HashtagMenu.css (uses `--tag-text`/`--tag-bg`).
