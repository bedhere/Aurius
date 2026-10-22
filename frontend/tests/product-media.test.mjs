import assert from 'node:assert/strict';
import test from 'node:test';
import { productGallery, productThumbnail, usesRemoteOnlyPresentation, usesWideFeaturePresentation } from '../src/utils/product-media.ts';

test('all smart toilets use their configurable remote regardless of model or body gallery', () => {
  for (const category of ['Smart Toilet', ' smart toilet ', '智能马桶', '马桶']) {
    for (const sku of ['AU-6885', 'ANOTHER-MODEL']) {
      const product = { category, sku, remoteImage: '/uploads/products/remote.png', images: ['/body.jpg'] };
      assert.equal(usesRemoteOnlyPresentation(product), true);
      assert.equal(productThumbnail(product), product.remoteImage);
      assert.deepEqual(productGallery(product), [product.remoteImage]);
    }
  }
});

test('replacing or deleting a remote never restores an old remote or toilet body photo', () => {
  const product = { category: 'Smart Toilet', sku: 'AU-6885', remoteImage: '/new-remote.png', images: ['/body.jpg', '/old-remote.png'] };
  assert.equal(productThumbnail(product), '/new-remote.png');
  for (const remoteImage of [null, undefined, '']) {
    assert.equal(productThumbnail({ ...product, remoteImage }), '/favicon.svg');
    assert.deepEqual(productGallery({ ...product, remoteImage }), []);
  }
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
