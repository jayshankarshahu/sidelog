// Tiny assertion script for the pure hashtag helpers.
// Run: npm run check:hashtags   (node >= 22.6; strips TS types natively)
import assert from 'node:assert/strict';
import {
    extractHashtags,
    findHashtagRanges,
    getHashtagQuery,
    normalizeTag,
} from '../src/services/HashtagService.ts';

const cases = [
    ['#a', ['a']],
    ['a#b', []],                                  // URL-fragment style: no whitespace before #
    ['see https://x.com/page#section', []],
    ['# heading', []],
    ['## heading #inside', ['inside']],
    ['`#code` and #real', ['real']],
    ['``a `#nested` b`` #x', ['x']],
    ['```\n#fenced\n```\n#after', ['after']],
    ['~~~js\n#fenced\n~~~', []],
    ['```\n#unclosed fence', []],
    ['#Tag and #tag', ['tag']],
    ['#a #a', ['a']],
    ['#tag, and #other.', ['other', 'tag']],
    ['#tag-with-dash', ['tag-with-dash']],
    ['#trailing- #under_', ['trailing', 'under']],
    ['\\#escaped at line start', ['escaped']],     // serializer escapes leading #
    ['#project\\_x', ['project_x']],              // serializer escapes _
    ['#über #日本', ['über', '日本']],
    ['line1\n#b\ttext\t#c', ['b', 'c']],
    ['#', []],
    ['', []],
];

for (const [input, expected] of cases) {
    assert.deepEqual(extractHashtags(input), expected, `extractHashtags(${JSON.stringify(input)})`);
}

assert.deepEqual(findHashtagRanges('hi #foo, x#y #bar-'), [{ from: 3, to: 7 }, { from: 13, to: 17 }]);

assert.equal(getHashtagQuery('hello #ide'), 'ide');
assert.equal(getHashtagQuery('#'), '');
assert.equal(getHashtagQuery('page#sec'), null);
assert.equal(getHashtagQuery('#done '), null);

assert.equal(normalizeTag('  Work Stuff '), 'work-stuff');
assert.equal(normalizeTag('#Ideas!'), 'ideas');
assert.equal(normalizeTag('!!!'), '');

console.log(`hashtag checks passed (${cases.length} extract cases)`);
