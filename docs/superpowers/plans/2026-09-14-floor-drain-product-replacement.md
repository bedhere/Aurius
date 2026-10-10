# Floor Drain Product Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder floor drain with the supplied `S-T12115L115FZ-80` product and preserve an interactive five-finish, real-photo preview.

**Architecture:** Keep the existing product code, category, engineering display style, and backend behavior. Store each finish's stable image path inside its variant `attributes`, then let the React detail page derive the selected variant and image from one finish selection state.

**Tech Stack:** TypeScript, React, Vite, Node test runner, Prisma seed data, static upload assets.

## Global Constraints

- Retain product code `AUR-FD-01`, category `Engineering Custom Floor Drain`, and display style `engineering`.
- Use fixed specifications `115 × 115 mm`, `Ø80 mm`, `SUS304`, and `1.2 mm`.
- Use exactly five finishes: brushed stainless steel, brushed gold, brushed rose gold, gunmetal, and matte black.
- Use temporary base dealer price `A$189`, RRP `A$299`, stock `20` per finish, and zero finish price adjustments.
- Preserve all non-floor-drain behavior.
- Do not copy `.DS_Store` or `__MACOSX` metadata.

---

### Task 1: Product assets and seed data

**Files:**
- Create: `uploads/products/floor-drain-s-t12115-brushed.jpg`
- Create: `uploads/products/floor-drain-s-t12115-gold.jpg`
- Create: `uploads/products/floor-drain-s-t12115-rose-gold.jpg`
- Create: `uploads/products/floor-drain-s-t12115-gunmetal.jpg`
- Create: `uploads/products/floor-drain-s-t12115-matte-black.jpg`
- Modify: `database/seeds/seed.ts`
- Test: `frontend/tests/floor-drain-variants.test.mjs`

**Interfaces:**
- Consumes: supplied JPG files under `../地漏/S-T12115L115FZ-80/`.
- Produces: five variants whose attributes are `{ length: '115 × 115 mm', colour: string, finishKey: string, image: string }`.

- [ ] **Step 1: Replace the old seed assertions with failing real-product assertions**

```js
test('floor drain seed defines the supplied fixed-size product and five photographed finishes', () => {
  assert.match(floorDrainBlock, /model: 'S-T12115L115FZ-80'/u);
  assert.match(floorDrainBlock, /sizes: \['115 × 115 mm'\]/u);
  assert.match(floorDrainBlock, /outlet: 'Ø80 mm'/u);
  assert.match(floorDrainBlock, /material: 'SUS304'/u);
  assert.match(floorDrainBlock, /thickness: '1.2 mm'/u);
  const finishBlock = seedSource.slice(
    seedSource.indexOf('const floorDrainFinishes = ['),
    seedSource.indexOf('\n  ];', seedSource.indexOf('const floorDrainFinishes = [')),
  );
  assert.equal((finishBlock.match(/key:/gu) ?? []).length, 5);
  assert.equal((finishBlock.match(/image: '\/uploads\/products\/floor-drain-/gu) ?? []).length, 5);
  assert.doesNotMatch(floorDrainBlock, /floorDrainSizes\.flatMap/u);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test frontend/tests/floor-drain-variants.test.mjs`

Expected: FAIL because the seed still contains `FD-CUSTOM`, six lengths, and nine finishes.

- [ ] **Step 3: Copy only the five supplied product photos to stable upload paths**

Use PowerShell `Copy-Item -LiteralPath` for each exact source and destination filename listed above. Do not copy the source directory recursively.

- [ ] **Step 4: Replace the seed product with the fixed-size five-variant definition**

```ts
const floorDrainFinishes = [
  { key: 'brushedSteel', name: 'Brushed Stainless Steel', image: '/uploads/products/floor-drain-s-t12115-brushed.jpg' },
  { key: 'gold', name: 'Brushed Gold', image: '/uploads/products/floor-drain-s-t12115-gold.jpg' },
  { key: 'roseGold', name: 'Brushed Rose Gold', image: '/uploads/products/floor-drain-s-t12115-rose-gold.jpg' },
  { key: 'gunmetal', name: 'Gunmetal', image: '/uploads/products/floor-drain-s-t12115-gunmetal.jpg' },
  { key: 'matteBlack', name: 'Matte Black', image: '/uploads/products/floor-drain-s-t12115-matte-black.jpg' },
];

{
  code: 'AUR-FD-01', sku: 'S-T12115L115FZ-80', name: 'AURIUS S-T12115L115FZ-80 Floor Drain',
  model: 'S-T12115L115FZ-80', stock: 100, price1: 189, price2: 189, price3: 189, rrp: 299,
  sizes: ['115 × 115 mm'], colors: floorDrainFinishes.map((finish) => finish.name),
  image: floorDrainFinishes[0].image, displayStyle: 'engineering',
  promotionNote: 'Five real finishes available for project specification.',
  dimensionSpec: '115 × 115 mm · Ø80 mm outlet · SUS304 · 1.2 mm material thickness',
  specsExtra: { outlet: 'Ø80 mm', material: 'SUS304', thickness: '1.2 mm' },
  variants: floorDrainFinishes.map((finish) => ({
    skuSuffix: finish.key.toUpperCase(), name: finish.name,
    attributes: { length: '115 × 115 mm', colour: finish.name, finishKey: finish.key, image: finish.image },
    stock: 20, priceAdjustment: 0,
  })),
}
```

