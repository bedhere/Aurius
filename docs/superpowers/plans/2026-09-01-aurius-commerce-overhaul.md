# AURIUS Commerce Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the store support guest purchase, role-scoped pricing, richer product merchandising, editable homepage and stockist content, and scheduled customer notifications.

**Architecture:** Keep Prisma as the source of truth for products, prices, orders, and content settings. Extend the backend first so every visible price, purchase path, and admin-editable merchandising field is enforced server-side, then wire the frontend to those new contracts. Add one background notification service for periodic reminders and reuse the existing mail pipeline for all customer-facing email.

**Tech Stack:** TypeScript, Express, Prisma/SQLite, React, Vite, React Router, existing mail service, existing admin panel.

## Global Constraints

- Guest purchase must work without login and must still collect email plus address before payment.
- The backend must never expose unrelated pricing tiers to the wrong audience.
- Builder / waterworker / VIP / dealer visibility must be enforced by server-derived identity, not client-selected price levels.
- Google Maps is used for dealer location display; map data must remain admin-editable.
- ABR verification may auto-run when configured, but manual admin review remains available.
- Annual reminder emails must exclude partner accounts.
- Existing member checkout, order history, admin audit, and mail logging must remain intact.

---

### Task 1: Extend the data model for guest orders, merch content, and richer pricing

**Files:**
- Modify: `F:/zky/Aurius/AURIUS/database/schema/schema.prisma`
- Modify: `F:/zky/Aurius/AURIUS/database/seeds/seed.ts`
- Modify: `F:/zky/Aurius/AURIUS/backend/src/services/sequenceService.ts`
- Modify: `F:/zky/Aurius/AURIUS/backend/src/services/priceService.ts`
- Modify: `F:/zky/Aurius/AURIUS/backend/src/services/memberService.ts`
- Create: `F:/zky/Aurius/AURIUS/database/schema/migrations/20260901_marketplace_overhaul/migration.sql`

**Interfaces:**
- Consumes: `roleToPriceLevel`, `generateOrderNumber`, existing `Product`, `Order`, `User`, `SystemSetting` models.
- Produces: order fields for guest checkout, product fields for series/media/display metadata, and explicit pricing visibility helpers used by later tasks.

- [ ] Add Prisma fields for guest checkout and merchandising data: guest email / phone / shipping fields on `Order`, product series / display type / home carousel media / product gallery / engineering-note fields on `Product`, and stockist fields for map marker, phone, address, storefront photos on `SystemSetting` or a new content model if needed.
- [ ] Expand the pricing model so the backend can represent retail, promo, waterworker, builder, second-tier distributor, and first-tier dealer prices without leaking the unused tiers to other audiences.
- [ ] Add or adjust role mapping so waterworker and builder access can be derived server-side instead of from a client-side label.
- [ ] Update seeds so demo data covers the new series split, the new public homepage content, and representative dealer locations.
- [ ] Run the Prisma generation/migration flow and confirm the new schema compiles before touching controllers.

**Tests:**
- Add/adjust backend schema-facing tests under `F:/zky/Aurius/AURIUS/backend/tests/` that assert the new data shape can be read and written.

---

### Task 2: Implement guest checkout and payment without login

**Files:**
- Modify: `F:/zky/Aurius/AURIUS/backend/src/routes/index.ts`
- Modify: `F:/zky/Aurius/AURIUS/backend/src/controllers/orderController.ts`
- Modify: `F:/zky/Aurius/AURIUS/backend/src/controllers/paymentController.ts`
- Modify: `F:/zky/Aurius/AURIUS/backend/src/services/orderService.ts`
- Modify: `F:/zky/Aurius/AURIUS/backend/src/services/paymentService.ts`
- Modify: `F:/zky/Aurius/AURIUS/backend/src/mail/templates.ts`
- Modify: `F:/zky/Aurius/AURIUS/frontend/src/pages/public/ProductDetail.tsx`
- Create: `F:/zky/Aurius/AURIUS/frontend/src/pages/public/GuestCheckout.tsx`
- Modify: `F:/zky/Aurius/AURIUS/frontend/src/App.tsx`
- Modify: `F:/zky/Aurius/AURIUS/frontend/src/api/types.ts`

