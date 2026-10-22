import assert from 'node:assert/strict';
import test from 'node:test';
import { dealerMapUrl, groupDealerLocations } from '../src/utils/dealer-locations.ts';

test('populated states and empty recruitment states coexist and inactive dealers remain hidden', () => {
  const groups = groupDealerLocations([
    { id: 1, state: 'NSW', active: true },
    { id: 2, state: 'NSW', active: true },
    { id: 3, state: 'TAS', active: false },
    { id: 4, state: ' vic ', active: true },
  ]);
  assert.deepEqual(groups.map(({ state }) => state), ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']);
  assert.deepEqual(groups.map(({ dealers }) => dealers.length), [2, 1, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(groups[0].dealers.map(({ id }) => id), [1, 2]);
  assert.equal(groupDealerLocations([{ id: 1, state: 'NSW', active: false }])[0].dealers.length, 0);
});

test('both territories always appear and active dealers join the existing territory groups', () => {
  const emptyGroups = groupDealerLocations([]);
  assert.equal(emptyGroups.length, 8);
  assert.deepEqual(emptyGroups.slice(6), [{ state: 'ACT', dealers: [] }, { state: 'NT', dealers: [] }]);

  const groups = groupDealerLocations([
    { id: 1, state: 'ACT', active: true },
    { id: 2, state: null, active: true },
    { id: 3, state: ' nt ', active: true },
    { id: 4, state: 'NT', active: false },
  ]);
  assert.equal(groups.length, 9);
  assert.deepEqual(groups.slice(6).map(({ state }) => state), ['ACT', 'NT', 'other']);
  assert.deepEqual(groups.slice(6).map(({ dealers }) => dealers.map(({ id }) => id)), [[1], [3], [2]]);
});

test('the map marker follows the selected dealer coordinates and bounds stay valid', () => {
  const first = new URL(dealerMapUrl({ latitude: -33.8651, longitude: 151.2069 }));
  const second = new URL(dealerMapUrl({ latitude: -33.8151, longitude: 151.0011 }));
  assert.equal(first.searchParams.get('marker'), '-33.8651,151.2069');
  assert.equal(second.searchParams.get('marker'), '-33.8151,151.0011');
  const edge = new URL(dealerMapUrl({ latitude: 90, longitude: -180 }));
  const [west, south, east, north] = edge.searchParams.get('bbox').split(',').map(Number);
  assert.ok(west >= -180 && east <= 180 && south >= -90 && north <= 90);
});

test('invalid coordinates omit the map while zero coordinates remain valid', () => {
  for (const coordinates of [{ latitude: null, longitude: 10 }, { latitude: NaN, longitude: 10 }, { latitude: 91, longitude: 10 }]) {
    assert.equal(dealerMapUrl(coordinates), null);
  }
  assert.ok(dealerMapUrl({ latitude: 0, longitude: 0 }));
});
