<template>
  <MpModal
    id="product-category-modal"
    :is-open="isOpen"
    size="md"
    is-centered
    @close="emit('close')"
  >
    <MpModalOverlay />
    <MpModalContent>
      <MpModalHeader>
        <span :class="modalTitleClass">Manage product category</span>
        <MpModalCloseButton />
      </MpModalHeader>

      <MpModalBody>
        <!-- Search + Add on one row. Add is disabled while the draft row is
             already open rather than hidden: a button that disappears when you
             click it reads as a misfire. -->
        <div :class="toolbarClass">
          <div :class="searchWrapClass">
            <MpInputGroup>
              <MpInputLeftAddon>
                <MpIcon name="search" size="sm" color="gray.400" />
              </MpInputLeftAddon>
              <MpInput
                v-model="search"
                placeholder="Search category"
                aria-label="Search category"
              />
            </MpInputGroup>
          </div>
          <MpButton variant="secondary" :is-disabled="isRowBusy" @click="startAdd">
            Add category
          </MpButton>
        </div>

        <!-- The list. Not an MpTable: every row can turn into a form, and a
             two-column table whose cells swap for an input and two buttons
             fights its own column widths. -->
        <div :class="listClass">
          <div v-if="rows.length || isAdding" :class="listHeadClass">
            <MpText size="label" weight="semiBold" color="dark">Name</MpText>
            <div :class="totalHeadClass">
              <MpText size="label" weight="semiBold" color="dark">Total</MpText>
              <MpTooltip placement="left" use-portal label="Total product per category">
                <span :class="tooltipWrapClass">
                  <MpIcon name="info" size="sm" color="gray.400" />
                </span>
              </MpTooltip>
            </div>
          </div>

          <!-- Draft row for a new category, at the top where the button is. -->
          <div v-if="isAdding" :class="rowClass">
            <MpFormControl is-required :is-invalid="Boolean(draftError)">
              <div :class="editRowClass">
                <MpInput
                  v-model="draftName"
                  placeholder="Example: Raw material"
                  aria-label="New category name"
                  :maxlength="PRODUCT_CATEGORY_NAME_MAX_LENGTH"
                  @keyup.enter="saveAdd"
                />
                <MpButton variant="ghost" size="sm" @click="cancelAdd">Cancel</MpButton>
                <MpButton variant="secondary" size="sm" @click="saveAdd">Save</MpButton>
              </div>
              <MpFormErrorMessage>{{ draftError }}</MpFormErrorMessage>
            </MpFormControl>
          </div>

          <div v-for="row in rows" :key="row.name" :class="rowClass">
            <template v-if="editingName === row.name">
              <MpFormControl is-required :is-invalid="Boolean(draftError)">
                <div :class="editRowClass">
                  <MpInput
                    v-model="draftName"
                    :aria-label="`Rename ${row.name}`"
                    :maxlength="PRODUCT_CATEGORY_NAME_MAX_LENGTH"
                    @keyup.enter="saveEdit"
                  />
                  <MpButton variant="ghost" size="sm" @click="cancelEdit">Cancel</MpButton>
                  <MpButton variant="secondary" size="sm" @click="saveEdit">Save</MpButton>
                </div>
                <MpFormErrorMessage>{{ draftError }}</MpFormErrorMessage>
              </MpFormControl>
            </template>

            <!-- The delete confirmation is the row, not a modal on top of this
                 one. A modal over a modal stacks two overlays for a decision
                 with nothing to explain (Delete is only offered at a zero
                 count, so nothing is lost), and the row is already where the
                 name is — the same place a rename happens. -->
            <template v-else-if="pendingDelete === row.name">
              <MpText color="dark">Delete {{ row.name }}?</MpText>
              <div :class="confirmActionsClass">
                <MpButton variant="ghost" size="sm" @click="pendingDelete = null">Cancel</MpButton>
                <MpButton variant="danger" size="sm" @click="confirmDelete">Delete</MpButton>
              </div>
            </template>

            <template v-else>
              <div :class="nameCellClass">
                <MpText color="dark">{{ row.name }}</MpText>
                <MpButton
                  variant="ghost"
                  size="sm"
                  left-icon="edit"
                  :aria-label="`Edit ${row.name}`"
                  :is-disabled="isRowBusy"
                  @click="startEdit(row.name)"
                />
              </div>
              <div :class="totalCellClass">
                <MpText color="gray.700">{{ formatCount(row.productCount) }}</MpText>
                <!-- Delete is offered only at a zero count. A category still on
                     a product can't be removed without leaving that product
                     describing itself with a word that no longer exists, so at
                     any other count the button isn't there at all — the source
                     makes the same call. -->
                <MpButton
                  v-if="row.productCount === 0"
                  variant="ghost"
                  size="sm"
                  left-icon="delete"
                  :aria-label="`Delete ${row.name}`"
                  :is-disabled="isRowBusy"
                  @click="startDelete(row.name)"
                />
                <span v-else :class="deleteSpacerClass" aria-hidden="true" />
              </div>
            </template>
          </div>

          <!-- Two different nothings: never had a category, versus this search
               matched none. docs/patterns/BlankSlate.md. -->
          <div v-if="!rows.length && !isAdding" :class="emptyClass">
            <MpText weight="semiBold" color="dark">
              {{ searchTerm ? "Category not found" : "No category yet" }}
            </MpText>
            <MpText size="body-small" color="gray.600">
              {{
                searchTerm
                  ? "Recheck the keywords you have typed and try searching again."
                  : "Product category will appear here."
              }}
            </MpText>
          </div>
        </div>
      </MpModalBody>

      <MpModalFooter>
        <div :class="modalFooterClass">
          <MpButton variant="primary" @click="emit('close')">Done</MpButton>
        </div>
      </MpModalFooter>
    </MpModalContent>
  </MpModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  css,
  MpButton,
  MpFormControl,
  MpFormErrorMessage,
  MpIcon,
  MpInput,
  MpInputGroup,
  MpInputLeftAddon,
  MpModal,
  MpModalBody,
  MpModalCloseButton,
  MpModalContent,
  MpModalFooter,
  MpModalHeader,
  MpModalOverlay,
  MpText,
  MpTooltip
} from "@mekari/pixel3";
import {
  createProductCategory,
  deleteProductCategory,
  formatCount,
  getProductCategoriesWithUsage,
  isProductCategoryNameTaken,
  PRODUCT_CATEGORY_NAME_MAX_LENGTH,
  renameProductCategory
} from "~/data/products";

