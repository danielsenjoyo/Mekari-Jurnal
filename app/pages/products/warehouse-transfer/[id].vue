<template>
  <DefaultPageContent
    :title="record ? record.number : 'Warehouse transfer not found'"
    :breadcrumb="isPending ? 'Require approval' : 'Warehouse transfer list'"
    :breadcrumb-to="
      isPending ? '/products?tab=warehouse_transfers_approval' : '/products?tab=warehouse_transfers'
    "
  >
    <template v-if="isPending" #title-badge>
      <MpBadge for="tableStatus" type="warning">Awaiting approval</MpBadge>
    </template>

    <template v-if="record && !isPending" #actions>
      <MpTooltip label="Previous transfer">
        <MpButton
          variant="ghost"
          size="sm"
          left-icon="chevrons-left"
          aria-label="Previous transfer"
          :is-disabled="!adjacent.prevId"
          @click="goTo(adjacent.prevId)"
        />
      </MpTooltip>
      <MpTooltip label="Next transfer">
        <MpButton
          variant="ghost"
          size="sm"
          left-icon="chevrons-right"
          aria-label="Next transfer"
          :is-disabled="!adjacent.nextId"
          @click="goTo(adjacent.nextId)"
        />
      </MpTooltip>
    </template>

    <BlankSlate
      v-if="!record"
      title="Warehouse transfer not found"
      description="This transaction may have been deleted, or the link you followed may be out of date."
    >
      <MpButton variant="secondary" @click="navigateTo('/products?tab=warehouse_transfers')">
        Back to Warehouse transfer list
      </MpButton>
    </BlankSlate>

    <template v-else>
      <!-- Zone A. A transfer's identity is where it goes from and to; the
           headline is how much moved. -->
      <div :class="topRowClass">
        <div :class="metaFieldClass">
          <MpText color="gray.600">From warehouse</MpText>
          <MpTextlink
            v-if="fromWarehouseId"
            :class="textlinkAlignClass"
            as="button"
            variant="primary"
            @click="navigateTo(`/products/warehouse/${fromWarehouseId}`)"
          >
            {{ record.fromWarehouse }}
          </MpTextlink>
          <MpText v-else>{{ record.fromWarehouse || "—" }}</MpText>
        </div>

        <div :class="metaFieldClass">
          <MpText color="gray.600">To warehouse</MpText>
          <MpTextlink
            v-if="toWarehouseId"
            :class="textlinkAlignClass"
            as="button"
            variant="primary"
            @click="navigateTo(`/products/warehouse/${toWarehouseId}`)"
          >
            {{ record.toWarehouse }}
          </MpTextlink>
          <MpText v-else>{{ record.toWarehouse || "—" }}</MpText>
        </div>

        <div :class="headlineColClass">
          <MpText weight="semiBold" color="dark">
            {{ formatCount(record.lines.length) }} product{{ record.lines.length === 1 ? "" : "s" }}
            transferred
          </MpText>
          <MpText size="body-small" color="gray.600">
            {{ formatQuantity(totalQuantity) }} unit{{ totalQuantity === 1 ? "" : "s" }} in total
          </MpText>
        </div>
      </div>

      <MpDivider variant="dashed" :class="dividerClass" />

      <div :class="metaGridClass">
        <div :class="metaFieldClass">
          <MpText color="gray.600">Date</MpText>
          <MpText>{{ formatDisplayDate(record.date) }}</MpText>
        </div>
        <div :class="metaFieldClass">
          <MpText color="gray.600">Memo</MpText>
          <MpText :class="wrapValueClass">{{ record.memo || "—" }}</MpText>
        </div>
        <div />
      </div>

      <MpText weight="semiBold" color="dark" :class="sectionHeadingClass">
        Transferred products
      </MpText>
      <MpTableContainer :class="scrollShadowClass">
        <MpTable :class="lineTableClass">
          <MpTableHead is-fixed :class="tableHeadClass">
            <MpTableRow>
              <MpTableCell as="th">Product name</MpTableCell>
              <MpTableCell as="th" :class="numCellClass">Qty at source</MpTableCell>
              <MpTableCell as="th" :class="numCellClass">Total transfer</MpTableCell>
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <MpTableRow v-for="line in record.lines" :key="line.productId">
              <MpTableCell as="td" :class="wrapCellClass">
                <MpTextlink
                  :class="textlinkCellClass"
                  as="button"
                  variant="primary"
                  @click="navigateTo(`/products/detail/${line.productId}`)"
                >
                  {{ line.name }}
                </MpTextlink>
              </MpTableCell>
              <MpTableCell as="td" :class="[wrapCellClass, numCellClass]">
                {{ formatQuantity(line.quantityAtSource) }} {{ line.unit }}
              </MpTableCell>
              <MpTableCell as="td" :class="[wrapCellClass, numCellClass]">
                {{ formatQuantity(line.quantity) }} {{ line.unit }}
              </MpTableCell>
            </MpTableRow>
          </MpTableBody>
        </MpTable>
      </MpTableContainer>

      <div :class="bottomActionsClass">
        <template v-if="isPending">
          <div />
          <MpButton variant="primary" @click="isApproveModalOpen = true">Approve</MpButton>
        </template>
        <template v-else>
          <MpButton variant="ghost" @click="isDeleteModalOpen = true">Delete</MpButton>
          <MpFlex gap="2">
            <MpButton
              variant="secondary"
              @click="navigateTo(`/products/warehouse-transfer/edit/${record.id}`)"
            >
              Edit
            </MpButton>
            <!-- The source's one extra action: transfers repeat between the
                 same two sites, so duplicating beats retyping the lines. -->
            <MpButton variant="primary" @click="onClone">Duplicate transfer</MpButton>
          </MpFlex>
        </template>
      </div>

      <MpModal
        id="transfer-delete-modal"
        :is-open="isDeleteModalOpen"
        size="sm"
        @close="isDeleteModalOpen = false"
      >
        <MpModalOverlay />
        <MpModalContent>
          <MpModalHeader>
            <span :class="modalTitleClass">Delete warehouse transfer?</span>
            <MpModalCloseButton />
          </MpModalHeader>
          <MpModalBody>
            <MpText size="body" color="gray.700">
              Once deleted, <strong>{{ record.number }}</strong> cannot be restored.
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

      <MpModal
        id="transfer-approve-modal"
        :is-open="isApproveModalOpen"
        size="sm"
        @close="isApproveModalOpen = false"
      >
        <MpModalOverlay />
        <MpModalContent>
          <MpModalHeader>
            <span :class="modalTitleClass">Approve {{ record.number }}?</span>
            <MpModalCloseButton />
          </MpModalHeader>
          <MpModalBody>
            <MpText size="body" color="gray.700">
              The approved transaction will move to the warehouse transfer list.
            </MpText>
          </MpModalBody>
          <MpModalFooter>
            <div :class="modalFooterClass">
              <MpButton variant="secondary" @click="isApproveModalOpen = false">Cancel</MpButton>
              <MpButton variant="primary" @click="confirmApprove">Approve</MpButton>
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
  MpTable,
  MpTableBody,
  MpTableCell,
  MpTableContainer,
  MpTableHead,
  MpTableRow,
  MpText,
  MpTextlink,
  MpTooltip
} from "@mekari/pixel3";
import DefaultPageContent from "~/components/template/DefaultPageContent.vue";
import {
  approveWarehouseTransfers,
  deleteProductRecords,
  formatCount,
  formatDisplayDate,
  formatQuantity,
  getAdjacentTransferIds,
  getWarehouseApprovalById,
  getWarehouses,
  getWarehouseTransferById
} from "~/data/products";
import { textlinkAlignClass, textlinkCellClass } from "~/utils/textlink-align";

