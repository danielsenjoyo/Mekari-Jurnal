<template>
  <DefaultPageContent
    :title="master ? master.name : 'Product with variant not found'"
    breadcrumb="Product with variant list"
    breadcrumb-to="/products?tab=masters"
  >
    <template v-if="master?.isArchived" #title-badge>
      <MpBadge for="additionalInformation" type="announcement">Archived</MpBadge>
    </template>

    <template v-if="master" #actions>
      <MpTooltip label="Previous product">
        <MpButton
          variant="ghost"
          size="sm"
          left-icon="chevrons-left"
          aria-label="Previous product"
          :is-disabled="!adjacent.prevId"
          @click="goTo(adjacent.prevId)"
        />
      </MpTooltip>
      <MpTooltip label="Next product">
        <MpButton
          variant="ghost"
          size="sm"
          left-icon="chevrons-right"
          aria-label="Next product"
          :is-disabled="!adjacent.nextId"
          @click="goTo(adjacent.nextId)"
        />
      </MpTooltip>
    </template>

    <BlankSlate
      v-if="!master"
      title="Product with variant not found"
      description="This product may have been deleted, or the link you followed may be out of date."
    >
      <MpButton variant="secondary" @click="navigateTo('/products?tab=masters')">
        Back to Product with variant list
      </MpButton>
    </BlankSlate>

    <template v-else>
      <div :class="topRowClass">
        <div :class="metaFieldClass">
          <MpText color="gray.600">Product code / SKU</MpText>
          <MpText>{{ master.code || "—" }}</MpText>
        </div>

        <div :class="metaFieldClass">
          <MpText color="gray.600">Product category</MpText>
          <MpText>{{ master.category || "—" }}</MpText>
        </div>

        <div :class="headlineColClass">
          <MpText weight="semiBold" color="dark">
            Stock on hand {{ formatQuantity(master.quantity) }} {{ master.unit }}
          </MpText>
          <MpText size="body-small" color="gray.600">
            across {{ master.variantCount }} variant{{ master.variantCount === 1 ? "" : "s" }}
          </MpText>
        </div>
      </div>

      <MpText size="body-small" color="gray.600" :class="asOfClass">
        Data below are based on {{ formatDisplayDate(todayIso) }}, unless stated otherwise
      </MpText>

      <MpDivider variant="dashed" :class="dividerClass" />

      <MpText weight="semiBold" color="dark" :class="sectionHeadingClass">Main product info</MpText>
      <div :class="metaGridClass">
        <div :class="metaColClass">
          <div :class="metaFieldClass">
            <MpText color="gray.600">Created date</MpText>
            <MpText>{{ formatDisplayDate(master.createdDate) }}</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Unit</MpText>
            <MpText>{{ master.unit || "—" }}</MpText>
          </div>
        </div>

        <div :class="metaColClass">
          <div v-if="master.trackInventory" :class="metaFieldClass">
            <MpText color="gray.600">Inventory tracking</MpText>
            <MpText>{{ INVENTORY_TRACKING_LABEL[master.inventoryTracking] }}</MpText>
          </div>
          <div v-if="master.trackInventory" :class="metaFieldClass">
            <MpText color="gray.600">Inventory account</MpText>
            <MpText>{{ master.inventoryAccount || "—" }}</MpText>
          </div>
          <div v-if="!master.trackInventory" :class="metaFieldClass">
            <MpText color="gray.600">Inventory tracking</MpText>
            <MpText>Without tracking</MpText>
          </div>
        </div>

        <div :class="metaColClass">
          <!-- The attributes ARE the variant table below: two attributes with
               four and three options produce its twelve rows. Showing them
               here is what makes that table legible as a grid rather than a
               list. -->
          <div v-for="attribute in master.attributes" :key="attribute.name" :class="metaFieldClass">
            <MpText color="gray.600">{{ attribute.name }}</MpText>
            <MpFlex gap="2" flex-wrap="wrap">
              <MpTag
                v-for="option in attribute.options"
                :key="option"
                variant="gray"
                size="sm"
                :class="wrapInlineClass"
              >
                {{ option }}
              </MpTag>
            </MpFlex>
          </div>
        </div>
      </div>

      <div :class="descriptionFieldClass">
        <MpText color="gray.600">Description</MpText>
        <MpText :class="descriptionValueClass">{{ master.description || "—" }}</MpText>
      </div>

      <template v-if="master.isBuy || master.isSell">
        <MpDivider variant="dashed" :class="dividerClass" />
        <div :class="tradeRowClass">
          <div v-if="master.isBuy" :class="tradeColClass">
            <MpText weight="semiBold" color="dark" :class="sectionHeadingClass">Buying info</MpText>
            <div :class="metaFieldClass">
              <MpText color="gray.600">Purchases account</MpText>
              <MpText>{{ master.buyAccount || "—" }}</MpText>
            </div>
            <div :class="metaFieldClass">
              <MpText color="gray.600">Default buy tax</MpText>
              <MpText>{{ master.buyTax || "—" }}</MpText>
            </div>
          </div>

          <div v-if="master.isSell" :class="tradeColClass">
            <MpText weight="semiBold" color="dark" :class="sectionHeadingClass"
              >Selling info</MpText
            >
            <div :class="metaFieldClass">
              <MpText color="gray.600">Sales account</MpText>
              <MpText>{{ master.sellAccount || "—" }}</MpText>
            </div>
            <div :class="metaFieldClass">
              <MpText color="gray.600">Default sell tax</MpText>
              <MpText>{{ master.sellTax || "—" }}</MpText>
            </div>
            <div :class="metaFieldClass">
              <MpText color="gray.600">Discount account</MpText>
              <MpText>{{ master.sellDiscountAccount || "—" }}</MpText>
            </div>
          </div>
        </div>
      </template>

      <!-- Zone D — the variant list. Prices per variant rather than one master
           price: the source lets each variant carry its own, which is the
           whole point of the "Set prices & minimum stock limit at once"
           shortcut on its form. -->
      <div :class="relatedSectionClass">
        <MpText weight="semiBold" color="dark" :class="sectionHeadingClass">
          Product variant list
        </MpText>
        <MpTableContainer :class="scrollShadowClass">
          <MpTable :class="relatedTableClass">
            <MpTableHead is-fixed :class="tableHeadClass">
              <MpTableRow>
                <MpTableCell as="th">Product name</MpTableCell>
                <MpTableCell as="th">Product code / SKU</MpTableCell>
                <MpTableCell as="th">Barcode</MpTableCell>
                <MpTableCell as="th" :class="numCellClass">Stock on hand</MpTableCell>
                <MpTableCell as="th" :class="numCellClass">Available qty</MpTableCell>
                <MpTableCell as="th" :class="numCellClass">Minimum stock limit</MpTableCell>
                <MpTableCell as="th" :class="numCellClass">Unit buy price</MpTableCell>
                <MpTableCell as="th" :class="numCellClass">Unit sell price</MpTableCell>
              </MpTableRow>
            </MpTableHead>
            <MpTableBody>
              <MpTableRow v-for="variant in master.variants" :key="variant.id">
                <MpTableCell as="td" :class="wrapCellClass">{{ variant.name }}</MpTableCell>
                <MpTableCell as="td" :class="wrapCellClass">{{ variant.code }}</MpTableCell>
                <MpTableCell as="td" :class="wrapCellClass">{{ variant.barcode }}</MpTableCell>
                <MpTableCell as="td" :class="[wrapCellClass, numCellClass]">
                  {{ formatQuantity(variant.quantity) }}
                </MpTableCell>
                <MpTableCell as="td" :class="[wrapCellClass, numCellClass]">
                  {{ formatQuantity(variant.quantityAvailable) }}
                </MpTableCell>
                <MpTableCell as="td" :class="[wrapCellClass, numCellClass]">
                  {{ formatQuantity(variant.buffer) }}
                </MpTableCell>
                <MpTableCell as="td" :class="[wrapCellClass, numCellClass]">
                  {{ formatAmount(variant.buyPrice) }}
                </MpTableCell>
                <MpTableCell as="td" :class="[wrapCellClass, numCellClass]">
                  {{ formatAmount(variant.sellPrice) }}
                </MpTableCell>
              </MpTableRow>
            </MpTableBody>
          </MpTable>
        </MpTableContainer>
        <MpText size="body-small" color="gray.600" :class="relatedCaptionClass">
          Showing {{ master.variants.length }} of {{ master.variants.length }} variant
        </MpText>
      </div>

      <div :class="bottomActionsClass">
        <MpButton variant="ghost" @click="isDeleteModalOpen = true">Delete</MpButton>
        <MpFlex gap="2">
          <MpButton variant="secondary" @click="navigateTo(`/products/master/edit/${master.id}`)">
            Edit
          </MpButton>
          <MpPopover placement="bottom-end" use-portal is-adaptive-width>
            <template #default>
              <MpPopoverTrigger>
                <MpButton variant="primary" right-icon="caret-down">Actions</MpButton>
              </MpPopoverTrigger>
              <MpPopoverContent>
                <MpPopoverList>
                  <MpPopoverListItem role="menuitem" @click="openArchiveModal">
                    {{ master.isArchived ? "Unarchive" : "Archive" }}
                  </MpPopoverListItem>
                </MpPopoverList>
              </MpPopoverContent>
            </template>
          </MpPopover>
        </MpFlex>
      </div>

      <!-- Archiving a master takes its variants with it, so this one gets a
           confirm of its own rather than acting straight from the menu — the
           source spells the same consequences out. -->
      <MpModal
        id="master-archive-modal"
        :is-open="isArchiveModalOpen"
        size="sm"
        @close="isArchiveModalOpen = false"
      >
        <MpModalOverlay />
        <MpModalContent>
          <MpModalHeader>
            <span :class="modalTitleClass">
              {{ master.isArchived ? "Unarchive main product?" : "Archive main product?" }}
            </span>
            <MpModalCloseButton />
          </MpModalHeader>
          <MpModalBody>
            <template v-if="!master.isArchived">
              <MpText size="body" color="gray.700">Impacts of archiving the main product:</MpText>
              <ul :class="bulletListClass">
                <li>
                  <MpText size="body" color="gray.700"
                    >Product variants inside will also be archived.</MpText
                  >
                </li>
                <li>
                  <MpText size="body" color="gray.700">
                    Unarchiving product variants cannot be done as long as the main product is still
                    archived.
                  </MpText>
                </li>
              </ul>
            </template>
            <MpText v-else size="body" color="gray.700">
              The main product and its variants return to the product with variant list.
            </MpText>
          </MpModalBody>
          <MpModalFooter>
            <div :class="modalFooterClass">
              <MpButton variant="secondary" @click="isArchiveModalOpen = false">Cancel</MpButton>
              <MpButton variant="primary" @click="confirmArchive">
                {{ master.isArchived ? "Unarchive" : "Archive" }}
              </MpButton>
            </div>
          </MpModalFooter>
        </MpModalContent>
      </MpModal>

      <MpModal
        id="master-delete-modal"
        :is-open="isDeleteModalOpen"
        size="sm"
        @close="isDeleteModalOpen = false"
      >
        <MpModalOverlay />
        <MpModalContent>
          <MpModalHeader>
            <span :class="modalTitleClass">Delete main product?</span>
            <MpModalCloseButton />
          </MpModalHeader>
          <MpModalBody>
            <MpText size="body" color="gray.700">
              By deleting the main product, product variants inside will also be deleted. Deleted
              products cannot be restored.
            </MpText>
          </MpModalBody>
          <MpModalFooter>
            <div :class="modalFooterClass">
              <MpButton variant="secondary" @click="isDeleteModalOpen = false">Cancel</MpButton>
              <MpButton variant="danger" @click="confirmDelete">Delete</MpButton>
            </div>
          </MpModalFooter>
        </MpModalContent>
      </MpModal>
    </template>
  </DefaultPageContent>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import {
  css,
  MpBadge,
  MpButton,
  MpDivider,
  MpFlex,
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
  MpTag,
  MpText,
  MpTooltip
} from "@mekari/pixel3";
import DefaultPageContent from "~/components/template/DefaultPageContent.vue";
import {
  deleteProductRecords,
  formatAmount,
  formatDisplayDate,
  formatQuantity,
  getAdjacentMasterIds,
  getProductMasterById,
  INVENTORY_TRACKING_LABEL,
  setProductMasterArchived,
  todayIsoDate
} from "~/data/products";

