<template>
  <DefaultPageContent
    :title="warehouse ? warehouse.name : 'Warehouse not found'"
    breadcrumb="Warehouse list"
    breadcrumb-to="/products?tab=warehouses"
  >
    <template v-if="warehouse && !warehouse.isActive" #title-badge>
      <MpBadge for="tableStatus" :type="ACTIVE_STATUS_TYPE.inactive">
        {{ ACTIVE_STATUS_LABEL.inactive }}
      </MpBadge>
    </template>

    <template v-if="warehouse" #actions>
      <MpTooltip label="Previous warehouse">
        <MpButton
          variant="ghost"
          size="sm"
          left-icon="chevrons-left"
          aria-label="Previous warehouse"
          :is-disabled="!adjacent.prevId"
          @click="goTo(adjacent.prevId)"
        />
      </MpTooltip>
      <MpTooltip label="Next warehouse">
        <MpButton
          variant="ghost"
          size="sm"
          left-icon="chevrons-right"
          aria-label="Next warehouse"
          :is-disabled="!adjacent.nextId"
          @click="goTo(adjacent.nextId)"
        />
      </MpTooltip>
    </template>

    <BlankSlate
      v-if="!warehouse"
      title="Warehouse not found"
      description="This warehouse may have been deleted, or the link you followed may be out of date."
    >
      <MpButton variant="secondary" @click="navigateTo('/products?tab=warehouses')">
        Back to Warehouse list
      </MpButton>
    </BlankSlate>

    <template v-else>
      <!-- Zone A. A warehouse's headline figure is how much it is holding —
           the reason anyone opens this page. -->
      <div :class="topRowClass">
        <div :class="metaFieldClass">
          <MpText color="gray.600">Warehouse code</MpText>
          <MpText>{{ warehouse.code || "—" }}</MpText>
        </div>

        <div :class="metaFieldClass">
          <MpText color="gray.600">Person in charge</MpText>
          <MpText>{{ warehouse.pics.join(", ") || "—" }}</MpText>
        </div>

        <div :class="headlineColClass">
          <MpText weight="semiBold" color="dark">
            {{ formatCount(products.length) }} product{{ products.length === 1 ? "" : "s" }} held
          </MpText>
          <MpText size="body-small" color="gray.600">
            {{ formatCount(locations.length) }} storage location{{
              locations.length === 1 ? "" : "s"
            }}
          </MpText>
        </div>
      </div>

      <MpDivider variant="dashed" :class="dividerClass" />

      <MpText weight="semiBold" color="dark" :class="sectionHeadingClass">Warehouse info</MpText>
      <div :class="metaGridClass">
        <div :class="metaFieldClass">
          <MpText color="gray.600">Address</MpText>
          <MpText :class="wrapValueClass">{{ warehouse.address || "—" }}</MpText>
        </div>
        <div :class="metaFieldClass">
          <MpText color="gray.600">Description</MpText>
          <MpText :class="wrapValueClass">{{ warehouse.description || "—" }}</MpText>
        </div>
        <div :class="metaFieldClass">
          <MpText color="gray.600">Status</MpText>
          <div>
            <MpBadge for="tableStatus" :type="ACTIVE_STATUS_TYPE[statusKey]">
              {{ ACTIVE_STATUS_LABEL[statusKey] }}
            </MpBadge>
          </div>
        </div>
      </div>

      <div :class="relatedSectionClass">
        <MpTabs v-model="activeTabIndex" is-manual variant-color="blue">
          <MpTabList>
            <MpTab v-for="tab in tabs" :key="tab.key">
              <span :class="tabLabelClass">{{ tab.label }}</span>
            </MpTab>
          </MpTabList>
        </MpTabs>

        <!-- Products held here -->
        <div v-if="activeTabKey === 'products'" :class="relatedBodyClass">
          <MpTableContainer v-if="products.length" :class="scrollShadowClass">
            <MpTable :class="relatedTableClass">
              <MpTableHead is-fixed :class="tableHeadClass">
                <MpTableRow>
                  <MpTableCell as="th">Product name</MpTableCell>
                  <MpTableCell as="th">Product code</MpTableCell>
                  <MpTableCell as="th" :class="numCellClass">Stock on hand</MpTableCell>
                  <MpTableCell as="th" :class="numCellClass">Available qty</MpTableCell>
                </MpTableRow>
              </MpTableHead>
              <MpTableBody>
                <MpTableRow v-for="product in products" :key="product.id">
                  <MpTableCell as="td" :class="wrapCellClass">
                    <MpTextlink
                      :class="textlinkCellClass"
                      as="button"
                      variant="primary"
                      @click="navigateTo(`/products/detail/${product.id}`)"
                    >
                      {{ product.name }}
                    </MpTextlink>
                  </MpTableCell>
                  <MpTableCell as="td" :class="wrapCellClass">{{ product.code }}</MpTableCell>
                  <MpTableCell as="td" :class="[wrapCellClass, numCellClass]">
                    {{ formatQuantity(product.quantity ?? 0) }} {{ product.unit }}
                  </MpTableCell>
                  <MpTableCell as="td" :class="[wrapCellClass, numCellClass]">
                    {{ formatQuantity(product.quantityAvailable ?? 0) }} {{ product.unit }}
                  </MpTableCell>
                </MpTableRow>
              </MpTableBody>
            </MpTable>
          </MpTableContainer>
          <MpText v-else size="body-small" color="gray.600">
            No product is held in this warehouse yet.
          </MpText>
        </div>

        <!-- Storage locations -->
        <div v-if="activeTabKey === 'locations'" :class="relatedBodyClass">
          <MpTableContainer v-if="locations.length">
            <MpTable :class="relatedTableClass">
              <MpTableHead is-fixed :class="tableHeadClass">
                <MpTableRow>
                  <MpTableCell as="th">Location code</MpTableCell>
                  <MpTableCell as="th">Location name</MpTableCell>
                  <MpTableCell as="th">Storage type</MpTableCell>
                </MpTableRow>
              </MpTableHead>
              <MpTableBody>
                <MpTableRow v-for="location in locations" :key="location.id">
                  <MpTableCell as="td" :class="wrapCellClass">{{ location.code }}</MpTableCell>
                  <!-- Named by its path: a bare "Bin 1" can't be told from the
                       other seven of them. -->
                  <MpTableCell as="td" :class="wrapCellClass">
                    {{ storageLocationPath(location) }}
                  </MpTableCell>
                  <MpTableCell as="td" :class="wrapCellClass">
                    {{ storageLevelTypeAt(warehouse, location.level) || "—" }}
                  </MpTableCell>
                </MpTableRow>
              </MpTableBody>
            </MpTable>
          </MpTableContainer>
          <MpText v-else size="body-small" color="gray.600">
            No storage location has been set up in this warehouse yet.
          </MpText>
          <MpButton
            variant="secondary"
            size="sm"
            :class="addLocationClass"
            @click="openLocationDrawer"
          >
            Add new storage location
          </MpButton>
        </div>

        <!-- Movements touching this warehouse -->
        <div v-if="activeTabKey === 'transactions'" :class="relatedBodyClass">
          <MpTableContainer v-if="transactions.length" :class="scrollShadowClass">
            <MpTable :class="relatedTableClass">
              <MpTableHead is-fixed :class="tableHeadClass">
                <MpTableRow>
                  <MpTableCell as="th">Date</MpTableCell>
                  <MpTableCell as="th">Transaction no.</MpTableCell>
                  <MpTableCell as="th">Transaction type</MpTableCell>
                  <MpTableCell as="th" :class="numCellClass">Total products</MpTableCell>
                </MpTableRow>
              </MpTableHead>
              <MpTableBody>
                <MpTableRow v-for="row in transactions" :key="`${row.kind}-${row.id}`">
                  <MpTableCell as="td" :class="wrapCellClass">
                    {{ formatDisplayDate(row.date) }}
                  </MpTableCell>
                  <MpTableCell as="td" :class="wrapCellClass">
                    <MpTextlink
                      :class="textlinkCellClass"
                      as="button"
                      variant="primary"
                      @click="openTransaction(row)"
                    >
                      {{ row.number }}
                    </MpTextlink>
                  </MpTableCell>
                  <MpTableCell as="td" :class="wrapCellClass">{{ row.typeLabel }}</MpTableCell>
                  <MpTableCell as="td" :class="[wrapCellClass, numCellClass]">
                    {{ formatCount(row.lineCount) }}
                  </MpTableCell>
                </MpTableRow>
              </MpTableBody>
            </MpTable>
          </MpTableContainer>
          <MpText v-else size="body-small" color="gray.600">
            No transaction has touched this warehouse yet.
          </MpText>
        </div>
      </div>

      <div :class="bottomActionsClass">
        <MpButton variant="ghost" @click="isDeleteModalOpen = true">Delete</MpButton>
        <MpFlex gap="2">
          <MpButton
            variant="secondary"
            @click="navigateTo(`/products/warehouse/edit/${warehouse.id}`)"
          >
            Edit
          </MpButton>
          <MpPopover placement="bottom-end" use-portal is-adaptive-width>
            <template #default>
              <MpPopoverTrigger>
                <MpButton variant="primary" right-icon="caret-down">Actions</MpButton>
              </MpPopoverTrigger>
              <MpPopoverContent>
                <MpPopoverList>
                  <MpPopoverListItem role="menuitem" @click="openLocationDrawer">
                    Add new storage location
                  </MpPopoverListItem>
                  <MpPopoverListItem role="menuitem" @click="onToggleActive">
                    {{ warehouse.isActive ? "Deactivate" : "Activate" }}
                  </MpPopoverListItem>
                </MpPopoverList>
              </MpPopoverContent>
            </template>
          </MpPopover>
        </MpFlex>
      </div>

      <!-- Deactivation is refused while locations exist, so the reason is
           surfaced where the action was taken rather than failing silently. -->
      <MpBanner
        v-if="actionError"
        id="warehouse-action-error"
        variant="danger"
        is-inline
        :class="errorBannerClass"
      >
        <MpBannerIcon id="warehouse-action-error-icon" />
        <MpBannerDescription id="warehouse-action-error-desc">
          {{ actionError }}
        </MpBannerDescription>
      </MpBanner>

      <MpModal
        id="warehouse-delete-modal"
        :is-open="isDeleteModalOpen"
        size="sm"
        @close="isDeleteModalOpen = false"
      >
        <MpModalOverlay />
        <MpModalContent>
          <MpModalHeader>
            <span :class="modalTitleClass">Delete warehouse?</span>
            <MpModalCloseButton />
          </MpModalHeader>
          <MpModalBody>
            <MpText size="body" color="gray.700">
              Once deleted, <strong>{{ warehouse.name }}</strong> cannot be restored.
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

      <!-- The same drawer the Products list's Actions menu opens, with the
           warehouse already known here (docs/patterns/Drawer.md). -->
      <StorageLocationDrawer
        :is-open="isLocationDrawerOpen"
        :warehouse-id="warehouseId"
        @close="isLocationDrawerOpen = false"
        @created="onLocationCreated"
      />
    </template>
  </DefaultPageContent>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import {
  css,
  MpBadge,
  MpBanner,
  MpBannerDescription,
  MpBannerIcon,
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
  MpTab,
  MpTabList,
  MpTable,
  MpTableBody,
  MpTableCell,
  MpTableContainer,
  MpTableHead,
  MpTableRow,
  MpTabs,
  MpText,
  MpTextlink,
  MpTooltip
} from "@mekari/pixel3";
import DefaultPageContent from "~/components/template/DefaultPageContent.vue";
import {
  ACTIVE_STATUS_LABEL,
  ACTIVE_STATUS_TYPE,
  ADJUSTMENT_TYPE_LABEL,
  deleteProductRecords,
  formatCount,
  formatDisplayDate,
  formatQuantity,
  getAdjacentWarehouseIds,
  getProducts,
  getStockAdjustments,
  getStorageLocations,
  isStorageLocationFeatureActive,
  getWarehouseById,
  storageLevelTypeAt,
  storageLocationPath,
  getWarehouseTransfers,
  setWarehouseActive,
  type ActiveStatus
} from "~/data/products";
import { textlinkCellClass } from "~/utils/textlink-align";

