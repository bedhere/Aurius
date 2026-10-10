# Dealer Location Management Design

## Goal

Replace the editable `DEALER_LOCATIONS` system-setting array with a dedicated
dealer-location feature. Administrators can create, list, edit, delete, and
enable or disable locations. The public stockists page renders enabled
locations with a no-key OpenStreetMap embed.

## Scope

- Add a Prisma `DealerLocation` model and migration.
- Seed representative enabled locations in Sydney, Melbourne, Brisbane, and
  Perth.
- Add administrator-only list, create, update, and delete endpoints.
- Replace the dealer-location section of the existing Settings page with a
  dedicated admin page linked through the existing admin navigation pattern.
- Keep the existing public `/stockists` layout and card/detail interaction,
  but source its locations from a public API and use OpenStreetMap instead of
  Google Maps.
- Preserve the project’s existing panel, table, form-grid, button, alert, and
  confirmation-dialog conventions. No new frontend libraries or map SDKs are
  introduced.

## Data Model

Each location stores:

- `id`
- `name`
- `phone`
- `address`
- `city`
- `state`
- `latitude` and `longitude`
- `photos` as a JSON array of existing uploaded-image paths or URLs
- `note`
- `active`
- creation and update timestamps

`name`, `address`, `latitude`, and `longitude` are required. `active` defaults
to `true`; inactive locations remain visible to administrators but are omitted
from public responses.

## API Design

Public:

- `GET /api/dealers` returns enabled locations only, ordered by state and name.

Administrator-only:

- `GET /api/admin/dealers` returns all locations.
- `POST /api/admin/dealers` creates a location.
- `PUT /api/admin/dealers/:id` updates a location.
- `DELETE /api/admin/dealers/:id` deletes a location.

All writes use the existing admin authentication middleware, input validation,
standard JSON response envelope, and audit logging style.

## Public Experience

The current stockists page continues to present a selectable dealer list and a
detail area with phone, address, notes, and optional images. The selected
location’s map is an OpenStreetMap embed built from its coordinates, so it
works without `GOOGLE_MAPS_API_KEY`.

When there are no enabled locations, the existing empty-state treatment remains
in place. Invalid or missing map coordinates are prevented by server-side
validation and marked as field errors in the admin form.

## Admin Experience

The admin navigation gains a dedicated dealer-locations entry. Its page follows
the project’s existing operations UI:

- a compact table for scanning locations and their active status;
- an Add Dealer action;
- a form/modal-style editor using existing field and panel classes;
- Edit and Delete actions per row;
- a confirmation step before deletion;
- visible success and error feedback after each request.

The legacy dealer-locations block is removed from Settings so there is a single
source of truth. Other Settings fields remain unchanged.

## Seed Data

The development seed creates four enabled showroom-style test locations with
realistic Australian addresses and coordinates:

- Sydney, NSW
- Melbourne, VIC
- Brisbane, QLD
- Perth, WA

Photos use existing local assets where appropriate; missing imagery does not
block the map or contact details.

## Testing

Backend integration tests cover:

- admin CRUD for dealer locations;
- unauthenticated and non-admin write denial;
- public endpoint filtering of inactive locations;
- validation of required fields and valid latitude/longitude ranges.

Frontend source-level tests cover:

- stockists fetching the new public endpoint;
- no-key OpenStreetMap embed URL construction;
- dedicated admin dealer page and navigation registration.

## Migration

Existing values stored in `SystemSetting.DEALER_LOCATIONS` are not read by the
new runtime path. The development seed supplies the new test locations.
Production migration/import of prior JSON data is deliberately excluded from
this request because no deployed location dataset was provided.