// ---------------------------------------------------------------------------
// Product-with-variant (master) detail. Cloned from jurnal-frontend-app
// src/pages/products/master/index.vue.
//
// The variant rows are the master's own children here rather than links to
// separate product pages: variants don't appear in the flat product list (the
// masters tab exists so they don't flood it), so there is no product detail
// page for them to point at.
// ---------------------------------------------------------------------------

const route = useRoute();
const masterId = computed(() => Number(route.params.id));

const refreshTick = ref(0);
const master = computed(() => {
  void refreshTick.value;
  return getProductMasterById(masterId.value);
});

useHead({
  title: computed(() =>
    master.value
      ? `${master.value.name} — Mekari Jurnal`
      : "Product with variant not found — Mekari Jurnal"
  )
});

const adjacent = computed(() => getAdjacentMasterIds(masterId.value));
const todayIso = todayIsoDate();

const isArchiveModalOpen = ref(false);
const isDeleteModalOpen = ref(false);

function goTo(id: number | null) {
  if (id) navigateTo(`/products/master/${id}`);
}

function openArchiveModal() {
  isArchiveModalOpen.value = true;
}

function confirmArchive() {
  if (!master.value) return;
  setProductMasterArchived(master.value.id, !master.value.isArchived);
  refreshTick.value++;
  isArchiveModalOpen.value = false;
}