// ---------------------------------------------------------------------------
// Warehouse detail. Cloned from jurnal-frontend-app
// src/pages/warehouses/detail/index.vue.
//
// Not ported: the storage LEVEL designer (a settings screen that names the
// tiers before locations can use them), and the batch / serial-number tabs —
// both are per-warehouse views of records this prototype tracks per product
// instead.
// ---------------------------------------------------------------------------

const route = useRoute();
const warehouseId = computed(() => Number(route.params.id));

const refreshTick = ref(0);
const warehouse = computed(() => {
  void refreshTick.value;
  return getWarehouseById(warehouseId.value);
});

useHead({
  title: computed(() =>
    warehouse.value
      ? `${warehouse.value.name} — Mekari Jurnal`
      : "Warehouse not found — Mekari Jurnal"
  )
});

const adjacent = computed(() => getAdjacentWarehouseIds(warehouseId.value));

const statusKey = computed<ActiveStatus>(() => (warehouse.value?.isActive ? "active" : "inactive"));

/** What this warehouse holds — read off the catalogue rather than stored
 *  against the warehouse, so the two can't disagree. */
const products = computed(() => {
  void refreshTick.value;
  const name = warehouse.value?.name;
  if (!name) return [];
  return getProducts().filter(
    (product) => product.warehouse === name && !product.isArchived && product.trackInventory
  );
});

