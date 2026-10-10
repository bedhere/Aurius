# Dealer Showroom Seed Data Design

## Goal

Expand the development dealer-location seed so the public Stockists page has
enough realistic Australian dealer examples to exercise scrolling, selection,
map updates, notes, and showroom-image rendering.

## Scope

- Replace the four generic seed locations with eight active, clearly fictional
  AURIUS dealer records across NSW, VIC, QLD, SA, and WA.
- Give every record a phone number, address, city, state, latitude, longitude,
  concise showroom note, and one showroom image.
- Download six externally sourced Australian bathroom-showroom photos into
  `uploads/dealers/` and reference only local `/uploads/dealers/...` paths
  from seeded data.
- Add a focused automated source-level test that guards the expected seed
  count, local image paths, and geographic coverage.

## Non-Goals

- Do not add a dealer-type database field, filter, or presentation change.
- Do not modify the public Stockists component, routes, API, Prisma schema, or
  admin dealer-management UI.
- Do not use real retailer names, telephone numbers, or addresses as AURIUS
  dealer records.
- Do not hotlink third-party images from the public site.

## Seed Records

The seed will create these active records:

| Name | City / State | Use in testing |
| --- | --- | --- |
| AURIUS Sydney Bathroom Gallery | Sydney, NSW | CBD showroom selection and map |
| AURIUS Western Sydney Bathroom Supplies | Parramatta, NSW | second NSW list item |
| AURIUS Northern Beaches Bathroom Centre | Brookvale, NSW | long multi-word store name |
| AURIUS Melbourne Bathroom Gallery | Richmond, VIC | southern-state selection |
| AURIUS Brisbane Bathroom & Plumbing Supplies | Bowen Hills, QLD | Queensland selection |
| AURIUS Gold Coast Bathroom Centre | Southport, QLD | second Queensland list item |
| AURIUS Adelaide Bathroom Studio | Adelaide, SA | South Australia selection |
| AURIUS Perth Bathroom Warehouse | Osborne Park, WA | Western Australia selection |

All phone numbers, street addresses, and coordinates are deterministic
fictional demo values positioned in their named metropolitan areas.

## Images

Six local image files will be added under `uploads/dealers/`. They will be
downloaded from publicly available Australian showroom pages and renamed for
their intended test use:

- `nsw-inspire-bathrooms-exterior.jpg`
- `nsw-bidet-showroom.jpg`
- `nsw-brookvale-showroom.jpg`
- `qld-bathroom-showroom.jpg`
- `qld-trade-showroom.jpg`
- `sa-toilet-showroom.jpg`

Some image files will be shared by more than one fictional seed record. This
keeps the test fixture compact while ensuring that every location supplies a
photo and the page can exercise the image-detail path.

The image files are development-only visual fixtures. The seed references
local URLs so the application does not depend on a third-party image host at
runtime.

## Data Flow

`database/seeds/seed.ts` clears `DealerLocation` rows before inserting the
eight records. Each record serializes its single local image path as the
existing `photos` JSON array. The public `GET /api/dealers` endpoint already
returns this field as an array, and `Stockists.tsx` already renders the first
photo in the selected location detail panel.

## Testing

Add a test in `frontend/tests/public-assets.test.mjs` that reads the seed
source and verifies:

- the eight named records are present;
- every dealer image path is under `/uploads/dealers/`;
- locations cover NSW, VIC, QLD, SA, and WA;
- the previous generic seed names are absent.

Run the focused Node test, the full frontend source-level test suite, the
backend dealer integration test file, and production builds for both
workspaces. Run the development seed afterward to confirm the local images
and eight public dealer records are available.

## Constraints

- No dependencies, migrations, schema changes, API changes, or UI changes.
- Preserve the current seed cleanup and `photos: JSON.stringify(...)` pattern.
- Keep all fixture names and data deterministic.
- External image source pages are used only to collect development fixtures;
  the final seeded application references local files.
