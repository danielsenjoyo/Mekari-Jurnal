<template>
  <MpDrawer :is-open="isOpen" placement="right" size="md" @close="onCancel">
    <MpDrawerOverlay />
    <MpDrawerContent>
      <MpDrawerHeader>
        <span :class="titleClass">Filter purchase transaction</span>
        <MpDrawerCloseButton />
      </MpDrawerHeader>

      <MpDrawerBody>
        <div :class="formClass">
          <!-- Specific search: a keyword, and which column it applies to. -->
          <MpFormControl>
            <MpFormLabel>Keyword</MpFormLabel>
            <MpInputGroup>
              <MpInputLeftAddon>
                <MpIcon name="search" size="sm" color="gray.400" />
              </MpInputLeftAddon>
              <MpInput v-model="form.key" placeholder="Search transaction" />
            </MpInputGroup>
          </MpFormControl>

          <MpFormControl>
            <MpFormLabel>Column option</MpFormLabel>
            <MpSelect v-model="form.searchColumn" is-full-width>
              <option v-for="col in columnOptions" :key="col.value" :value="col.value">
                {{ col.label }}
              </option>
            </MpSelect>
          </MpFormControl>

          <!-- Combination search: everything below narrows by field, not text. -->
          <MpFormControl v-if="showTransactionDate">
            <MpFormLabel>Transaction date</MpFormLabel>
            <div :class="rangeRowClass">
              <MpDatePicker
                v-model="form.startDate"
                value-type="string"
                :format="DATE_INPUT_FORMAT"
                placeholder="Start date"
                use-portal
              />
              <MpText color="gray.600" :class="dashClass">-</MpText>
              <MpDatePicker
                v-model="form.endDate"
                value-type="string"
                :format="DATE_INPUT_FORMAT"
                placeholder="End date"
                use-portal
              />
            </div>
          </MpFormControl>

          <MpFormControl v-if="showMoneyFields">
            <MpFormLabel>Due date</MpFormLabel>
            <div :class="rangeRowClass">
              <MpDatePicker
                v-model="form.dueDateStart"
                value-type="string"
                :format="DATE_INPUT_FORMAT"
                placeholder="Start date"
                use-portal
              />
              <MpText color="gray.600" :class="dashClass">-</MpText>
              <MpDatePicker
                v-model="form.dueDateEnd"
                value-type="string"
                :format="DATE_INPUT_FORMAT"
                placeholder="End date"
                use-portal
              />
            </div>
          </MpFormControl>

          <MpFormControl v-if="statusOptions.length">
            <MpFormLabel>Status</MpFormLabel>
            <MpSelect v-model="form.status" is-full-width>
              <option value="">All status</option>
              <option v-for="opt in statusOptions" :key="opt" :value="opt">
                {{ statusLabel(opt) }}
              </option>
            </MpSelect>
          </MpFormControl>

          <!-- Two amount ranges, each a mode + one or two bounds. -->
          <MpFormControl v-if="showMoneyFields">
            <MpFormLabel>Balance due</MpFormLabel>
            <div :class="radioRowClass">
              <MpRadio
                v-for="mode in AMOUNT_MODES"
                :id="`balance-due-${mode.value}`"
                :key="mode.value"
                v-model="form.remainingMode"
                :value="mode.value"
              >
                {{ mode.label }}
              </MpRadio>
            </div>
            <div :class="rangeRowClass">
              <div
                v-if="showLowerBound(form.remainingMode)"
                :class="moneyFieldClass"
                @focusout="onMoneyBlur('remainingGt')"
              >
                <MpInputGroup>
                  <MpInputLeftAddon>
                    <MpText weight="semiBold" :class="addonTextClass">Rp</MpText>
                  </MpInputLeftAddon>
                  <MpInput
                    v-model="text.remainingGt"
                    type="text"
                    inputmode="decimal"
                    @update:model-value="onMoneyInput('remainingGt')"
                  />
                </MpInputGroup>
              </div>
              <MpText v-if="form.remainingMode === 'bt'" color="gray.600" :class="dashClass"
                >-</MpText
              >
              <div
                v-if="showUpperBound(form.remainingMode)"
                :class="moneyFieldClass"
                @focusout="onMoneyBlur('remainingLt')"
              >
                <MpInputGroup>
                  <MpInputLeftAddon>
                    <MpText weight="semiBold" :class="addonTextClass">Rp</MpText>
                  </MpInputLeftAddon>
                  <MpInput
                    v-model="text.remainingLt"
                    type="text"
                    inputmode="decimal"
                    @update:model-value="onMoneyInput('remainingLt')"
                  />
                </MpInputGroup>
              </div>
            </div>
          </MpFormControl>

          <MpFormControl v-if="showMoneyFields" :is-invalid="invalidTotal">
            <MpFormLabel>Total</MpFormLabel>
            <div :class="radioRowClass">
              <MpRadio
                v-for="mode in AMOUNT_MODES"
                :id="`total-${mode.value}`"
                :key="mode.value"
                v-model="form.totalMode"
                :value="mode.value"
              >
                {{ mode.label }}
              </MpRadio>
            </div>
            <div :class="rangeRowClass">
              <div
                v-if="showLowerBound(form.totalMode)"
                :class="moneyFieldClass"
                @focusout="onMoneyBlur('totalGt')"
              >
                <MpInputGroup>
                  <MpInputLeftAddon>
                    <MpText weight="semiBold" :class="addonTextClass">Rp</MpText>
                  </MpInputLeftAddon>
                  <MpInput
                    v-model="text.totalGt"
                    type="text"
                    inputmode="decimal"
                    @update:model-value="onMoneyInput('totalGt')"
                  />
                </MpInputGroup>
              </div>
              <MpText v-if="form.totalMode === 'bt'" color="gray.600" :class="dashClass">-</MpText>
              <div
                v-if="showUpperBound(form.totalMode)"
                :class="moneyFieldClass"
                @focusout="onMoneyBlur('totalLt')"
              >
                <MpInputGroup>
                  <MpInputLeftAddon>
                    <MpText weight="semiBold" :class="addonTextClass">Rp</MpText>
                  </MpInputLeftAddon>
                  <MpInput
                    v-model="text.totalLt"
                    type="text"
                    inputmode="decimal"
                    @update:model-value="onMoneyInput('totalLt')"
                  />
                </MpInputGroup>
              </div>
            </div>
            <MpFormErrorMessage>Total must be more than balance due</MpFormErrorMessage>
          </MpFormControl>

          <MpFormControl v-if="showTags">
            <MpFormLabel>Additional tag</MpFormLabel>
            <MpInputTag
              id="filter-tags"
              :key="tagInputKey"
              placeholder="Search tag..."
              :data="tagData"
              :suggestions="TAG_OPTIONS"
              :max-row="-1"
              :is-enable-create-new-tag="false"
              :is-show-suggestions="true"
              :is-show-icon-chevron-down="true"
              @change="onTagsChange"
            />
            <div :class="radioRowClass">
              <MpRadio id="tag-logic-and" v-model="form.tagsLogic" value="and">All tags</MpRadio>
              <MpRadio id="tag-logic-or" v-model="form.tagsLogic" value="or">
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
          <MpTextlink as="button" variant="primary" @click="onReset">
            <span :class="labelWithIconClass">
              <MpIcon name="reset" size="sm" />
              Reset
            </span>
          </MpTextlink>
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
  MpFormErrorMessage,
  MpFormLabel,
  MpIcon,
  MpInput,
  MpInputGroup,
  MpInputLeftAddon,
  MpInputTag,
  MpRadio,
  MpSelect,
  MpText,
  MpTextlink,
  MpTooltip
} from "@mekari/pixel3";
import {
  AMOUNT_MODES,
  COLUMN_OPTIONS,
  emptyPurchaseFilter,
  totalBelowBalanceDue,
  type AmountMode,
  type PurchaseFilter
} from "~/data/purchase-filter";
import { TAG_OPTIONS, formatAmount, parseAmount } from "~/data/purchase-transactions";
import { DATE_INPUT_FORMAT } from "~/utils/dates";

