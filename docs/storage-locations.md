# Storage locations

> How the Products module tracks *where inside a warehouse* stock sits.
> Cloned from jurnal-frontend-app's `src/scm/pages/warehouse/*`.
> See also [`patterns/Drawer.md`](./patterns/Drawer.md), [`patterns/form-page-format.md`](./patterns/form-page-format.md).

A warehouse can be one undivided space, or it can be divided into named places —
Rak A / Baris 1 / Bin 2. The second is what this feature is. It is three screens
and one switch, and they only make sense together:

| Screen | Route | What it decides |
| --- | --- | --- |
| Warehouse settings | `/products/warehouse/settings` | Whether the company uses locations at all, and the way into the type list |
| Location type management | `/products/warehouse/location-types` | The words a warehouse may call a level: Area, Rack, Bin |
| Set location / Pick from location | a drawer over the movement forms | Which locations a movement's quantity goes to, or comes from |

## The model

Four pieces in [`app/data/products.ts`](../app/data/products.ts):

- **`LocationType`** — a tenant-wide name (`Area`, `Rack`, `Bin`), capped at
  `MAX_LOCATION_TYPES` (20). Names are the identity: a second "Rack" would make
  the warehouse form's picker ambiguous, so `isLocationTypeNameTaken` guards it.
- **`Warehouse.storageLevels`** — the levels *this* warehouse has, in order,
  each naming one of those types and saying whether stock may be stored **at**
  that level (`isStoringPreference`). Level 1 contains level 2 contains level 3.
- **`StorageLocation`** — a place, nested by `parentId`, sitting at `level`.
  `getStorableLocations(warehouseId)` returns only the ones at a storing level:
  offering a Rack *and* the Bins inside it would let the same goods be counted
  twice.
- **`StorageStock`** — what one location holds of one product; the figure the
  pick list shows and the put-away adds to.

A movement's line carries **`LocationAllocation[]`** — `{ locationId, quantity }`
per location. An adjustment line has one list (`locations`); a transfer line has
two (`pickLocations` at the source, `storeLocations` at the destination),
because the two ends are different warehouses with different shelves.

## The switch, and why it can refuse

`isStorageLocationFeatureActive()` gates the whole thing: with it off, the
warehouse form loses its storage section, the warehouse page loses its Location
list tab, the Products **Actions** menu loses "Add new storage location", and
the movement forms lose their Location column. One flag, four screens — check it
rather than re-deriving "does this warehouse have locations" in each.

`setStorageLocationFeatureActive(false)` **returns `false` and changes nothing**
while any location still holds stock. Those quantities have nowhere to go, and
silently discarding them would lose a count someone took by hand. The settings
page shows a modal saying so, exactly as the source does.

## The allocation drawer

[`StorageQuantityDrawer.vue`](../app/components/products/StorageQuantityDrawer.vue)
is one component for both directions — the arithmetic is identical, and only
the title, the stock column and the "Pick all" shortcut differ:

- **The line's quantity is the target.** Rows must add up to it; the running
  `Total 40 / 40 Rim` turns red until they do, and `Done` refuses with
  "Total must be equal".
- **One row per location.** Two rows against the same shelf are two halves of a
  number nobody can read at a glance.
- **Pick mode also validates against the shelf** ("Qty exceeds stock") and
  offers **Pick all**, which fills the *shortfall* capped by what the location
  holds — not the whole shelf.
- **Changing the line's quantity clears its allocation.** The split was made to
  add up to the old number; leaving it would show a settled line that isn't.
- **Saving the movement moves the stock** (`applyLocationAllocations`), so the
  next pick list reads the new figures. A form that only recorded the intent
  would let the same 40 units be picked from the same bin forever.

## Where each screen is reached from

- **Warehouse settings** — the title-band button on the Products page's
  **Warehouses** segment (only there: they are warehouse settings).
- **Location type management** — from Warehouse settings, and from the caption
  under the warehouse form's level table. The form's "enter to add" creates a
  real type, so it appears on that screen too.
- **The drawer** — the Location column on the stock-adjustment and
  warehouse-transfer forms, which appears only when the feature is on *and* the
  warehouse in question has a storable location.

## Not ported

The source's per-line **route** for Store/Pick quantity (`/v3/warehouses/:id/store/:index`,
which round-trips through `localStorage`) — here it is a drawer over the form,
so the line being placed stays on screen. The source's sub-location detail page
and its batch-reminder settings are also out of scope.
