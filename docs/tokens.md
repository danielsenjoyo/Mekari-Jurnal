# Mekari Jurnal — Design Tokens (Pixel 3 v2.1)

> Living document. Pair with [`design.md`](./design.md) — that file owns the
> rules, this file owns the values.

**Source of truth:** `@mekari/pixel3-styled-system` v2.1 ships the `--mp-*`
CSS variable namespace at runtime (auto-injected by `@mekari/pixel3-nuxt`).
**Components must consume `--mp-*` directly** — do not duplicate or alias
them in this project.

**Mode:** Pixel 3 — v2.1 (`setNextTheme(false)` in [`app/app.vue`](../app/app.vue)).
Do not import v2.4 tokens.

---

## 1. How to use tokens

Styling goes through Panda `css()` — there are no `<style>` blocks in this
codebase. Prefer the shorthand aliases, which resolve to `--mp-*` underneath:

```ts
const cardClass = css({
  bg: "white", // → var(--mp-colors-white)
  color: "dark", // → var(--mp-colors-dark)
  p: 4, // → var(--mp-spacing-4)
  rounded: "lg", // → var(--mp-radii-lg)
  shadow: "sm" // → var(--mp-shadows-sm)
});
```

Drop to a raw `var(--mp-*)` only where no shorthand expresses the value:

```ts
const railClass = css({
  width: "var(--layout-sidebar-width)", // project-local layout primitive
  transitionTimingFunction: "var(--motion-ease-in-out)" // Pixel ships no easing token
});
```

**Rules**

1. Always reach for a `--mp-*` variable (or its Panda alias) — never a raw
   hex code or px literal.
2. Prefer Pixel component CSS Props (`gap`, `padding`, `align`) over custom
   margins on `MpFlex`, `MpScrollbar`, `MpSkeleton`.
3. If you need a value Pixel doesn't ship, propose adding it under
   [`assets/css/tokens.css`](../app/assets/css/tokens.css) — the small
   project-local layer documented in §10 below — and update this file.

---

## 2. Color (`--mp-colors-*`)

### Brand

| Token                          | Value     | Used for                        |
| ------------------------------ | --------- | ------------------------------- |
| `--mp-colors-brand-jurnal`     | `#40C3FF` | Jurnal mark                     |
| `--mp-colors-brand-university` | `#448AFF` | Cross-product University accent |
| `--mp-colors-brand-talenta`    | `#F22929` | Cross-product Talenta accent    |
| `--mp-colors-brand-mekari`     | `#651FFF` | Mekari corporate                |

(Full brand palette: capital, esign, expense, flex, jurnal, klikpajak,
mekari, qontak, talenta, university.)

### Blue scale

| Token                  | Value     | Used for                                        |
| ---------------------- | --------- | ----------------------------------------------- |
| `--mp-colors-blue-50`  | `#EAECFB` | Selected-nav row background (sidebar + submenu) |
| `--mp-colors-blue-100` | `#D5DEFF` | Focus ring                                      |
| `--mp-colors-blue-400` | `#4B61DD` | Primary action; submenu heading label           |
| `--mp-colors-blue-500` | `#1C44D5` | Active text/icon on selected-nav rows           |
| `--mp-colors-blue-700` | `#0031BE` | Pressed primary                                 |

### Neutral / Gray scale

| Token                  | Value     | Used for                                  |
| ---------------------- | --------- | ----------------------------------------- |
| `--mp-colors-white`    | `#FFFFFF` | Page card, modal background, on-dark text |
| `--mp-colors-gray-25`  | `#F8F9FB` | Popover headers, inset cards              |
| `--mp-colors-gray-50`  | `#EDF0F2` | Muted chip, icon-button hover             |
| `--mp-colors-gray-100` | `#D0D6DD` | Default border, divider                   |
| `--mp-colors-gray-400` | `#8B95A5` | Placeholder text, subtle icons            |
| `--mp-colors-gray-600` | `#626B79` | Secondary text                            |
| `--mp-colors-dark`     | `#232933` | Primary text                              |

> Pixel v2.1 only exposes gray-{25,50,100,400,600} + dark. There is no
> gray-{200,300,500,700,800,900} in the v2.1 surface — adapt designs accordingly.

### Status / Chart

| Token                    | Value     | Used for                   |
| ------------------------ | --------- | -------------------------- |
| `--mp-colors-rose-400`   | `#EF4444` | Notification badge, errors |
| `--mp-colors-green-400`  | `#68BE79` | Success                    |
| `--mp-colors-orange-400` | `#E0AB00` | Warnings                   |
| `--mp-colors-red-400`    | `#DA473F` | Destructive (Pixel "red")  |

### Surface

| Token                    | Value                | Used for                  |
| ------------------------ | -------------------- | ------------------------- |
| `--mp-colors-background` | `#F1F5F9`            | App shell page background |
| `--mp-colors-white`      | `#FFFFFF`            | Page stage, TheNavbar     |
| `--mp-colors-overlay`    | `rgba(22,26,32,0.8)` | Modal backdrop            |

---

## 3. Spacing (`--mp-spacing-*` — numeric scale, rem-based)