// ---------------------------------------------------------------------------
// The purchase list's advanced filter drawer. Ported from jurnal-frontend-app
// src/pages/purchases/components/advance-search/.
//
// Two things about it are worth knowing before editing.
//
// 1. It is STAGED, not live. Everything here edits a local draft; only Apply
//    hands it to the page, and Cancel throws the draft away. That is what
//    makes Cancel and Apply mean anything — a drawer that filtered as you
//    typed would leave both buttons decorative, and would re-run the list
//    behind an overlay the user can't see past.
//
// 2. Which fields appear depends on the tab, because some of them have no
//    referent there. A Delivery has no transaction date of its own and no
//    money; a Request has no due date and no money; a Join invoice bundles
//    other invoices, so it carries no tags and no warehouse of its own.
//    Rendering a control that can only ever match nothing is worse than
//    omitting it — the user reads it as a filter that's broken.
//
// The source also has Shipping date, Urgency level and Procurement staff
// fields, all commented out there ("until supported by ES"). They are omitted
// here for the same reason: cloning a control the real product doesn't show
// would make this prototype diverge from what users actually see.
// ---------------------------------------------------------------------------

const props = defineProps<{
  isOpen: boolean;
  /** The list's active tab key — decides which fields are relevant. */
  activeTab: string;
  statusOptions: readonly string[];
  statusLabel: (status: string) => string;
  /** The filter currently applied to the list; the draft is seeded from it. */
  applied: PurchaseFilter;
}>();

const emit = defineEmits<{ close: []; apply: [filter: PurchaseFilter] }>();

const form = reactive<PurchaseFilter>(emptyPurchaseFilter());

/** Grouped-string mirrors for the four money bounds. Money is parsed on every
 *  keystroke and reformatted only on focusout — reformatting live at two
 *  decimals makes incremental typing impossible (docs/patterns/Form.md). */
