import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Vite serves public uploads locally instead of proxying them to the API', async () => {
  const config = await readFile(new URL('../vite.config.ts', import.meta.url), 'utf8');

  assert.match(config, /function serveUploads\(/);
  assert.match(config, /server\.middlewares\.use\('\/uploads', \(req, res, next\) =>/);
  assert.match(config, /segments\.length !== 2 \|\| !publicUploadDirectories\.has\(segments\[0\]\)[\s\S]*res\.statusCode = 404/);
  assert.doesNotMatch(config, /'\/uploads\/brand'\s*:/);
  assert.doesNotMatch(config, /'\/uploads\/products'\s*:/);
});
