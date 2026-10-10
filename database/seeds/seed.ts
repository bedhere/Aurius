// ============================================================================
// AURIUS development seed (DEVELOPMENT ONLY — see requirement 89).
// Creates: admin, test accounts (Level1/2/3 + waterworker + builder + pending),
// products with the expanded price structure, download files, bank settings
// and price rules.
//
// Run:  npm run seed  (from backend/, after migrate)
// Admin credentials come from ADMIN_EMAIL + CREATE_ADMIN_PASSWORD env/args —
// they are never hardcoded (requirement 88/89).
// ============================================================================
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

const UPLOADS = path.resolve(__dirname, '../../uploads');
const PRODUCTS_DIR = path.join(UPLOADS, 'products');
const DOWNLOADS_DIR = path.join(UPLOADS, 'downloads');
const DEALERS_DIR = path.join(UPLOADS, 'dealers');

function ensureDirs(): void {
  fs.mkdirSync(PRODUCTS_DIR, { recursive: true });
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
  fs.mkdirSync(DEALERS_DIR, { recursive: true });
}

// Simple but valid PDF file for the download centre
function writeSamplePdf(file: string, title: string, lines: string[]): string {
  const full = path.join(DOWNLOADS_DIR, file);
  let content = '%PDF-1.4\n';
  const objects: string[] = [];
  const text = `${title}\n\n${lines.join('\n')}`;
  objects.push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);
  objects.push(`2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`);
  objects.push(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n`,
  );
  const escaped = text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  objects.push(
    `4 0 obj\n<< /Length ${escaped.length + 60} >>\nstream\nBT /F1 12 Tf 50 740 Td (${escaped.split('\n').join(') Tj 0 -18 Td (')}) Tj ET\nendstream\nendobj\n`,
  );
  objects.push(`5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`);
  let offset = 0;
  const offsets: number[] = [];
  objects.forEach((obj) => {
    offsets.push(offset);
    offset += Buffer.byteLength(obj);
  });
  content += objects.join('');
  const xrefPos = offset;
  content += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => {
    content += `${String(o).padStart(10, '0')} 00000 n \n`;
  });
  content += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  fs.writeFileSync(full, content);
  return full;
}

async function seed(): Promise<void> {
  ensureDirs();
  console.log('[seed] cleaning existing dev data...');
  await prisma.$transaction([
    prisma.downloadAccessLog.deleteMany(),
    prisma.downloadFile.deleteMany(),
    prisma.performanceAdjustment.deleteMany(),
    prisma.performanceRecord.deleteMany(),
    prisma.referralSale.deleteMany(),
    prisma.installationRecord.deleteMany(),
    prisma.bankTransferReceipt.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.shipment.deleteMany(),
    prisma.orderStatusHistory.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.cartItem.deleteMany(),
    prisma.shoppingCart.deleteMany(),
    prisma.priceChangeLog.deleteMany(),
    prisma.productPrice.deleteMany(),
    prisma.regionalPriceRule.deleteMany(),
    prisma.productVariant.deleteMany(),
    prisma.product.deleteMany(),
    prisma.emailLog.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.securityLog.deleteMany(),
    prisma.sequenceCounter.deleteMany(),
    prisma.dealerLocation.deleteMany(),
    prisma.passwordResetToken.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.verificationRecord.deleteMany(),
    prisma.licence.deleteMany(),
    prisma.applicationReviewLog.deleteMany(),
    prisma.partnerApplication.deleteMany(),
    prisma.memberId.deleteMany(),
    prisma.memberProfile.deleteMany(),
    prisma.shippingAddress.deleteMany(),
    prisma.user.deleteMany(),
    prisma.systemSetting.deleteMany(),
  ]);

  console.log('[seed] creating settings...');
  await prisma.systemSetting.createMany({
    data: [
      {
        key: 'BANK_ACCOUNT',
        category: 'PAYMENT',
        value: JSON.stringify({
          bankName: 'Commonwealth Bank of Australia',
          bsb: '062-000',
          accountName: 'AURIUS Australia Pty Ltd',
          accountNumber: '1000 0000',
          instructions: 'Use your Order Number as the payment reference.',
        }),
      },
      {
        key: 'SHIPPING_METHODS',
        category: 'SHIPPING',
        value: JSON.stringify([
          { id: 'STANDARD', name: 'Standard Delivery', fee: 29 },
          { id: 'EXPRESS', name: 'Express Delivery', fee: 59 },
          { id: 'PICKUP', name: 'Warehouse Pickup', fee: 0 },
        ]),
      },
      {
        key: 'COMPANY_CONTACT',
        category: 'GENERAL',
        value: JSON.stringify({
          phone: '+61 2 8000 0000',
          email: 'info@aurius.com.au',
          address: 'Unit 8, 12-14 Orchard Road, Sydney NSW 2000, Australia',
          hours: 'Mon-Fri 9:00am - 5:00pm AEST',
        }),
      },
    ],
  });

  console.log('[seed] creating dealer locations...');
  const dealerLocations = [
    {
      name: 'AURIUS Sydney Bathroom Gallery',
      phone: '+61 2 8000 1101',
      address: "18 O'Connell Street",
      city: 'Sydney',
      state: 'NSW',
      latitude: -33.8651,
      longitude: 151.2069,
      photos: ['/uploads/dealers/nsw-showroom-exterior.jpg'],
      note: 'Bathroom showroom with smart toilet and whole-house filtration displays.',
      active: true,
    },
    {
      name: 'AURIUS Western Sydney Bathroom Supplies',
      phone: '+61 2 8000 1102',
      address: '42 Parramatta Road',
      city: 'Parramatta',
      state: 'NSW',
      latitude: -33.8151,
      longitude: 151.0011,
      photos: ['/uploads/dealers/nsw-toilet-showroom.jpg'],
      note: 'Trade-friendly bathroom supplies showroom with toilet displays.',
      active: true,
    },
    {
      name: 'AURIUS Northern Beaches Bathroom Centre',
      phone: '+61 2 8000 1103',
      address: '7 Mitchell Road',
      city: 'Brookvale',
      state: 'NSW',
      latitude: -33.7627,
      longitude: 151.2734,
      photos: ['/uploads/dealers/nsw-toilet-showroom.jpg'],
      note: 'Appointment-based bathroom planning and product consultation.',
      active: true,
    },
    {
      name: 'AURIUS Melbourne Bathroom Gallery',
      phone: '+61 3 8000 1104',
      address: '26 Bridge Road',
      city: 'Richmond',
      state: 'VIC',
      latitude: -37.8183,
      longitude: 144.9987,
      photos: ['/uploads/dealers/vic-toilet-display.jpg'],
      note: 'Curated bathroom gallery with contemporary toilet and basin displays.',
      active: true,
    },
    {
      name: 'AURIUS Brisbane Bathroom & Plumbing Supplies',
      phone: '+61 7 3000 1105',
      address: '15 Commercial Road',
      city: 'Bowen Hills',
      state: 'QLD',
      latitude: -27.4457,
      longitude: 153.0395,
      photos: ['/uploads/dealers/qld-showroom-exterior.png'],
      note: 'Bathroom and plumbing supplies showroom near the inner city.',
      active: true,
    },
    {
      name: 'AURIUS Gold Coast Bathroom Centre',
      phone: '+61 7 3000 1106',
      address: '9 Ferry Road',
      city: 'Southport',
      state: 'QLD',
      latitude: -27.9767,
      longitude: 153.4145,
      photos: ['/uploads/dealers/nsw-showroom-exterior.jpg'],
      note: 'Display-led showroom for residential bathroom renovations.',
      active: true,
    },
    {
      name: 'AURIUS Adelaide Bathroom Studio',
      phone: '+61 8 6000 1107',
      address: '31 Richmond Road',
      city: 'Keswick',
      state: 'SA',
      latitude: -34.9451,
      longitude: 138.5724,
      photos: ['/uploads/dealers/nsw-toilet-showroom.jpg'],
      note: 'Bathroom studio with multiple toilet suites available to view.',
      active: true,
    },
    {
      name: 'AURIUS Perth Bathroom Warehouse',
      phone: '+61 8 6000 1108',
      address: '22 Scarborough Beach Road',
      city: 'Osborne Park',
      state: 'WA',
      latitude: -31.9035,
      longitude: 115.8109,
      photos: ['/uploads/dealers/qld-showroom-exterior.png'],
      note: 'Warehouse-style bathroom display and trade collection point.',
      active: true,
    },
  ].map((location) => ({ ...location, photos: JSON.stringify(location.photos) }));
  await prisma.dealerLocation.createMany({ data: dealerLocations });

  console.log('[seed] creating price rules (examples)...');
  await prisma.regionalPriceRule.createMany({
    data: [
      {
        name: 'Bulk purchase 10+ units',
        type: 'VOLUME_DISCOUNT',
        minQuantity: 10,
        maxQuantity: null,
        percentValue: -5,
        active: true,
      },
      {
        name: 'Bulk purchase 50+ units',
        type: 'VOLUME_DISCOUNT',
        minQuantity: 50,
        maxQuantity: null,
        percentValue: -10,
        active: true,
      },
      {
        name: 'NT/WA remote area surcharge',
        type: 'REMOTE_AREA_SURCHARGE',
        state: 'NT',
        percentValue: 3.5,
        active: true,
      },
    ],
  });

  console.log('[seed] creating products...');
  const floorDrainFinishes = [
    { key: 'brushedSteel', name: 'Brushed Stainless Steel', image: '/uploads/products/floor-drain-s-t12115-brushed.jpg' },
    { key: 'gold', name: 'Brushed Gold', image: '/uploads/products/floor-drain-s-t12115-gold.jpg' },
    { key: 'roseGold', name: 'Brushed Rose Gold', image: '/uploads/products/floor-drain-s-t12115-rose-gold.jpg' },
    { key: 'gunmetal', name: 'Gunmetal', image: '/uploads/products/floor-drain-s-t12115-gunmetal.jpg' },
    { key: 'matteBlack', name: 'Matte Black', image: '/uploads/products/floor-drain-s-t12115-matte-black.jpg' },
  ];
  const floorDrainColors = floorDrainFinishes.map((finish) => finish.name);
  const toilets = [
    { code: 'AUR-ST-01', sku: 'AUR-ST-SMART86-W', name: 'AURIUS Smart Toilet S86', model: 'S86', stock: 120, price1: 980, price2: 1180, price3: 1380, rrp: 1899, sizes: ['S86'], colors: ['Glossy White'], image: '/uploads/products/cdr-smart-toilet-s86.png', displayStyle: 'carousel', promotionNote: 'Single carousel hero with simple color callouts.' },
    { code: 'AUR-ST-02', sku: 'AUR-ST-SMART90-W', name: 'AURIUS Smart Toilet S90', model: 'S90', stock: 80, price1: 1080, price2: 1280, price3: 1480, rrp: 2099, sizes: ['S90'], colors: ['Glossy White'], image: '/uploads/products/cdr-smart-toilet-s90.png', displayStyle: 'carousel', promotionNote: 'Single carousel hero with simple color callouts.' },
    { code: 'AUR-ST-03', sku: 'AUR-ST-SMART95-B', name: 'AURIUS Smart Toilet S95 Pro', model: 'S95', stock: 60, price1: 1280, price2: 1490, price3: 1690, rrp: 2399, sizes: ['S95'], colors: ['Glossy White', 'Matte Black'], image: '/uploads/products/cdr-smart-toilet-s95.png', displayStyle: 'carousel', promotionNote: 'Single carousel hero with simple color callouts.' },
    { code: 'AUR-ST-04', sku: 'AUR-ST-SEAT86-W', name: 'AURIUS Smart Toilet Seat Bidet 86', model: 'B86', stock: 200, price1: 420, price2: 520, price3: 610, rrp: 899, sizes: ['Universal'], colors: ['Glossy White'], image: '/uploads/products/cdr-toilet-lid-b86.png' },
    { code: 'AUR-WF-01', sku: 'AUR-WF-RJ-20', name: 'AURIUS Ruijing Whole House Water System', model: 'RJ-20', stock: 90, price1: 520, price2: 640, price3: 750, rrp: 1099, sizes: ['20"', '10"'], colors: ['Gold', 'Stainless Steel'], image: '/uploads/products/cdr-water-filter-3stage.png', category: 'Whole-House Water Purification', series: '瑞景', displayStyle: 'carousel' },
    { code: 'AUR-WF-02', sku: 'AUR-WF-CART-20', name: 'AURIUS Replacement Filter Cartridge (3-pack)', model: 'C20-3', stock: 300, price1: 88, price2: 108, price3: 128, rrp: 179, sizes: ['20"', '10"'], colors: ['Standard'], image: '/uploads/products/cdr-filter-media.png', category: 'Filter Cartridge', displayStyle: 'catalog' },
    { code: 'AUR-WF-03', sku: 'AUR-WF-SB-20', name: 'AURIUS Saibo Whole House Water System', model: 'SB-20', stock: 75, price1: 560, price2: 680, price3: 790, rrp: 1199, sizes: ['20"', '10"'], colors: ['Gold', 'Stainless Steel'], image: '/uploads/products/cdr-water-filter-3stage.png', category: 'Whole-House Water Purification', series: '赛博', displayStyle: 'carousel' },
    { code: 'AUR-WF-04', sku: 'AUR-WF-CTO-20', name: 'AURIUS CTO Carbon Filter Cartridge', model: 'CTO-20', stock: 240, price1: 38, price2: 48, price3: 58, rrp: 89, sizes: ['20"', '10"'], colors: ['White'], image: '/uploads/products/cdr-filter-media.png', category: 'Filter Cartridge', displayStyle: 'catalog' },
    { code: 'AUR-WF-05', sku: 'AUR-WF-RESIN-90', name: 'AURIUS RESIN 90 Filter Cartridge', model: 'RESIN-90', stock: 180, price1: 42, price2: 54, price3: 66, rrp: 99, sizes: ['20"', '10"'], colors: ['White'], image: '/uploads/products/cdr-filter-media.png', category: 'Filter Cartridge', displayStyle: 'catalog' },
    { code: 'AUR-SF-01', sku: 'AUR-SF-SHOWER-01', name: 'AURIUS Shower Filtration Set', model: 'SHOWER-01', stock: 150, price1: 78, price2: 98, price3: 118, rrp: 169, sizes: ['Universal'], colors: ['White', 'Lavender'], image: '/uploads/products/cdr-shower-filtration.png' },
    {
      code: 'AUR-FD-01', sku: 'S-T12115L115FZ-80', name: 'AURIUS S-T12115L115FZ-80 Floor Drain', model: 'S-T12115L115FZ-80', stock: 100, price1: 189, price2: 189, price3: 189, rrp: 299,
      sizes: ['115 × 115 mm'],
      colors: floorDrainColors,
      image: floorDrainFinishes[0].image,
      displayStyle: 'engineering',
      promotionNote: 'Five real finishes available for project specification.',
      dimensionSpec: '115 × 115 mm · Ø80 mm outlet · SUS304 · 1.2 mm material thickness',
      outlet: 'Ø80 mm',
      material: 'SUS304',
      thickness: '1.2 mm',
      variants: floorDrainFinishes.map((finish) => ({
        skuSuffix: finish.key.toUpperCase(),
        name: finish.name,
        attributes: { length: '115 × 115 mm', colour: finish.name, finishKey: finish.key, image: finish.image },
        stock: 20,
        priceAdjustment: 0,
      })),
    },
  ];

  for (const [displayOrder, t] of toilets.entries()) {
    const isFloorDrain = t.code.startsWith('AUR-FD');
    const isWaterProduct = t.code.startsWith('AUR-WF');
    const isShowerFilter = t.code.startsWith('AUR-SF');
    const isFilterCartridge = t.category === 'Filter Cartridge';
    const img = t.image
      ?? (isFloorDrain
        ? '/uploads/products/custom-floor-drain.jpg'
        : isWaterProduct || isShowerFilter
          ? '/uploads/products/water-filtration.jpg'
          : '/uploads/products/smart-toilet.jpg');
    await prisma.product.create({
      data: {
        productCode: t.code,
        sku: t.sku,
        name: t.name,
        category: t.category ?? (isFloorDrain
          ? 'Engineering Custom Floor Drain'
          : t.code === 'AUR-ST-04'
            ? 'Toilet Lid'
            : t.code.startsWith('AUR-ST')
              ? 'Smart Toilet'
              : isShowerFilter
              ? 'Shower Filtration'
              : t.code === 'AUR-WF-02'
                ? 'Filter Cartridge'
                : t.code !== 'AUR-WF-01' && t.code.startsWith('AUR-WF-0')
                  ? 'Filter Cartridge'
                  : 'Whole-House Water Purification'),
        model: t.model,
        description: isFloorDrain
          ? 'Compact SUS304 floor drain with a fixed 115 × 115 mm body, Ø80 mm outlet and five photographed finish options.'
          : t.code.startsWith('AUR-ST')
          ? 'Premium smart toilet with posterior & feminine cleaning, heated seat and water, soft closing, swing mode, anti-bacterial surface, massage mode, integrated deodoriser, air dryer and wireless remote control. Australian certified quality.'
          : isShowerFilter
          ? 'Compact shower filtration set with replaceable filter elements for a cleaner, softer shower experience. Universal fit for bathroom installations.'
          : isFilterCartridge
          ? 'AURIUS replacement filtration media for the whole-house water filtration range. Select the correct media type and housing size for your installation.'
          : 'Whole-house water filtration system with dual-gradient polypropylene sediment filter, activated catalytic carbon and salt-free descaling media. Protects every tap in your home.',
        images: JSON.stringify([img]),
        series: t.series ?? null,
        displayStyle: t.displayStyle ?? null,
        promotionNote: t.promotionNote ?? null,
        dimensionSpec: t.dimensionSpec ?? null,
        displayOrder: toilets.length - 1 - displayOrder,
        stock: t.stock,
        status: 'ACTIVE',
        specs: JSON.stringify({
          sizes: t.sizes,
          colors: t.colors,
          ...(isFloorDrain ? { outlet: 'Ø80 mm', material: 'SUS304', thickness: '1.2 mm' } : {}),
          features: t.code.startsWith('AUR-ST')
            ? ['Posterior Cleaning','Feminine Cleaning','Heated Seat & Water','Soft Closing','Swing Mode','Anti-bacterial','Massage Mode','Integrated Deodoriser','Air Dryer','Wireless Remote']
            : isShowerFilter
              ? ['Shower filtration','Replaceable elements','Universal connection','Compact installation']
              : isFilterCartridge && t.code === 'AUR-WF-02'
                ? ['3-pack replacement set','PP sediment','CTO carbon','Resin media']
                : isFilterCartridge
                  ? ['Replacement media','Whole-house housing compatible','Multiple micron grades']
                  : ['Stage 1: Dual-gradient PP','Stage 2: Activated catalytic carbon','Stage 3: Salt-free descaling'],
        }),
        prices: {
          create: {
            retailPrice: t.rrp,
            promoPrice: Math.round(t.rrp * 0.9 * 100) / 100,
            waterworkerPrice: t.price2,
            builderPrice: t.price3,
            distributor2Price: t.price2 + 25,
            dealer1Price: t.price1,
            level1Price: t.price1,
            level2Price: t.price2,
            level3Price: t.price3,
            rrp: t.rrp,
          },
        },
        variants: (t.variants ?? t.sizes.flatMap((length) => t.colors.map((colour) => ({
          skuSuffix: `${String(length).replace(/\D/g, '') || 'STD'}-${String(colour).replace(/\W/g, '').toUpperCase()}`,
          name: `${length} / ${colour}`,
          attributes: { length, colour },
          priceAdjustment: 0,
          stock: t.stock,
        }))))
          ? {
              create: (t.variants ?? t.sizes.flatMap((length) => t.colors.map((colour) => ({
                skuSuffix: `${String(length).replace(/\D/g, '') || 'STD'}-${String(colour).replace(/\W/g, '').toUpperCase()}`,
                name: `${length} / ${colour}`,
                attributes: { length, colour },
                priceAdjustment: 0,
                stock: t.stock,
              })))).map((variant, index) => ({
                skuSuffix: variant.skuSuffix,
                name: variant.name,
                attributes: JSON.stringify(variant.attributes),
                priceAdjustment: variant.priceAdjustment,
                stock: variant.stock,
                sortOrder: index,
              })),
            }
          : undefined,
      },
    });
  }

  console.log('[seed] creating download files...');
  const downloads = [
    { title: 'WaterMark Certification — Smart Toilet S Series', category: 'WATERMARK_CERTIFICATION', roles: 'LEVEL1,LEVEL2,LEVEL3', file: 'watermark-s-series.pdf', lines: ['AURIUS Smart Toilet S Series', 'WaterMark Certificate of Conformity', 'WM-023456', 'Standards: AS/NZS 3500, AS 1976'] },
    { title: 'Product Catalogue 2026 — Full Range', category: 'PRODUCT_CATALOGUE', roles: 'LEVEL1,LEVEL2,LEVEL3', file: 'catalogue-2026.pdf', lines: ['AURIUS Product Catalogue 2026', 'Smart Toilets', 'Whole-House Water Purification', 'Filter Cartridges'] },
    { title: 'Installation Drawings — Smart Toilet S86/S90/S95', category: 'INSTALLATION_DRAWINGS', roles: 'LEVEL1,LEVEL2,LEVEL3', file: 'installation-drawings.pdf', lines: ['AURIUS Smart Toilet', 'Rough-in dimensions: 305mm', 'Water inlet position', 'Electrical requirements'] },
    { title: 'Installation Guide — Whole House Filtration', category: 'INSTALLATION_GUIDE', roles: 'LEVEL1,LEVEL2,LEVEL3', file: 'installation-guide-whf.pdf', lines: ['AURIUS 3-Stage Whole House Filtration', 'Step 1: Shut off main water supply', 'Step 2: Mount bracket and housing', 'Step 3: Connect and flush system'] },
    { title: 'Dealer Contract Template', category: 'DEALER_CONTRACT_TEMPLATE', roles: 'LEVEL1,LEVEL3', file: 'dealer-contract-template.pdf', lines: ['AURIUS Dealer Agreement Template', 'This template is for reference only.', 'Final agreements are issued by AURIUS operations team.'] },
    { title: 'Technical Specifications — Filter Media', category: 'TECHNICAL_DOCUMENTS', roles: 'LEVEL1,LEVEL2,LEVEL3', file: 'tech-specs-filter.pdf', lines: ['AURIUS Filter Media Technical Specifications', 'PP sediment: 5 micron dual-gradient', 'Catalytic carbon: chlorine/chloramine reduction', 'Salt-free descaling: TAC media'] },
  ];
  for (const d of downloads) {
    const full = writeSamplePdf(d.file, d.title, d.lines);
    await prisma.downloadFile.create({
      data: {
        title: d.title,
        description: 'Official AURIUS document — for authorised partners only.',
        category: d.category as never,
        filePath: full,
        originalName: d.file,
        mime: 'application/pdf',
        size: fs.statSync(full).size,
        allowedRoles: d.roles,
        status: 'PUBLISHED',
      },
    });
  }

  console.log('[seed] creating accounts...');
  const bcrypt = await import('bcryptjs');
  const email = process.env.ADMIN_EMAIL || 'admin@aurius.com.au';
  const adminPassword = process.env.CREATE_ADMIN_PASSWORD || 'Admin@1234';
  const hash = await bcrypt.hash(adminPassword, 12);

  // Admin
  await prisma.user.create({
    data: {
      email,
      passwordHash: hash,
      role: 'ADMIN',
      accountStatus: 'ACTIVE',
      memberLevel: null,
    },
  });

  // Approved test accounts for every tier
  const testAccounts = [
    { email: 'agent@aurius-demo.com.au', role: 'REGIONAL_AGENT' as const, level: 1, firstName: 'Marcus', lastName: 'Chen', company: 'Sydney Bathroom Group Pty Ltd', state: 'NSW', aurId: 'AUR-DE-2026001288', tradeType: 'NOT_APPLICABLE' as const },
    { email: 'plumber@aurius-demo.com.au', role: 'LICENSED_TRADESMAN' as const, level: 2, firstName: 'James', lastName: 'Wilson', company: 'JW Plumbing Services', state: 'VIC', aurId: 'AUR-TR-2026000365', tradeType: 'LICENSED_PLUMPER' as const },
    { email: 'electrician@aurius-demo.com.au', role: 'LICENSED_TRADESMAN' as const, level: 2, firstName: 'Sarah', lastName: 'Nguyen', company: 'SN Electrical Pty Ltd', state: 'QLD', aurId: 'AUR-TR-2026000366', tradeType: 'LICENSED_ELECTRICIAN' as const },
    { email: 'subdealer@aurius-demo.com.au', role: 'SUB_DEALER' as const, level: 3, firstName: 'David', lastName: 'Smith', company: 'Smith Bathroom Supplies', state: 'WA', aurId: 'AUR-SD-2026002412', tradeType: 'NOT_APPLICABLE' as const },
    { email: 'waterworker@aurius-demo.com.au', role: 'WATERWORKER' as const, level: 4, firstName: 'Lena', lastName: 'Brown', company: 'Luna Waterworks', state: 'SA', aurId: 'AUR-WW-2026000101', tradeType: 'NOT_APPLICABLE' as const },
    { email: 'builder@aurius-demo.com.au', role: 'BUILDER' as const, level: 5, firstName: 'Oliver', lastName: 'Stone', company: 'Stone Build Co', state: 'NSW', aurId: 'AUR-BR-2026000102', tradeType: 'NOT_APPLICABLE' as const },
  ];

  for (const a of testAccounts) {
    const pw = await bcrypt.hash('Demo@1234', 12);
    const user = await prisma.user.create({
      data: {
        email: a.email,
        passwordHash: pw,
        role: a.role,
        accountStatus: 'ACTIVE',
        memberLevel: a.level,
        lastLoginAt: null,
      },
    });
    await prisma.memberProfile.create({
      data: {
        userId: user.id,
        firstName: a.firstName,
        lastName: a.lastName,
        companyName: a.company,
        phone: null,
        streetAddress: '1 Demo Street',
        suburb: 'Demo Suburb',
        state: a.state,
        postcode: '2000',
        country: 'Australia',
        region: a.state,
        approvedAt: new Date(),
      },
    });
    await prisma.memberId.create({
      data: {
        userId: user.id,
        aurId: a.aurId,
        prefix: a.aurId.slice(0, 6),
        year: 2026,
        sequence: parseInt(a.aurId.slice(-6), 10),
      },
    });
    await prisma.partnerApplication.create({
      data: {
        userId: user.id,
        channel: a.role === 'LICENSED_TRADESMAN' ? 'VIP' : 'TRADE',
        applicationNo: `APP-DEMO-${a.aurId.slice(-6)}`,
        status: 'APPROVED',
        tradeType: a.tradeType,
        state: a.state,
        firstName: a.firstName,
        lastName: a.lastName,
        companyName: a.company,
        streetAddress: '1 Demo Street',
        suburb: 'Demo Suburb',
        postcode: '2000',
        country: 'Australia',
        privacyConsent: true,
        dealerAgreement: true,
        marketingConsent: false,
        businessInterest: 'All Categories',
      },
    });
  }

  // Pending review account
  const pendingHash = await bcrypt.hash('Demo@1234', 12);
  const pendingUser = await prisma.user.create({
    data: {
      email: 'pending@aurius-demo.com.au',
      passwordHash: pendingHash,
      role: 'SUB_DEALER',
      accountStatus: 'PENDING_REVIEW',
      memberLevel: 3,
    },
  });
  await prisma.partnerApplication.create({
    data: {
      userId: pendingUser.id,
      channel: 'TRADE',
      applicationNo: 'APP-DEMO-PENDING01',
      status: 'SUBMITTED',
      tradeType: 'NOT_APPLICABLE',
      state: 'NSW',
      firstName: 'Alex',
      lastName: 'Pending',
      companyName: 'Pending Supplies Co',
      streetAddress: '9 Wait Street',
      suburb: 'Parramatta',
      postcode: '2150',
      country: 'Australia',
      abnNumber: '51824753556',
      privacyConsent: true,
      dealerAgreement: true,
      marketingConsent: false,
      businessInterest: 'Smart Toilet',
    },
  });

  console.log('[seed] done.');
  console.log('--------------------------------------------');
  console.log('Development accounts (DEVELOPMENT ONLY):');
  console.log(`  Admin:      ${email} / ${adminPassword}`);
  for (const a of testAccounts) {
    console.log(`  ${a.role.padEnd(20)} ${a.email} / Demo@1234`);
  }
  console.log(`  Pending:    pending@aurius-demo.com.au / Demo@1234`);
  console.log('--------------------------------------------');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