type MoneyKey = "remainingGt" | "remainingLt" | "totalGt" | "totalLt";
const text = reactive<Record<MoneyKey, string>>({
  remainingGt: "",
  remainingLt: "",
  totalGt: "",
  totalLt: ""
});

// MpInputTag owns its own tag list internally, so it is seeded through `data`
// and re-mounted via this key whenever the draft is replaced from outside
// (open / reset). Without the re-mount, Reset would clear the model while the
// chips stayed on screen.
const tagInputKey = ref(0);
const tagData = computed(() =>
  form.tags.map((tag) => ({
    id: `tag-${tag}`,
    text: tag,
    value: tag,
    isInvalid: false,
    isReadOnly: false
  }))
);

function syncText() {
  (Object.keys(text) as MoneyKey[]).forEach((key) => {
    text[key] = form[key] ? formatAmount(form[key]) : "";
  });
}

function loadDraft(source: PurchaseFilter) {
  Object.assign(form, { ...source, tags: [...source.tags] });
  syncText();
  tagInputKey.value += 1;
}

// Re-seed each time it opens, so a cancelled edit leaves nothing behind.
watch(
  () => props.isOpen,
  (open) => {
    if (open) loadDraft(props.applied);
  },
  { immediate: true }
);

const isDelivery = computed(() => props.activeTab === "pd");
const isRequest = computed(() => props.activeTab === "pr");
const isJoinInvoice = computed(() => props.activeTab === "jpi");

const showTransactionDate = computed(() => !isDelivery.value);
/** Due date and both amount ranges share one condition in the source. */
const showMoneyFields = computed(() => !isDelivery.value && !isRequest.value);
const showTags = computed(() => !isJoinInvoice.value);

/** Requests and join invoices have neither a warehouse nor a vendor reference
 *  number, so those two columns are dropped rather than offered empty. */
const columnOptions = computed(() =>
  isRequest.value || isJoinInvoice.value
    ? COLUMN_OPTIONS.filter((c) => c.value !== "warehouse" && c.value !== "referenceNo")
    : COLUMN_OPTIONS
);

function showLowerBound(mode: AmountMode) {
  return mode === "gt" || mode === "bt";
}
function showUpperBound(mode: AmountMode) {
  return mode === "lt" || mode === "bt";
}

function onMoneyInput(key: MoneyKey) {
  form[key] = parseAmount(text[key]);
}
function onMoneyBlur(key: MoneyKey) {
  const value = parseAmount(text[key]);
  form[key] = value;
  text[key] = value ? formatAmount(value) : "";
}

// Switching mode carries the figure across, so changing your mind about the
// comparison doesn't silently discard the number you already typed.
watch(
  () => form.remainingMode,
  (mode) => {
    if (mode === "lt") form.remainingLt = form.remainingGt;
    else if (mode === "gt") form.remainingGt = form.remainingLt;
    syncText();
  }
);
watch(
  () => form.totalMode,
  (mode) => {
    if (mode === "lt") form.totalLt = form.totalGt;
    else if (mode === "gt") form.totalGt = form.totalLt;
    syncText();
  }
);

function onTagsChange(data: { value?: string; text?: string }[]) {
  form.tags = (data ?? []).map((item) => String(item.value ?? item.text ?? "")).filter(Boolean);
}

const invalidTotal = computed(() => totalBelowBalanceDue(form));

function onReset() {
  loadDraft(emptyPurchaseFilter());
}

function onCancel() {
  emit("close");
}

function onApply() {
  // Apply stays enabled while invalid and simply refuses, surfacing the error
  // instead — this module never disables a commit button, because a disabled
  // one gives no reason (docs/patterns/form-page-format.md, Validation).
  if (invalidTotal.value) return;
  const applied: PurchaseFilter = { ...form, tags: [...form.tags] };
  // Zero the bound the chosen mode doesn't use, so a figure left behind by an
  // earlier mode can't keep filtering invisibly.
  if (applied.remainingMode === "gt") applied.remainingLt = 0;
  else if (applied.remainingMode === "lt") applied.remainingGt = 0;
  if (applied.totalMode === "gt") applied.totalLt = 0;
  else if (applied.totalMode === "lt") applied.totalGt = 0;
  emit("apply", applied);
}

// All css() below uses Pixel 3 token shortcuts only (token mode 2.1).
// The addon supplies no padding of its own: Pixel's "input with prefix and
// suffix" pattern (docs.mekari.design/patterns/input.html) pads the addon's
// content by 12px, without which the prefix sits flush against both edges.
const addonTextClass = css({ px: 3 });
const titleClass = css({ fontSize: "lg" });
const formClass = css({ display: "flex", flexDirection: "column", gap: 5 });
const rangeRowClass = css({
  display: "flex",
  alignItems: "center",
  gap: 3,
  "& > *": { flex: "1 1 0", minWidth: "0" }
});
const moneyFieldClass = css({ minWidth: "0" });
const dashClass = css({ flex: "none!" });
const radioRowClass = css({
  display: "flex",
  alignItems: "center",
  gap: 6,
  flexWrap: "wrap",
  mb: 2
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
