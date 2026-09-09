<template>
  <MpDrawer :is-open="isOpen" placement="right" size="md" @close="onCancel">
    <MpDrawerOverlay />
    <MpDrawerContent>
      <MpDrawerHeader>
        <span :class="titleClass">Filter report</span>
        <MpDrawerCloseButton />
      </MpDrawerHeader>

      <MpDrawerBody>
        <div :class="formClass">
          <MpFormControl>
            <MpFormLabel>Date range</MpFormLabel>
            <div :class="rangeRowClass">
              <MpDatePicker
                v-model="form.startDate"
                value-type="string"
                :format="DATE_INPUT_FORMAT"
                placeholder="Start date"
                use-portal
                @update:model-value="onDateEdited"
              />
              <MpText color="gray.600" :class="dashClass">-</MpText>
              <MpDatePicker
                v-model="form.endDate"
                value-type="string"
                :format="DATE_INPUT_FORMAT"
                placeholder="End date"
                use-portal
                @update:model-value="onDateEdited"
              />
            </div>
          </MpFormControl>

          <MpFormControl>
            <MpFormLabel>Period</MpFormLabel>
            <MpSelect
              :model-value="form.periodId"
              is-full-width
              @update:model-value="onPeriodChange"
            >
              <option v-for="period in SALES_REPORT_PERIODS" :key="period.id" :value="period.id">
                {{ period.label }}
              </option>
            </MpSelect>
          </MpFormControl>

          <MpFormControl v-if="shows('transactionType')">
            <MpFormLabel>Transaction type</MpFormLabel>
            <MpSelect v-model="form.transactionType" is-full-width>
              <option v-for="opt in SALES_REPORT_TYPE_OPTIONS" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </MpSelect>
          </MpFormControl>

          <!-- Production calls this "Date by": which of the two dates on a
               transaction the range above is measured against. -->
          <MpFormControl v-if="shows('dateBy')">
            <MpFormLabel>Date by</MpFormLabel>
            <MpSelect v-model="form.dateBy" is-full-width>
              <option v-for="opt in DATE_BY_OPTIONS" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </MpSelect>
          </MpFormControl>

          <MpFormControl v-if="shows('customers')">
            <MpFormLabel>Customer</MpFormLabel>
            <MpInputTag
              id="sales-report-filter-customers"
              :key="`customers-${draftKey}`"
              placeholder="All customers"
              :data="customerData"
              :suggestions="customerOptions"
              :max-row="-1"
              :is-enable-create-new-tag="false"
              :is-show-suggestions="true"
              :is-show-icon-chevron-down="true"
              @change="(data: TagChange[]) => (form.customers = readTags(data))"
            />
          </MpFormControl>

          <MpFormControl v-if="shows('statuses')">
            <MpFormLabel>Status</MpFormLabel>
            <MpInputTag
              id="sales-report-filter-statuses"
              :key="`statuses-${draftKey}`"
              placeholder="All statuses"
              :data="statusData"
              :suggestions="statusSuggestions"
              :max-row="-1"
              :is-enable-create-new-tag="false"
              :is-show-suggestions="true"
              :is-show-icon-chevron-down="true"
              @change="onStatusChange"
            />
          </MpFormControl>

          <MpFormControl v-if="shows('tags')">
            <MpFormLabel>Group with tag</MpFormLabel>
            <MpInputTag
              id="sales-report-filter-tags"
              :key="`tags-${draftKey}`"
              placeholder="Search tag..."
              :data="tagData"
              :suggestions="tagOptions"
              :max-row="-1"
              :is-enable-create-new-tag="false"
              :is-show-suggestions="true"
              :is-show-icon-chevron-down="true"
              @change="(data: TagChange[]) => (form.tags = readTags(data))"
            />
            <div :class="radioRowClass">
              <MpRadio id="sales-report-tag-logic-and" v-model="form.tagsLogic" value="and">
                Include all
              </MpRadio>
              <MpRadio id="sales-report-tag-logic-or" v-model="form.tagsLogic" value="or">
                <span :class="labelWithIconClass">
                  Either
                  <MpTooltip label="Showing one of all selected tags.">
                    <MpIcon name="info" size="sm" color="gray.600" />
                  </MpTooltip>
                </span>
              </MpRadio>
            </div>
          </MpFormControl>
        </div>
      </MpDrawerBody>

      <MpDrawerFooter>
        <div :class="footerClass">
          <MpTextlink as="button" variant="primary" @click="onReset">Reset filter</MpTextlink>
          <div :class="footerRightClass">
            <MpButton variant="ghost" @click="onCancel">Cancel</MpButton>
            <MpButton variant="primary" @click="onApply">Filter</MpButton>
          </div>
        </div>
      </MpDrawerFooter>
    </MpDrawerContent>
  </MpDrawer>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import {
  css,
  MpButton,
  MpDatePicker,
  MpDrawer,
  MpDrawerBody,
  MpDrawerCloseButton,
  MpDrawerContent,
  MpDrawerFooter,
  MpDrawerHeader,
  MpDrawerOverlay,
  MpFormControl,
  MpFormLabel,
  MpIcon,
  MpInputTag,
  MpRadio,
  MpSelect,
  MpText,
  MpTextlink,
  MpTooltip
} from "@mekari/pixel3";
import {
  DATE_BY_OPTIONS,
  SALES_REPORT_PERIODS,
  SALES_REPORT_STATUS_OPTIONS,
  SALES_REPORT_TYPE_OPTIONS,
  salesReportCustomers,
  salesReportTags
} from "~/data/sales-report";
import { defaultSalesReportFilter, type SalesReportFilter } from "~/data/sales-report-filter";
import { SALES_STATUS_LABEL, type SalesStatus } from "~/data/sales-status";
import { DATE_INPUT_FORMAT, isoToDmy } from "~/utils/dates";

