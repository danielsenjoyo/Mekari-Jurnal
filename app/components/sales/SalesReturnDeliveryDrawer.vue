<template>
  <MpDrawer :is-open="isOpen" placement="right" size="md" @close="onCancel">
    <MpDrawerOverlay />
    <MpDrawerContent>
      <MpDrawerHeader>
        <span :class="titleClass">Select the delivery to be returned</span>
        <MpDrawerCloseButton />
      </MpDrawerHeader>

      <MpDrawerBody>
        <MpText size="body-small" color="gray.600" :class="introClass">
          Only the deliveries this invoice bills for can be returned against. Leave every one
          unticked to return against the invoice as a whole.
        </MpText>

        <MpTableContainer>
          <MpTable :class="tableClass">
            <colgroup>
              <col style="width: 44px" />
              <col style="width: 22%" />
              <col style="width: 26%" />
              <col style="width: 16%" />
              <col style="width: 20%" />
            </colgroup>
            <MpTableHead :class="tableHeadClass">
              <MpTableRow>
                <MpTableCell as="th" :class="checkboxCellClass" />
                <MpTableCell as="th">Date</MpTableCell>
                <MpTableCell as="th">Number</MpTableCell>
                <MpTableCell as="th" :class="numCellClass">Products</MpTableCell>
                <MpTableCell as="th">Tracking no.</MpTableCell>
              </MpTableRow>
            </MpTableHead>
            <MpTableBody>
              <MpTableRow v-for="delivery in deliveries" :key="delivery.id">
                <MpTableCell as="td" :class="checkboxCellClass">
                  <MpCheckbox
                    :is-checked="draft.includes(delivery.id)"
                    @change="toggle(delivery.id)"
                  />
                </MpTableCell>
                <MpTableCell as="td">{{
                  formatDisplayDate(delivery.shippingDateSort || delivery.transactionDateSort)
                }}</MpTableCell>
                <MpTableCell as="td" :class="wrapCellClass">{{ delivery.number }}</MpTableCell>
                <MpTableCell as="td" :class="numCellClass">{{ delivery.lines.length }}</MpTableCell>
                <MpTableCell as="td" :class="wrapCellClass">{{
                  delivery.trackingNo || "—"
                }}</MpTableCell>
              </MpTableRow>

              <MpTableRow v-if="!deliveries.length">
                <MpTableCell as="td" :colspan="5" :class="emptyCellClass">
                  <MpText size="body-small" color="gray.600">
                    This invoice has no delivery to return against.
                  </MpText>
                </MpTableCell>
              </MpTableRow>
            </MpTableBody>
          </MpTable>
        </MpTableContainer>
      </MpDrawerBody>

      <MpDrawerFooter>
        <div :class="footerClass">
          <MpTextlink as="button" variant="primary" @click="draft = []">Reset</MpTextlink>
          <div :class="footerRightClass">
            <MpButton variant="ghost" @click="onCancel">Cancel</MpButton>
            <MpButton variant="primary" @click="onApply">Apply</MpButton>
          </div>
        </div>
      </MpDrawerFooter>
    </MpDrawerContent>
  </MpDrawer>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import {
  css,
  MpButton,
  MpCheckbox,
  MpDrawer,
  MpDrawerBody,
  MpDrawerCloseButton,
  MpDrawerContent,
  MpDrawerFooter,
  MpDrawerHeader,
  MpDrawerOverlay,
  MpTable,
  MpTableBody,
  MpTableCell,
  MpTableContainer,
  MpTableHead,
  MpTableRow,
  MpText,
  MpTextlink
} from "@mekari/pixel3";
import { formatDisplayDate, type SalesTransaction } from "~/data/sales-transactions";

// ---------------------------------------------------------------------------
// Picking which deliveries a Sales Return is raised against — the reference
// app's DeliverySelectionModal / PreviewDeliveryDrawer, whose own title this
// keeps ("Select the delivery to be returned").
//
// STAGED, like the filter drawer: everything here edits a local draft and only
// Apply hands it back. A live selection would re-cap every return quantity in
// the form behind the overlay, where the user cannot see what changed.
// ---------------------------------------------------------------------------

const props = defineProps<{
  isOpen: boolean;
  deliveries: SalesTransaction[];
  /** The selection currently applied to the form; the draft is seeded from it. */
  selected: number[];
}>();

const emit = defineEmits<{ close: []; apply: [deliveryIds: number[]] }>();

const draft = ref<number[]>([]);

// Re-seed each time it opens, so a cancelled edit leaves nothing behind.
watch(
  () => props.isOpen,
  (open) => {
    if (open) draft.value = [...props.selected];
  },
  { immediate: true }
);

function toggle(id: number) {
  draft.value = draft.value.includes(id)
    ? draft.value.filter((x) => x !== id)
    : [...draft.value, id];
}

function onCancel() {
  emit("close");
}
function onApply() {
  emit("apply", [...draft.value]);
}

// All css() below uses Pixel 3 token shortcuts only (token mode 2.1).
const titleClass = css({ fontSize: "lg" });
const introClass = css({ display: "block", mb: 4 });
const tableClass = css({ tableLayout: "fixed", width: "full" });
const tableHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
const checkboxCellClass = css({ width: "44px", pl: "3!", pr: "0!" });
const numCellClass = css({ textAlign: "right" });
// On a <td>: wrapping only — NEVER set `display` here, a table cell must stay
// `display: table-cell`.
const wrapCellClass = css({ whiteSpace: "normal!", wordBreak: "break-word", textAlign: "left" });
const emptyCellClass = css({ textAlign: "center", py: "6!" });
const footerClass = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 3,
  width: "full"
});
const footerRightClass = css({ display: "flex", gap: 2 });
</script>
