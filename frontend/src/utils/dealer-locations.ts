import type { DealerLocation } from '../api/types';

export const partnerStates = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS'] as const;

export function groupDealerLocations(locations: DealerLocation[]) {
  const groups: { state: string; dealers: DealerLocation[] }[] = partnerStates.map((state) => ({ state, dealers: [] }));
  for (const dealer of locations) {
    if (!dealer.active) continue;
    const state = dealer.state?.trim().toUpperCase() || 'other';
    let group = groups.find((entry) => entry.state === state);
    if (!group) {
      group = { state, dealers: [] };
      groups.push(group);
    }
    group.dealers.push(dealer);
  }
  return groups;
}

export function dealerMapUrl(dealer: Pick<DealerLocation, 'latitude' | 'longitude'>): string | null {
  const { latitude, longitude } = dealer;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  const params = new URLSearchParams({
    bbox: `${Math.max(-180, longitude - 0.035)},${Math.max(-90, latitude - 0.025)},${Math.min(180, longitude + 0.035)},${Math.min(90, latitude + 0.025)}`,
    layer: 'mapnik',
    marker: `${latitude},${longitude}`,
  });
  return `https://www.openstreetmap.org/export/embed.html?${params.toString()}`;
}
