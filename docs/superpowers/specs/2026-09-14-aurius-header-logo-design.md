# AURIUS Header Logo Design

## Goal

Replace the public website header's separately rendered wordmark and translated tagline with one accurate, fixed SVG brand lockup based on `AURIUS网站(1)22(2).svg`.

## Scope

- Include the teal `AURIUS®` wordmark and the dark gray `SMART TOILET | WHOLE HOUSE WATER FILTRATION` tagline in one SVG image.
- Preserve the reference SVG's original vector paths, proportions, registered-mark placement, tagline lettering, and colours.
- Use a transparent background and a tightly fitted `viewBox` with enough padding to prevent clipping.
- Store the optimized result as the existing public frontend brand asset `aurius-logo.svg`.
- Render the complete lockup as one accessible header image and remove the separate translated tagline HTML.
- Language switching must not change the tagline embedded in the image.
- Adjust header CSS so the SVG matches the design at desktop sizes and scales cleanly on smaller screens.
- Align the visible left edge of the complete brand lockup (wordmark and fixed English tagline) with the homepage poster's left edge at every viewport width.

## Implementation Design

The complete vector lockup will be taken from `AURIUS网站(1)22(2).svg`. Its oversized CorelDRAW canvas will be tightened around the existing teal wordmark paths and dark gray tagline paths with safe padding. The shapes will remain vector paths with no rasterisation or font dependency.

`Header.tsx` will render the SVG through one `<img>` element with a descriptive `alt` value. The separate `.brand__text` and `.brand__tag` elements will be removed. Existing navigation, language controls, and links will remain unchanged. CSS will size the complete image by width while preserving its intrinsic aspect ratio.

The homepage poster uses `85.57%` of the viewport width, producing a symmetric `7.215%` outer margin. The header brand block will use the same responsive left offset independently of the navigation and right-side actions. At desktop widths, the offset will compensate for the header's existing fixed `75px` padding; under the `900px` breakpoint, it will use the `7.215vw` offset directly because the header padding becomes zero.

## Verification

- Confirm the SVG contains both teal and dark gray vector geometry and no embedded bitmap or text element.
- Render the standalone SVG and visually compare both rows with `AURIUS网站(1)22(2).svg`.
- Run the frontend asset and layout tests.
- Build the frontend and inspect the header at desktop and mobile widths for clipping, distortion, or layout regressions.
- At desktop and mobile widths, compare the brand block and poster bounding rectangles and require their left edges to differ by no more than 2 CSS pixels.
- Switch between English and Chinese and confirm the embedded English tagline does not change.

## Non-goals

- Footer, admin, and member-area branding are not changed.
- No manual redrawing, substitute font, or raster image is used.
