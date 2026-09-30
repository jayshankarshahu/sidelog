# slash/ — Notion-style `/` menu (Milkdown `@milkdown/plugin-slash`)
- `index.ts`: `useSlash()` hook (needs `ProsemirrorAdapterProvider` ancestor). Creates `slashFactory('sidelogSlash')`; returns `{plugin, config}`. Editor does `.config(slash.config).use(slash.plugin)`.
  - `config` sets a plugin `view` = React `SlashMenu` (via `usePluginViewFactory`) and `props.handleKeyDown` for ArrowUp/ArrowDown/Enter/Escape.
  - `keydownHandlerRef` (exported mutable ref) is written by SlashMenu each render so ProseMirror-intercepted keys reach React state; it must return false when the menu is closed.
- `SlashMenu.tsx` (+css): renders filtered command list; `SlashProvider` used ONLY for positioning (open state + query derived from `view.state` on each PM update via `getSlashQuery`: `/` at line start or after whitespace, not in code blocks). Filter = startsWith/includes on label or slug. Selection index in React state.
- `registry.ts`: `SLASH_COMMANDS: ISlashCommand[]` — order = menu order (H1–H3, bullet, ordered, quote, code, divider, bye).
- `commands/`: one class per command implementing `ISlashCommand` (see commands/CLAUDE.md).

## Add a command
1. Create `commands/XCommand.ts` implementing `ISlashCommand`.
2. Instantiate it in `registry.ts`. Nothing else needed.
