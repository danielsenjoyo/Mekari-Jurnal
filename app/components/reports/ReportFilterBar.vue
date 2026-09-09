<template>
  <div :class="filterBarClass">
    <div :class="dateFieldClass">
      <MpFormControl>
        <MpFormLabel>Start date</MpFormLabel>
        <MpDatePicker
          :model-value="startDate"
          value-type="string"
          :format="DATE_INPUT_FORMAT"
          placeholder="DD/MM/YYYY"
          use-portal
          @update:model-value="onDate('startDate', $event)"
        />
      </MpFormControl>
    </div>

    <div :class="dateFieldClass">
      <MpFormControl>
        <MpFormLabel>End date</MpFormLabel>
        <MpDatePicker
          :model-value="endDate"
          value-type="string"
          :format="DATE_INPUT_FORMAT"
          placeholder="DD/MM/YYYY"
          use-portal
          @update:model-value="onDate('endDate', $event)"
        />
      </MpFormControl>
    </div>

    <div :class="periodFieldClass">
      <MpFormControl>
        <MpFormLabel>Period</MpFormLabel>
        <MpSelect :model-value="periodId" is-full-width @update:model-value="onPeriod">
          <option v-for="period in periods" :key="period.id" :value="period.id">
            {{ period.label }}
          </option>
        </MpSelect>
      </MpFormControl>
    </div>

    <!-- Anything a single report adds to the bar (a group-by, a sort-by) goes
         here, so it lands between the period and the buttons rather than
         wrapping onto a line of its own. -->
    <slot />

    <MpButton variant="primary" :is-disabled="!isValid" @click="$emit('run')">Filter</MpButton>

    <div :class="moreFilterClass">
      <MpButton variant="secondary" left-icon="filter" @click="$emit('open-drawer')">
        More filter
      </MpButton>
      <!-- The drawer closes over its own settings, so mark the button while
           anything in it is set (docs/patterns/Drawer.md). -->
      <span v-if="isFilterActive" :class="filterDotClass" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { css, MpButton, MpDatePicker, MpFormControl, MpFormLabel, MpSelect } from "@mekari/pixel3";
import type { ReportPeriod } from "~/data/report-period";
import { isoToDmy, DATE_INPUT_FORMAT } from "~/utils/dates";

/**
 * The control row every report page opens with: a date range, a period preset,
 * the **Filter** button that actually runs the report, and **More filter**
 * which opens the page's own drawer.
 *
 * There is no keyword search — a report is narrowed by criteria, not by text
 * (`docs/patterns/reports-page-format.md`).
 *
 * Uncontrolled-by-design: it emits the field the user touched rather than
 * mutating a filter object, so each page keeps ownership of its own filter
 * shape (which differs per report) while sharing this chrome.
 */
const props = defineProps<{
  startDate: string;
  endDate: string;
  periodId: string;
  /**
   * The presets this report offers. Passed in rather than imported: each module
   * resolves its presets against its **own** fixture "today"
   * (`~/data/report-period`), and shared chrome must not reach into one
   * module's dataset to serve another's page.
   */
  periods: ReportPeriod[];
  /** Both ends of the range parse — production disables Filter on the same test. */
  isValid: boolean;
  /** Anything set in the drawer — drives the dot. */
  isFilterActive?: boolean;
}>();

const emit = defineEmits<{
  "update:startDate": [value: string];
  "update:endDate": [value: string];
  "update:periodId": [value: string];
  run: [];
  "open-drawer": [];
}>();

/** Editing either date by hand means the range is no longer a named preset. */
function onDate(field: "startDate" | "endDate", value: string) {
  if (field === "startDate") emit("update:startDate", value);
  else emit("update:endDate", value);
  emit("update:periodId", "custom");
}

/** Picking a preset fills both dates; "Custom" leaves whatever is there. */
function onPeriod(id: string) {
  emit("update:periodId", id);
  const bounds = props.periods.find((p) => p.id === id)?.range?.();
  if (!bounds) return;
  emit("update:startDate", isoToDmy(bounds.start));
  emit("update:endDate", isoToDmy(bounds.end));
}

// One `flex-end` row, no space-between: the buttons act on the controls beside
// them, so they stay beside them.
const filterBarClass = css({
  display: "flex",
  alignItems: "flex-end",
  gap: 3,
  flexWrap: "wrap",
  mb: 5
});
// 180px, not 160: MpDatePicker's calendar addon eats into the field, and at
// 160 the DD/MM/YYYY value clipped mid-year ("01/07/20…").
const dateFieldClass = css({ width: "180px" });
const periodFieldClass = css({ width: "180px" });

const moreFilterClass = css({ position: "relative" });
const filterDotClass = css({
  position: "absolute",
  top: "-2px",
  right: "-2px",
  width: "2",
  height: "2",
  rounded: "full",
  bg: "red.400",
  borderWidth: "sm",
  borderColor: "white"
});
</script>
