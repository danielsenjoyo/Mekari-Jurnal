<template>
  <DefaultPageContent
    :title="product ? product.name : 'Product not found'"
    breadcrumb="Product list"
    breadcrumb-to="/products"
  >
    <template v-if="product?.isArchived" #title-badge>
      <MpBadge for="additionalInformation" type="announcement">Archived</MpBadge>
    </template>

    <!-- Only prev/next live in the title band — Edit / Actions / Delete sit in
         the bottom action bar (docs/patterns/details-page-format.md). The
         source puts Edit + Actions at the top of the content area instead;
         this follows the repo-wide pattern the Purchase pages established so
         the two modules' detail screens don't disagree about where a
         lifecycle action lives. -->
    <template v-if="product" #actions>
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
      v-if="!product"
      title="Product not found"
      description="This product may have been deleted, or the link you followed may be out of date."
    >
      <MpButton variant="secondary" @click="navigateTo('/products')">Back to Product list</MpButton>
    </BlankSlate>

    <template v-else>
      <!-- Zone A — identity row. The right column carries the record's one
           headline figure, which is stock for a tracked product and the sell
           price for a service (a service has no stock to headline). -->
      <div :class="topRowClass">
        <div :class="metaFieldClass">
          <MpText color="gray.600">Product code / SKU</MpText>
          <MpText>{{ product.code || "—" }}</MpText>
        </div>

        <div :class="metaFieldClass">
          <MpText color="gray.600">Product category</MpText>
          <MpText>{{ product.category || "—" }}</MpText>
        </div>

        <div :class="headlineColClass">
          <MpText v-if="product.trackInventory" weight="semiBold" color="dark">
            Stock on hand {{ formatQuantity(product.quantity ?? 0) }} {{ product.unit }}
          </MpText>
          <MpText v-else weight="semiBold" color="dark">
            Unit sell price {{ formatCurrency(product.sellPrice) }}
          </MpText>
          <MpTextlink
            v-if="product.trackInventory"
            :class="textlinkAlignClass"
            as="button"
            variant="secondary"
            @click="showWarehouseTab"
          >
            View warehouse info
          </MpTextlink>
        </div>
      </div>

      <!-- Same "as of" caption the source prints under the header. It's here
           because the figures above and below are point-in-time — a costing
           recalculation can move the average price after the fact. -->
      <MpText size="body-small" color="gray.600" :class="asOfClass">
        Data below are based on {{ formatDisplayDate(todayIso) }}, unless stated otherwise
      </MpText>

      <MpDivider variant="dashed" :class="dividerClass" />

      <!-- Zone C — Product info. -->
      <MpText weight="semiBold" color="dark" :class="sectionHeadingClass">Product info</MpText>
      <div :class="metaGridClass">
        <div :class="metaColClass">
          <div :class="metaFieldClass">
            <MpText color="gray.600">Created date</MpText>
            <MpText>{{ formatDisplayDate(product.createdDate) }}</MpText>
          </div>
          <div v-if="master" :class="metaFieldClass">
            <MpText color="gray.600">Main product</MpText>
            <MpTextlink
              :class="textlinkAlignClass"
              as="button"
              variant="primary"
              @click="navigateTo(`/products/master/${master.id}`)"
            >
              {{ master.name }}
            </MpTextlink>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Barcode</MpText>
            <MpText>{{ product.barcode || "—" }}</MpText>
          </div>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Product type</MpText>
            <div>
              <MpBadge for="additionalInformation" type="information">
                {{ product.isBundle ? "Bundle" : "Single" }}
              </MpBadge>
            </div>
          </div>
        </div>

        <div :class="metaColClass">
          <!-- Every stock field is gated on tracking together: an untracked
               product has no stock to report, and rendering four "—" rows says
               less than not rendering them. -->
          <template v-if="product.trackInventory">
            <div :class="metaFieldClass">
              <MpText color="gray.600">{{ costingLabel }}</MpText>
              <MpText>{{ formatCurrency(product.avgPrice) }}</MpText>
            </div>
            <div :class="metaFieldClass">
              <MpFlex align-items="center" gap="2">
                <MpText color="gray.600">Available qty</MpText>
                <MpTooltip
                  label="Product stocks for sale. Shown data are the subtraction of stock on hand with stock in fulfillment process."
                >
                  <MpIcon name="info" size="sm" color="gray.600" />
                </MpTooltip>
              </MpFlex>
              <MpText>
                {{ formatQuantity(product.quantityAvailable ?? 0) }} {{ product.unit }}
              </MpText>
            </div>
            <div :class="metaFieldClass">
              <MpText color="gray.600">Minimum stock limit</MpText>
              <MpText>{{ formatQuantity(product.buffer ?? 0) }} {{ product.unit }}</MpText>
            </div>
          </template>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Unit</MpText>
            <MpText>{{ product.unit || "—" }}</MpText>
          </div>
        </div>

        <div :class="metaColClass">
          <template v-if="product.trackInventory">
            <div :class="metaFieldClass">
              <MpText color="gray.600">Inventory tracking</MpText>
              <MpText>{{ INVENTORY_TRACKING_LABEL[product.inventoryTracking] }}</MpText>
            </div>
            <div :class="metaFieldClass">
              <MpText color="gray.600">Default inventory account</MpText>
              <MpText>{{ product.inventoryAccount || "—" }}</MpText>
            </div>
          </template>
          <div :class="metaFieldClass">
            <MpText color="gray.600">Tags</MpText>
            <MpFlex v-if="product.tags.length" gap="2" flex-wrap="wrap">
              <MpTag
                v-for="tag in product.tags"
                :key="tag"
                variant="gray"
                size="sm"
                :class="wrapInlineClass"
              >
                {{ tag }}
              </MpTag>
            </MpFlex>
            <MpText v-else>—</MpText>
          </div>
        </div>
      </div>

      <div :class="descriptionFieldClass">
        <MpText color="gray.600">Description</MpText>
        <MpText :class="descriptionValueClass">{{ product.description || "—" }}</MpText>
      </div>

      <!-- Buying / Selling info, side by side as in the source. Each half is
           gated on its own checkbox: a product you only sell has no purchases
           account to show. -->
      <template v-if="product.isBuy || product.isSell">
        <MpDivider variant="dashed" :class="dividerClass" />
        <div :class="tradeRowClass">
          <div v-if="product.isBuy" :class="tradeColClass">
            <MpText weight="semiBold" color="dark" :class="sectionHeadingClass">Buying info</MpText>
            <div :class="metaFieldClass">
              <MpText color="gray.600">Unit buy price</MpText>
              <MpText>{{ formatCurrency(product.buyPrice) }}</MpText>
            </div>
            <div :class="metaFieldClass">
              <MpText color="gray.600">Purchases account</MpText>
              <MpText>{{ product.buyAccount || "—" }}</MpText>
            </div>
            <div :class="metaFieldClass">
              <MpText color="gray.600">Default buy tax</MpText>
              <MpText>{{ product.buyTax || "—" }}</MpText>
            </div>
          </div>

          <div v-if="product.isSell" :class="tradeColClass">
            <MpText weight="semiBold" color="dark" :class="sectionHeadingClass"
              >Selling info</MpText
            >
            <div :class="metaFieldClass">
              <MpText color="gray.600">Unit sell price</MpText>
              <MpText>{{ formatCurrency(product.sellPrice) }}</MpText>
            </div>
            <div :class="metaFieldClass">
              <MpText color="gray.600">Sales account</MpText>
              <MpText>{{ product.sellAccount || "—" }}</MpText>
            </div>
            <div :class="metaFieldClass">
              <MpText color="gray.600">Default sell tax</MpText>
              <MpText>{{ product.sellTax || "—" }}</MpText>
            </div>
          </div>
        </div>
      </template>

      <!-- Zone D — related records. Which tabs exist depends on the product:
           bundle components only for a bundle, batches only for a
           batch-tracked product. -->
      <div :class="relatedSectionClass">
        <MpTabs v-model="activeTabIndex" is-manual variant-color="blue">
          <MpTabList>
            <MpTab v-for="tab in tabs" :key="tab.key">
              <span :class="tabLabelClass">{{ tab.label }}</span>
            </MpTab>
          </MpTabList>
        </MpTabs>

        <!-- Product transactions -->
        <div v-if="activeTabKey === 'transactions'" :class="relatedBodyClass">
          <MpTableContainer v-if="transactions.length">
            <MpTable :class="relatedTableClass">
              <MpTableHead is-fixed :class="tableHeadClass">
                <MpTableRow>
                  <MpTableCell as="th">Date</MpTableCell>
                  <MpTableCell as="th">Transaction no.</MpTableCell>
                  <MpTableCell as="th">Transaction type</MpTableCell>
                  <MpTableCell as="th">Warehouse</MpTableCell>
                  <MpTableCell as="th" :class="numCellClass">Qty change</MpTableCell>
                  <MpTableCell as="th" :class="numCellClass">Balance</MpTableCell>
                </MpTableRow>
              </MpTableHead>
              <MpTableBody>
                <MpTableRow v-for="row in transactions" :key="row.id">
                  <MpTableCell as="td" :class="wrapCellClass">
                    {{ formatDisplayDate(row.date) }}
                  </MpTableCell>
                  <MpTableCell as="td" :class="wrapCellClass">{{ row.number }}</MpTableCell>
                  <MpTableCell as="td" :class="wrapCellClass">
                    {{ PRODUCT_TRANSACTION_TYPE_LABEL[row.type] }}
                  </MpTableCell>
                  <MpTableCell as="td" :class="wrapCellClass">{{ row.warehouse }}</MpTableCell>
                  <!-- Signed explicitly. A colour alone doesn't separate a
                       stock-in from a stock-out for anyone who can't tell the
                       two hues apart. -->
                  <MpTableCell as="td" :class="[wrapCellClass, numCellClass]">
                    {{ signedQuantity(row.quantityChange) }}
                  </MpTableCell>
                  <MpTableCell as="td" :class="[wrapCellClass, numCellClass]">
                    {{ formatQuantity(row.balance) }}
                  </MpTableCell>
                </MpTableRow>
              </MpTableBody>
            </MpTable>
          </MpTableContainer>
          <MpText v-else size="body-small" color="gray.600">
            This product has no recorded movements yet.
          </MpText>
        </div>

        <!-- Warehouse info -->
        <div v-if="activeTabKey === 'warehouse'" :class="relatedBodyClass">
          <MpTableContainer v-if="warehouseStock.length">
            <MpTable :class="relatedTableClass">
              <MpTableHead is-fixed :class="tableHeadClass">
                <MpTableRow>
                  <MpTableCell as="th">Warehouse name</MpTableCell>
                  <MpTableCell as="th" :class="numCellClass">Stock on hand</MpTableCell>
                  <MpTableCell as="th" :class="numCellClass">Available qty</MpTableCell>
                </MpTableRow>
              </MpTableHead>
              <MpTableBody>
                <MpTableRow v-for="row in warehouseStock" :key="row.warehouse">
                  <MpTableCell as="td" :class="wrapCellClass">{{ row.warehouse }}</MpTableCell>
                  <MpTableCell as="td" :class="[wrapCellClass, numCellClass]">
                    {{ formatQuantity(row.onHand) }} {{ product.unit }}
                  </MpTableCell>
                  <MpTableCell as="td" :class="[wrapCellClass, numCellClass]">
                    {{ formatQuantity(row.available) }} {{ product.unit }}
                  </MpTableCell>
                </MpTableRow>
              </MpTableBody>
            </MpTable>
          </MpTableContainer>
          <MpText v-else size="body-small" color="gray.600">
            No warehouse holds this product yet.
          </MpText>
        </div>

        <!-- Bundle components -->
        <div v-if="activeTabKey === 'bundle'" :class="relatedBodyClass">
          <MpText size="body-small" color="gray.600" :class="relatedCaptionClass">
            This product has components of:
          </MpText>
          <MpTableContainer>
            <MpTable :class="relatedTableClass">
              <MpTableHead is-fixed :class="tableHeadClass">
                <MpTableRow>
                  <MpTableCell as="th">Product name</MpTableCell>
                  <MpTableCell as="th" :class="numCellClass">Qty</MpTableCell>
                  <MpTableCell as="th" :class="numCellClass">Price</MpTableCell>
                  <MpTableCell as="th" :class="numCellClass">Total</MpTableCell>
                </MpTableRow>
              </MpTableHead>
              <MpTableBody>
                <MpTableRow v-for="item in product.bundleItems" :key="item.productId">
                  <MpTableCell as="td" :class="wrapCellClass">
                    <MpTextlink
                      :class="textlinkCellClass"
                      as="button"
                      variant="primary"
                      @click="navigateTo(`/products/detail/${item.productId}`)"
                    >
                      {{ item.name }}
                    </MpTextlink>
                  </MpTableCell>
                  <MpTableCell as="td" :class="[wrapCellClass, numCellClass]">
                    {{ formatQuantity(item.quantity) }}
                  </MpTableCell>
                  <MpTableCell as="td" :class="[wrapCellClass, numCellClass]">
                    {{ formatAmount(item.price) }}
                  </MpTableCell>
                  <MpTableCell as="td" :class="[wrapCellClass, numCellClass]">
                    {{ formatAmount(item.price * item.quantity) }}
                  </MpTableCell>
                </MpTableRow>
              </MpTableBody>
            </MpTable>
          </MpTableContainer>
          <div :class="bundleTotalClass">
            <MpText color="gray.600">Total price</MpText>
            <MpText weight="semiBold" color="dark">{{ formatCurrency(bundleTotal) }}</MpText>
          </div>
        </div>

        <!-- Batch info -->
        <div v-if="activeTabKey === 'batch'" :class="relatedBodyClass">
          <MpTableContainer v-if="batches.length">
            <MpTable :class="relatedTableClass">
              <MpTableHead is-fixed :class="tableHeadClass">
                <MpTableRow>
                  <MpTableCell as="th">Batch no.</MpTableCell>
                  <MpTableCell as="th">Expiration date</MpTableCell>
                  <MpTableCell as="th">Description</MpTableCell>
                  <MpTableCell as="th" :class="numCellClass">Batch stock on hand</MpTableCell>
                  <MpTableCell as="th" :class="numCellClass">Available batch qty</MpTableCell>
                </MpTableRow>
              </MpTableHead>
              <MpTableBody>
                <MpTableRow v-for="batch in batches" :key="batch.id">
                  <MpTableCell as="td" :class="wrapCellClass">
                    <MpTextlink
                      :class="textlinkCellClass"
                      as="button"
                      variant="primary"
                      @click="navigateTo(`/products/${product.id}/batches/${batch.id}`)"
                    >
                      {{ batch.number }}
                    </MpTextlink>
                    <MpBadge
                      v-if="batch.isArchived"
                      for="additionalInformation"
                      type="announcement"
                    >
                      Archived
                    </MpBadge>
                  </MpTableCell>
                  <MpTableCell as="td" :class="wrapCellClass">
                    {{ batch.expirationDate ? formatDisplayDate(batch.expirationDate) : "—" }}
                  </MpTableCell>
                  <MpTableCell as="td" :class="wrapCellClass">
                    {{ batch.description || "—" }}
                  </MpTableCell>
                  <MpTableCell as="td" :class="[wrapCellClass, numCellClass]">
                    {{ formatQuantity(batch.onHand) }} {{ product.unit }}
                  </MpTableCell>
                  <MpTableCell as="td" :class="[wrapCellClass, numCellClass]">
                    {{ formatQuantity(batch.available) }} {{ product.unit }}
                  </MpTableCell>
                </MpTableRow>
              </MpTableBody>
            </MpTable>
          </MpTableContainer>
          <MpText v-else size="body-small" color="gray.600">
            No batch has been received for this product yet.
          </MpText>
        </div>
      </div>

      <!-- Zone E — bottom action bar. -->
      <div :class="bottomActionsClass">
        <MpButton variant="ghost" @click="isDeleteModalOpen = true">Delete</MpButton>
        <MpFlex gap="2">
          <MpButton variant="secondary" @click="navigateTo(`/products/edit/${product.id}`)">
            Edit
          </MpButton>
          <MpPopover placement="bottom-end" use-portal is-adaptive-width>
            <template #default>
              <MpPopoverTrigger>
                <MpButton variant="primary" right-icon="caret-down">Actions</MpButton>
              </MpPopoverTrigger>
              <MpPopoverContent>
                <MpPopoverList>
                  <MpPopoverListItem
                    v-if="product.trackInventory && !product.isArchived"
                    role="menuitem"
                    @click="onAction('adjust-stock')"
                  >
                    Adjust stock (stock opname)
                  </MpPopoverListItem>
                  <MpPopoverListItem
                    v-if="canConvert"
                    role="menuitem"
                    @click="navigateTo(`/products/convert/new?from=${product.id}`)"
                  >
                    Convert product
                  </MpPopoverListItem>
                  <MpPopoverListItem role="menuitem" @click="toggleArchive">
                    {{ product.isArchived ? "Unarchive" : "Archive" }}
                  </MpPopoverListItem>
                </MpPopoverList>
              </MpPopoverContent>
            </template>
          </MpPopover>
        </MpFlex>
      </div>

      <MpModal
        id="product-detail-delete-modal"
        :is-open="isDeleteModalOpen"
        size="sm"
        @close="isDeleteModalOpen = false"
      >
        <MpModalOverlay />
        <MpModalContent>
          <MpModalHeader>
            <span :class="modalTitleClass">Delete product?</span>
            <MpModalCloseButton />
          </MpModalHeader>
          <MpModalBody>
            <MpText size="body" color="gray.700">
              Once deleted, <strong>{{ product.name }}</strong> cannot be restored.
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
  MpIcon,
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
  MpTab,
  MpTabList,
  MpTable,
  MpTableBody,
  MpTableCell,
  MpTableContainer,
  MpTableHead,
  MpTableRow,
  MpTabs,
  MpTag,
  MpText,
  MpTextlink,
  MpTooltip
} from "@mekari/pixel3";
import DefaultPageContent from "~/components/template/DefaultPageContent.vue";
import {
  deleteProductRecords,
  formatAmount,
  formatCurrency,
  formatDisplayDate,
  formatQuantity,
  getAdjacentProductIds,
  getProductById,
  getProductMasterById,
  INVENTORY_TRACKING_LABEL,
  setProductArchived,
  todayIsoDate
} from "~/data/products";
import {
  getBatchesForProduct,
  getProductTransactions,
  getWarehouseStock,
  PRODUCT_TRANSACTION_TYPE_LABEL
} from "~/data/product-records";
import { textlinkAlignClass, textlinkCellClass } from "~/utils/textlink-align";

