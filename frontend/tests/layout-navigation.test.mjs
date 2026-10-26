import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../src/layouts/', import.meta.url);

async function layout(name) {
  return readFile(new URL(name, root), 'utf8');
}

test('member and admin layouts provide a return link to the public website', async () => {
  const [member, admin] = await Promise.all([
    layout('MemberLayout.tsx'),
    layout('AdminLayout.tsx'),
  ]);

  for (const source of [member, admin]) {
    assert.match(source, /<Link to="\/"[^>]*>(?:\{t\(['"])?Back to website(?:['"]\)\})?<\/Link>/);
  }
});

test('member layout exposes the shopping cart route', async () => {
  const member = await layout('MemberLayout.tsx');

  assert.match(member, /<NavLink to="\/member\/cart" className=\{item\}>/);
  assert.match(member, /My Cart/);
});
