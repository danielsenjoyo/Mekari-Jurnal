<template>
  <BlankSlate :variant="hasRun ? 'not-found' : 'no-data'" :title="title" :description="description">
    <MpButton v-if="canClear" variant="secondary" @click="$emit('clear')">Clear filters</MpButton>
  </BlankSlate>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { MpButton } from "@mekari/pixel3";

/**
 * A report's two empty states, in one block (`docs/patterns/BlankSlate.md`):
 * it hasn't been run yet, or it ran and matched nothing. Copy is verbatim from
 * production.
 *
 * The second state gets a **Clear filters** button whenever the drawer filter
 * is active — a staged drawer closes over its own criteria, so an empty table
 * would otherwise have no visible cause and no way out.
 */
const props = defineProps<{
  hasRun: boolean;
  /** Whether anything in the staged drawer is set — gates the Clear button. */
  isFilterActive?: boolean;
  /**
   * Match the page's `ReportFilterBar` mode. Production's copy names the two
   * controls it expects you to touch ("Select dates or period"), and an
   * as-of-date report has neither — pointing at a period select that isn't on
   * screen is worse than no instruction at all.
   */
  mode?: "range" | "as-of";
}>();

defineEmits<{ clear: [] }>();

const isAsOf = computed(() => props.mode === "as-of");

const title = computed(() => {
  if (!props.hasRun) return "Report will appear here";
  return isAsOf.value
    ? "There was no report data on this date"
    : "There was no report data on this date/period";
});
const description = computed(() => {
  if (!props.hasRun) {
    return isAsOf.value
      ? "Select a date, then click the Filter button."
      : "Select dates or period, then click the Filter button.";
  }
  return isAsOf.value
    ? "Recheck the filter or select another date."
    : "Recheck the filter or select another date/period.";
});
const canClear = computed(() => props.hasRun && Boolean(props.isFilterActive));
</script>
