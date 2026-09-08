<template>
  <DefaultPageContent
    title="Product categories"
    breadcrumb="Other lists"
    breadcrumb-to="/other-lists"
  >
    <template #actions>
      <MpButton variant="primary" :is-disabled="isRowBusy" @click="openAdd">
        Add category
      </MpButton>
    </template>

    <MpInputGroup :class="searchClass">
      <MpInputLeftAddon>
        <MpIcon name="search" size="sm" color="gray.400" />
      </MpInputLeftAddon>
      <MpInput v-model="search" placeholder="Search category" aria-label="Search category" />
    </MpInputGroup>

    <BlankSlate
      v-if="!rows.length"
      :variant="searchTerm ? 'not-found' : 'no-data'"
      :title="searchTerm ? 'Category not found' : 'Categories will appear here'"
      :description="
        searchTerm
          ? 'Recheck the keywords you have typed and try searching again.'
          : 'Add a category from the Add category button.'
      "
    >
      <MpButton v-if="!searchTerm" variant="secondary" @click="openAdd">Add category</MpButton>
    </BlankSlate>

    <MpTableContainer v-else>
      <MpTable :class="tableClass">
        <colgroup>
          <col />
          <col :style="{ width: '160px' }" />
        </colgroup>
        <MpTableHead is-fixed :class="tableHeadClass">
          <MpTableRow>
            <MpTableCell as="th">
              <!-- The only column with values to compare, so it is the only
                   sort. -->
              <button type="button" :class="sortHeaderClass" @click="toggleSort">
                Name
                <MpIcon :name="sortAsc ? 'sort-ascending' : 'sort-descending'" size="sm" />
              </button>
            </MpTableCell>
            <MpTableCell as="th" :class="usedInHeadClass">
              <span>Used in</span>
              <MpTooltip
                placement="left"
                use-portal
                label="Products and product masters carrying this category."
              >
                <span :class="tooltipWrapClass">
                  <MpIcon name="info" size="sm" color="gray.400" />
                </span>
              </MpTooltip>
            </MpTableCell>
            <MpTableCell as="th" :class="actionCellClass">Actions</MpTableCell>
          </MpTableRow>
        </MpTableHead>
        <MpTableBody>
          <MpTableRow v-for="row in rows" :key="row.name">
            <!-- The delete confirmation is the row, not a modal on top of this
                 page — the same call ProductCategoryModal.vue makes, and for
                 the same reason: nothing is lost at a zero count, so a second
                 overlay explains nothing a plain "Delete X?" doesn't already
                 say (docs/patterns/Modal.md). -->
            <template v-if="pendingDelete === row.name">
              <MpTableCell as="td" :colspan="2">
                <MpText color="dark">Delete {{ row.name }}?</MpText>
              </MpTableCell>
              <MpTableCell as="td" :class="actionCellClass">
                <div :class="confirmActionsClass">
                  <MpButton variant="ghost" size="sm" @click="pendingDelete = null"
                    >Cancel</MpButton
                  >
                  <MpButton variant="danger" size="sm" @click="confirmDelete">Delete</MpButton>
                </div>
              </MpTableCell>
            </template>

            <template v-else-if="editing === row.name">
              <MpTableCell as="td" :colspan="2">
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
              </MpTableCell>
              <MpTableCell as="td" />
            </template>

            <template v-else>
              <MpTableCell as="td">{{ row.name }}</MpTableCell>
              <MpTableCell as="td" :class="usedInCellClass">
                {{ formatCount(row.productCount) }}
              </MpTableCell>
              <MpTableCell as="td" :class="actionCellClass">
                <MpPopover placement="bottom-end" use-portal is-adaptive-width is-close-on-select>
                  <template #default>
                    <MpPopoverTrigger>
                      <MpButton
                        variant="secondary"
                        size="sm"
                        right-icon="chevrons-down"
                        :is-disabled="isRowBusy"
                        :aria-label="`Actions for ${row.name}`"
                      >
                        Actions
                      </MpButton>
                    </MpPopoverTrigger>
                    <MpPopoverContent>
                      <MpPopoverList>
                        <MpPopoverListItem role="menuitem" @click="startEdit(row.name)">
                          Edit
                        </MpPopoverListItem>
                        <MpTooltip
                          v-if="row.productCount > 0"
                          placement="left"
                          use-portal
                          label="This category is used by a product, so it can't be deleted."
                        >
                          <MpPopoverListItem is-disabled>Delete</MpPopoverListItem>
                        </MpTooltip>
                        <MpPopoverListItem v-else role="menuitem" @click="pendingDelete = row.name">
                          Delete
                        </MpPopoverListItem>
                      </MpPopoverList>
                    </MpPopoverContent>
                  </template>
                </MpPopover>
              </MpTableCell>
            </template>
          </MpTableRow>
        </MpTableBody>
      </MpTable>
    </MpTableContainer>

    <!-- Add shares the same single-field shape as edit, in its own modal —
         the source opens it the same way (a plain name prompt), and it is the
         one row-state Add can't be, since there is no row yet to become one. -->
    <MpModal
      id="product-category-add-modal"
      :is-open="isAddOpen"
      size="sm"
      @close="isAddOpen = false"
    >
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          <span :class="modalTitleClass">Add category</span>
          <MpModalCloseButton />
        </MpModalHeader>
        <MpModalBody>
          <MpFormControl is-required :is-invalid="Boolean(draftError)">
            <MpFormLabel>Category name</MpFormLabel>
            <MpInput
              v-model="draftName"
              placeholder="Example: Raw material"
              :maxlength="PRODUCT_CATEGORY_NAME_MAX_LENGTH"
              @keyup.enter="saveAdd"
            />
            <MpFormErrorMessage>{{ draftError }}</MpFormErrorMessage>
          </MpFormControl>
        </MpModalBody>
        <MpModalFooter>
          <div :class="modalFooterClass">
            <MpButton variant="ghost" @click="isAddOpen = false">Cancel</MpButton>
            <MpButton variant="primary" @click="saveAdd">Save</MpButton>
          </div>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>
  </DefaultPageContent>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import {
  css,
  MpButton,
  MpFormControl,
  MpFormErrorMessage,
  MpFormLabel,
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
  MpPopover,
  MpPopoverContent,
  MpPopoverList,
  MpPopoverListItem,
  MpPopoverTrigger,
  MpTable,
  MpTableBody,
  MpTableCell,
  MpTableContainer,
  MpTableHead,
  MpTableRow,
  MpText,
  MpTooltip
} from "@mekari/pixel3";
import BlankSlate from "~/components/template/BlankSlate.vue";
import DefaultPageContent from "~/components/template/DefaultPageContent.vue";
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
// Product categories — the full management page. Cloned from
// jurnal-frontend-app src/pages/other-lists/product-categories/.
//
// The source carries this SAME list on two surfaces: a quick modal opened
// from the product list's toolbar ("Manage product category" —
// ProductCategoryModal.vue) for a glance mid-task, and this page under Other
// Lists for a thorough pass — sortable, searchable, one row per category.
// Both read and write the same PRODUCT_CATEGORIES array, so a rename on
// either shows up on the other immediately.
//
// Not ported: the bulk multi-select delete and the "Last updated" column —
// this prototype doesn't stamp a modification time on a category, and a
// vocabulary list this short (docs/patterns/TablePage.md's location-types
// precedent is the same call) doesn't need row-at-a-time selection either.
// ---------------------------------------------------------------------------

