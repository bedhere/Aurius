# AURIUS Header Logo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the original `AURIUS®` vector wordmark from `AURIUS网站.pdf` and use it in the public website header.

**Architecture:** A small extraction script reads the first PDF page's vector drawing operators, keeps teal filled paths inside the logo bounds, converts PDF coordinates to a compact SVG coordinate system, and writes a static public asset. The React header consumes that asset through an accessible `<img>`, while CSS controls responsive sizing and leaves the translated tagline as HTML.

**Tech Stack:** Python 3 with bundled `pypdf`, SVG, React 18, TypeScript, CSS, Node.js test runner, Vite.

## Global Constraints

- Extract only the teal `AURIUS®` wordmark from the top-left of the first PDF page.
- Preserve original vector paths, proportions, registered-mark placement, and brand colour.
- The output must have a transparent background, tightly fitted `viewBox`, and no embedded bitmap or font dependency.
- Keep the existing translated tagline as HTML beneath the logo.
- Do not change footer, admin, or member-area branding.

---

### Task 1: Extract and validate the SVG asset

**Files:**
- Create: `scripts/extract-header-logo.py`
- Create: `frontend/public/brand/aurius-logo.svg`
- Create: `frontend/tests/header-logo-svg.test.mjs`

**Interfaces:**
- Consumes: page 1 of `../AURIUS网站.pdf` and its PDF vector path operators.
- Produces: `/brand/aurius-logo.svg`, a transparent standalone SVG containing only `<path>` geometry for `AURIUS®`.

- [ ] **Step 1: Write the failing SVG asset test**

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const logoUrl = new URL('../public/brand/aurius-logo.svg', import.meta.url);

