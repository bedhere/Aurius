import assert from 'node:assert/strict';
import test from 'node:test';

test('public brand assets are served as images', async () => {
  const response = await fetch('http://127.0.0.1:5173/uploads/brand/quality-strip.png');

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /^image\//);
});
