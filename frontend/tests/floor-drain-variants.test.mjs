import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const seedSource = fs.readFileSync(new URL('../../database/seeds/seed.ts', import.meta.url), 'utf8');
const start = seedSource.indexOf("code: 'AUR-FD-01'");
const end = seedSource.indexOf('\n    },\n  ];', start);
const floorDrainBlock = start >= 0 && end > start ? seedSource.slice(start, end) : '';
const productDetailSource = fs.readFileSync(new URL('../src/pages/public/ProductDetail.tsx', import.meta.url), 'utf8');

test('floor drain seed defines the supplied fixed-size product and five photographed finishes', () => {
  const finishesStart = seedSource.indexOf('const floorDrainFinishes = [');
  const finishesEnd = seedSource.indexOf('\n  ];', finishesStart);
  const finishBlock = finishesStart >= 0 && finishesEnd > finishesStart
    ? seedSource.slice(finishesStart, finishesEnd)
    : '';

  assert.match(floorDrainBlock, /model: 'S-T12115L115FZ-80'/u);
  assert.match(floorDrainBlock, /sizes: \['115 × 115 mm'\]/u);
  assert.match(floorDrainBlock, /outlet: 'Ø80 mm'/u);
  assert.match(floorDrainBlock, /material: 'SUS304'/u);
  assert.match(floorDrainBlock, /thickness: '1.2 mm'/u);
  assert.equal((finishBlock.match(/key:/gu) ?? []).length, 5);
  assert.equal((finishBlock.match(/image: '\/uploads\/products\/floor-drain-/gu) ?? []).length, 5);
  assert.doesNotMatch(floorDrainBlock, /floorDrainSizes\.flatMap/u);
});

test('floor drain configurator uses variant photos and has no fabricated size selector', () => {
  assert.match(productDetailSource, /selectedDrainVariant/u);
  assert.match(productDetailSource, /const selectedDrainImage = selectedDrainVariant\?\.attributes\.image \?\? safeGallery\[0\]/u);
  assert.match(productDetailSource, /<img src=\{selectedDrainImage\}/u);
  assert.doesNotMatch(productDetailSource, /FLOOR_DRAIN_SIZES\.map/u);
  assert.doesNotMatch(productDetailSource, /drain-preview__drain/u);
  assert.match(productDetailSource, /variantId: variantToAdd\?\.id/u);
});
