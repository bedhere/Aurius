# AURIUS Brand Lockup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the separately rendered AURIUS wordmark and translated tagline with one fixed, optimized SVG brand lockup based on `AURIUS网站(1)22(2).svg`.

**Architecture:** The extraction script will read the supplied CorelDRAW SVG, retain its teal wordmark path and dark gray tagline path, and write them into the existing public logo asset with a tightened transparent viewBox. The React header will render only that image; responsive CSS will preserve the existing poster alignment.

**Tech Stack:** Python 3 standard library XML parsing, SVG, React 18, TypeScript, CSS, Node.js test runner, Vite.

## Global Constraints

- The SVG contains `AURIUS®` and `SMART TOILET | WHOLE HOUSE WATER FILTRATION` as vector paths.
- Preserve reference path data, proportions, placement, and colours `#0DA19F` and `#333333`.
- Do not embed text, fonts, or raster images.
- Language switching must not change the embedded English tagline.
- Keep the visible left edge aligned with the homepage poster within 2 CSS pixels.
- Footer, admin, and member-area branding remain unchanged.

---

### Task 1: Replace the header with the complete fixed brand lockup

**Files:**
- Modify: `scripts/extract-header-logo.py`
- Modify: `frontend/public/brand/aurius-logo.svg`
- Modify: `frontend/src/components/Header.tsx:17-22`
- Modify: `frontend/src/assets/styles/global.css:996-1042`
- Modify: `frontend/tests/header-logo-svg.test.mjs`
- Modify: `frontend/tests/header-logo-integration.test.mjs`

**Interfaces:**
- Consumes: `../AURIUS网站(1)22(2).svg` containing three vector paths: wordmark, registered mark, and tagline.
- Produces: `/brand/aurius-logo.svg`, one fixed two-row image rendered by `Header.tsx`.

- [ ] **Step 1: Write failing tests**

Require the public SVG to contain both `#0da19f` and `#333333`, exactly three path elements, no `<text>`, `<image>`, font reference, or oversized `viewBox="0 0 13199 5347"`. Require `Header.tsx` to contain one logo `<img>` and no `.brand__text`, `.brand__tag`, or `t('brand.tagline')` markup.

- [ ] **Step 2: Run tests and verify the expected failures**

Run: `node --test frontend/tests/header-logo-svg.test.mjs frontend/tests/header-logo-integration.test.mjs`

Expected: FAIL because the current asset lacks the dark gray tagline path and the component still renders translated tagline HTML.

- [ ] **Step 3: Rewrite the extraction script**

Parse `AURIUS网站(1)22(2).svg` with `xml.etree.ElementTree`, require exactly three non-empty paths, preserve their `d` values, and write a transparent standalone SVG with a tightened viewBox. Serialize the wordmark and registered-mark paths with `fill="#0da19f"`, the tagline path with `fill="#333333"`, and reject any output containing text, image, or font markup.

- [ ] **Step 4: Regenerate the public SVG**

Run the bundled Python executable against `scripts/extract-header-logo.py`.

Expected: the existing asset is replaced with a three-path, two-colour vector lockup using the compact viewBox.

- [ ] **Step 5: Simplify the React header and CSS**

Remove the `.brand__text` and `.brand__tag` spans from `Header.tsx`. Set the image alt text to `AURIUS — Smart Toilet | Whole House Water Filtration`. Keep `.pdf-header .brand` responsive alignment rules unchanged, remove obsolete header tagline styles, and retain image width with automatic height.

- [ ] **Step 6: Run the focused tests**

Run: `node --test frontend/tests/header-logo-svg.test.mjs frontend/tests/header-logo-integration.test.mjs`

Expected: both tests PASS.

- [ ] **Step 7: Run full verification and visual checks**

Run all frontend tests and `npm.cmd run build --workspace frontend`. In the browser, inspect 1440px and 390px widths, confirm poster alignment within 2px, confirm no menu overlap, and toggle the language to verify the embedded English tagline does not change.

- [ ] **Step 8: Commit when Git is available**

```powershell
git add scripts/extract-header-logo.py frontend/public/brand/aurius-logo.svg frontend/src/components/Header.tsx frontend/src/assets/styles/global.css frontend/tests/header-logo-svg.test.mjs frontend/tests/header-logo-integration.test.mjs
git commit -m "feat: use complete AURIUS brand lockup"
```

Expected: one focused commit. The current workspace has no valid Git repository, so record this step as skipped unless repository metadata becomes available.