function confirmDelete() {
  if (!master.value) return;
  deleteProductRecords("masters", [master.value.id]);
  isDeleteModalOpen.value = false;
  navigateTo("/products?tab=masters");
}

// All css() below uses Pixel 3 token shortcuts only (token mode 2.1).
const topRowClass = css({
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 6,
  alignItems: "start"
});
const headlineColClass = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: 1,
  textAlign: "right"
});
const asOfClass = css({ display: "block", mt: 3 });
const dividerClass = css({ my: 6 });
const sectionHeadingClass = css({ fontSize: "lg", mb: 4 });

const metaGridClass = css({
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 6
});
const metaColClass = css({ display: "flex", flexDirection: "column", gap: 4 });
const metaFieldClass = css({ display: "flex", flexDirection: "column", gap: 1, minWidth: "0" });

const descriptionFieldClass = css({
  display: "flex",
  flexDirection: "column",
  gap: 1,
  mt: 6,
  maxWidth: "640px"
});
const descriptionValueClass = css({ whiteSpace: "normal", wordBreak: "break-word" });

const tradeRowClass = css({ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 });
const tradeColClass = css({ display: "flex", flexDirection: "column", gap: 4, minWidth: "0" });

const relatedSectionClass = css({ mt: 8 });
const relatedCaptionClass = css({ display: "block", mt: 3 });
// Eight columns don't fit a narrow stage; min-width makes the container scroll
// rather than wrapping every cell (docs/patterns/TablePage.md).
const relatedTableClass = css({ tableLayout: "auto", width: "full", minWidth: "1280px" });
const tableHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
const numCellClass = css({ textAlign: "right" });
// On a <td>: wrapping only, never `display` — a cell must stay `table-cell`.
const wrapCellClass = css({ whiteSpace: "normal!", wordBreak: "break-word", textAlign: "left" });
const wrapInlineClass = css({
  whiteSpace: "normal!",
  wordBreak: "break-word",
  maxWidth: "full",
  display: "inline-block",
  textAlign: "left"
});
const scrollShadowClass = css({
  backgroundImage:
    "linear-gradient(to right, var(--mp-colors-white) 30%, transparent), linear-gradient(to left, var(--mp-colors-white) 30%, transparent), linear-gradient(to right, rgba(29,31,36,0.16), transparent), linear-gradient(to left, rgba(29,31,36,0.16), transparent)",
  backgroundPosition: "left center, right center, left center, right center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "36px 100%, 36px 100%, 12px 100%, 12px 100%",
  backgroundAttachment: "local, local, scroll, scroll"
});

const bulletListClass = css({ pl: 5, mt: 2, listStyleType: "disc" });

const modalTitleClass = css({ fontSize: "lg" });
const modalFooterClass = css({ display: "flex", justifyContent: "flex-end", gap: 2 });

const bottomActionsClass = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  mt: 8,
  pt: 6,
  borderTopWidth: "sm",
  borderColor: "gray.100"
});
</script>
