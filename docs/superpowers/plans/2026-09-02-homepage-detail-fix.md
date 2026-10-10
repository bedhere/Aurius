# AURIUS Homepage And Product Detail Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent product-detail blank screens and rebuild the public homepage around the approved PSD-inspired visual language while keeping the existing commerce, partner, and admin editing features.

**Architecture:** Keep the existing React Router and API contracts. Harden product-detail state into explicit loading/error/success branches, then replace the generic homepage hero with a structured editorial commerce homepage whose center visual is still driven by the admin-managed `homepageMedia` array. Reuse/crop PSD-compatible visual assets when available and fall back safely to existing uploaded media.

**Tech Stack:** React 18, TypeScript, Vite, React Router, existing CSS design tokens, Express/Prisma public content API.

## Global Constraints

- Preserve guest checkout, partner pricing isolation, dealer map, and admin homepage editing.
- Do not hard-code an entire PSD as a single page background.
- Use accessible image alt text, keyboard-operable carousel controls, and visible loading/error states.
- Prefer existing assets and existing CSS tokens; avoid unrelated backend or database changes.
- Verify with focused browser checks, frontend build, and backend regression tests.

### Task 1: Reproduce And Harden Product Detail

**Files:**
- Modify: `frontend/src/pages/public/ProductDetail.tsx`
- Modify: `frontend/src/components/ui.tsx` only if a reusable error state is needed
- Modify: `frontend/src/assets/styles/pages-public.css`
- Test: focused browser navigation to `/products/:id` with a valid product, invalid id, and failed API response

**Interfaces:**
- Consumes: `GET /api/products/:id` response typed as `ProductItem`.
- Produces: explicit `loading`, `error`, and `product` render branches; safe normalization for optional arrays/objects.

- [ ] **Step 1: Capture the current browser error and API payload.**
  - Start backend and frontend development servers.
  - Open the product list, click a product, and record the browser console error and network response.
  - Compare the payload fields with `ProductItem`, especially `images`, `variants`, and `specs`.

- [ ] **Step 2: Add a failing regression check for the observed failure.**
  - Exercise the exact product route in the browser and confirm the page remains nonblank when the API rejects or returns malformed optional fields.

- [ ] **Step 3: Implement the smallest root-cause fix.**
  - Track `loading` and `loadError` separately from `product`.
  - Normalize `images`, `variants`, and `specs` before rendering.
  - Render `PageLoading` while loading, an `Alert` plus return link on error, and the existing product UI only after valid data exists.
  - Guard derived values so an empty image list, missing specs, or missing variants cannot throw during render.

- [ ] **Step 4: Verify the detail route.**
  - Confirm a real product renders, an invalid id shows a nonblank not-found state, and an API failure shows a nonblank error state.

### Task 2: Rebuild PSD-Inspired Homepage Structure

**Files:**
- Modify: `frontend/src/pages/public/Home.tsx`
- Modify: `frontend/src/assets/styles/pages-public.css`
- Modify: `frontend/src/assets/styles/global.css` only if shared public-shell tokens need a small adjustment

**Interfaces:**
- Consumes: `SiteContent.homepageMedia`, existing product and dealer routes, existing `Link` navigation.
- Produces: a responsive homepage with a design-led hero, admin-driven media rotation, product category entry points, and partner/dealer conversion paths.

- [ ] **Step 1: Define the homepage sections in the component.**
  - Keep the existing header/footer outside the page.
  - Add a hero with a compact brand statement, media stage, slide metadata, previous/next buttons, dots, and pause-safe controls.
  - Add a product-category strip for smart toilets, water filtration, and engineering floor drains.
  - Add a restrained service/partner band linking retail purchase, become partner, and dealer locations.
  - Keep copy concise so the first viewport remains visually led.

- [ ] **Step 2: Bind the four PSD-inspired carousel variants.**
  - Use the admin `homepageMedia` entries when present.
  - Preserve support for both images and videos.
  - Use existing uploaded media as fallback if an entry is empty or fails to load.
  - Keep slide state stable when the admin content changes.

- [ ] **Step 3: Implement the visual system.**
  - Use the light warm background, AURIUS green accent, thin rules, generous whitespace, and product-first composition visible in the supplied references.
  - Avoid dark overlays, generic marketing cards, excessive gradients, and oversized decorative elements.
  - Add responsive rules for mobile without horizontal overflow.

- [ ] **Step 4: Verify interactions.**
  - Test dots, previous/next controls, automatic rotation, image fallback, video rendering, and links at desktop and mobile widths.

### Task 3: Crop And Register Reusable Design Assets

**Files:**
- Create: `frontend/public/uploads/brand/homepage/` cropped raster assets when PSD extraction is available
- Modify: `frontend/src/pages/public/Home.tsx` only to reference registered fallback assets
- Modify: `frontend/src/assets/styles/pages-public.css` only for asset-specific object positioning

**Interfaces:**
- Consumes: the four supplied PSD homepage files and existing upload serving path.
- Produces: optimized, named assets with stable public URLs and no dependency on local PSD paths.

- [ ] **Step 1: Render or extract each PSD composite/usable layer.**
  - Preserve the original design files outside the repository.
  - Export only the central product visual, logo/brand treatment, or other reusable bitmap needed by the homepage.

- [ ] **Step 2: Resize/crop assets for desktop and mobile-safe focal points.**
  - Use a fixed aspect ratio and `object-position` values so product subjects remain visible.
  - Keep raster files web-appropriate and avoid unnecessary duplicate copies.

- [ ] **Step 3: Register assets in the carousel fallback or admin seed data.**
  - Keep admin editing authoritative; local assets are only safe defaults.
  - Verify every referenced path returns successfully.

### Task 4: Full Verification

**Files:**
- No additional source files unless verification reveals a defect.

- [ ] **Step 1: Run frontend production build.**
  - Run `npm.cmd run build --workspace frontend`.
  - Expected: exit code 0.

- [ ] **Step 2: Run backend regression tests.**
  - Run `npm.cmd test --workspace backend`.
  - Expected: all existing tests pass.

- [ ] **Step 3: Perform browser smoke checks.**
  - Check `/`, `/products`, `/products/:id`, `/guest-checkout`, and `/stockists`.
  - Check desktop and mobile viewports for blank screens, overflow, broken images, and inaccessible controls.

- [ ] **Step 4: Report residual asset limitations.**
  - If PSD decoding is unavailable in the environment, report exactly which supplied assets could not be extracted and which existing project assets were used instead.
