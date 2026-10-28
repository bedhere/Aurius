import assert from 'node:assert/strict';
import test from 'node:test';
import { productGallery, productThumbnail, usesRemoteOnlyPresentation, usesWideFeaturePresentation } from '../src/utils/product-media.ts';

test('smart toilets keep their configured primary first and include their saved gallery', () => {
  for (const category of ['Smart Toilet', ' smart toilet ', '智能马桶', '马桶']) {
    for (const sku of ['AU-6885', 'ANOTHER-MODEL']) {
      const product = { category, sku, remoteImage: '/uploads/products/remote.png', images: ['/body.jpg'] };
      assert.equal(usesRemoteOnlyPresentation(product), true);
      assert.equal(productThumbnail(product), product.remoteImage);
      assert.deepEqual(productGallery(product), [product.remoteImage, '/body.jpg']);
    }
  }
});

test('replacing or removing the primary uses only current images and keeps a usable default', () => {
  const product = { category: 'Smart Toilet', sku: 'AU-6885', remoteImage: '/new-remote.png', images: ['/body.jpg'] };
  assert.equal(productThumbnail(product), '/new-remote.png');
  assert.deepEqual(productGallery(product), ['/new-remote.png', '/body.jpg']);
  for (const remoteImage of [null, undefined, '']) {
    assert.equal(productThumbnail({ ...product, remoteImage }), '/body.jpg');
    assert.deepEqual(productGallery({ ...product, remoteImage }), ['/body.jpg']);
    assert.equal(productThumbnail({ ...product, remoteImage, images: [] }), '/favicon.svg');
    assert.deepEqual(productGallery({ ...product, remoteImage, images: [] }), []);
  }
});

test('gallery removes repeated URLs, empty entries and invalid values without changing order', () => {
  const product = { category: 'Smart Toilet', remoteImage: '/main.png', images: ['/side.png', '/main.png', '/side.png', '', null, 123, '  ', ' /detail.png '] };
  assert.deepEqual(productGallery(product), ['/main.png', '/side.png', '/detail.png']);
});

test('removing an extra gallery image does not restore it from the model or previous media', () => {
  const product = { category: 'Smart Toilet', model: 'AU-6885', remoteImage: '/main.png', images: ['/side.png', '/detail.png'] };
  assert.deepEqual(productGallery({ ...product, images: ['/detail.png'] }), ['/main.png', '/detail.png']);
  assert.deepEqual(productGallery({ ...product, images: [] }), ['/main.png']);
});

test('toilet seats share the wide feature layout but keep their own gallery', () => {
  for (const category of ['Toilet Lid', 'Smart Toilet Seat', '马桶盖', '智能马桶盖']) {
    const product = { category, sku: 'AU-6886', images: ['/seat.jpg'] };
    assert.equal(usesRemoteOnlyPresentation(product), false);
    assert.equal(usesWideFeaturePresentation(product), true);
    assert.equal(productThumbnail(product), '/seat.jpg');
  }
});

test('other categories preserve images and do not receive a toilet layout based on SKU', () => {
  const product = { category: 'Whole-House Water Purification', sku: 'AU-6885', images: ['/water.png'] };
  assert.equal(usesRemoteOnlyPresentation(product), false);
  assert.equal(usesWideFeaturePresentation(product), false);
  assert.equal(productThumbnail(product), '/water.png');
  assert.equal(productThumbnail({ image: '/cart.png' }), '/cart.png');
  assert.equal(productThumbnail({ images: [] }), '/favicon.svg');
});