// ---------------------------------------------------------------------------
// Product detail. Cloned from jurnal-frontend-app
// src/pages/products/detail/index.vue.
//
// Not ported, and why: the product image uploader (no file storage is modelled
// anywhere in this prototype), the custom-fields section (a Settings feature),
// the unit-conversion tab (its own editable sub-form), the serial-number tab
// (no serial records exist here — a serial-tracked product simply doesn't get
// that tab rather than getting an empty one), and the COGS-recalculation
// banners.
// ---------------------------------------------------------------------------

const route = useRoute();
const productId = computed(() => Number(route.params.id));

// Plain module state, so a mutation on this page needs a re-read to be seen.
const refreshTick = ref(0);
const product = computed(() => {
  void refreshTick.value;
  return getProductById(productId.value);
});

useHead({
  title: computed(() =>
    product.value ? `${product.value.name} — Mekari Jurnal` : "Product not found — Mekari Jurnal"
  )
});

const master = computed(() =>
  product.value?.masterId ? getProductMasterById(product.value.masterId) : undefined
);
const adjacent = computed(() => getAdjacentProductIds(productId.value));
const todayIso = todayIsoDate();

const transactions = computed(() => (product.value ? getProductTransactions(product.value) : []));
const warehouseStock = computed(() => (product.value ? getWarehouseStock(product.value) : []));
const batches = computed(() => (product.value ? getBatchesForProduct(product.value.id) : []));