test('header logo is a self-contained vector wordmark', async () => {
  const svg = await readFile(logoUrl, 'utf8');
  assert.match(svg, /<svg[^>]+viewBox="[^"]+"/);
  assert.match(svg, /<path\b/);
  assert.doesNotMatch(svg, /<image\b|data:image|<text\b|font-family/i);
  assert.match(svg, /#0da19e/i);
});
```

- [ ] **Step 2: Run the asset test and verify it fails**

Run: `node --test frontend/tests/header-logo-svg.test.mjs`

Expected: FAIL with `ENOENT` for `frontend/public/brand/aurius-logo.svg`.

- [ ] **Step 3: Implement the extraction script**

Create `scripts/extract-header-logo.py` with constants for the PDF path, output path, logo bounds (`x=74..206`, `y=445..478` in PDF points), and brand colour `#0da19e`. Use `pypdf.generic.ContentStream` to iterate page-one operators. Accumulate `m`, `l`, `c`, `v`, `y`, `h`, and `re` path commands; on `f`, `f*`, `B`, or `B*`, calculate the path bounding box and retain filled paths fully inside the logo bounds. Convert each retained point to SVG coordinates with `svgY = maxY - pdfY`, translate by the retained geometry's minimum coordinates, add one point of padding, and serialize every shape as `<path fill="#0da19e" d="..."/>`. Reject an empty result and reject output containing `<image>` or `<text>`.

- [ ] **Step 4: Generate the asset with bundled Python**

Run:

```powershell
& 'C:\Users\m1534\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts\extract-header-logo.py
```

Expected: `frontend/public/brand/aurius-logo.svg` is created and the script reports the path count and compact viewBox.

- [ ] **Step 5: Run the asset test and render the SVG**

Run: `node --test frontend/tests/header-logo-svg.test.mjs`

Expected: PASS.

Render the SVG to PNG with a browser screenshot or available SVG renderer and compare it to the top-left wordmark in PDF page 1. Expected: all letters and the registered mark are present, with no tagline or surrounding page content.

- [ ] **Step 6: Commit the asset unit when Git is available**

```powershell
git add scripts/extract-header-logo.py frontend/public/brand/aurius-logo.svg frontend/tests/header-logo-svg.test.mjs
git commit -m "feat: extract AURIUS header logo"
```

Expected: one commit containing only the extractor, SVG, and asset test. The current workspace has no valid Git repository, so record this step as skipped unless repository metadata becomes available.

---

### Task 2: Integrate the SVG into the responsive header

**Files:**
- Modify: `frontend/src/components/Header.tsx:17-22`
- Modify: `frontend/src/assets/styles/global.css:996-1003, 1030-1034, 1196-1203`
- Create: `frontend/tests/header-logo-integration.test.mjs`

**Interfaces:**
- Consumes: `/brand/aurius-logo.svg` from Task 1.
- Produces: an accessible header image with class `brand__wordmark`, intrinsic aspect ratio, and unchanged tagline/navigation behaviour.

- [ ] **Step 1: Write the failing integration test**

```js
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

  assert.match(component, /<img\s+src="\/brand\/aurius-logo\.svg"\s+alt="AURIUS"\s+className="brand__wordmark"\s*\/>/);
  assert.doesNotMatch(component, /<span className="brand__wordmark">AURIUS<\/span>/);
  assert.match(component, /<span className="brand__tag">\{t\('brand\.tagline'\)\}<\/span>/);
  assert.match(css, /\.pdf-header \.brand__wordmark\s*\{[^}]*width:\s*clamp\([^}]*height:\s*auto;/s);
});
```

- [ ] **Step 2: Run the integration test and verify it fails**

Run: `node --test frontend/tests/header-logo-integration.test.mjs`

Expected: FAIL because `Header.tsx` still renders a `<span>` wordmark.

- [ ] **Step 3: Replace the text wordmark with the SVG image**

In `frontend/src/components/Header.tsx`, replace the wordmark span with:

```tsx
<img src="/brand/aurius-logo.svg" alt="AURIUS" className="brand__wordmark" />
```

Keep the existing `.brand__text` and translated `.brand__tag` elements unchanged.

- [ ] **Step 4: Update responsive wordmark sizing**

Replace typography-only `.brand__wordmark` declarations with image-safe rules:

```css
.brand__wordmark {
  display: block;
  width: 120px;
  height: auto;
}

.pdf-header .brand__wordmark {
  width: clamp(130px, 15.5vw, 260px);
  height: auto;
}

@media (max-width: 900px) {
  .pdf-header .brand__wordmark {
    width: 150px;
  }
}
```

- [ ] **Step 5: Run focused frontend tests**

Run:

```powershell
node --test frontend/tests/header-logo-svg.test.mjs frontend/tests/header-logo-integration.test.mjs frontend/tests/layout-navigation.test.mjs
```

Expected: all tests PASS.

- [ ] **Step 6: Build the frontend**

Run: `npm.cmd run build --workspace frontend`

Expected: TypeScript compilation and Vite production build complete with exit code 0.

- [ ] **Step 7: Inspect desktop and mobile header rendering**

Start the frontend with `npm.cmd run dev --workspace frontend -- --host 127.0.0.1`, open the local page, and inspect at approximately 1440 px and 390 px viewport widths. Expected: the logo matches the PDF, preserves aspect ratio, remains unclipped, and does not overlap navigation, controls, or the tagline.

- [ ] **Step 8: Commit the integration when Git is available**

```powershell
git add frontend/src/components/Header.tsx frontend/src/assets/styles/global.css frontend/tests/header-logo-integration.test.mjs
git commit -m "feat: use vector logo in public header"
```

Expected: one integration commit. The current workspace has no valid Git repository, so record this step as skipped unless repository metadata becomes available.

---

### Task 3: Align the brand block with the homepage poster

**Files:**
- Modify: `frontend/src/assets/styles/global.css:1018-1027, 1190-1202`
- Modify: `frontend/tests/header-logo-integration.test.mjs`

**Interfaces:**
- Consumes: the homepage poster width rule `85.57%`, whose symmetric outer margin is `7.215vw`.
- Produces: a `.pdf-header .brand` left edge aligned with `.aurius-home__slide-stage` without moving the navigation or action groups.

- [ ] **Step 1: Add a failing CSS alignment assertion**

Add assertions that the desktop brand rule contains `margin-left: calc(7.215vw - 75px)` and that the `max-width: 900px` override contains `margin-left: 7.215vw`.

- [ ] **Step 2: Run the integration test and verify it fails**

Run: `node --test frontend/tests/header-logo-integration.test.mjs`

Expected: FAIL because the brand block has no responsive alignment offset.

- [ ] **Step 3: Add the desktop and mobile offsets**

Add this to the existing desktop rule:

```css
.pdf-header .brand {
  margin-left: calc(7.215vw - 75px);
}
```

Add this inside the existing `@media (max-width: 900px)` rule:

```css
.pdf-header .brand {
  margin-left: 7.215vw;
}
```

- [ ] **Step 4: Run tests and build**

Run all `frontend/tests/*.mjs`, then run `npm.cmd run build --workspace frontend`.

Expected: all tests and the production build complete with exit code 0.

- [ ] **Step 5: Verify alignment in the browser**

At 1440px and 390px viewport widths, measure `.pdf-header .brand` and `.aurius-home__slide-stage` with `getBoundingClientRect()`. Expected: the absolute difference between their `left` values is at most 2 CSS pixels, with no overlap between the brand block and menu/navigation.

- [ ] **Step 6: Commit when Git is available**

```powershell
git add frontend/src/assets/styles/global.css frontend/tests/header-logo-integration.test.mjs
git commit -m "fix: align header logo with homepage poster"
```

Expected: one alignment commit. The current workspace has no valid Git repository, so record this step as skipped unless repository metadata becomes available.
