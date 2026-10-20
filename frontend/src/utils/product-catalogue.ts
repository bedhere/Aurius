import type { ProductItem } from '../api/types';

export interface ProductPage {
  items: ProductItem[];
  total: number;
  page: number;
  pageSize: number;
}

export async function loadProductOverview(fetchPage: (page: number) => Promise<ProductPage>): Promise<ProductItem[]> {
  const first = await fetchPage(1);
  const pageCount = Math.ceil(first.total / first.pageSize);
  const remaining = await Promise.all(
    Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) => fetchPage(index + 2)),
  );
  return [first, ...remaining].flatMap((result) => result.items);
}

export function groupOverviewProducts<T extends { category: string }>(products: T[]) {
  const groups = [
    { key: 'water', titleKey: 'products.group.water', gridClass: 'water-product-grid', categories: ['Whole-House Water Purification', 'Filter Cartridge', 'Shower Filtration'], items: [] as T[] },
    { key: 'bathroom', titleKey: 'products.group.bathroom', gridClass: 'bathroom-product-grid', categories: ['Smart Toilet', 'Toilet Lid'], items: [] as T[] },
    { key: 'drain', titleKey: 'products.group.drain', gridClass: '', categories: ['Engineering Custom Floor Drain'], items: [] as T[] },
    { key: 'other', titleKey: 'products.group.other', gridClass: '', categories: [], items: [] as T[] },
  ];

  for (const product of products) {
    const group = groups.find((entry) => entry.categories.includes(product.category)) ?? groups[3];
    group.items.push(product);
  }

  return groups.filter((group) => group.items.length > 0);
}