useHead({ title: "Product categories — Mekari Jurnal" });

const refreshTick = ref(0);
const search = ref("");
const searchTerm = computed(() => search.value.trim());
const sortAsc = ref(true);

const rows = computed(() => {
  void refreshTick.value;
  const term = searchTerm.value.toLowerCase();
  let list = getProductCategoriesWithUsage();
  if (term) list = list.filter((row) => row.name.toLowerCase().includes(term));
  return sortAsc.value ? list : list.slice().reverse();
});

function toggleSort() {
  sortAsc.value = !sortAsc.value;
}

// ---- Add / edit — one draft, since only one row can be mid-edit at a time,
// and Add is really the same draft with no row of its own yet. ------------

const isAddOpen = ref(false);
const editing = ref("");
const draftName = ref("");
const draftError = ref("");
const pendingDelete = ref<string | null>(null);

/** One row at a time: while any row is being edited or confirmed for
 *  deletion, every OTHER row's Actions trigger is off — opening a second
 *  row's Edit would otherwise reassign the single `editing`/`draftName` refs
 *  and silently abandon whatever the first row's edit had typed. */
const isRowBusy = computed(() => Boolean(editing.value) || Boolean(pendingDelete.value));

function resetDraft() {
  isAddOpen.value = false;
  editing.value = "";
  draftName.value = "";
  draftError.value = "";
  pendingDelete.value = null;
}

function openAdd() {
  resetDraft();
  isAddOpen.value = true;
}

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
}

function startEdit(name: string) {
  resetDraft();
  editing.value = name;
  draftName.value = name;
}

function cancelEdit() {
  resetDraft();
}

function saveEdit() {
  const target = editing.value;
  draftError.value = validateDraft(target);
  if (draftError.value) return;
  renameProductCategory(target, draftName.value.trim());
  resetDraft();
  refreshTick.value++;
}

function confirmDelete() {
  if (pendingDelete.value) deleteProductCategory(pendingDelete.value);
  resetDraft();
  refreshTick.value++;
}

// All css() below uses Pixel 3 token shortcuts only (token mode 2.1).
const searchClass = css({ width: "280px", mb: 6 });
const tableClass = css({ width: "full" });
const tableHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
const actionCellClass = css({ textAlign: "right" });
const usedInHeadClass = css({ display: "flex", alignItems: "center", gap: 2 });
const usedInCellClass = css({ color: "var(--mp-colors-gray-700)" });
const tooltipWrapClass = css({ display: "inline-flex" });
const sortHeaderClass = css({
  display: "inline-flex",
  alignItems: "center",
  gap: 1,
  bg: "transparent",
  border: "none",
  p: 0,
  cursor: "pointer",
  font: "inherit",
  color: "inherit"
});
const editRowClass = css({ display: "flex", alignItems: "center", gap: 2 });
const confirmActionsClass = css({ display: "flex", justifyContent: "flex-end", gap: 2 });
const modalTitleClass = css({ fontSize: "lg" });
const modalFooterClass = css({ display: "flex", justifyContent: "flex-end", gap: 2 });
</script>
