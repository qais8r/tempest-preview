import test from 'node:test';
import assert from 'node:assert/strict';
import { workExcerpt } from '../scripts/text.mjs';

test('prose excerpts omit markup and hidden content while retaining readable punctuation', () => {
  const body =
    '# A **quiet** room\n\n[Listen](https://example.com) &amp; breathe.<br>Again.\n\n<script>hidden()</script>\n\n![Artwork](photo.jpg)';
  assert.equal(workExcerpt(body, 'Prose'), 'A quiet room Listen & breathe. Again.');
  assert.equal(
    workExcerpt('*A literal poem*\n  & a pause', 'Poetry'),
    '*A literal poem* & a pause',
  );
  assert.equal(workExcerpt('', 'Visual art'), '');
});

test('long excerpts truncate at words with three dots and leave short text intact', () => {
  assert.equal(
    workExcerpt('First morning light falls across the table.', 'Prose', 24),
    'First morning light...',
  );
  assert.equal(workExcerpt('A brief work.', 'Prose'), 'A brief work.');
  assert.equal(workExcerpt('🌊'.repeat(30), 'Poetry', 12), '🌊'.repeat(9) + '...');
});
