# state/ — global save status
- `types.ts`: `SaveState = 'saving'|'saved'|'error'`; `NoteMode = 'popup'|'sidepanel'`.
- `SaveStateManager.ts`: singleton `saveStateManager` (extends `EventTarget`, dispatches `CustomEvent('change')`). Initial state `saved`; `setState` no-ops on same value.
  - `subscribe(fn)` returns unsubscribe. `waitForSaved(timeoutMs=5000)` resolves with `saved`/`error`; timeout resolves `'error'`.
- `index.ts` re-exports; import from `'../state'`.
- Writers: `StorageService.storageSet` and `useNotes` (sets `saving` when debounce starts). Reader: `useSaveState` hook (BottomBar indicator), `ByeCommand`.
- Not React state and not persisted; one instance per page/JS context (popup, timeline etc. don't share it).
- Style here: 2-space indent, no semicolons.
