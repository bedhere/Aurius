import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const componentUrl = new URL('../src/components/Header.tsx', import.meta.url);
const cssUrl = new URL('../src/assets/styles/global.css', import.meta.url);

test('public header renders the extracted logo asset', async () => {
  const [component, css] = await Promise.all([
    readFile(componentUrl, 'utf8'),
    readFile(cssUrl, 'utf8'),
  ]);

  assert.match(component, /<img\s+src="\/brand\/aurius-logo\.svg"\s+alt="AURIUS — Smart Toilet \| Whole House Water Filtration"\s+className="brand__wordmark"\s*\/>/);
  assert.doesNotMatch(component, /<span className="brand__wordmark">AURIUS<\/span>/);
  assert.doesNotMatch(component, /brand__text|brand__tag|t\('brand\.tagline'\)/);
  assert.match(css, /\.pdf-header \.brand__wordmark\s*\{[^}]*width:\s*clamp\([^}]*height:\s*auto;/s);
  assert.match(css, /\.pdf-header \.brand\s*\{[^}]*margin-left:\s*calc\(7\.215vw - 75px\);/s);
  assert.match(css, /@media \(max-width: 900px\)[\s\S]*?\.pdf-header \.brand\s*\{[^}]*margin-left:\s*7\.215vw;/);
});