const locations = computed(() => {
  void refreshTick.value;
  return getStorageLocations(warehouseId.value);
});

interface WarehouseTransactionRow {
  kind: "adjustment" | "transfer";
  id: number;
  date: string;
  number: string;
  typeLabel: string;
  lineCount: number;
}

/** Everything that has moved stock in or out of here — adjustments recorded
 *  against it, and transfers with it at either end. */
const transactions = computed<WarehouseTransactionRow[]>(() => {
  void refreshTick.value;
  const name = warehouse.value?.name;
  if (!name) return [];

  const adjustments: WarehouseTransactionRow[] = getStockAdjustments()
    .filter((record) => record.warehouse === name)
    .map((record) => ({
      kind: "adjustment",
      id: record.id,
      date: record.date,
      number: record.number,
      typeLabel: ADJUSTMENT_TYPE_LABEL[record.adjustmentType],
      lineCount: record.lines.length
    }));

  const transfers: WarehouseTransactionRow[] = getWarehouseTransfers()
    .filter((record) => record.fromWarehouse === name || record.toWarehouse === name)
    .map((record) => ({
      kind: "transfer",
      id: record.id,
      date: record.date,
      number: record.number,
      typeLabel: record.fromWarehouse === name ? "Transfer out" : "Transfer in",
      lineCount: record.lines.length
    }));

  return [...adjustments, ...transfers].sort((a, b) => b.date.localeCompare(a.date));
});

