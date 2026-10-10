# Floor Drain Product Replacement Design

## Goal

Replace the placeholder engineering floor-drain product with the supplied `S-T12115L115FZ-80` product while preserving the existing interactive finish-selection and live-preview experience.

## Product Data

- Product code: retain `AUR-FD-01` so existing category, cart, and order logic continues to recognize the product.
- SKU/model: `S-T12115L115FZ-80`.
- Name: `AURIUS S-T12115L115FZ-80 Floor Drain`.
- Category: retain `Engineering Custom Floor Drain`.
- Size: fixed at `115 × 115 mm`.
- Outlet: `Ø80 mm`.
- Material: `SUS304`.
- Advertised material thickness: `1.2 mm`, following the product information workbook. The drawing's local `1.5 mm` annotation will not be presented as the overall material thickness.
- Temporary base dealer price: `A$189`.
- Temporary recommended retail price: `A$299`.
- Temporary stock: `20` units per finish.
- Finish variants have no price adjustment.

## Finish Variants and Images

The product has five real variants. Each finish maps directly to its supplied photograph:

| Finish key | English name | Chinese name | Source image |
| --- | --- | --- | --- |
| `brushedSteel` | Brushed stainless steel | 拉丝不锈钢 | `S-T12115L115FZ-80拉丝.jpg` |
| `gold` | Brushed gold | 拉丝金 | `S-T12115L115FZ-80拉丝金.jpg` |
| `roseGold` | Brushed rose gold | 拉丝玫瑰金 | `S-T12115L115FZ-80拉丝玫瑰金.jpg` |
| `gunmetal` | Gunmetal | 枪灰 | `S-T12115L115FZ-80枪灰.jpg` |
| `matteBlack` | Matte black | 哑黑 | `S-T12115L115FZ-80哑黑.jpg` |

The images will be copied into the application's product-upload asset directory under stable ASCII filenames. macOS metadata files and `.DS_Store` will not be copied.

## Detail Page Experience

- Keep the existing floor-drain-specific configurator and finish buttons.
- Remove the fabricated length selector and the CSS-drawn drain preview.
- Show the fixed product dimensions and material specification as product information.
- Selecting a finish updates the main product image and the configurator preview to the matching real photograph.
- The selected finish resolves to a real product variant before the item is added to the cart.
- Existing category navigation and engineering-floor-drain recognition remain intact.

## Data Flow

The seed defines the five finish variants and their image paths. The product API returns the product images and variant attributes. The detail page derives available finishes from those variants, selects the first available finish initially, and changes the displayed photograph when the selection changes. Cart submission includes the selected variant ID.

## Compatibility and Error Handling

- Retaining `AUR-FD-01`, the category, and the engineering display style preserves current backend special handling.
- If a variant image is absent, the detail page falls back to the product's primary image.
- If no matching variant exists, add-to-cart remains disabled or reports the existing variant-selection error rather than submitting an incorrect product.
- Existing non-floor-drain product behavior must remain unchanged.

## Verification

- Seed-level tests confirm exactly five finishes and one fixed size.
- Frontend tests confirm finish selection resolves a variant and switches the displayed image.
- Build and relevant automated tests pass.
- Manual verification covers the product list card, initial detail image, all five finish selections, fixed specifications, and selected variant in the cart.

## Scope

This change replaces only the existing floor-drain product and its detail-page presentation. It does not redesign other product pages, add new pricing rules, or change the engineering-order policy.
