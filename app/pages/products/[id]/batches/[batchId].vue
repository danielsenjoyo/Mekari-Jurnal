<template>
  <DefaultPageContent
    :title="batch ? batch.number : 'Batch not found'"
    breadcrumb="Product details"
    :breadcrumb-to="`/products/detail/${productId}`"
  >
    <template v-if="batch?.isArchived" #title-badge>
      <MpBadge for="additionalInformation" type="announcement">Archived</MpBadge>
    </template>

    <BlankSlate
      v-if="!batch || !product"
      title="Batch not found"
      description="This batch may have been deleted, or the link you followed may be out of date."
    >
      <MpButton variant="secondary" @click="navigateTo('/products')">Back to Product list</MpButton>
    </BlankSlate>

    <template v-else>
      <!-- Zone A. A batch's headline figure is its own stock, not the
           product's — the whole reason the page exists is that the two differ
           per intake. -->
      <div :class="topRowClass">
        <div :class="metaFieldClass">
          <MpText color="gray.600">Product name</MpText>
          <MpTextlink
            :class="textlinkAlignClass"
            as="button"
            variant="primary"
            @click="navigateTo(`/products/detail/${product.id}`)"
          >
            {{ product.name }}
          </MpTextlink>
        </div>

        <div :class="metaFieldClass">
          <MpText color="gray.600">Expiration date</MpText>
          <MpFlex align-items="center" gap="2">
            <MpText>
              {{ batch.expirationDate ? formatDisplayDate(batch.expirationDate) : "—" }}
            </MpText>
            <!-- An expired batch is the one fact on this page a user has to
                 act on, so it is called out rather than left to be worked out
                 from the date. -->
            <MpBadge v-if="isExpired" for="tableStatus" type="critical">Expired</MpBadge>
          </MpFlex>
        </div>

        <div :class="headlineColClass">
          <MpText weight="semiBold" color="dark">
            Batch stock on hand {{ formatQuantity(batch.onHand) }} {{ product.unit }}
          </MpText>
          <MpText size="body-small" color="gray.600">
            Available batch qty {{ formatQuantity(batch.available) }} {{ product.unit }}
          </MpText>
        </div>
      </div>

      <MpText size="body-small" color="gray.600" :class="asOfClass">
        Data below are based on {{ formatDisplayDate(todayIso) }} unless stated otherwise
      </MpText>

      <MpDivider variant="dashed" :class="dividerClass" />

      <div :class="descriptionFieldClass">
        <MpText color="gray.600">Description</MpText>
        <MpText :class="descriptionValueClass">{{ batch.description || "—" }}</MpText>
      </div>

      <div :class="relatedSectionClass">
        <MpTabs v-model="activeTabIndex" variant-color="blue">
          <MpTabList>
            <MpTab><span :class="tabLabelClass">Batch transactions</span></MpTab>
            <MpTab><span :class="tabLabelClass">Warehouse info</span></MpTab>
          </MpTabList>
        </MpTabs>

        <div v-if="activeTabIndex === 0" :class="relatedBodyClass">
          <MpTableContainer v-if="transactions.length" :class="scrollShadowClass">
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
            This batch has no recorded movements yet.
          </MpText>
        </div>

        <div v-else :class="relatedBodyClass">
          <MpTableContainer v-if="warehouseStock.length">
            <MpTable :class="relatedTableClass">
              <MpTableHead is-fixed :class="tableHeadClass">
                <MpTableRow>
                  <MpTableCell as="th">Warehouse name</MpTableCell>
                  <MpTableCell as="th" :class="numCellClass">Batch stock on hand</MpTableCell>
                  <MpTableCell as="th" :class="numCellClass">Available batch qty</MpTableCell>
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
            No warehouse holds stock from this batch.
          </MpText>
        </div>
      </div>

      <!-- No Delete: a batch is a record of stock that physically arrived, so
           the source only ever archives one. The bar keeps the same shape as
           every other detail page, with the left slot empty. -->
      <div :class="bottomActionsClass">
        <div />
        <MpButton variant="secondary" @click="toggleArchive">
          {{ batch.isArchived ? "Unarchive" : "Archive" }}
        </MpButton>
      </div>
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
  MpTextlink
} from "@mekari/pixel3";
import DefaultPageContent from "~/components/template/DefaultPageContent.vue";
import { formatDisplayDate, formatQuantity, getProductById, todayIsoDate } from "~/data/products";
import {
  getBatchById,
  getBatchTransactions,
  getBatchWarehouseStock,
  PRODUCT_TRANSACTION_TYPE_LABEL
} from "~/data/product-records";
import { textlinkAlignClass } from "~/utils/textlink-align";

// ---------------------------------------------------------------------------
// Batch detail. Cloned from jurnal-frontend-app
// src/pages/products/batches/show.vue.
//
// Reached from a batch-tracked product's "Batch info" tab; there is no batch
// list of its own, there or here — a batch only ever makes sense under the
// product it belongs to, which is why the route nests under it.
// ---------------------------------------------------------------------------

const route = useRoute();
const productId = computed(() => Number(route.params.id));
const batchId = computed(() => Number(route.params.batchId));

const refreshTick = ref(0);
const product = computed(() => getProductById(productId.value));
const batch = computed(() => {
  void refreshTick.value;
  return getBatchById(productId.value, batchId.value);
});

useHead({
  title: computed(() =>
    batch.value ? `${batch.value.number} — Mekari Jurnal` : "Batch not found — Mekari Jurnal"
  )
});

const todayIso = todayIsoDate();
const isExpired = computed(
  () => Boolean(batch.value?.expirationDate) && batch.value!.expirationDate < todayIso
);

const transactions = computed(() => (batch.value ? getBatchTransactions(batch.value) : []));
const warehouseStock = computed(() => (batch.value ? getBatchWarehouseStock(batch.value) : []));

const activeTabIndex = ref(0);

function signedQuantity(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatQuantity(Math.abs(value))}`;
}

function toggleArchive() {
  if (!batch.value) return;
  batch.value.isArchived = !batch.value.isArchived;
  refreshTick.value++;
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
const metaFieldClass = css({ display: "flex", flexDirection: "column", gap: 1, minWidth: "0" });
const descriptionFieldClass = css({
  display: "flex",
  flexDirection: "column",
  gap: 1,
  maxWidth: "640px"
});
const descriptionValueClass = css({ whiteSpace: "normal", wordBreak: "break-word" });

const relatedSectionClass = css({ mt: 8 });
const relatedBodyClass = css({ pt: 4 });
const relatedTableClass = css({ tableLayout: "auto", width: "full", minWidth: "720px" });
const tableHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
const numCellClass = css({ textAlign: "right" });
const wrapCellClass = css({ whiteSpace: "normal!", wordBreak: "break-word", textAlign: "left" });
const tabLabelClass = css({
  display: "inline-flex",
  alignItems: "center",
  gap: 2,
  whiteSpace: "nowrap"
});
const scrollShadowClass = css({
  backgroundImage:
    "linear-gradient(to right, var(--mp-colors-white) 30%, transparent), linear-gradient(to left, var(--mp-colors-white) 30%, transparent), linear-gradient(to right, rgba(29,31,36,0.16), transparent), linear-gradient(to left, rgba(29,31,36,0.16), transparent)",
  backgroundPosition: "left center, right center, left center, right center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "36px 100%, 36px 100%, 12px 100%, 12px 100%",
  backgroundAttachment: "local, local, scroll, scroll"
});

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
