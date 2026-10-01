/**
 * HashtagService — pure helpers for inline `#hashtags` (no chrome / React imports).
 *
 * A hashtag is `#` at the start of the text or after whitespace, followed by one or
 * more tag characters (unicode letters/digits/marks, `_`, `-`). Tags are normalized to
 * lowercase without the `#`. Kept import-free so `scripts/check-hashtags.mjs` can load
 * it with plain node.
 */

/** Character class for one tag character (used with the `u` flag). */
export const TAG_CHAR = '[\\p{L}\\p{N}\\p{M}_-]';

// In stored markdown the serializer escapes some characters: `#` at line start
// becomes `\#`, and `_` becomes `\_`. Accept both escaped forms. Emphasis /
// strikethrough / link-text openers (`**#tag**`, `_#tag_`, `~~#tag~~`, `[#tag](…)`)
// between the whitespace and `#` are allowed: rendered, the `#` follows whitespace.
const MARKDOWN_HASHTAG_RE = new RegExp(`(^|\\s)[*_~[]*\\\\?#((?:${TAG_CHAR}|\\\\[_-])+)`, 'gu');

// Same rule on plain (already-rendered) text, e.g. ProseMirror text blocks.
const TEXT_HASHTAG_RE = new RegExp(`(^|\\s)#(${TAG_CHAR}+)`, 'gu');

// Fenced code blocks: a line opening with ``` or ~~~ up to a line closing with the
// same fence (or end of text).
const FENCED_CODE_RE = /^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^ {0,3}\1[`~]*[ \t]*$|(?![\s\S]))/gm;

// Inline code: a backtick run up to the next run of the same length.
const INLINE_CODE_RE = /(`+)[\s\S]*?\1/g;

/** Trailing `-`/`_` are treated as punctuation (`#tag-` → `tag`). */
function trimTag(raw: string): string {
    return raw.replace(/[-_]+$/, '').toLowerCase();
}

/**
 * Extract hashtags from a note's markdown. Returns lowercase tags without `#`,
 * deduped and sorted.
 *
 * - `#tag` at start / after whitespace only, so `page#section` is ignored
 *   (markdown openers like `**`/`_`/`~~`/`[` may sit in between).
 * - `# Heading` is ignored (a space follows the `#`); so is `## Heading`.
 * - `#` inside fenced or inline code is ignored (code is blanked out first).
 * - Trailing punctuation is dropped: `#tag,` / `#tag.` → `tag`.
 */
export function extractHashtags(markdown: string): string[] {
    if (!markdown) return [];
    const text = markdown
        .replace(FENCED_CODE_RE, ' ')
        .replace(INLINE_CODE_RE, ' ');

    const tags = new Set<string>();
    for (const match of text.matchAll(MARKDOWN_HASHTAG_RE)) {
        const tag = trimTag(match[2].replace(/\\/g, ''));
        if (tag) tags.add(tag);
    }
    return Array.from(tags).sort();
}

/**
 * Find hashtag ranges in plain text (offsets cover the `#` and the tag).
 * Used by the editor highlight decoration.
 */
export function findHashtagRanges(text: string): { from: number; to: number }[] {
    const ranges: { from: number; to: number }[] = [];
    for (const match of text.matchAll(TEXT_HASHTAG_RE)) {
        const tag = match[2].replace(/[-_]+$/, '');
        if (!tag) continue;
        const from = match.index! + match[1].length;
        ranges.push({ from, to: from + 1 + tag.length });
    }
    return ranges;
}

/**
 * If `textBefore` (text from the block start up to the cursor) ends inside a
 * `#partial` token, return the partial (possibly '' right after `#`); else null.
 */
export function getHashtagQuery(textBefore: string): string | null {
    const match = new RegExp(`(?:^|\\s)#(${TAG_CHAR}*)$`, 'u').exec(textBefore);
    return match ? match[1] : null;
}

/** Length of the tag characters at the start of `textAfter` (rest of a token). */
export function hashtagTailLength(textAfter: string): number {
    const match = new RegExp(`^${TAG_CHAR}*`, 'u').exec(textAfter);
    return match ? match[0].length : 0;
}

/**
 * Convert a legacy, manually-entered tag (may contain spaces or symbols) into a
 * valid hashtag body: lowercase, whitespace → `-`, other invalid chars dropped.
 * Returns '' if nothing usable remains.
 */
export function normalizeTag(raw: string): string {
    return trimTag(
        raw
            .trim()
            .replace(/^#+/, '')
            .replace(/\s+/g, '-')
            .replace(new RegExp(`(?!${TAG_CHAR}).`, 'gu'), '')
    );
}
