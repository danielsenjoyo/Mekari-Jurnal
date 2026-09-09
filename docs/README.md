# Mekari Jurnal — Documentation

Reference docs for building screens in the Mekari Jurnal prototype. Everything
here targets **Pixel 3 token mode 2.1** (`app/app.vue` → `setNextTheme(false)`)
and the `@mekari/pixel3` component library.

> **Before writing or editing any component**, call the Pixel MCP / `pixel-docs-jurnal`
> skill first. Never guess props, tokens, or icon names.

## Start here

| If you want to…                                 | Read                                                                                                                    |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Understand the app shell (header/sidebar/stage) | [`design.md`](./design.md)                                                                                              |
| Look up a raw token value                       | [`tokens.md`](./tokens.md)                                                                                              |
| Pick patterns for a kind of page                | [`patterns/page-recipes.md`](./patterns/page-recipes.md)                                                                |
| Build a list/index screen                       | [`patterns/index-page-format.md`](./patterns/index-page-format.md) + [`index-page-pattern.md`](./index-page-pattern.md) |
| Build a board (records as stages of a process)  | [`patterns/KanbanBoard.md`](./patterns/KanbanBoard.md)                                                                  |
| Build a single-record screen                    | [`patterns/details-page-format.md`](./patterns/details-page-format.md)                                                  |
| Build a create/edit form screen                 | [`patterns/form-page-format.md`](./patterns/form-page-format.md) + [`patterns/Form.md`](./patterns/Form.md)             |
| Work on the Home landing page                   | [`patterns/home-page-format.md`](./patterns/home-page-format.md)                                                        |
| Build a catalog page (tabs → grid of links)     | [`patterns/reports-index-format.md`](./patterns/reports-index-format.md)                                                |
| Build a report screen (range → run → totals)    | [`patterns/reports-page-format.md`](./patterns/reports-page-format.md)                                                  |
| Build a tenant-wide named-list management page  | [`patterns/VocabularyList.md`](./patterns/VocabularyList.md)                                                            |
| Work on warehouse storage locations             | [`storage-locations.md`](./storage-locations.md)                                                                        |

## Map

### Shell & tokens

- **[`design.md`](./design.md)** — the token layers (§0), then the app shell: `TheNavbar`, `TheSidebar` (+ `SidebarChild` submenu), and `DefaultPageContent` (title band + white stage); iconography; import discipline; styling rules.
- **[`tokens.md`](./tokens.md)** — raw Pixel 2.1 token values (colours, spacing, type, layout).

### Page construction — [`patterns/`](./patterns/)

Each file is one focused, copy-pasteable pattern. They link to the reference
implementation [`app/pages/templates/index-template.vue`](../app/pages/templates/index-template.vue).

**Recipes (what goes where)**

- [`page-recipes.md`](./patterns/page-recipes.md) — which patterns assemble which page type.
- [`index-page-format.md`](./patterns/index-page-format.md) — index/list page zone composition.
- [`KanbanBoard.md`](./patterns/KanbanBoard.md) — the board: a collection shown as stages of one process. When it beats a table, and the column/width/empty-state rules that make it readable (Fulfillment).
- [`details-page-format.md`](./patterns/details-page-format.md) — single-record page composition.
- [`form-page-format.md`](./patterns/form-page-format.md) — create/edit form page composition (+ the Purchase module page map).
- [`home-page-format.md`](./patterns/home-page-format.md) — the Home landing page: section stack, the no-PageTitle exception, what the port from production leaves out.
- [`reports-index-format.md`](./patterns/reports-index-format.md) — the catalog page: category tabs over a two-column grid of link cards (Reports).
- [`reports-page-format.md`](./patterns/reports-page-format.md) — the report screen: date range + criteria → run → table with a TOTAL row. How it differs from an index page, and why.

**Building blocks**

- [`page-title-bar.md`](./patterns/page-title-bar.md) — title + action row.
- [`Tabs.md`](./patterns/Tabs.md) — page-level vs. content tabs.
- [`SummaryBox.md`](./patterns/SummaryBox.md) — KPI strip.
- [`FilterBar.md`](./patterns/FilterBar.md) — quick filters + search.
- [`Drawer.md`](./patterns/Drawer.md) — right-side filter/form panel.
- [`TablePage.md`](./patterns/TablePage.md) — fixed-layout table, sticky header + Actions.
- [`BulkActionBar.md`](./patterns/BulkActionBar.md) — selection header swap.
- [`Pagination.md`](./patterns/Pagination.md) — rows-per-page + page-jump footer.
- [`StatusBadge.md`](./patterns/StatusBadge.md) — domain status → `MpBadge type`.
- [`BlankSlate.md`](./patterns/BlankSlate.md) — adaptive empty state.
- [`Form.md`](./patterns/Form.md) — `MpFormControl`-wrapped fields.
- [`Modal.md`](./patterns/Modal.md) — centred confirm/focused dialog.
- [`ImportExport.md`](./patterns/ImportExport.md) — file in / file out: the title-band menus, the three-step import modal, the export column picker, and the CSV helpers.
- [`VocabularyList.md`](./patterns/VocabularyList.md) — a tenant-wide list of names other records pick from (location types, product categories, product units): inline row states, usage-gated delete, and the "one array, two surfaces" rule.

### Deep reference

- **[`index-page-pattern.md`](./index-page-pattern.md)** — the exhaustive index-page reference (full rationale, state-model table, component gotchas, changelog). The `patterns/` files are the focused extract; this is the long form.
- **[`storage-locations.md`](./storage-locations.md)** — the Products module's storage-location feature: the company switch, the location-type list, and the Set location / Pick from location drawer that splits a movement across shelves.

### Compliance gate

Three checks run on `git push` (husky `pre-push`) and on every PR to `main`
(`.github/workflows/ci.yml`): **`pnpm lint`**, **`pnpm typecheck`**
(`nuxt typecheck`), and Pixel Police. Typecheck earns its place because eslint
cannot see what it sees — none of the sixteen type errors this repo carried
until they were cleared were lint errors.

- **`scripts/pixel-police.sh`** — Pixel Police: the mechanical rules below, checked on the **added
  lines** of changed `.vue` files — commits since the base **and the working tree**, including
  untracked files, so uncommitted work is checked too. Runs on `git push` (husky `pre-push`) and on
  every PR to `main`. Run it yourself with `bash scripts/pixel-police.sh`.
- **[`.agents/skills/pixel-police/references/rules.md`](../.agents/skills/pixel-police/references/rules.md)** —
  the full rule list: the 7 the script enforces (with their whitelisted exceptions) and the
  reviewer-only ones it can't see. Adding a rule? That file says how.

## Conventions

- **Token mode 2.1.** All styling — shell and page body alike — uses Panda **`css()`** with Pixel token shorthands (`gap: 4`, `bg: "gray.25"`, `rounded: "md"`). The only other layer is the 10 project-local variables in `app/assets/css/tokens.css` (`--layout-*`, `--motion-*`, `--border-radius-full`) for what Pixel doesn't ship. See [`design.md` §0](./design.md). There is no `--color-*` / `--spacing-*` layer — that namespace belonged to the pre-Nuxt static preview.
- **No inline `style`**, no `<style>` blocks in pages — `css()` only. Raw `var(--mp-*)` is allowed inside `css()` values only for hairline borders/shadows a shorthand can't express.
- **Living docs.** When a pattern changes, update its `patterns/` file (and `index-page-pattern.md` if it's the index page) in the same change.
