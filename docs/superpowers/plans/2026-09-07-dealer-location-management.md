# Dealer Location Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add seeded dealer locations with a no-key map on the public stockists page and full administrator CRUD using the existing AURIUS UI and API conventions.

**Architecture:** Store locations in a dedicated Prisma `DealerLocation` table. Expose a public enabled-only endpoint and administrator CRUD endpoints protected by the existing auth middleware, validation, response, and audit helpers. Keep the current stockists interaction, replacing only its data source and map embed; add a focused admin page using existing panel, form, table, alert, and button styles.

**Tech Stack:** Prisma 6, SQLite, Express, TypeScript, React 18, React Router, Vite, Vitest, Supertest, OpenStreetMap embed.

## Global Constraints

- Use the existing React, Express, Prisma, Vitest, and project CSS conventions.
- Do not add a new frontend library, map SDK, or API-key requirement.
- Use OpenStreetMap embeds based on stored latitude and longitude.
- Only `active` locations are returned publicly.
- Required fields are `name`, `address`, `latitude`, and `longitude`; latitude must be `-90..90`, longitude `-180..180`.
- All administrator writes require the existing `requireAuth` and `requireAdmin` middleware.
- Keep the legacy Settings fields unchanged; dealer locations get their own admin page.
- Add Australian demo locations for Sydney, Melbourne, Brisbane, and Perth.

---

### Task 1: Add the dealer-location data model and seed data

**Files:**
- Modify: `database/schema/schema.prisma`
- Create: `database/schema/migrations/20260907090000_dealer_locations/migration.sql`
- Modify: `database/seeds/seed.ts`
- Test: `backend/tests/marketplace-overhaul.test.ts`

**Interfaces:**
- Produces Prisma model `DealerLocation` with fields `id`, `name`, `phone`, `address`, `city`, `state`, `latitude`, `longitude`, `photos`, `note`, `active`, `createdAt`, and `updatedAt`.
- Produces seeded rows readable through `prisma.dealerLocation`.

- [ ] **Step 1: Write the failing test**

Add a test that creates a `DealerLocation` row with coordinates, reads it back, and verifies the seed-facing fields are available:

```ts
it('stores dealer locations with map coordinates and active status', async () => {
  const location = await prisma.dealerLocation.create({
    data: {
      name: 'Sydney Test Showroom',
      phone: '+61 2 9000 0000',
      address: '1 George Street',
      city: 'Sydney',
      state: 'NSW',
      latitude: -33.8688,
      longitude: 151.2093,
      photos: JSON.stringify([]),
      note: 'Test showroom',
      active: true,
    },
  });

  expect(location.latitude).toBe(-33.8688);
  expect(location.longitude).toBe(151.2093);
  expect(location.active).toBe(true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
cd F:\zky\Aurius\AURIUS
npm.cmd test --workspace backend -- marketplace-overhaul.test.ts
```

Expected: FAIL because `prisma.dealerLocation` does not exist before the schema is added.

- [ ] **Step 3: Add the Prisma model and migration**

Add the model near the existing `SystemSetting` model:

```prisma
model DealerLocation {
  id        Int      @id @default(autoincrement())
  name      String
  phone     String?
  address   String
  city      String?
  state     String?
  latitude  Float
  longitude Float
  photos    String   @default("[]")
  note      String?
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

Create the matching SQLite migration with a `DealerLocation` table and indexes only if required by the generated Prisma migration. Regenerate the Prisma client using the existing backend Prisma script.

- [ ] **Step 4: Add four deterministic seed locations**

In `database/seeds/seed.ts`, clear existing dealer locations with the other development content and create:

```ts
const dealerLocations = [
  { name: 'AURIUS Sydney Showroom', phone: '+61 2 8000 1001', address: '1 George Street', city: 'Sydney', state: 'NSW', latitude: -33.8688, longitude: 151.2093, note: 'Smart toilet and whole-house filtration display.', active: true },
  { name: 'AURIUS Melbourne Showroom', phone: '+61 3 8000 1002', address: '123 Collins Street', city: 'Melbourne', state: 'VIC', latitude: -37.8136, longitude: 144.9631, note: 'By appointment for product demonstrations.', active: true },
  { name: 'AURIUS Brisbane Stockist', phone: '+61 7 3000 1003', address: '80 Ann Street', city: 'Brisbane', state: 'QLD', latitude: -27.4698, longitude: 153.0251, note: 'Bathroom and water filtration product display.', active: true },
  { name: 'AURIUS Perth Stockist', phone: '+61 8 6000 1004', address: '55 St Georges Terrace', city: 'Perth', state: 'WA', latitude: -31.9505, longitude: 115.8605, note: 'Local showroom support.', active: true },
].map((location) => ({ ...location, photos: JSON.stringify([]) }));
```

Create them with `prisma.dealerLocation.createMany({ data: dealerLocations })` after the existing cleanup.

- [ ] **Step 5: Run the focused test to verify it passes**

Run:

```powershell
npm.cmd test --workspace backend -- marketplace-overhaul.test.ts
```

Expected: the new model test and all existing focused tests pass.

- [ ] **Step 6: Run the seed and verify row count**

Run:

```powershell
npm.cmd run seed --workspace backend
```

Expected: seed completes and creates four dealer-location rows in the development database.

### Task 2: Add validated public and admin dealer-location APIs

**Files:**
- Create: `backend/src/validators/dealerLocation.schema.ts`
- Create: `backend/src/controllers/dealerLocationController.ts`
- Modify: `backend/src/routes/public.routes.ts`
- Modify: `backend/src/routes/index.ts`
- Modify: `backend/tests/marketplace-overhaul.test.ts`

**Interfaces:**
- `GET /api/dealers` returns `{ data: DealerLocation[] }` with active rows only.
- `GET /api/admin/dealers` returns all rows.
- `POST /api/admin/dealers` accepts validated dealer fields and returns the created row.
- `PUT /api/admin/dealers/:id` accepts validated dealer fields and returns the updated row.
- `DELETE /api/admin/dealers/:id` deletes the row and returns the existing empty success envelope.

- [ ] **Step 1: Write failing API tests**

Add tests covering public filtering, admin CRUD, and access control:

```ts
it('returns active dealer locations publicly and hides inactive locations', async () => {
  await prisma.dealerLocation.createMany({
    data: [
      { name: 'Public Dealer', address: '1 Main St', latitude: -33, longitude: 151, photos: '[]', active: true },
      { name: 'Hidden Dealer', address: '2 Main St', latitude: -34, longitude: 152, photos: '[]', active: false },
    ],
  });

  const response = await request(app).get('/api/dealers');

  expect(response.status).toBe(200);
  expect(response.body.data.map((item: { name: string }) => item.name)).toContain('Public Dealer');
  expect(response.body.data.map((item: { name: string }) => item.name)).not.toContain('Hidden Dealer');
});

it('allows an administrator to create, update, list, and delete dealer locations', async () => {
  const adminEmail = `dealer-admin-${Date.now()}@test.com.au`;
  await createUser(adminEmail, 'ADMIN');
  const admin = await loginAgent(app, adminEmail);
  const payload = {
    name: 'CRUD Dealer',
    phone: '+61 2 9000 0000',
    address: '10 Test Street',
    city: 'Sydney',
    state: 'NSW',
    latitude: -33.8688,
    longitude: 151.2093,
    photos: [],
    note: 'Initial note',
    active: true,
  };

  const created = await request(app).post('/api/admin/dealers').set('Authorization', `Bearer ${admin.token}`).send(payload);
  expect(created.status).toBe(201);

  const id = created.body.data.id;
  const updated = await request(app).put(`/api/admin/dealers/${id}`).set('Authorization', `Bearer ${admin.token}`).send({ ...payload, name: 'Updated Dealer', active: false });
  expect(updated.status).toBe(200);
  expect(updated.body.data.name).toBe('Updated Dealer');
  expect(updated.body.data.active).toBe(false);

  const listed = await request(app).get('/api/admin/dealers').set('Authorization', `Bearer ${admin.token}`);
  expect(listed.body.data.some((item: { id: number }) => item.id === id)).toBe(true);

  const deleted = await request(app).delete(`/api/admin/dealers/${id}`).set('Authorization', `Bearer ${admin.token}`);
  expect(deleted.status).toBe(200);
  expect(await prisma.dealerLocation.findUnique({ where: { id } })).toBeNull();
});

