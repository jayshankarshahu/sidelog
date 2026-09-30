import { slashFactory } from '@milkdown/kit/plugin/slash'
import { usePluginViewFactory } from '@prosemirror-adapter/react'
import type { Ctx } from '@milkdown/kit/ctx'
import { HashtagMenu } from './HashtagMenu'

export { hashtagHighlight } from './highlight'

// slashFactory is a generic "plugin with props + view" factory; reused here
// with its own id so it doesn't collide with the `/` menu.
const hashtag = slashFactory('sidelogHashtag')

const MENU_KEYS = ['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape']

/**
 * Shared mutable ref written by HashtagMenu on every render (same pattern as
 * slash/). Returns false when the menu is closed so typing / Enter pass through.
 */
export const keydownHandlerRef: { current: ((key: string) => boolean) | null } = {
  current: null,
}

export interface HashtagSource {
  /** Every hashtag across all notes (incl. this one), most-used first. */
  allTags: string[]
  /** Notes-per-tag behind `allTags`. */
  tagCounts: Record<string, number>
  /** This note's tags as counted in `tagCounts` (may lag the editor slightly). */
  noteTags: string[]
}

/**
 * Suggestion source. Editor.tsx writes it on every render from useNotes;
 * HashtagMenu reads it on each editor update.
 */
export const hashtagSourceRef: { current: HashtagSource } = {
  current: { allTags: [], tagCounts: {}, noteTags: [] },
}

export const useHashtag = () => {
  const pluginViewFactory = usePluginViewFactory()

  return {
    plugin: hashtag,
    config: (ctx: Ctx) => {
      ctx.set(hashtag.key, {
        props: {
          handleKeyDown: (_view: unknown, event: KeyboardEvent) => {
            if (!MENU_KEYS.includes(event.key)) return false
            if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return false
            return keydownHandlerRef.current?.(event.key) ?? false
          },
        },
        view: pluginViewFactory({ component: HashtagMenu }),
      })
    },
  }
}
