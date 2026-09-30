import { useEffect, useRef, useState } from 'react'
import { SlashProvider } from '@milkdown/kit/plugin/slash'
import type { EditorView } from '@milkdown/kit/prose/view'
import { usePluginViewContext } from '@prosemirror-adapter/react'
import { findHashtagRanges, getHashtagQuery, hashtagTailLength } from '../services/HashtagService'
import { hashtagSourceRef, keydownHandlerRef } from './index'
import './HashtagMenu.css'

const MAX_SUGGESTIONS = 8
const LEAF = '￼'

interface HashtagContext {
  query: string // partial after '#', possibly ''
  start: number // doc position of the '#'
}

/**
 * Read the `#partial` token ending at the cursor, or null when the cursor isn't
 * in one (non-empty selection, code block, inline code, mid-word '#').
 */
function getHashtagContext(view: EditorView): HashtagContext | null {
  const { selection, storedMarks } = view.state
  if (!selection.empty) return null
  const { $from } = selection
  if (!$from.parent.isTextblock || $from.parent.type.spec.code) return null
  const marks = storedMarks ?? $from.marks()
  if (marks.some(m => m.type.name === 'inlineCode')) return null
  const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, LEAF)
  const query = getHashtagQuery(textBefore)
  if (query === null) return null
  return { query, start: $from.pos - query.length - 1 }
}

/**
 * Tags written in the live document, excluding the token under the cursor
 * (that one is still being typed).
 */
function getDocTags(view: EditorView, skipStart: number): Set<string> {
  const tags = new Set<string>()
  view.state.doc.descendants((node, pos) => {
    if (!node.isTextblock) return true
    if (node.type.spec.code) return false
    const text = node.textBetween(0, node.content.size, undefined, LEAF)
    for (const { from, to } of findHashtagRanges(text)) {
      if (pos + 1 + from !== skipStart) tags.add(text.slice(from + 1, to).toLowerCase())
    }
    return false
  })
  return tags
}

/**
 * Suggestions for `query`: prefix matches from the global set, most-used first.
 * useNotes derives this note's tags from debounced markdown updates, so its
 * snapshot may hold a half-typed partial (e.g. `ide` after backspacing to `#id`).
 * A tag is kept only if another note uses it or the live document still has it.
 */
function getSuggestions(view: EditorView, context: HashtagContext): string[] {
  const { allTags, tagCounts, noteTags } = hashtagSourceRef.current
  const q = context.query.toLowerCase()
  const prefixed = allTags.filter(t => t.startsWith(q) && t !== q)
  if (prefixed.length === 0) return []
  const docTags = getDocTags(view, context.start)
  return prefixed
    .filter(t => tagCounts[t] - (noteTags.includes(t) ? 1 : 0) > 0 || docTags.has(t))
    .slice(0, MAX_SUGGESTIONS)
}

export const HashtagMenu = () => {
  const { view, prevState } = usePluginViewContext()
  const providerRef = useRef<SlashProvider | null>(null)
  const containerRef = useRef<HTMLDivElement>(null!)
  const [selectedIndex, setSelectedIndex] = useState(0)
  // Escape dismisses the menu for the token starting at this position
  const [dismissedStart, setDismissedStart] = useState<number | null>(null)

  // Derived on every render — the plugin view re-renders on each PM update
  const context = getHashtagContext(view)
  const q = context?.query.toLowerCase() ?? ''
  const matches = context ? getSuggestions(view, context) : []
  const isOpen = context !== null && matches.length > 0 && context.start !== dismissedStart
  const active = Math.min(selectedIndex, Math.max(matches.length - 1, 0))

  // SlashProvider only positions the popup under the cursor (open state is ours)
  useEffect(() => {
    if (!containerRef.current || !view) return
    providerRef.current = new SlashProvider({
      content: containerRef.current,
      debounce: 20,
      shouldShow: v => getHashtagContext(v) !== null,
      floatingUIOptions: { strategy: 'fixed' },
    })
    return () => {
      providerRef.current?.destroy()
      providerRef.current = null
    }
  }, [view])

  useEffect(() => {
    providerRef.current?.update(view, prevState)
  })

  // New token or new query → back to the first (most-used) suggestion
  useEffect(() => {
    setSelectedIndex(0)
  }, [context?.start, q])

  // Leaving the dismissed token re-enables the menu for the next one
  useEffect(() => {
    if (dismissedStart !== null && context?.start !== dismissedStart) setDismissedStart(null)
  }, [context?.start, dismissedStart])

  useEffect(() => {
    if (!isOpen) return
    containerRef.current
      ?.querySelector('.hashtag-menu-item--selected')
      ?.scrollIntoView({ block: 'nearest' })
  }, [active, isOpen])

  // Replace the whole `#partial` token (incl. chars after the cursor) with `#tag `
  const insertTag = (tag: string) => {
    const ctx = getHashtagContext(view)
    if (!ctx) return
    const { state } = view
    const { $from } = state.selection
    const after = $from.parent.textBetween($from.parentOffset, $from.parent.content.size, undefined, LEAF)
    const tail = hashtagTailLength(after)
    const next = after.charAt(tail)
    const text = `#${tag}${next && /\s/.test(next) ? '' : ' '}`
    view.dispatch(state.tr.insertText(text, ctx.start, $from.pos + tail).scrollIntoView())
    view.focus()
  }

  // Written every render so it closes over fresh state; see index.ts
  keydownHandlerRef.current = (key: string) => {
    if (!isOpen || !context) return false
    if (key === 'ArrowDown') {
      setSelectedIndex((active + 1) % matches.length)
      return true
    }
    if (key === 'ArrowUp') {
      setSelectedIndex((active - 1 + matches.length) % matches.length)
      return true
    }
    if (key === 'Enter' || key === 'Tab') {
      insertTag(matches[active])
      return true
    }
    if (key === 'Escape') {
      setDismissedStart(context.start)
      return true
    }
    return false
  }

  return (
    <div
      ref={containerRef}
      className="hashtag-menu-wrapper"
      style={isOpen ? undefined : { display: 'none' }}
    >
      {isOpen && (
        <div className="hashtag-menu" role="listbox">
          {matches.map((tag, i) => (
            <div
              key={tag}
              role="option"
              aria-selected={i === active}
              className={`hashtag-menu-item ${i === active ? 'hashtag-menu-item--selected' : ''}`}
              onMouseEnter={() => setSelectedIndex(i)}
              onMouseDown={e => { e.preventDefault(); insertTag(tag) }}
            >
              <span className="hashtag-menu-hash">#</span>
              <span className="hashtag-menu-label">{tag}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