| Token               | Value      | Pixel | Typical use                           |
| ------------------- | ---------- | ----- | ------------------------------------- |
| `--mp-spacing-0`    | `0`        | 0px   | Reset                                 |
| `--mp-spacing-0\.5` | `0.125rem` | 2px   | Hairline gaps                         |
| `--mp-spacing-1`    | `0.25rem`  | 4px   | Inline icon-to-text gap, tight stacks |
| `--mp-spacing-1\.5` | `0.375rem` | 6px   | Sidebar item vertical padding, badges |
| `--mp-spacing-2`    | `0.5rem`   | 8px   | Default gap between adjacent controls |
| `--mp-spacing-3`    | `0.75rem`  | 12px  | Form field internal gap               |
| `--mp-spacing-4`    | `1rem`     | 16px  | Card padding, sidebar group padding   |
| `--mp-spacing-6`    | `1.5rem`   | 24px  | Page padding, primary card padding    |
| `--mp-spacing-8`    | `2rem`     | 32px  | Section spacing                       |
| `--mp-spacing-12`   | `3rem`     | 48px  | Hero / empty-state vertical padding   |
| `--mp-spacing-16`   | `4rem`     | 64px  | Page-level large gaps                 |

> **The scale has holes, and missing steps fail silently.** The table above is
> the whole scale: there is no `7`, `9`, `10`, `11`, `13`, `14` or `15`. Panda
> still emits the class for one — `css({ mt: 10 })` produces
> `.mp-mt_10 { margin-top: var(--mp-spacing-10) }` — but the variable is never
> defined, so the rule resolves to nothing and the element renders with **zero**
> margin. Nothing warns: not the type checker, not the linter, not the browser.
>
> This shipped: twelve call sites across the Products module used `mt: 10` for
> the gap above a form's commit row or a details page's related-records section,
> and every one of them had no gap at all until it was found by measuring the
> DOM. When a step you want isn't in the table, round to one that is (`8` = 32px,
> `12` = 48px) rather than assuming the number exists — or, for a genuine 40px,
> use `--mp-sizes-10` (`2.5rem`).

---

## 4. Border radius (`--mp-radii-*`)

| Token             | Value      | Pixel   | Use                            |
| ----------------- | ---------- | ------- | ------------------------------ |
| `--mp-radii-xs`   | `0.125rem` | 2px     | Tag chips                      |
| `--mp-radii-sm`   | `0.25rem`  | 4px     | Inline pills, tiny badges      |
| `--mp-radii-md`   | `0.375rem` | 6px     | Buttons, sidebar items         |
| `--mp-radii-lg`   | `0.5rem`   | 8px     | Cards, stat tiles              |
| `--mp-radii-xl`   | `0.75rem`  | 12px    | Modals, large cards            |
| `--mp-radii-full` | `50%`      | ellipse | **Circles only — see warning** |

