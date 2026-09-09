<template>
  <MpModal :is-open="isOpen" size="lg" is-centered @close="emit('close')">
    <MpModalOverlay />
    <MpModalContent>
      <MpModalHeader>
        <div :class="headerClass">
          <MpText size="body-small" weight="semiBold" color="gray.600">{{ subject }}</MpText>
          <span :class="titleClass">Audit log</span>
        </div>
        <MpModalCloseButton />
      </MpModalHeader>

      <MpModalBody>
        <MpTableContainer :class="scrollClass">
          <MpTable :class="tableFixedClass">
            <colgroup>
              <col style="width: 20%" />
              <col style="width: 24%" />
              <col style="width: 22%" />
              <col style="width: 34%" />
            </colgroup>
            <MpTableHead :class="tableHeadClass">
              <MpTableRow>
                <MpTableCell as="th">Date</MpTableCell>
                <MpTableCell as="th">Action</MpTableCell>
                <MpTableCell as="th">User</MpTableCell>
                <MpTableCell as="th">Details</MpTableCell>
              </MpTableRow>
            </MpTableHead>
            <MpTableBody>
              <MpTableRow v-for="(entry, index) in logs" :key="`${entry.date}-${index}`">
                <MpTableCell as="td">{{ formatDisplayDate(entry.date) }}</MpTableCell>
                <MpTableCell as="td" :class="wrapCellClass">{{ entry.action }}</MpTableCell>
                <MpTableCell as="td" :class="wrapCellClass">{{ entry.user }}</MpTableCell>
                <MpTableCell as="td" :class="wrapCellClass">{{ entry.detail }}</MpTableCell>
              </MpTableRow>
            </MpTableBody>
          </MpTable>
        </MpTableContainer>

        <MpText size="body-small" color="gray.600" :class="footnoteClass">
          Time is shown in GMT +7.
        </MpText>
      </MpModalBody>

      <MpModalFooter>
        <div :class="footerClass">
          <MpButton variant="secondary" @click="emit('close')">Close</MpButton>
        </div>
      </MpModalFooter>
    </MpModalContent>
  </MpModal>
</template>

<script setup lang="ts">
import {
  css,
  MpButton,
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
  MpText
} from "@mekari/pixel3";
import { formatDisplayDate, type FulfillmentLogEntry } from "~/data/fulfillment";

/**
 * The audit trail behind the "Last updated by …" link.
 *
 * Cloned from jurnal-frontend-app
 * `src/pages/outbounds/components/audit-modal`, which all six of its
 * fulfillment detail pages share. Same four columns (Date / Action / User /
 * Details) and the same "Time is shown in …" footnote.
 *
 * Two differences from the source, both because of what this prototype is:
 * the entries come from the record rather than an endpoint (they are written
 * by the lifecycle helpers in `~/data/fulfillment`, so the trail cannot
 * disagree with the record), and `Details` renders as text. The source binds
 * that cell with `v-html` against a server-rendered diff string — which is an
 * XSS surface, and there is nothing here that needs markup.
 */
defineProps<{
  isOpen: boolean;
  /** What the log is about — shown above the title, e.g. the order number. */
  subject: string;
  logs: FulfillmentLogEntry[];
}>();

const emit = defineEmits<{ close: [] }>();

const headerClass = css({ display: "flex", flexDirection: "column", gap: 0 });
const titleClass = css({ fontSize: "lg" });
// 360px, matching the source's own cap: enough for eight or so entries before
// the list scrolls inside the modal rather than growing it past the viewport.
const scrollClass = css({ maxHeight: "360px", overflowY: "auto" });
const tableFixedClass = css({ tableLayout: "fixed", width: "full" });
const tableHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
// On a <td>: wrapping only — a table cell must stay `display: table-cell`.
const wrapCellClass = css({ whiteSpace: "normal!", wordBreak: "break-word", textAlign: "left" });
const footnoteClass = css({ display: "block", mt: 3 });
const footerClass = css({ display: "flex", justifyContent: "flex-end", gap: 2 });
</script>