/** The costing figure's label follows the company's costing method. Average is
 *  the only one modelled here; the source shows "Current COGS" under FIFO. */
const costingLabel = "Average price";

const bundleTotal = computed(() =>
  (product.value?.bundleItems ?? []).reduce((sum, item) => sum + item.price * item.quantity, 0)
);

// Only a tracked bundle can be converted — the source gates the action the
// same way, and its own tooltip explains that batch/serial-tracked stock
// can't be.
const canConvert = computed(
  () =>
    Boolean(product.value?.isBundle) &&
    Boolean(product.value?.trackInventory) &&
    product.value?.inventoryTracking === "qty" &&
    !product.value?.isArchived
);

type TabKey = "transactions" | "warehouse" | "bundle" | "batch";

const tabs = computed<{ key: TabKey; label: string }[]>(() => {
  const list: { key: TabKey; label: string }[] = [
    { key: "transactions", label: "Product transactions" }
  ];
  if (product.value?.trackInventory) list.push({ key: "warehouse", label: "Warehouse info" });
  if (product.value?.isBundle) list.push({ key: "bundle", label: "Bundle info" });
  if (product.value?.inventoryTracking === "batch")
    list.push({ key: "batch", label: "Batch info" });
  return list;
});

const activeTabIndex = ref(0);
const activeTabKey = computed<TabKey>(
  () => tabs.value[activeTabIndex.value]?.key ?? tabs.value[0]!.key
);

