import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const logoUrl = new URL('../public/brand/aurius-logo.svg', import.meta.url);

test('header logo is a self-contained vector wordmark', async () => {
  const svg = await readFile(logoUrl, 'utf8');

  assert.match(svg, /<svg[^>]+viewBox="[^"]+"/);
  assert.match(svg, /<path\b/);
  assert.doesNotMatch(svg, /<image\b|data:image|<text\b|font-family/i);
  assert.equal(svg.match(/<path\b/g)?.length, 3);
  assert.match(svg, /#0da19f/i);
  assert.match(svg, /#333333/i);
  assert.doesNotMatch(svg, /viewBox="0 0 13199 5347"/);
});
