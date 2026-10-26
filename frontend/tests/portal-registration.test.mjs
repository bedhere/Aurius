import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('the second registration step does not require a field shown on the third step', async () => {
  const source = await readFile(new URL('../src/pages/auth/Portal.tsx', import.meta.url), 'utf8');
  const stepTwoStart = source.indexOf('if (s === 2) {');
  const stepThreeStart = source.indexOf('if (s === 3) {');
  const stepTwoValidation = source.slice(stepTwoStart, stepThreeStart);

  assert.equal(stepTwoStart >= 0 && stepThreeStart > stepTwoStart, true);
  assert.doesNotMatch(stepTwoValidation, /errs\.email/);
});

test('VIP plumber registration uses the backend trade type enum', async () => {
  const source = await readFile(new URL('../src/pages/auth/Portal.tsx', import.meta.url), 'utf8');

  assert.match(source, /value="LICENSED_PLUMPER">(?:\{t\(['"])?Licensed Plumber/);
  assert.doesNotMatch(source, /value="LICENSED_PLUMBER">(?:\{t\(['"])?Licensed Plumber/);
});

test('registration exposes backend validation details instead of only the generic title', async () => {
  const source = await readFile(new URL('../src/pages/auth/Portal.tsx', import.meta.url), 'utf8');

  assert.match(source, /apiErr\.errors\.map\(\(fe\) => fe\.message\)/);
  assert.match(source, /setError\(\[(?:t\()?apiErr\.message/);
});

test('API failures without a JSON response identify the HTTP status instead of showing a generic Request failed message', async () => {
  const source = await readFile(new URL('../src/api/client.ts', import.meta.url), 'utf8');

  assert.match(source, /Request failed \(HTTP \$\{res\.status\}\)/);
});
