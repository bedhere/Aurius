# AURIUS Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the existing AURIUS catalogue with product families,
validated variants, product imagery, and public pages aligned to the supplied
sketches while retaining the secure B2B business flow.

**Architecture:** Extend the existing Prisma product model with a child
`ProductVariant` table. The backend validates a selected variant at cart and
checkout time, then snapshots it into cart and order items. The React
catalogue consumes the existing products API with additive variant fields and
renders the supplied water, toilet, lid, and custom floor-drain product
directions through existing layouts and routes.

**Tech Stack:** React 18, TypeScript, Vite, Express, Prisma 6, SQLite, Vitest,
Supertest.

## Global Constraints

- Preserve the existing `frontend/` and `backend/` workspace architecture.
- Never return price tiers other than the authenticated active member's tier.
- Preserve existing tables, URLs, member IDs, order records, and audit logs.
- Use local bitmap images for public product media; do not seed typographic SVG
  product placeholders.
- Keep all customer-facing copy in English.

---

### Task 1: Add product variant persistence

**Files:**
- Modify: `database/schema/schema.prisma`
- Create: `database/schema/migrations/<timestamp>_add_product_variants/migration.sql`
- Modify: `backend/tests/orders.test.ts`

**Interfaces:**
- Produces `ProductVariant` with `id`, `productId`, `skuSuffix`, `name`,
  `attributes`, `priceAdjustment`, `stock`, `status`, and `sortOrder`.
- Produces nullable `variantId`, `variantName`, and `variantAttributes` order
  and cart snapshots.

- [ ] **Step 1: Write failing integration assertions**

```ts
expect(cartItem.variantName).toBe('900 mm / Graphite');
expect(orderItem.variantAttributes).toContain('900 mm');
```

- [ ] **Step 2: Run the focused order test**

Run: `npm run test --workspace backend -- orders.test.ts`
Expected: FAIL because cart and order items do not yet expose a variant.

- [ ] **Step 3: Add the schema models and snapshot columns**

```prisma
model ProductVariant {
  id              Int      @id @default(autoincrement())
  productId       Int
  product         Product  @relation(fields: [productId], references: [id])
  skuSuffix       String
  name            String
  attributes      String
  priceAdjustment Float    @default(0)
  stock           Int?
  status          ProductStatus @default(ACTIVE)
  sortOrder       Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([productId, skuSuffix])
}
```

- [ ] **Step 4: Generate and apply a Prisma migration**

Run: `npm run migrate --workspace backend`
Expected: migration applies to `database/schema/dev.db`.

- [ ] **Step 5: Run the focused order test**

Run: `npm run test --workspace backend -- orders.test.ts`
Expected: the schema compiles; behavioural assertions still fail until Task 2.

### Task 2: Validate variants in cart and checkout

**Files:**
- Modify: `backend/src/validators/order.schema.ts`
- Modify: `backend/src/controllers/cartController.ts`
- Modify: `backend/src/services/orderService.ts`
- Modify: `backend/src/controllers/productController.ts`
- Modify: `backend/tests/orders.test.ts`

**Interfaces:**
- `POST /api/cart` accepts `{ productId, quantity, variantId? }`.
- `ProductItem` includes active variants with non-sensitive option metadata.
- Cart and order calculations derive prices from the server role price plus the
  server-stored variant adjustment.

- [ ] **Step 1: Add failing tests for an active variant and an invalid variant**

```ts
const add = await request(app).post('/api/cart').set('Authorization', bearer).send({
  productId,
  quantity: 1,
  variantId,
});
expect(add.status).toBe(200);

const invalid = await request(app).post('/api/cart').set('Authorization', bearer).send({
  productId,
  quantity: 1,
  variantId: 999999,
});
expect(invalid.status).toBe(400);
```

- [ ] **Step 2: Run the focused test**

Run: `npm run test --workspace backend -- orders.test.ts`
Expected: FAIL because `variantId` is not accepted.

- [ ] **Step 3: Add variant lookup and snapshot behaviour**

```ts
const variant = variantId
  ? await prisma.productVariant.findFirst({
      where: { id: variantId, productId, status: 'ACTIVE' },
    })
  : null;

if (variantId && !variant) {
  throw new AppError(400, 'Selected product option is unavailable');
}
```