it('denies dealer-location administration to anonymous users and non-admin members', async () => {
  const publicResponse = await request(app).get('/api/admin/dealers');
  expect(publicResponse.status).toBe(401);

  const memberEmail = `dealer-member-${Date.now()}@test.com.au`;
  await createUser(memberEmail, 'SUB_DEALER');
  const member = await loginAgent(app, memberEmail);
  const response = await request(app).post('/api/admin/dealers').set('Authorization', `Bearer ${member.token}`).send({
    name: 'Denied Dealer',
    address: '1 Test St',
    latitude: -33,
    longitude: 151,
  });
  expect(response.status).toBe(403);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```powershell
npm.cmd test --workspace backend -- marketplace-overhaul.test.ts
```

Expected: FAIL with missing routes/controllers.

- [ ] **Step 3: Add request validation**

Define a Zod schema with optional `phone`, `city`, `state`, `photos`, and `note`; require `name`, `address`, `latitude`, and `longitude`; constrain coordinates; default `photos` to an empty array and `active` to `true`. Use a shared create/update shape so both routes reject invalid coordinates and non-array photos.

- [ ] **Step 4: Implement controller serialization and CRUD**

Implement controller helpers that parse `photos` JSON into arrays for responses and stringify arrays for Prisma writes. Return locations ordered by `state`, then `name`; public queries add `active: true`. Use `notFound`, `badRequest`, `ok`, `created`, and `audit` from existing helpers. Record create, update, and delete actions with target type `DealerLocation`.

- [ ] **Step 5: Register routes**

Register `GET /dealers` in `public.routes.ts`. Register the four admin routes in `routes/index.ts` with `requireAuth`, `requireAdmin`, and `validate` on create/update.

- [ ] **Step 6: Run backend tests**

Run:

```powershell
npm.cmd test --workspace backend -- marketplace-overhaul.test.ts
```

Expected: all dealer API tests and existing marketplace tests pass.

### Task 3: Switch the public stockists page to OpenStreetMap

**Files:**
- Modify: `frontend/src/pages/public/Stockists.tsx`
- Modify: `frontend/src/api/types.ts`
- Modify: `frontend/src/assets/styles/pages-public.css`
- Modify: `frontend/tests/public-assets.test.mjs`

**Interfaces:**
- `Stockists.tsx` fetches `/api/dealers`.
- The map iframe URL contains `https://www.openstreetmap.org/export/embed.html` and a bounding box/marker derived from the selected location coordinates.
- No `googleMapsApiKey` or Google Maps configuration is required for stockist rendering.

- [ ] **Step 1: Write failing frontend source tests**

Add assertions that the public page uses `/api/dealers`, contains the OpenStreetMap embed URL, and does not gate the map on a Google Maps API key:

```js
test('stockists uses the no-key dealer endpoint and OpenStreetMap embed', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../src/pages/public/Stockists.tsx', import.meta.url), 'utf8');
  assert.match(source, /api\.get<DealerLocation\[\]>\('\/api\/dealers'\)/);
  assert.match(source, /openstreetmap\.org\/export\/embed\.html/);
  assert.doesNotMatch(source, /googleMapsApiKey/);
});
```

- [ ] **Step 2: Run the frontend test to verify it fails**

Run:

```powershell
cd F:\zky\Aurius\AURIUS
node --test frontend/tests/public-assets.test.mjs
```

Expected: FAIL because the current page still reads `/api/site-content` and builds a Google Maps URL.

- [ ] **Step 3: Update the frontend type**

Change `DealerLocation` to use required numeric `latitude` and `longitude` fields matching the backend response. Keep compatibility aliases only if existing callers require them; do not keep `mapQuery` as the map source.

- [ ] **Step 4: Update the stockists data flow and map URL**

Fetch `DealerLocation[]` from `/api/dealers`, set the first returned location active, and build an OpenStreetMap embed URL with a small coordinate bounding box plus `marker=lat,lng`. Keep the existing dealer list, selected detail, photos, note, empty state, and project button styles. Use the existing `api` client and loading/error conventions.

- [ ] **Step 5: Keep the current responsive styling**

Reuse the existing `.stockists-layout`, `.stockists-list`, `.stockists-detail`, and iframe styles. Add only a focused iframe/accessibility adjustment if required; do not introduce a new visual system.

- [ ] **Step 6: Run frontend tests and build**

Run:

```powershell
node --test frontend/tests/public-assets.test.mjs
npm.cmd run build --workspace frontend
```

Expected: frontend tests pass and Vite/TypeScript build exits successfully.

### Task 4: Add the dedicated admin dealer-location page

**Files:**
- Create: `frontend/src/pages/admin/DealerLocations.tsx`
- Modify: `frontend/src/layouts/AdminLayout.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/api/types.ts`
- Modify: `frontend/src/assets/styles/pages-admin.css`
- Modify: `frontend/tests/public-assets.test.mjs`

**Interfaces:**
- The admin page uses `GET /api/admin/dealers`, `POST /api/admin/dealers`, `PUT /api/admin/dealers/:id`, and `DELETE /api/admin/dealers/:id`.
- The page exposes the existing admin navigation and route conventions.

- [ ] **Step 1: Write failing frontend source tests**

Add assertions for the page file, route, navigation label/path, CRUD endpoint strings, delete confirmation, active control, and map coordinate fields.

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
node --test frontend/tests/public-assets.test.mjs
```

Expected: FAIL because the dedicated page and route do not exist.

- [ ] **Step 3: Implement the admin page**

Create a page with:

- a compact existing-style table/list showing name, city/state, address, coordinates, and active status;
- Add, Edit, Save, Cancel, and Delete actions using existing button classes;
- a form containing name, phone, address, city, state, latitude, longitude, photos, note, and active;
- success/error `Alert` feedback;
- `window.confirm` before deletion;
- refresh after create/update/delete.

Keep all fields within the existing admin layout and avoid nested card styling.

- [ ] **Step 4: Register navigation and route**

Add an admin menu item pointing to `/admin/dealers` and a lazy or direct route in `App.tsx`, following current `AdminLayout` and route naming patterns.

- [ ] **Step 5: Remove the legacy Settings editor**

Remove only the dealer-location state, form block, and payload entry from `frontend/src/pages/admin/Settings.tsx`. Leave bank, shipping, contact, and homepage media settings unchanged.

- [ ] **Step 6: Run frontend tests and build**

Run:

```powershell
node --test frontend/tests/public-assets.test.mjs
npm.cmd run build --workspace frontend
```

Expected: all frontend source tests pass and the build succeeds.

### Task 5: Verify seed, API, UI build, and regression behavior

**Files:**
- Modify: `README.md` or `docs/api.md` only if the new endpoints are not already documented.
- Test: `backend/tests/marketplace-overhaul.test.ts`
- Test: `frontend/tests/public-assets.test.mjs`

- [ ] **Step 1: Run all backend tests**

Run:

```powershell
npm.cmd test --workspace backend
```

Expected: zero failed tests.

- [ ] **Step 2: Run all frontend source tests**

Run:

```powershell
node --test frontend/tests/*.test.mjs
```

Expected: zero failed tests.

- [ ] **Step 3: Build the whole project**

Run:

```powershell
npm.cmd run build
```

Expected: backend TypeScript compilation and frontend Vite build both succeed.

- [ ] **Step 4: Verify the seeded public endpoint**

Start the existing backend using the project script, then request:

```powershell
Invoke-RestMethod http://localhost:4000/api/dealers
```

Expected: four enabled Australian demo locations are returned, each with numeric coordinates and a photos array.

- [ ] **Step 5: Verify the UI manually**

Open `/stockists` and confirm the list contains four locations, selecting a location changes the detail and map marker, and the map is visible without `GOOGLE_MAPS_API_KEY`. Open the admin dealer page, create one row, edit it, deactivate it, confirm it disappears from `/stockists`, then delete it and confirm it is gone from the admin list.

- [ ] **Step 6: Document the new admin workflow**

Add a short API/admin note to `docs/api.md` if needed, including the public endpoint, admin CRUD endpoints, and the fact that map display uses OpenStreetMap without an API key.
