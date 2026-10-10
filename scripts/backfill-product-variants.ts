import { prisma } from '../backend/src/lib/prisma';

type Specs = { sizes?: string[]; colors?: string[] };

async function main(): Promise<void> {
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    include: { variants: true },
  });

  let created = 0;
  for (const product of products) {
    if (product.variants.length > 0) continue;
    let specs: Specs = {};
    try { specs = product.specs ? JSON.parse(product.specs) as Specs : {}; } catch { specs = {}; }
    const sizes = specs.sizes?.filter(Boolean) ?? [];
    const colors = specs.colors?.filter(Boolean) ?? [];
    if (sizes.length === 0 && colors.length === 0) continue;
    const options = sizes.length > 0 ? sizes : ['Standard'];
    const finishes = colors.length > 0 ? colors : ['Standard'];
    for (const size of options) {
      for (const colour of finishes) {
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            skuSuffix: `${size.replace(/\D/g, '') || 'STD'}-${colour.replace(/\W/g, '').toUpperCase()}`,
            name: `${size} / ${colour}`,
            attributes: JSON.stringify({ length: size, colour }),
            priceAdjustment: 0,
            stock: product.stock,
          },
        });
        created += 1;
      }
    }
  }
  console.log(`[backfill] created ${created} product variants`);
}

main().finally(() => prisma.$disconnect());