/**
 * The Sales reports' "More filter" drawer — the AR mirror of
 * `PurchaseReportFilterDrawer`. Kept as its own component for the reason given
 * at the top of `~/data/sales-report`: the two modules' criteria can diverge
 * (Sales filters by customer over eight transaction types) without either
 * editing the other. The domain-neutral chrome around it — the filter bar, the
 * table, the pager, the blank slate — is shared.
 */

/** Fields a report can offer. Not every report has a referent for each one. */
export type SalesReportFilterField =
  | "transactionType"
  | "dateBy"
  | "customers"
  | "statuses"
  | "tags";

const props = withDefaults(
  defineProps<{
    isOpen: boolean;
    /** The filter currently applied to the report; the draft is seeded from it. */
    applied: SalesReportFilter;
    /**
     * Which fields this report shows. Delivery fixes its transaction type, and
     * a product aggregate has no single status — a control that can only ever
     * match everything reads as broken, so it is dropped rather than shown
     * inert (docs/patterns/Drawer.md § Gotchas).
     */
    fields?: SalesReportFilterField[];
  }>(),
  // Inlined, not a module const: a defineProps default is hoisted out of
  // setup(), so it cannot reference a locally declared binding.
  { fields: () => ["transactionType", "dateBy", "customers", "statuses", "tags"] }
);

function shows(field: SalesReportFilterField): boolean {
  return props.fields.includes(field);
}

const emit = defineEmits<{ close: []; apply: [filter: SalesReportFilter] }>();

const form = reactive<SalesReportFilter>(defaultSalesReportFilter());

interface TagChange {
  value?: string;
  text?: string;
}

const customerOptions = salesReportCustomers();
const tagOptions = salesReportTags();
const statusSuggestions = SALES_REPORT_STATUS_OPTIONS.map((s) => s.label);

/**
 * MpInputTag keeps its own internal chip list, so it is seeded through `data`
 * and re-mounted whenever the draft is replaced from outside (open / reset).
 * Without the re-mount, Reset clears the model while the chips stay on screen.
 */
const draftKey = ref(0);

function chips(values: string[]) {
  return values.map((value) => ({
    id: `chip-${value}`,
    text: value,
    value,
    isInvalid: false,
    isReadOnly: false
  }));
}

const customerData = computed(() => chips(form.customers));
const tagData = computed(() => chips(form.tags));
const statusData = computed(() => chips(form.statuses.map((s) => SALES_STATUS_LABEL[s])));

function readTags(data: TagChange[]): string[] {
  return (data ?? []).map((item) => String(item.value ?? item.text ?? "")).filter(Boolean);
}

function onStatusChange(data: TagChange[]) {
  const labels = new Set(readTags(data));
  form.statuses = SALES_REPORT_STATUS_OPTIONS.filter((s) => labels.has(s.label)).map(
    (s) => s.value as SalesStatus
  );
}

function loadDraft(source: SalesReportFilter) {
  Object.assign(form, {
    ...source,
    customers: [...source.customers],
    statuses: [...source.statuses],
    tags: [...source.tags]
  });
  draftKey.value += 1;
}

// Re-seed each time it opens, so a cancelled edit leaves nothing behind.
watch(
  () => props.isOpen,
  (open) => {
    if (open) loadDraft(props.applied);
  },
  { immediate: true }
);

/** Picking a preset fills both dates; "Custom" leaves whatever is there. */
function onPeriodChange(id: string) {
  form.periodId = id;
  const bounds = SALES_REPORT_PERIODS.find((p) => p.id === id)?.range?.();
  if (!bounds) return;
  form.startDate = isoToDmy(bounds.start);
  form.endDate = isoToDmy(bounds.end);
}

/** Editing either date by hand means the range is no longer a named preset. */
function onDateEdited() {
  form.periodId = "custom";
}

function onReset() {
  loadDraft(defaultSalesReportFilter());
}

function onCancel() {
  emit("close");
}

function onApply() {
  emit("apply", {
    ...form,
    customers: [...form.customers],
    statuses: [...form.statuses],
    tags: [...form.tags]
  });
}

// All css() below uses Pixel 3 token shortcuts only (token mode 2.1).
const titleClass = css({ fontSize: "lg" });
const formClass = css({ display: "flex", flexDirection: "column", gap: 5 });
const rangeRowClass = css({
  display: "flex",
  alignItems: "center",
  gap: 3,
  "& > *": { flex: "1 1 0", minWidth: "0" }
});
const dashClass = css({ flex: "none!" });
const radioRowClass = css({
  display: "flex",
  alignItems: "center",
  gap: 6,
  flexWrap: "wrap",
  mt: 3
});
const labelWithIconClass = css({ display: "inline-flex", alignItems: "center", gap: 1 });
const footerClass = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 3,
  width: "full"
});
const footerRightClass = css({ display: "flex", gap: 2 });
</script>