Merge `specsExtra` into the existing serialized `specs` object for this product so the outlet, material, and thickness reach the frontend without changing the Prisma schema.

- [ ] **Step 5: Run the focused test**

Run: `node --test frontend/tests/floor-drain-variants.test.mjs`

Expected: the seed-data test passes; the UI-source assertion may remain failing until Task 2.

### Task 2: Real-photo finish configurator

**Files:**
- Modify: `frontend/src/pages/public/ProductDetail.tsx`
- Modify: `frontend/src/assets/styles/pages-public.css`
- Modify: `frontend/src/i18n/LanguageContext.tsx`
- Test: `frontend/tests/floor-drain-variants.test.mjs`

**Interfaces:**
- Consumes: `ProductVariant.attributes.finishKey`, `.colour`, `.length`, and `.image` from Task 1.
- Produces: `selectedDrainVariant: ProductVariant | undefined` and `selectedDrainImage: string` used by both product hero and preview.

- [ ] **Step 1: Add failing source-level interaction assertions**

```js
test('floor drain configurator uses variant photos and has no fabricated size selector', () => {
  assert.match(productDetailSource, /const selectedDrainImage = selectedDrainVariant\?\.attributes\.image \?\? safeGallery\[0\]/u);
  assert.match(productDetailSource, /<img src=\{selectedDrainImage\}/u);
  assert.doesNotMatch(productDetailSource, /FLOOR_DRAIN_SIZES\.map/u);
  assert.doesNotMatch(productDetailSource, /drain-preview__drain/u);
  assert.match(productDetailSource, /variantId: variantToAdd\?\.id/u);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test frontend/tests/floor-drain-variants.test.mjs`

Expected: FAIL because the page still renders the CSS drain and size buttons.

- [ ] **Step 3: Derive finishes and selected photo from API variants**

```tsx
const variants = Array.isArray(product.variants) ? product.variants : [];
const drainVariants = variants.filter((variant) => typeof variant.attributes.finishKey === 'string');
const selectedDrainVariant = drainVariants.find(
  (variant) => variant.attributes.finishKey === selectedDrainFinish,
);
const selectedDrainImage = selectedDrainVariant?.attributes.image ?? safeGallery[0];
const selectedFinishName = selectedDrainVariant?.attributes.colour ?? '';
```

Initialize/reset `selectedDrainFinish` to `brushedSteel`, remove `FLOOR_DRAIN_SIZES`, `selectedDrainSize`, scaling, and `CSSProperties` usage, and submit `variantToAdd?.id` from `addToCart`.

- [ ] **Step 4: Replace both CSS illustrations with the selected real photo**

```tsx
<img src={selectedDrainImage} alt={`${product.name} - ${selectedFinishName}`} />
```

Render finish buttons from `drainVariants`, keep the existing active/disabled behavior, show the fixed `product.dimensionSpec`, and label the preview `115 × 115 mm · {selectedFinishName}`.

- [ ] **Step 5: Adjust presentation styles**

Replace the obsolete `.drain-preview__drain`, edge, grate, and size-grid rules with image-stage rules that use `object-fit: contain`, a neutral background, consistent aspect ratio, responsive maximum height, and visible focus styles on finish buttons. Keep selectors scoped under `.drain-preview` or `.product-detail` so other product pages do not change.

- [ ] **Step 6: Update bilingual copy for a fixed product**

```ts
'drain.config.copy': 'Select a finish to view the matching product photograph.',
'drain.preview': 'Selected finish',
```

Use the equivalent Chinese copy `选择颜色，查看对应的产品实拍图。` and `已选颜色`. Preserve keys used by other code.

- [ ] **Step 7: Run the focused test**

Run: `node --test frontend/tests/floor-drain-variants.test.mjs`

Expected: PASS.

### Task 3: Regression verification

**Files:**
- Test: `frontend/tests/floor-drain-variants.test.mjs`
- Verify: `frontend/src/pages/public/ProductDetail.tsx`
- Verify: `database/seeds/seed.ts`

**Interfaces:**
- Consumes: completed seed and configurator implementation.
- Produces: verified build and regression evidence.

- [ ] **Step 1: Run all frontend tests**

Run: `node --test frontend/tests`

Expected: all frontend tests pass.

- [ ] **Step 2: Build the frontend**

Run: `npm.cmd run build --prefix frontend`

Expected: TypeScript and Vite build complete with exit code 0.

- [ ] **Step 3: Run backend tests affected by seed/API assumptions**

Run: `npm.cmd test --prefix backend`

Expected: all backend tests pass.

- [ ] **Step 4: Verify asset references**

Run: `rg -n "floor-drain-s-t12115" database/seeds/seed.ts frontend/src uploads/products`

Expected: five stable files exist and all five seed references resolve to those files.

- [ ] **Step 5: Review the final diff**

Confirm no `.DS_Store`, `__MACOSX`, source workbook, or drawing PDF was copied into runtime assets; confirm unrelated products and pages are unchanged.

No commit step is included because `F:\zky\Aurius\AURIUS` is not currently a Git repository.
