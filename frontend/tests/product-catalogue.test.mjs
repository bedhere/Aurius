import assert from 'node:assert/strict';
import test from 'node:test';
import { groupOverviewProducts, loadProductOverview } from '../src/utils/product-catalogue.ts';

test('the overview keeps four water products, two bathroom products and six drains in category order', () => {
  const products = [
    ...Array.from({ length: 6 }, (_, index) => ({ id: `drain-${index}`, category: 'Engineering Custom Floor Drain' })),
    { id: 'toilet', category: 'Smart Toilet' },
    { id: 'water-1', category: 'Whole-House Water Purification' },
    { id: 'lid', category: 'Toilet Lid' },
    { id: 'water-2', category: 'Whole-House Water Purification' },
    { id: 'filter', category: 'Filter Cartridge' },
    { id: 'shower', category: 'Shower Filtration' },
  ];

  const groups = groupOverviewProducts(products);

  assert.deepEqual(groups.map((group) => group.key), ['water', 'bathroom', 'drain']);
  assert.deepEqual(groups.map((group) => group.items.length), [4, 2, 6]);
  assert.deepEqual(groups[1].items.map((item) => item.id), ['toilet', 'lid']);
  assert.deepEqual(groups[0].items.map((item) => item.id), ['water-1', 'water-2', 'filter', 'shower']);
  assert.equal(new Set(groups.flatMap((group) => group.items.map((item) => item.id))).size, products.length);
});

test('the overview loads products beyond the API page limit before grouping', async () => {
  const products = Array.from({ length: 56 }, (_, index) => ({
    id: index,
    category: index < 50 ? 'Engineering Custom Floor Drain' : 'Whole-House Water Purification',
  }));
  const requestedPages = [];
  const items = await loadProductOverview(async (page) => {
    requestedPages.push(page);
    return { items: products.slice((page - 1) * 50, page * 50), total: products.length, page, pageSize: 50 };
  });

  assert.deepEqual(requestedPages, [1, 2]);
  assert.deepEqual(items, products);
  assert.deepEqual(groupOverviewProducts(items).map((group) => [group.key, group.items.length]), [['water', 6], ['drain', 50]]);
});

test('a failed later page rejects the overview instead of presenting an incomplete catalogue', async () => {
  await assert.rejects(loadProductOverview(async (page) => {
    if (page === 2) throw new Error('Network unavailable');
    return { items: [], total: 51, page, pageSize: 50 };
  }), /Network unavailable/);
});

test('empty categories are omitted and unrecognised categories remain visible', () => {
  assert.deepEqual(groupOverviewProducts([]), []);
  const products = [{ id: 1, category: 'New Category' }];
  const groups = groupOverviewProducts(products);
  assert.deepEqual(groups.map((group) => group.key), ['other']);
  assert.deepEqual(groups[0].items, products);
});
