# Product Variant Selection and Display Design

## Goal

Require customers to choose a concrete product variant before adding products that have variants to the cart, and preserve/display the selected variant consistently through the cart, checkout, customer orders, and administrator order details.

## Scope

- Product detail pages select a real `ProductVariant` and submit its `variantId`.
- Products with variants cannot be added without a valid selection.
- Products without variants remain directly addable.
- Floor drain size and finish selections resolve to the matching real variant.
- Cart lines display the saved variant name and attributes.
- Order and administrator order detail views display the selected variant.
- Product option typography and spacing use one shared visual treatment across ordinary products and floor drains.

## Data Flow

1. The product API returns variants with `id`, `name`, `attributes`, and stock.
2. The product page derives the selected variant from the current option selections.
3. The add-to-cart request sends only that variant's `variantId`; the backend validates that it belongs to the product and is active.
4. The backend snapshots `variantName` and `variantAttributes` on `CartItem`.
5. Cart and order APIs return the snapshot fields for display, so later catalog edits do not erase what the customer selected.

## Validation

- Frontend blocks submission when a product has variants but no available variant is selected.
- Backend rejects a supplied variant ID that does not belong to the product or is inactive.
- Backend should reject missing variant IDs for products that have active variants, preventing direct API calls from bypassing the UI.
- Selected variants are checked for available stock before adding to the cart.

## Presentation

- Use a shared option title, option button, metadata, and selected-state style.
- Show variant details below each cart item using a consistent label/value treatment.
- Include the variant in customer order detail and administrator order item rows.
- Keep product-specific floor drain preview behavior, but make its controls use the shared typography and spacing tokens.

## Verification

- Add backend tests for rejecting missing/invalid variant selection and accepting a valid variant.
- Add or update frontend tests for selecting a variant and rendering the variant in cart data.
- Run existing backend tests and frontend build.
- Manually verify a floor drain and a non-floor-drain product through product page, cart, checkout, and admin order detail.