// Warehouse transfer detail. Cloned from jurnal-frontend-app
// src/pages/warehouse-transfers/detail/index.vue. Like the stock-adjustment
// page, one route serves both the committed list and the approval queue — the
// record is identical, only the decision available on it differs.

const route = useRoute();
const recordId = computed(() => Number(route.params.id));

const refreshTick = ref(0);
const committed = computed(() => {
  void refreshTick.value;
  return getWarehouseTransferById(recordId.value);
});
const pending = computed(() => {
  void refreshTick.value;
  return getWarehouseApprovalById(recordId.value);
});

const isPending = computed(() => !committed.value && Boolean(pending.value));
const record = computed(() => committed.value ?? pending.value);

useHead({
  title: computed(() =>
    record.value
      ? `${record.value.number} — Mekari Jurnal`
      : "Warehouse transfer not found — Mekari Jurnal"
  )
});

const adjacent = computed(() => getAdjacentTransferIds(recordId.value));

/** The warehouses are stored by name, so the links resolve back to an id. A
 *  name with no matching record (a warehouse since deleted) renders as text
 *  rather than a link to nowhere. */
function warehouseIdFor(name: string): number | undefined {
  return getWarehouses().find((warehouse) => warehouse.name === name)?.id;
}
const fromWarehouseId = computed(() => warehouseIdFor(record.value?.fromWarehouse ?? ""));
const toWarehouseId = computed(() => warehouseIdFor(record.value?.toWarehouse ?? ""));

const totalQuantity = computed(() =>
  (record.value?.lines ?? []).reduce((sum, line) => sum + line.quantity, 0)
);

const isDeleteModalOpen = ref(false);
const isApproveModalOpen = ref(false);

function goTo(id: number | null) {
  if (id) navigateTo(`/products/warehouse-transfer/${id}`);
}

/** Cloning opens the form pre-filled from this record rather than copying it
 *  straight into the list — a transfer that repeats still needs its date and
 *  quantities reviewed before it is committed. */
function onClone() {
  navigateTo(`/products/warehouse-transfer/new?from=${recordId.value}`);
}

function confirmDelete() {
  if (!record.value) return;
  deleteProductRecords("warehouse_transfers", [record.value.id]);
  isDeleteModalOpen.value = false;
  navigateTo("/products?tab=warehouse_transfers");
}

function confirmApprove() {
  if (!record.value) return;
  approveWarehouseTransfers([record.value.id]);
  isApproveModalOpen.value = false;
  refreshTick.value++;
  navigateTo(`/products/warehouse-transfer/${recordId.value}`);
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
const sectionHeadingClass = css({ fontSize: "lg", mt: 8, mb: 4 });
const metaGridClass = css({ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 });
const metaFieldClass = css({ display: "flex", flexDirection: "column", gap: 1, minWidth: "0" });
const wrapValueClass = css({ whiteSpace: "normal", wordBreak: "break-word" });

const tableHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
const lineTableClass = css({ tableLayout: "auto", width: "full", minWidth: "620px" });
const numCellClass = css({ textAlign: "right" });
const wrapCellClass = css({ whiteSpace: "normal!", wordBreak: "break-word", textAlign: "left" });
const scrollShadowClass = css({
  backgroundImage:
    "linear-gradient(to right, var(--mp-colors-white) 30%, transparent), linear-gradient(to left, var(--mp-colors-white) 30%, transparent), linear-gradient(to right, rgba(29,31,36,0.16), transparent), linear-gradient(to left, rgba(29,31,36,0.16), transparent)",
  backgroundPosition: "left center, right center, left center, right center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "36px 100%, 36px 100%, 12px 100%, 12px 100%",
  backgroundAttachment: "local, local, scroll, scroll"
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