/** The tabs, in render order — `?tab=` names one so a link can land on it
 *  (docs/patterns/form-page-format.md § "a tab is a destination"). Location
 *  list is absent while the storage-location feature is off: with the feature
 *  down there are no locations to list, and an empty tab reads as a warehouse
 *  that lost them. */
const tabs = computed(() => {
  const list: { key: string; label: string }[] = [{ key: "products", label: "Product list" }];
  if (isStorageLocationFeatureActive()) list.push({ key: "locations", label: "Location list" });
  list.push({ key: "transactions", label: "Transaction list" });
  return list;
});

const activeTabIndex = ref(
  Math.max(
    0,
    tabs.value.findIndex((tab) => tab.key === String(route.query.tab))
  )
);

const activeTabKey = computed(() => tabs.value[activeTabIndex.value]?.key ?? "products");
const isDeleteModalOpen = ref(false);
const isLocationDrawerOpen = ref(false);
const actionError = ref("");

function goTo(id: number | null) {
  if (id) navigateTo(`/products/warehouse/${id}`);
}

function openTransaction(row: WarehouseTransactionRow) {
  navigateTo(
    row.kind === "adjustment"
      ? `/products/stock-adjustment/${row.id}`
      : `/products/warehouse-transfer/${row.id}`
  );
}

function openLocationDrawer() {
  isLocationDrawerOpen.value = true;
}

function onLocationCreated() {
  refreshTick.value++;
  // Land the user on the list they just added to.
  activeTabIndex.value = 1;
}

function onToggleActive() {
  if (!warehouse.value) return;
  const result = setWarehouseActive(warehouse.value.id, !warehouse.value.isActive);
  actionError.value = result.ok ? "" : (result.reason ?? "");
  refreshTick.value++;
}

function confirmDelete() {
  if (!warehouse.value) return;
  deleteProductRecords("warehouses", [warehouse.value.id]);
  isDeleteModalOpen.value = false;
  navigateTo("/products?tab=warehouses");
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
const dividerClass = css({ my: 6 });
const sectionHeadingClass = css({ fontSize: "lg", mb: 4 });
const metaGridClass = css({ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 });
const metaFieldClass = css({ display: "flex", flexDirection: "column", gap: 1, minWidth: "0" });
const wrapValueClass = css({ whiteSpace: "normal", wordBreak: "break-word" });

const relatedSectionClass = css({ mt: 8 });
const relatedBodyClass = css({ pt: 4 });
const relatedTableClass = css({ tableLayout: "auto", width: "full", minWidth: "640px" });
const tableHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
const numCellClass = css({ textAlign: "right" });
const wrapCellClass = css({ whiteSpace: "normal!", wordBreak: "break-word", textAlign: "left" });
const tabLabelClass = css({
  display: "inline-flex",
  alignItems: "center",
  gap: 2,
  whiteSpace: "nowrap"
});
const addLocationClass = css({ mt: 4 });
const scrollShadowClass = css({
  backgroundImage:
    "linear-gradient(to right, var(--mp-colors-white) 30%, transparent), linear-gradient(to left, var(--mp-colors-white) 30%, transparent), linear-gradient(to right, rgba(29,31,36,0.16), transparent), linear-gradient(to left, rgba(29,31,36,0.16), transparent)",
  backgroundPosition: "left center, right center, left center, right center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "36px 100%, 36px 100%, 12px 100%, 12px 100%",
  backgroundAttachment: "local, local, scroll, scroll"
});

const errorBannerClass = css({ mt: 4 });

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
