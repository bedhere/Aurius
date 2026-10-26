import assert from 'node:assert/strict';
import test from 'node:test';

test('API client restores a cookie-backed session after a full page refresh', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../src/api/client.ts', import.meta.url), 'utf8');

  assert.match(source, /if \(res\.status === 401\) \{/);
  assert.doesNotMatch(source, /if \(res\.status === 401 && accessToken\)/);
});

test('water filtration feature image is served as an image asset', async () => {
  const response = await fetch('http://127.0.0.1:5173/uploads/products/water-filtration-system.jpg');

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /^image\//);
});

test('product detail specification chips are interactive controls', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../src/pages/public/ProductDetail.tsx', import.meta.url), 'utf8');

  assert.match(source, /<button[\s\S]*className=\{`spec-chip/);
  assert.match(source, /aria-pressed=\{isSpecSelected/);
  assert.match(source, /onClick=\{\(\) => selectSpec/);
});

test('floor drain detail keeps an isolated five-finish photographed configurator', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../src/pages/public/ProductDetail.tsx', import.meta.url), 'utf8');

  assert.match(source, /FLOOR_DRAIN_CODE = ['"]AUR-FD-01['"]/);
  assert.match(source, /drain-configurator/);
  assert.match(source, /115 × 115 mm/);
  assert.match(source, /brushedSteel/);
  assert.match(source, /matteBlack/);
  assert.match(source, /selectedDrainImage/);
  assert.doesNotMatch(source, /FLOOR_DRAIN_SIZES/);
  assert.doesNotMatch(source, /drain-preview__drain/);
  assert.match(source, /drain-preview/);
  assert.match(source, /aria-live="polite"/);
});

test('water product filtering exposes the two required series and filter-core group', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../src/pages/public/Products.tsx', import.meta.url), 'utf8');

  assert.match(source, /requestedSeries = searchParams\.get\('series'\) \?\? 'all'/);
  assert.match(source, /params\.set\('series', series\)/);
  assert.match(source, /锐净/);
  assert.match(source, /赛博/);
  assert.match(source, /products\.filter/);
  const translations = await (await import('node:fs/promises')).readFile(new URL('../src/i18n/LanguageContext.tsx', import.meta.url), 'utf8');
  assert.match(translations, /滤芯/);
});

test('waterworker installation reporting includes an optional customer email field', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../src/pages/member/Performance.tsx', import.meta.url), 'utf8');

  assert.match(source, /contactEmail/);
  assert.match(source, /Customer Email \(optional\)/);
  assert.match(source, /me\?\.role === 'WATERWORKER'/);
});

test('smart-toilet carousel renders its concise promotion note below the image', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../src/pages/public/ProductDetail.tsx', import.meta.url), 'utf8');

  assert.match(source, /product\.displayStyle === 'carousel'/);
  assert.match(source, /product\.promotionNote/);
  assert.match(source, /product-detail__carousel-note/);
});

test('homepage carousel keeps its canvas, advances every five seconds and replaces arrows with playback control', async () => {
  const { readFile } = await import('node:fs/promises');
  const [home, styles] = await Promise.all([
    readFile(new URL('../src/pages/public/Home.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/assets/styles/pages-public.css', import.meta.url), 'utf8'),
  ]);

  assert.doesNotMatch(home, /Previous slide|Next slide|aurius-home__nav-button/);
  assert.match(home, /setInterval\([\s\S]*5000\)/);
  assert.match(home, /aria-pressed=\{paused\}/);
  assert.doesNotMatch(home, /onMouseEnter/);
  assert.match(home, /aurius-home__slide--active/);
  assert.match(styles, /\.aurius-home__slide-stage\s*\{[\s\S]*aspect-ratio:\s*2\.85\s*\/\s*1/);
  assert.match(styles, /\.aurius-home__slide,\s*\.aurius-home__quality\s*\{[\s\S]*transition:\s*opacity\s+320ms\s+ease-in-out/);
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});

test('stockists provides separate state pages with a consumer contact fallback', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../src/pages/public/Stockists.tsx', import.meta.url), 'utf8');

  assert.match(source, /groupDealerLocations\(dealers\)/);
  assert.match(source, /useParams/);
  assert.match(source, /to=\{`\/stockists\/\$\{state\.toLowerCase\(\)\}`\}/);
  assert.match(source, /StateDealerView/);
  assert.match(source, /selectedGroup\.dealers/);
  assert.match(source, /dealers\.map/);
  assert.match(source, /stockists\.recruiting/);
  assert.match(source, /stockists\.vacancy/);
  assert.match(source, /<Link to="\/contact"/);
  assert.match(source, /\/api\/dealers/);
  assert.match(source, /<iframe/);
  assert.match(source, /dealer\.address/);
  assert.match(source, /dealer\.phone/);
  assert.match(source, /dealer\.photos/);
  assert.match(source, /setSelectedId/);
  const app = await (await import('node:fs/promises')).readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
  assert.match(app, /path="\/stockists\/:state" element=\{<Stockists \/>\}/);
});

test('dealer seed supplies eight photo-backed Australian showrooms', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../../database/seeds/seed.ts', import.meta.url), 'utf8');

  for (const name of [
    'AURIUS Sydney Bathroom Gallery',
    'AURIUS Western Sydney Bathroom Supplies',
    'AURIUS Northern Beaches Bathroom Centre',
    'AURIUS Melbourne Bathroom Gallery',
    'AURIUS Brisbane Bathroom & Plumbing Supplies',
    'AURIUS Gold Coast Bathroom Centre',
    'AURIUS Adelaide Bathroom Studio',
    'AURIUS Perth Bathroom Warehouse',
  ]) {
    assert.match(source, new RegExp(name));
  }

  for (const state of ['NSW', 'VIC', 'QLD', 'SA', 'WA']) {
    assert.match(source, new RegExp(`state: '${state}'`));
  }

  assert.match(source, /photos: \['\/uploads\/dealers\//);
  assert.doesNotMatch(source, /AURIUS Sydney Showroom/);
  assert.doesNotMatch(source, /AURIUS Melbourne Showroom/);
  assert.doesNotMatch(source, /AURIUS Brisbane Stockist/);
  assert.doesNotMatch(source, /AURIUS Perth Stockist/);
});

test('admin dealer page exposes protected CRUD controls and coordinate fields', async () => {
  const { readFile } = await import('node:fs/promises');
  const [page, app, layout, settings] = await Promise.all([
    readFile(new URL('../src/pages/admin/DealerLocations.tsx', import.meta.url), 'utf8').catch(() => ''),
    readFile(new URL('../src/App.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/layouts/AdminLayout.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/admin/Settings.tsx', import.meta.url), 'utf8'),
  ]);

  assert.notEqual(page, '');
  assert.match(app, /path="dealers"\s+element=\{<AdminDealerLocations \/>}/);
  assert.match(layout, /to: '\/admin\/dealers'/);
  assert.match(layout, /tAdmin\('dealers'/);
  assert.match(page, /\/api\/admin\/dealers/);
  assert.match(page, /window\.confirm/);
  assert.match(page, /latitude/);
  assert.match(page, /longitude/);
  assert.match(page, /active/);
  assert.doesNotMatch(settings, /DEALER_LOCATIONS|defaultDealer|setDealer/);
});
