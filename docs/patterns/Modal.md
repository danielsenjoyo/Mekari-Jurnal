# Modal

> Part of the Mekari Jurnal page-construction pattern set.
> Reference impls: [`location-types.vue`](../../app/pages/products/warehouse/location-types.vue)
> (add/edit + delete confirm), [`ProductCategoryModal.vue`](../../app/components/products/ProductCategoryModal.vue)
> (a list managed inside a modal).
> See also [`Form`](./Form.md), [`Drawer`](./Drawer.md).

## Purpose

A centred, focused dialog that takes over until the user resolves it. Use it for
confirmations (especially destructive ones) and short single-task forms that
warrant interrupting the page.

## Modal vs. Drawer

| Use a **Modal** when…                                 | Use a [**Drawer**](./Drawer.md) when…                 |
| ----------------------------------------------------- | ----------------------------------------------------- |
| Destructive confirmation ("Delete 3 items?")          | Filtering a list (the canonical drawer use)           |
| Short, focused single task that should block the page | A side form where the page behind should stay visible |
| A decision the user must resolve before continuing    | Browsing/editing alongside the underlying content     |

## Markup

```vue
<MpModal :is-open="isOpen" size="sm" @close="isOpen = false">
  <MpModalOverlay />
  <MpModalContent>
    <MpModalHeader>
      <span :class="modalTitleClass">Delete item?</span>   <!-- fontSize: lg (16px) -->
      <MpModalCloseButton />
    </MpModalHeader>
    <MpModalBody>
      <MpText size="body" color="gray.700">
        This will permanently remove "{{ target.name }}". This can't be undone.
      </MpText>
    </MpModalBody>
    <MpModalFooter>
      <div :class="modalFooterClass"><!-- flex, justify-end, gap:2 -->
        <MpButton variant="secondary" @click="isOpen = false">Cancel</MpButton>
        <MpButton variant="danger" @click="confirmDelete">Delete</MpButton>
      </div>
    </MpModalFooter>
  </MpModalContent>
</MpModal>
```

## Rules

- **Open state:** drive with `:is-open` + `@close` (same family contract as `MpDrawer` — emits `open`/`close`, **no `v-model:is-open`**). `@close` covers the ×, overlay click, and Esc.
- **Close button placement:** `MpModalCloseButton` does **not** self-position — it must live **inside `MpModalHeader`** (a flex `space-between` container), exactly like the drawer's close button.
- **Header title size:** wrap the title in a `lg` (16px) span; the header recipe defaults to `md`.
- **Footer button order:** dismiss (secondary/Cancel) then the affirmative on the right. Destructive affirmatives use `variant="danger"`; everything else `variant="primary"`.
- A confirm modal carries **no leading icons** on its buttons (label-only, like the page action row).
- **Never open a modal over a modal.** When a row inside a modal needs
  confirming, confirm it _in the row_ — swap the row's content for
  "Delete X? [Cancel] [Delete]", the same way an editable row swaps for its
  input. See `ProductCategoryModal.vue`. A second overlay for a decision with
  one sentence of consequence is ceremony, and the row is already where the
  record's name is.
- **A modal that hosts several row states needs one "busy" flag**, so that while
  any row is adding, renaming or confirming, the other rows' controls are
  disabled. Two rows in edit mode at once is a second draft with nowhere to go.
- Form fields inside a modal still follow [`Form`](./Form.md) (`MpFormControl` wrapping).

## Closing is driven by an animation frame

`MpModal` does not remove itself the moment `is-open` goes false. The close runs
through the content's leave transition, and `isModalOpen` — the internal ref
that actually unmounts the teleported `.mp-modal__root` — is set to `false` in
the **`complete` callback of that leave animation**, which is `anime.js`, which
is `requestAnimationFrame`.

Normal browsing never notices. **Automated testing does**: in a context where
rAF is throttled to a stop — a hidden or collapsed browser pane, a background
tab, a headless run with animations disabled — the leave animation never
advances past frame 0, its `complete` never fires, and the modal stays on
screen, hit-testable, with `document.body.style.overflow` still `"hidden"`.

So this symptom:

> Cancel / × / Esc / overlay-click all leave the dialog on screen, the page
> stays scroll-locked, and `props.isOpen` is `false` while the DOM says
> otherwise

**is a frozen animation clock, not a bug in the modal and not a bug in your
code.** Check it before you chase it:

```js
// In a healthy tab this returns tens of frames. A hidden pane returns 0-1.
const t0 = performance.now();
let frames = 0;
await new Promise((res) => {
  const loop = () => {
    frames++;
    performance.now() - t0 < 300 ? requestAnimationFrame(loop) : res();
  };
  requestAnimationFrame(loop);
});
frames;
```

The same clock gates the _enter_ path: `enterAnimation`'s `complete` is what
registers the Esc key listener and activates the focus trap. A modal that opens
invisible (stuck at `opacity: 1.11e-16`, `scale(0.95)`) and ignores Esc is the
same frozen clock, not a broken modal.

**Verify modals in a real, focused browser window.** `MpDrawer` shares this core
(same `useModalContent`, and its root is literally `.mp-modal__root`), so it
behaves identically.

Do **not** "fix" this with `v-if` on the modal. It appears to work — Vue tears
the component down without waiting for the animation — but it skips pixel3's
whole open path too: the scroll lock is never applied, the Esc listener and
focus trap are never registered, and the enter animation is left mid-flight.
This was tried, and reverted, in the branch that added the Products
import/export modals.

## Gotchas

- Verify the exact `MpModal*` part names and the `size` scale with the Pixel MCP / `pixel-docs-jurnal` skill before first use.
- Keep destructive confirmations short: one sentence stating the consequence + whether it's reversible.
- **`MpDrawer` shares this modal core** (same `useModalContent`, with `type="drawer"`), including the animation-frame close described above.