// ---------------------------------------------------------------------------
// Manage product category. Cloned from jurnal-frontend-app
// src/pages/products/goods-services/components/product-list/components/
// category-modal.
//
// The list lives on the product list, not in Settings, because categories exist
// only to group products and the person grouping them is looking at that list.
// Editing happens in the row itself: the whole record is one name, so a second
// modal on top of this one would be a dialog for a single text field.
//
// Not ported: the per-keystroke server search (this list is small enough to
// filter in place) and the success toasts (nothing else in this prototype
// raises one, and the row changes under the cursor either way).
// ---------------------------------------------------------------------------

const props = defineProps<{ isOpen: boolean }>();
const emit = defineEmits<{ close: []; changed: [] }>();

const refreshTick = ref(0);
const search = ref("");
const searchTerm = computed(() => search.value.trim());

const rows = computed(() => {
  void refreshTick.value;
  const term = searchTerm.value.toLowerCase();
  const all = getProductCategoriesWithUsage();
  return term ? all.filter((row) => row.name.toLowerCase().includes(term)) : all;
});

// ---- Add / rename --------------------------------------------------------
//
// One draft, because only one row can be in edit mode at a time: `isAdding` and
// `editingName` are the two things it can be attached to, and both are cleared
// together.

const isAdding = ref(false);
const editingName = ref("");
const draftName = ref("");
const draftError = ref("");
const pendingDelete = ref<string | null>(null);

/** One row at a time: while any row is being added, renamed or confirmed for
 *  deletion, the other rows' controls are off. */
const isRowBusy = computed(
  () => isAdding.value || Boolean(editingName.value) || Boolean(pendingDelete.value)
);

function resetDraft() {
  isAdding.value = false;
  editingName.value = "";
  draftName.value = "";
  draftError.value = "";
  pendingDelete.value = null;
}

// Reopening should not resume a half-typed rename from last time.
watch(
  () => props.isOpen,
  (open) => {
    if (!open) return;
    resetDraft();
    search.value = "";
    pendingDelete.value = null;
  }
);

function startAdd() {
  resetDraft();
  isAdding.value = true;
}

function cancelAdd() {
  resetDraft();
}

/** Shared by both drafts: the name has to be there, and it has to be free. */
function validateDraft(exceptName?: string): string {
  const value = draftName.value.trim();
  if (!value) return "You must fill in category name";
  if (isProductCategoryNameTaken(value, exceptName)) return "Please fill in with another name";
  return "";
}

function saveAdd() {
  draftError.value = validateDraft();
  if (draftError.value) return;
  createProductCategory(draftName.value.trim());
  resetDraft();
  refreshTick.value++;
  emit("changed");
}

function startEdit(name: string) {
  resetDraft();
  editingName.value = name;
  draftName.value = name;
}

function cancelEdit() {
  resetDraft();
}

function saveEdit() {
  const target = editingName.value;
  draftError.value = validateDraft(target);
  if (draftError.value) return;
  renameProductCategory(target, draftName.value.trim());
  resetDraft();
  refreshTick.value++;
  emit("changed");
}

// ---- Delete --------------------------------------------------------------

function startDelete(name: string) {
  resetDraft();
  pendingDelete.value = name;
}

function confirmDelete() {
  if (pendingDelete.value) deleteProductCategory(pendingDelete.value);
  pendingDelete.value = null;
  refreshTick.value++;
  emit("changed");
}

// All css() below uses Pixel 3 token shortcuts only (token mode 2.1).
const modalTitleClass = css({ fontSize: "lg" });
const modalFooterClass = css({ display: "flex", justifyContent: "flex-end", gap: 2 });
const toolbarClass = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 3,
  mb: 4
});
const searchWrapClass = css({ width: "280px" });
// The list scrolls inside the modal so the Done button stays reachable with a
// long category list.
const listClass = css({ maxHeight: "320px", overflowY: "auto" });
const listHeadClass = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 2,
  px: 2,
  py: 3,
  borderBottom: "1px solid var(--mp-colors-gray-100)"
});
const totalHeadClass = css({ display: "flex", alignItems: "center", gap: 2, width: "140px" });
const rowClass = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 2,
  px: 2,
  py: 2,
  borderBottom: "1px solid var(--mp-colors-gray-100)"
});
const nameCellClass = css({ display: "flex", alignItems: "center", gap: 1, minWidth: 0 });
const totalCellClass = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 2,
  width: "140px"
});
// Holds the Delete button's place on rows that don't get one, so the Total
// figures stay on one vertical line down the list.
const deleteSpacerClass = css({ display: "inline-block", width: "32px" });
const editRowClass = css({ display: "flex", alignItems: "center", gap: 2 });
const confirmActionsClass = css({ display: "flex", alignItems: "center", gap: 2, flex: "none" });
const emptyClass = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 1,
  py: 10,
  textAlign: "center"
});
const tooltipWrapClass = css({ display: "inline-flex" });
</script>
