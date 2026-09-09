<template>
  <div :class="rootClass">
    <MpFlex align-items="center" gap="2">
      <MpButton
        variant="ghost"
        size="sm"
        left-icon="minus-circular"
        :aria-label="`Decrease ${label}`"
        :is-disabled="isDisabled || modelValue <= min"
        @click="step(-1)"
      />
      <MpFormControl :is-invalid="isOverMax" :is-disabled="isDisabled" :class="fieldClass">
        <MpInput
          :model-value="text"
          :aria-label="label"
          inputmode="numeric"
          @update:model-value="onType"
          @focusout="onCommit"
        />
      </MpFormControl>
      <MpButton
        variant="ghost"
        size="sm"
        left-icon="add-circular"
        :aria-label="`Increase ${label}`"
        :is-disabled="isDisabled || modelValue >= max"
        @click="step(1)"
      />
    </MpFlex>
    <!-- The error sits outside MpFormControl rather than in an
         MpFormErrorMessage: the control wraps only the input, so its message
         would be trapped in a 72px-wide box between the two step buttons. -->
    <MpText v-if="isOverMax" size="body-small" color="red.400" :class="messageClass">
      {{ overMaxMessage }}
    </MpText>
    <MpText v-else-if="helpText" size="body-small" color="gray.600" :class="messageClass">
      {{ helpText }}
    </MpText>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { css, MpButton, MpFlex, MpFormControl, MpInput, MpText } from "@mekari/pixel3";

/**
 * The `− [n] +` quantity control the Fulfillment drawers use to say how much of
 * a line is being processed or received.
 *
 * Cloned from the stepper inlined in jurnal-frontend-app's
 * `src/pages/outbounds/fulfillment-order/components/process-order` table cell.
 * Extracted because the inbound receipt drawer needs the identical control, and
 * the source duplicates the whole thing (clamping, the over-max message and
 * the disabled rules) into its inbound module.
 */
const props = withDefaults(
  defineProps<{
    modelValue: number;
    /** Upper bound — what is still available on this line. */
    max: number;
    min?: number;
    /** Accessible name for the input and the two step buttons. */
    label: string;
    helpText?: string;
    isDisabled?: boolean;
  }>(),
  { min: 0, helpText: "", isDisabled: false }
);

const emit = defineEmits<{ "update:modelValue": [value: number] }>();

// The input is typed text, not a number: it has to hold "" and "1" mid-edit
// without either being coerced to 0 under the user's cursor.
const text = ref(String(props.modelValue));
watch(
  () => props.modelValue,
  (value) => {
    if (Number(text.value) !== value) text.value = String(value);
  }
);

const isOverMax = computed(() => props.modelValue > props.max);
const overMaxMessage = computed(() => `Cannot be more than ${props.max}`);

function onType(value: string) {
  text.value = value;
  // Digits only, and an empty field reads as 0 rather than NaN. NOT clamped
  // here: typing "12" into a max-9 line should show the error, not silently
  // become 9 — the user is told what is wrong instead of being corrected.
  const parsed = Number(String(value).replace(/[^\d]/g, ""));
  emit("update:modelValue", Number.isFinite(parsed) ? parsed : 0);
}

// Tidy the display once the user leaves ("007" → "7", "" → "0"). Deliberately
// on focusout, never while typing — see docs/patterns/page-recipes.md on why
// reformatting mid-keystroke fights the user.
function onCommit() {
  text.value = String(props.modelValue);
}

function step(delta: number) {
  const next = Math.min(props.max, Math.max(props.min, props.modelValue + delta));
  text.value = String(next);
  emit("update:modelValue", next);
}

const rootClass = css({ display: "flex", flexDirection: "column", gap: 1 });
// 72px: three digits plus the input's own padding. Wide enough for every
// quantity in this dataset, narrow enough that the two step buttons and the
// field still fit a table column.
const fieldClass = css({ width: "72px" });
const messageClass = css({ display: "block", whiteSpace: "normal!" });
</script>