- [ ] **Step 4: Recompute line prices from the authenticated role**

```ts
const unitPrice = baseRolePrice + (variant?.priceAdjustment ?? 0);
```

- [ ] **Step 5: Run focused backend tests**

Run: `npm run test --workspace backend -- orders.test.ts`
Expected: PASS.

### Task 3: Replace seeded placeholders with product media and real catalogue families

**Files:**
- Modify: `database/seeds/seed.ts`
- Create: `uploads/products/*.png`
- Modify: `backend/tests/helpers.ts`

**Interfaces:**
- Seeded products use bitmap `/uploads/products/*.png` media.
- Seed includes whole-house filters, replacement cartridges, smart toilets,
  toilet lids, and custom floor drains with structured variants.

- [ ] **Step 1: Remove the `svgProduct` generation path**

```ts
function writeProductImage(file: string, source: Buffer): string {
  const full = path.join(PRODUCTS_DIR, file);
  fs.writeFileSync(full, source);
  return `/uploads/products/${file}`;
}
```

- [ ] **Step 2: Add product catalogue records**

```ts
{
  code: 'AUR-FD-01',
  sku: 'AUR-FD-CUSTOM',
  name: 'AURIUS Custom Linear Floor Drain',
  category: 'Engineering Custom Floor Drain',
  variants: [
    { skuSuffix: '600-SS', name: '600 mm / Stainless Steel' },
    { skuSuffix: '900-GR', name: '900 mm / Graphite' },
  ],
}
```

- [ ] **Step 3: Run seed against the development database**

Run: `npm run seed`
Expected: seed completes and `/uploads/products/` contains bitmap assets.

### Task 4: Build product-led public catalogue and detail interaction

**Files:**
- Modify: `frontend/src/api/types.ts`
- Modify: `frontend/src/pages/public/Home.tsx`
- Modify: `frontend/src/pages/public/Products.tsx`
- Modify: `frontend/src/pages/public/ProductDetail.tsx`
- Modify: `frontend/src/assets/styles/global.css`
- Modify: `frontend/src/assets/styles/pages-public.css`

**Interfaces:**
- Public product APIs render active variant names and attributes.
- Product detail chooses one variant before adding a variant-enabled product to
  cart.
- Category actions route to `/products?category=<encoded category>`.

- [ ] **Step 1: Update the frontend product types**

```ts
export type ProductVariant = {
  id: number;
  name: string;
  attributes: Record<string, string>;
  stock: number | null;
};
```

- [ ] **Step 2: Render the three supplied catalogue directions**

```tsx
<Link to="/products?category=Engineering%20Custom%20Floor%20Drain">
  Explore custom floor drains
</Link>
```

- [ ] **Step 3: Add option selection and guarded add-to-cart**

```tsx
if (product.variants.length > 0 && !variantId) {
  setNotice({ type: 'error', text: 'Select an available product option first.' });
  return;
}
await api.post('/api/cart', { productId: product.id, quantity: 1, variantId });
```

- [ ] **Step 4: Build the frontend**

Run: `npm run build --workspace frontend`
Expected: TypeScript and Vite build complete successfully.

### Task 5: Audit and verify the full delivery

**Files:**
- Modify: `README.md`
- Modify: `docs/api.md`
- Modify: `docs/database.md`
- Modify: `docs/business-flow.md`

- [ ] **Step 1: Document variants and their server-side pricing rule**

```md
Product options are selected by `variantId`. The server verifies that the
variant belongs to the requested active product and adds only its stored
adjustment to the authenticated member's role-derived base price.
```

- [ ] **Step 2: Run backend suite**

Run: `npm test`
Expected: all Vitest/Supertest tests pass.

- [ ] **Step 3: Build all workspaces**

Run: `npm run build`
Expected: backend and frontend builds pass.

- [ ] **Step 4: Inspect the public website at desktop and mobile widths**

Run: start `npm run dev:backend` and `npm run dev:frontend`, then use the
in-app browser at `http://localhost:5173`.
Expected: images load, navigation and More actions work, and no horizontal
overflow appears.