> ⚠️ `--mp-radii-full: 50%` creates ellipses on non-square boxes. For
> stadium-shape pills (notification badge, SidebarChild expand pill), use the
> project-local [`--border-radius-full`](#10-project-local-layer) (`9999px`).

---

## 5. Border width (`--mp-borders-*`)

| Token             | Value   | Use                          |
| ----------------- | ------- | ---------------------------- |
| `--mp-borders-sm` | `1px`   | All hairlines, dividers      |
| `--mp-borders-md` | `1.5px` | Emphasized borders           |
| `--mp-borders-lg` | `2px`   | Focus rings, strong outlines |

---

## 6. Typography

| Category            | Tokens                                                                        |
| ------------------- | ----------------------------------------------------------------------------- |
| Font family         | `--mp-fonts-body`, `--mp-fonts-mono`                                          |
| Font size           | `--mp-font-sizes-{xs:10,sm:12,md:14,lg:16,xl:20,2xl:24}` (px)                 |
| Font weight         | `--mp-font-weights-{regular:400,semi-bold:600,bold:800}`                      |
| Line height (ratio) | `--mp-line-heights-{xs:1.2,sm:1.34,md:1.4,lg:1.429,xl:1.5,2xl:1.67,3xl:1.71}` |
| Letter spacing      | `--mp-letter-spacings-{tighter,tight,normal,wide,wider,widest}`               |

> Body text (14px) uses `var(--mp-font-sizes-md)` + `var(--mp-line-heights-lg)`
> (1.429 × 14 ≈ 20px). Tabular figures enabled globally via
> `font-feature-settings: 'lnum' 1, 'tnum' 1` in [`global.css`](../app/assets/css/global.css).
>
> Jurnal only uses **regular (400)** and **semi-bold (600)**. Do not reach
> for `--mp-font-weights-bold` (800) without design sign-off.

---

## 7. Elevation / Shadow (`--mp-shadows-*`)

| Token                                         | Use                               |
| --------------------------------------------- | --------------------------------- |
| `--mp-shadows-xs`                             | Subtle lift (notification badge)  |
| `--mp-shadows-sm`                             | Active sidebar item, raised chips |
| `--mp-shadows-md`                             | Floating cards, popovers          |
| `--mp-shadows-lg`                             | Modals, drawers                   |
| `--mp-shadows-xl`                             | Hero overlays                     |
| `--mp-shadows-focus` / `--mp-shadows-outline` | Focus rings                       |

---

## 8. Motion

Pixel v2.1 ships only duration tokens (no easings):

| Token                   | Value | Notes                                              |
| ----------------------- | ----- | -------------------------------------------------- |
| `--mp-durations-slow`   | 100ms | (Pixel's naming is inverted — this is the FASTEST) |
| `--mp-durations-normal` | 250ms | Default UI transition                              |
| `--mp-durations-fast`   | 300ms | Slowest of the three                               |

For easing curves, use the project-local `--motion-ease-{in,out,in-out}`
([see §10](#10-project-local-layer)).

---

## 9. Z-index (`--mp-z-index-*`)

| Token                  | Value | Use                      |
| ---------------------- | ----- | ------------------------ |
| `--mp-z-index-hide`    | -1    | Hidden                   |
| `--mp-z-index-base`    | 0     | Default                  |
| `--mp-z-index-docked`  | 10    | TheSidebar, SidebarChild |
| `--mp-z-index-sticky`  | 1100  | TheNavbar                |
| `--mp-z-index-overlay` | 1300  | Drawer/sheet backdrops   |
| `--mp-z-index-modal`   | 1400  | Modals                   |
| `--mp-z-index-popover` | 1500  | Popovers, dropdowns      |
| `--mp-z-index-tooltip` | 1800  | Tooltips                 |

---

## 10. Project-local layer

Defined in [`assets/css/tokens.css`](../app/assets/css/tokens.css). These
extend Pixel — they don't replace it.

### Layout primitives (Pixel doesn't ship app-shell sizes)

| Token                              | Value | Use                                          |
| ---------------------------------- | ----- | -------------------------------------------- |
| `--layout-header-height`           | 56px  | TheNavbar fixed height                       |
| `--layout-sidebar-width`           | 216px | TheSidebar — expanded rail width             |
| `--layout-sidebar-collapsed-width` | 56px  | TheSidebar — collapsed or with-submenu width |
| `--layout-submenu-width`           | 208px | Sidebar submenu panel width                  |
| `--layout-page-title-height`       | 72px  | DefaultPageContent title band min-height     |
| `--layout-sidebar-item-height`     | 36px  | Sidebar menu row min-height                  |

### Pill radius (Pixel `--mp-radii-full` is ellipse-only)

| Token                  | Value    | Use                                                         |
| ---------------------- | -------- | ----------------------------------------------------------- |
| `--border-radius-full` | `9999px` | Stadium-pill — notification badge, SidebarChild expand pill |

### Motion easings (Pixel ships durations but no cubic-beziers)

| Token                  | Value                          | Use                   |
| ---------------------- | ------------------------------ | --------------------- |
| `--motion-ease-out`    | `cubic-bezier(0.2, 0, 0, 1)`   | Element entering      |
| `--motion-ease-in`     | `cubic-bezier(0.4, 0, 1, 1)`   | Element leaving       |
| `--motion-ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | Default UI transition |

### Documented literal-colour exceptions

Two spots paint a literal colour instead of a `--mp-*` token because neither
has a token equivalent. Both carry a trailing `pixel-police-allow` comment —
don't "fix" them into the nearest token, it would just be visibly wrong.

| Where                                                                                    | Value                                                                                         | Why no token                                                                                                                                                                             |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Horizontal scroll-shadow gradient (`docs/patterns/TablePage.md`)                         | `linear-gradient(to right, var(--mp-colors-white) 30%, transparent), … rgba(29,31,36,0.16) …` | The rgba fade has no token equivalent.                                                                                                                                                   |
| Home add-ons card background ([`HomeAddOns.vue`](../app/components/home/HomeAddOns.vue)) | `linear-gradient(340deg, #66CFFF 9.7%, #00A8FD 47.12%, #0087D9 84.53%)`                       | A distinct marketing-brand sky-blue, not the Pixel `blue` scale (`#EAECFB`/`#D5DEFF`/`#4B61DD`/`#1C44D5`/`#0031BE`) — production paints the same literal gradient over a decorative PNG. |

---

## Migration notes (v2.1 → v2.4)

Not in scope. Token mode is locked to v2.1 via `setNextTheme(false)`.

---

## Changelog

- **v1.1.0** — Corrected "Used for" columns against the source, as part of the
  `design.md` reconciliation: the selected-nav row background is `blue.50`
  (not `blue.100`, which is the focus ring); the stadium pill is used by the
  notification badge and the `SidebarChild` expand pill (there is no search
  bar); component names updated to `TheNavbar` / `TheSidebar` /
  `DefaultPageContent`. §1's example no longer shows a `<style scoped>` block —
  this codebase has none.
- **v1.0.0** — Refactor to consume Pixel `--mp-*` tokens directly. Project-local
  `--color-*`/`--spacing-*`/`--shadow-*`/etc. surface removed. Surviving
  project-local layer: layout primitives, stadium-pill radius, motion easings.
