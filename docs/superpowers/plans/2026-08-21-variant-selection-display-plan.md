# Product Variant Selection and Display Implementation Plan

> **For agentic workers:** Execute this plan task-by-task with tests after each behavior change.

**Goal:** Require valid product variant selection and display the selected model/specification consistently in cart and order views.

**Architecture:** Reuse the existing `ProductVariant` model and cart/order snapshot fields. Strengthen backend validation, make the product page resolve all options to one variant, and add shared display helpers/styles for cart and order views.

**Tech Stack:** React 18, TypeScript, Vite, Express, Zod, Prisma, Vitest, Supertest.

## Global Constraints

- Products without variants remain directly addable.
- Products with variants require a valid active variant belonging to that product.
- Cart and orders display `variantName` and `variantAttributes` from server snapshots.
- Floor drain controls keep their custom preview but use the shared option typography and spacing.

### Task 1: Backend Variant Validation

**Files:**
- Modify: `backend/src/controllers/cartController.ts`
- Modify: `backend/tests/orders.test.ts`

- [ ] Add tests proving a product with active variants rejects a missing `variantId`, accepts a valid matching variant, and rejects a variant belonging to another product.
- [ ] Run the focused order tests and verify the new cases fail before implementation.
- [ ] Update `addToCart` to query active variants for the product and reject missing selection when active variants exist.
- [ ] Keep existing ownership, active-status, stock, price, and snapshot behavior.
- [ ] Run the focused order tests and the complete backend test suite.

### Task 2: Product Detail Variant Resolution

**Files:**
- Modify: `frontend/src/pages/public/ProductDetail.tsx`
- Modify: `frontend/src/assets/styles/pages-public.css`

- [ ] Ensure ordinary product options resolve to the selected real variant rather than only toggling display chips.
- [ ] Ensure floor drain size and finish resolve to one real variant before add-to-cart.
- [ ] Submit the resolved variant ID, and show a clear selection error when it is missing or unavailable.
- [ ] Consolidate option headings, buttons, font sizes, weights, spacing, and selected states using the existing product option styles.

### Task 3: Cart and Order Variant Presentation

**Files:**
- Modify: `frontend/src/pages/member/Cart.tsx`
- Modify: `frontend/src/pages/member/OrderDetail.tsx`
- Modify: `frontend/src/pages/admin/Orders.tsx`
- Modify: `frontend/src/api/types.ts`
- Modify: `backend/src/controllers/adminOrderController.ts` if the admin response does not expose snapshots

- [ ] Add a small shared formatter for variant name and attribute values.
- [ ] Show the formatted selection under every cart line when present.
- [ ] Show the formatted selection in customer and administrator order item rows.
- [ ] Preserve readable fallback behavior for historical rows with no variant snapshot.
- [ ] Run the frontend type-check/build and backend tests.

### Task 4: Verification

- [ ] Verify a no-variant product can be added directly.
- [ ] Verify a normal variant product cannot be added until selected.
- [ ] Verify a floor drain selection appears in cart, checkout, customer order detail, and admin order detail.
- [ ] Verify typography is consistent at desktop and narrow viewport widths.