/** The identity row's "View warehouse info" link — it selects the tab rather
 *  than navigating, since the table is already on this page. */
function showWarehouseTab() {
  const index = tabs.value.findIndex((tab) => tab.key === "warehouse");
  if (index >= 0) activeTabIndex.value = index;
}

const isDeleteModalOpen = ref(false);

function goTo(id: number | null) {
  if (id) navigateTo(`/products/detail/${id}`);
}

function signedQuantity(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatQuantity(Math.abs(value))}`;
}

function toggleArchive() {
  if (!product.value) return;
  setProductArchived(product.value.id, !product.value.isArchived);
  refreshTick.value++;
}

function confirmDelete() {
  if (!product.value) return;
  deleteProductRecords("products_and_services", [product.value.id]);
  isDeleteModalOpen.value = false;
  navigateTo("/products");
}

// Inert in this prototype: the stock-adjustment drawer is a form of its own,
// and no stock-adjustment create screen has been cloned yet.
function onAction(action: string) {
  void action;
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
// minWidth:0 — a grid/flex item's implicit min-width is its content's natural
// width, which is what lets a long value overflow its column instead of
// wrapping inside it.
const metaFieldClass = css({ display: "flex", flexDirection: "column", gap: 1, minWidth: "0" });

const descriptionFieldClass = css({
  display: "flex",
  flexDirection: "column",
  gap: 1,
  mt: 6,
  maxWidth: "640px"
});
const descriptionValueClass = css({ whiteSpace: "normal", wordBreak: "break-word" });

const tradeRowClass = css({
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: 8
});
const tradeColClass = css({ display: "flex", flexDirection: "column", gap: 4, minWidth: "0" });

const relatedSectionClass = css({ mt: 8 });
const relatedBodyClass = css({ pt: 4 });
const relatedCaptionClass = css({ display: "block", mb: 3 });
// `min-width` so a narrow stage scrolls the table (MpTableContainer is the
// scroll box) instead of squeezing every column — without it a six-column
// related table wraps "27 Aug 2026" onto three lines and breaks transaction
// numbers mid-string.
const relatedTableClass = css({ tableLayout: "auto", width: "full", minWidth: "720px" });
const tableHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
const numCellClass = css({ textAlign: "right" });
// On a <td>: wrapping only. NEVER set `display` here — a table cell must stay
// `display: table-cell` (docs/patterns/details-page-format.md).
const wrapCellClass = css({ whiteSpace: "normal!", wordBreak: "break-word", textAlign: "left" });
// On an inline child that ships its own nowrap (MpTag). An MpTextlink needs
// `textlinkCellClass` instead — same wrap rules plus the 2px margin correction.
const wrapInlineClass = css({
  whiteSpace: "normal!",
  wordBreak: "break-word",
  maxWidth: "full",
  display: "inline-block",
  textAlign: "left"
});
const tabLabelClass = css({
  display: "inline-flex",
  alignItems: "center",
  gap: 2,
  whiteSpace: "nowrap"
});
const bundleTotalClass = css({
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: 3,
  mt: 4
});

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
