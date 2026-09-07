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
}>();

defineEmits<{ clear: [] }>();

const title = computed(() =>
  props.hasRun ? "There was no report data on this date/period" : "Report will appear here"
);
const description = computed(() =>
  props.hasRun
    ? "Recheck the filter or select another date/period."
    : "Select dates or period, then click the Filter button."
);
const canClear = computed(() => props.hasRun && Boolean(props.isFilterActive));
</script>