**Interfaces:**
- Consumes: order creation, payment creation, mail template helpers, new guest order fields from Task 1.
- Produces: a public checkout flow that can create an order, collect email/address, and route into the existing payment methods or a guest-compatible payment path.

- [ ] Split the current member-only checkout logic so there is a guest order path that does not require `requireActiveMember`, while leaving the existing member cart flow untouched.
- [ ] Make the public product detail page expose a direct purchase action that opens or routes to guest checkout with product context already filled in.
- [ ] Ensure payment initiation and confirmation can work from a guest order record and can still send order confirmation mail to the guest email.
- [ ] Update the order/detail response types so guest orders render correctly in both the public confirmation flow and the admin order view.
- [ ] Preserve member-specific payment options and receipts for logged-in orders.

**Tests:**
- Add backend tests for guest order creation, guest payment creation, and mail dispatch.
- Add frontend tests for the public product detail purchase entry point and the guest checkout route.

---

### Task 3: Rework pricing visibility and product catalog segmentation

**Files:**
- Modify: `F:/zky/Aurius/AURIUS/backend/src/controllers/productController.ts`
- Modify: `F:/zky/Aurius/AURIUS/backend/src/services/priceService.ts`
- Modify: `F:/zky/Aurius/AURIUS/backend/src/controllers/adminCatalogController.ts`
- Modify: `F:/zky/Aurius/AURIUS/backend/src/services/orderService.ts`
- Modify: `F:/zky/Aurius/AURIUS/frontend/src/api/types.ts`
- Modify: `F:/zky/Aurius/AURIUS/frontend/src/pages/public/Products.tsx`
- Modify: `F:/zky/Aurius/AURIUS/frontend/src/pages/public/ProductDetail.tsx`
- Modify: `F:/zky/Aurius/AURIUS/frontend/src/components/ui.tsx`

**Interfaces:**
- Consumes: the richer pricing fields and product metadata from Task 1.
- Produces: a catalog API that only reveals the right prices and the right product groups for the right audience.

- [ ] Replace the current single injected price with role-scoped price presentation rules so guest, VIP, waterworker, builder, dealer, and distributor views stay isolated.
- [ ] Rebuild category filtering so toilets / toilet seats, water purification, and floor drains appear as separate shop groupings, with water filters split into the two named series and filter-core subgroups.
- [ ] Make floor drains display as engineering/custom products instead of direct retail goods, and surface the “large projects contact us” note on the public page.
- [ ] Update the product detail page so smart toilets use one image carousel, water products show series/color variants, and a dimension sheet appears below the image area where required.
- [ ] Keep the existing cart/order price validation server-side so the frontend cannot influence final pricing.

**Tests:**
- Extend the existing frontend catalog tests and add backend assertions around category and price visibility.

---

### Task 4: Add editable homepage, stockist map, and partner entry points

**Files:**
- Modify: `F:/zky/Aurius/AURIUS/backend/src/controllers/adminSystemController.ts`
- Modify: `F:/zky/Aurius/AURIUS/backend/src/routes/index.ts`
- Modify: `F:/zky/Aurius/AURIUS/frontend/src/pages/public/Home.tsx`
- Modify: `F:/zky/Aurius/AURIUS/frontend/src/pages/public/Stockists.tsx`
- Modify: `F:/zky/Aurius/AURIUS/frontend/src/components/Header.tsx`
- Modify: `F:/zky/Aurius/AURIUS/frontend/src/assets/styles/pages-public.css`
- Modify: `F:/zky/Aurius/AURIUS/frontend/src/i18n/strings.ts`
- Modify: `F:/zky/Aurius/AURIUS/frontend/src/api/types.ts`

**Interfaces:**
- Consumes: system settings from Task 1 and the public route structure already in place.
- Produces: an admin-editable home slideshow/video area, a dealer location page with map details, and revised header entry points.

- [ ] Store homepage slide/video items in settings and render them as the first visible public section instead of a single static image.
- [ ] Add admin controls so the homepage sequence can be edited without code changes.
- [ ] Replace the stockist state-only list with dealer cards that include map coordinates or map URLs, phone, address, and storefront photos.
- [ ] Hook the map view to Google Maps API usage through environment-backed configuration, not hardcoded keys.
- [ ] Move the “partner” entry to the top-right public navigation area and change the call-to-action copy to the retail-purchase wording requested.

