import { $prose } from '@milkdown/kit/utils'
import { Plugin, PluginKey } from '@milkdown/kit/prose/state'
import { Decoration, DecorationSet } from '@milkdown/kit/prose/view'
import type { Node } from '@milkdown/kit/prose/model'
import { findHashtagRanges } from '../services/HashtagService'

/**
 * Wrap every #hashtag in text blocks in `<span class="sidelog-hashtag">`.
 * Decorations are view-only: the document and stored markdown are unchanged.
 * Skips code blocks and inline code.
 */
function buildDecorations(doc: Node): DecorationSet {
  const inlineCode = doc.type.schema.marks.inlineCode
  const decorations: Decoration[] = []

  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true
    if (node.type.spec.code) return false
    // One placeholder char per inline leaf keeps text offsets == doc offsets
    const text = node.textBetween(0, node.content.size, undefined, '￼')
    for (const range of findHashtagRanges(text)) {
      const from = pos + 1 + range.from
      const to = pos + 1 + range.to
      if (inlineCode && doc.rangeHasMark(from, to, inlineCode)) continue
      decorations.push(Decoration.inline(from, to, { class: 'sidelog-hashtag' }))
    }
    return false
  })

  return DecorationSet.create(doc, decorations)
}

const key = new PluginKey<DecorationSet>('sidelogHashtagHighlight')

export const hashtagHighlight = $prose(() => new Plugin<DecorationSet>({
  key,
  state: {
    init: (_config, state) => buildDecorations(state.doc),
    apply: (tr, old) => (tr.docChanged ? buildDecorations(tr.doc) : old),
  },
  props: {
    decorations: (state) => key.getState(state),
  },
}))
