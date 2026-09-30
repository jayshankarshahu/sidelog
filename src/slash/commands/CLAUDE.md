# slash/commands/
Interface `ISlashCommand` (ISlashCommand.ts): `slug` (filter key, typed after `/`), `label`, `icon` (emoji/short text), `description`, `execute(ctx: Ctx): void|Promise<void>`.

Pattern: `export class XCommand implements ISlashCommand { readonly slug=…; execute(ctx){ ctx.get(commandsCtx).call(<milkdown command>.key[, arg]) } }` with 2-space indent, no semicolons. Import commands from `@milkdown/kit/preset/commonmark` and `commandsCtx` from `@milkdown/kit/core`.

Existing: `HeadingCommand(level 1|2|3)` (parametrized ctor, wraps selection in heading), `BulletListCommand`, `OrderedListCommand`, `QuoteCommand`, `CodeBlockCommand` (`createCodeBlockCommand`, slug `code`), `DividerCommand` (hr), `ByeCommand` (slug `bye`, 👋: `await saveStateManager.waitForSaved()` then `setTimeout(window.close, 1000)` — closes popup/panel tab after save).

Avoid direct DOM/DOM-selection edits; use Milkdown commands or `ctx.get(editorViewCtx)` transactions.