**Tests:**
- Add frontend tests that verify the homepage renders multiple slides and the stockist page still shows map/contact metadata.
- Add admin settings tests for saving and reloading homepage and dealer location content.

---

### Task 5: Automate verification, reminders, and promotional email flows

**Files:**
- Modify: `F:/zky/Aurius/AURIUS/backend/src/services/abrService.ts`
- Create: `F:/zky/Aurius/AURIUS/backend/src/services/reminderService.ts`
- Modify: `F:/zky/Aurius/AURIUS/backend/src/services/mailService.ts`
- Modify: `F:/zky/Aurius/AURIUS/backend/src/mail/templates.ts`
- Modify: `F:/zky/Aurius/AURIUS/backend/src/index.ts`
- Modify: `F:/zky/Aurius/AURIUS/backend/src/controllers/memberController.ts`
- Modify: `F:/zky/Aurius/AURIUS/backend/src/controllers/adminSystemController.ts`
- Modify: `F:/zky/Aurius/AURIUS/frontend/src/pages/admin/Settings.tsx`
- Modify: `F:/zky/Aurius/AURIUS/frontend/src/pages/admin/Installations.tsx`

**Interfaces:**
- Consumes: ABR verification helper, email template system, installation and order records, and the new customer reminder schedule.
- Produces: auto-review hooks for licences and builders, yearly reminder mail for buyers, and a one-off promotional mail flow for new products.

- [ ] Wire ABR checks so licensed plumbers and builders can be auto-verified when ABR configuration exists, while keeping manual admin verification as fallback.
- [ ] Add a reminder scheduler that scans paid orders, skips partner accounts, and sends the 12-month postal reminder to the buyer email cohort.
- [ ] Add a separate promotional mail template and dispatch path for new products so launches can be sent individually, not bundled into order mail.
- [ ] Update installation/admin views so installation address and optional email are visible where the operations team needs them.
- [ ] Keep mail logging intact for both production SMTP and development file logging.

**Tests:**
- Add backend tests for ABR auto/manual branching, reminder eligibility, and promotional mail dispatch.
- Add a regression test proving partner accounts are excluded from the annual reminder job.

---

### Task 6: Expand admin merchandising controls for drain/floor-filter support and finalize regression coverage

**Files:**
- Modify: `F:/zky/Aurius/AURIUS/backend/src/controllers/adminCatalogController.ts`
- Modify: `F:/zky/Aurius/AURIUS/backend/src/controllers/adminSystemController.ts`
- Modify: `F:/zky/Aurius/AURIUS/frontend/src/pages/admin/Products.tsx`
- Modify: `F:/zky/Aurius/AURIUS/frontend/src/pages/admin/Settings.tsx`
- Modify: `F:/zky/Aurius/AURIUS/frontend/src/pages/admin/Downloads.tsx`
- Modify: `F:/zky/Aurius/AURIUS/frontend/src/pages/admin/Dashboard.tsx`

**Interfaces:**
- Consumes: the product/content fields from Tasks 1, 3, and 4.
- Produces: admin-only controls for floor-drain display copy, filter-gift handling, product photo upload, and final product-level merchandising polish.

- [ ] Add admin controls to mark filter cartridges as retail products or gifts and allow image upload on that same page.
- [ ] Expose floor-drain project copy, size-note content, and merchandising images in admin product editing.
- [ ] Let admins edit the public product highlight blocks that support the new public shop grouping.
- [ ] Keep the existing download, email, and order pages functional after the content model change.

**Tests:**
- Add one end-to-end style regression test that walks from admin product editing to public catalog rendering.
- Update the existing frontend admin tests so the new form fields and upload controls are covered.

## Self-Review

- Spec coverage: every requested item maps to one or more tasks above, with pricing, guest checkout, public merchandising, admin editing, reminders, and ABR verification all covered.
- Placeholder scan: no TBD/TODO or hand-wavy tasks left in the plan.
- Type consistency: the plan keeps pricing logic server-side, uses the existing route/controller layout, and introduces new files only where the new behavior needs a clean boundary.

