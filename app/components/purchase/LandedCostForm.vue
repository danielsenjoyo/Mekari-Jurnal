<template>
  <DefaultPageContent :title="pageTitle" breadcrumb="Purchases" breadcrumb-to="/purchase">
    <BlankSlate
      v-if="!purchase"
      title="No purchase selected"
      description="A landed cost is always calculated against a purchase. Open one and choose Landed cost from its Actions menu."
    >
      <MpButton variant="secondary" @click="navigateTo('/purchase')">Back to Purchases</MpButton>
    </BlankSlate>

    <template v-else>
      <!-- Zone A — the purchase being costed, and the running total. -->
      <div :class="topRowClass">
        <MpFormControl>
          <MpFormLabel>Purchase no.</MpFormLabel>
          <MpTextlink
            as="button"
            variant="primary"
            @click="navigateTo(`/purchase/invoice/${purchase.id}`)"
          >
            {{ purchase.number }}
          </MpTextlink>
        </MpFormControl>

        <div />

        <div :class="totalColClass">
          <MpText size="h3" weight="semiBold" color="dark"
            >Total landed cost {{ formatCurrency(expenseTotal) }}</MpText
          >
        </div>
      </div>

      <MpDivider variant="dashed" :class="dividerClass" />

      <div :class="metaGridClass">
        <MpFormControl>
          <MpFormLabel>Created date</MpFormLabel>
          <MpDatePicker
            v-model="form.createdDateIso"
            value-type="string"
            :format="DATE_INPUT_FORMAT"
            placeholder="DD/MM/YYYY"
            use-portal
          />
        </MpFormControl>

        <MpFormControl :is-disabled="true">
          <MpFormLabel>
            <span :class="labelWithIconClass">
              Transaction date
              <MpTooltip label="The date of the purchase this cost is calculated against">
                <MpIcon name="info" size="sm" color="gray.600" />
              </MpTooltip>
            </span>
          </MpFormLabel>
          <MpInput
            :model-value="formatDisplayDate(purchase.transactionDateSort)"
            is-read-only
            is-full-width
          />
        </MpFormControl>

        <MpFormControl :is-disabled="isEdit">
          <MpFormLabel>Transaction no.</MpFormLabel>
          <MpInput
            v-model="form.transactionNo"
            :placeholder="isEdit ? '' : '[Auto]'"
            is-full-width
          />
        </MpFormControl>

        <MpFormControl>
          <MpFormLabel>Tag</MpFormLabel>
          <MpSelect :model-value="''" is-full-width @update:model-value="addTag">
            <option value="">Choose tag</option>
            <option v-for="tag in availableTags" :key="tag" :value="tag">{{ tag }}</option>
          </MpSelect>
          <MpFlex v-if="form.tags.length" gap="2" wrap="wrap" :class="tagListClass">
            <MpTag
              v-for="tag in form.tags"
              :key="tag"
              variant="gray"
              size="sm"
              is-closable
              @close="removeTag(tag)"
            >
              {{ tag }}
            </MpTag>
          </MpFlex>
        </MpFormControl>
      </div>

      <!-- Zone B — the expenses to spread. -->
      <MpText weight="semiBold" color="dark" :class="sectionHeadingClass">Expenses</MpText>
      <MpTableContainer :class="scrollShadowClass">
        <MpTable :class="expenseTableClass">
          <colgroup>
            <col style="width: 26%" />
            <col style="width: 28%" />
            <col style="width: 20%" />
            <col style="width: 22%" />
            <col style="width: 40px" />
          </colgroup>
          <MpTableHead :class="tableHeadClass">
            <MpTableRow>
              <MpTableCell as="th">Expense</MpTableCell>
              <MpTableCell as="th">Description</MpTableCell>
              <MpTableCell as="th">Amount</MpTableCell>
              <MpTableCell as="th">Amount used</MpTableCell>
              <MpTableCell as="th" />
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <MpTableRow v-for="(expense, index) in form.expenses" :key="expense.id">
              <MpTableCell as="td" :class="lineCellClass">
                <MpSelect v-model="expense.expense" is-full-width>
                  <option value="">Select expense</option>
                  <option v-for="e in EXPENSE_OPTIONS" :key="e" :value="e">{{ e }}</option>
                </MpSelect>
              </MpTableCell>
              <MpTableCell as="td" :class="lineCellClass">
                <MpInput
                  v-model="expense.description"
                  placeholder="Enter description"
                  is-full-width
                />
              </MpTableCell>
              <MpTableCell as="td" :class="lineCellClass">
                <div @focusout="onMoneyBlur(expense, 'amount')">
                  <MpInputGroup>
                    <MpInputLeftAddon>
                      <MpText weight="semiBold" :class="addonTextClass">Rp</MpText>
                    </MpInputLeftAddon>
                    <MpInput
                      v-model="expense.amountText"
                      type="text"
                      inputmode="decimal"
                      @update:model-value="onMoneyInput(expense, 'amount')"
                    />
                  </MpInputGroup>
                </div>
              </MpTableCell>
              <MpTableCell as="td" :class="lineCellClass">
                <div @focusout="onMoneyBlur(expense, 'amountUsed')">
                  <MpInputGroup>
                    <MpInputLeftAddon>
                      <MpText weight="semiBold" :class="addonTextClass">Rp</MpText>
                    </MpInputLeftAddon>
                    <MpInput
                      v-model="expense.amountUsedText"
                      type="text"
                      inputmode="decimal"
                      :is-invalid="expense.amountUsed > expense.amount"
                      @update:model-value="onMoneyInput(expense, 'amountUsed')"
                    />
                  </MpInputGroup>
                </div>
              </MpTableCell>
              <MpTableCell as="td" :class="lineCellClass">
                <MpButton
                  variant="ghost"
                  size="sm"
                  left-icon="minus-circular"
                  aria-label="Remove expense"
                  @click="removeExpense(index)"
                />
              </MpTableCell>
            </MpTableRow>

            <MpTableRow>
              <MpTableCell as="td" :class="lineCellClass">
                <MpSelect :model-value="''" is-full-width @update:model-value="addExpenseFrom">
                  <option value="">Select expense</option>
                  <option v-for="e in EXPENSE_OPTIONS" :key="e" :value="e">{{ e }}</option>
                </MpSelect>
              </MpTableCell>
              <MpTableCell v-for="n in 4" :key="n" as="td" :class="lineCellClass" />
            </MpTableRow>
          </MpTableBody>
        </MpTable>
      </MpTableContainer>

      <!-- Zone C — spreading it across the purchase's products. The allocated
           column is the only editable one; the last two are derived. -->
      <MpText weight="semiBold" color="dark" :class="sectionHeadingClass"
        >Landed cost calculation</MpText
      >
      <MpTableContainer :class="scrollShadowClass">
        <MpTable :class="landedTableClass">
          <colgroup>
            <col style="width: 22%" />
            <col style="width: 7%" />
            <col style="width: 14%" />
            <col style="width: 14%" />
            <col style="width: 17%" />
            <col style="width: 13%" />
            <col style="width: 13%" />
          </colgroup>
          <MpTableHead :class="tableHeadClass">
            <MpTableRow>
              <MpTableCell as="th">Product</MpTableCell>
              <MpTableCell as="th">Qty</MpTableCell>
              <MpTableCell as="th">Unit price</MpTableCell>
              <MpTableCell as="th">Amount</MpTableCell>
              <MpTableCell as="th">Landed cost</MpTableCell>
              <MpTableCell as="th">Landed unit price</MpTableCell>
              <MpTableCell as="th">Landed amount</MpTableCell>
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <MpTableRow v-for="alloc in form.allocations" :key="alloc.product">
              <MpTableCell as="td" :class="[lineCellClass, wrapCellClass]">{{
                alloc.product
              }}</MpTableCell>
              <MpTableCell as="td" :class="lineCellClass">{{ alloc.quantity }}</MpTableCell>
              <MpTableCell as="td" :class="lineCellClass">{{
                formatCurrency(alloc.unitPrice)
              }}</MpTableCell>
              <MpTableCell as="td" :class="lineCellClass">{{
                formatCurrency(alloc.amount)
              }}</MpTableCell>
              <MpTableCell as="td" :class="lineCellClass">
                <div @focusout="onMoneyBlur(alloc, 'allocated')">
                  <MpInputGroup>
                    <MpInputLeftAddon>
                      <MpText weight="semiBold" :class="addonTextClass">Rp</MpText>
                    </MpInputLeftAddon>
                    <MpInput
                      v-model="alloc.allocatedText"
                      type="text"
                      inputmode="decimal"
                      @update:model-value="onMoneyInput(alloc, 'allocated')"
                    />
                  </MpInputGroup>
                </div>
              </MpTableCell>
              <MpTableCell as="td" :class="lineCellClass">{{
                formatCurrency(landedUnitPrice(alloc))
              }}</MpTableCell>
              <MpTableCell as="td" :class="lineCellClass">{{
                formatCurrency(landedAmount(alloc))
              }}</MpTableCell>
            </MpTableRow>
          </MpTableBody>
        </MpTable>
      </MpTableContainer>

      <!-- The balance check. Every rupiah of expense has to land on a product;
           an unallocated remainder would silently drop out of the costing, so
           it blocks saving rather than warning after the fact. -->
      <div :class="balanceRowClass">
        <MpButton
          variant="secondary"
          size="sm"
          :is-disabled="!expenseTotal || !form.allocations.length"
          @click="distributeByValue"
        >
          Distribute by value
        </MpButton>
        <div :class="balanceFiguresClass">
          <div :class="balanceLineClass">
            <MpText color="gray.600">Total expense</MpText>
            <MpText>{{ formatCurrency(expenseTotal) }}</MpText>
          </div>
          <div :class="balanceLineClass">
            <MpText color="gray.600">Allocated</MpText>
            <MpText>{{ formatCurrency(allocatedTotal) }}</MpText>
          </div>
          <div :class="balanceLineClass">
            <MpText weight="semiBold" :color="remaining === 0 ? 'dark' : undefined"
              >Remaining</MpText
            >
            <MpText weight="semiBold" :color="remaining === 0 ? 'dark' : undefined">{{
              formatCurrency(remaining)
            }}</MpText>
          </div>
        </div>
      </div>

      <div v-if="submitted && !isValid" :class="validationSummaryClass">
        <MpBanner variant="danger" is-inline>
          <MpBannerIcon />
          <MpBannerDescription>
            {{
              missingFields.length === 1
                ? "One thing is still missing:"
                : `${missingFields.length} things are still missing:`
            }}
            {{ missingFields.join(", ") }}.
          </MpBannerDescription>
        </MpBanner>
      </div>

      <div :class="actionBarClass">
        <MpButton variant="ghost" @click="onCancel">Cancel</MpButton>
        <MpButton variant="primary" @click="onSubmit()">{{
          isEdit ? "Save changes" : "Save"
        }}</MpButton>
      </div>
    </template>
  </DefaultPageContent>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import {
  css,
  MpBanner,
  MpBannerDescription,
  MpBannerIcon,
  MpButton,
  MpDatePicker,
  MpDivider,
  MpFlex,
  MpFormControl,
  MpFormLabel,
  MpIcon,
  MpInput,
  MpInputGroup,
  MpInputLeftAddon,
  MpSelect,
  MpTable,
  MpTableBody,
  MpTableCell,
  MpTableContainer,
  MpTableHead,
  MpTableRow,
  MpTag,
  MpText,
  MpTextlink,
  MpTooltip
} from "@mekari/pixel3";
import DefaultPageContent from "~/components/template/DefaultPageContent.vue";
import {
  EXPENSE_OPTIONS,
  allocationsForPurchase,
  createLandedCost,
  getLandedCostById,
  landedAmount as calcLandedAmount,
  landedUnitPrice as calcLandedUnitPrice,
  updateLandedCost,
  type LandedCostAllocation,
  type LandedCostExpense
} from "~/data/purchase-landed-cost";
import {
  TAG_OPTIONS,
  formatAmount,
  formatCurrency,
  formatDisplayDate,
  getPurchaseTransactionById,
  parseAmount
} from "~/data/purchase-transactions";
import { DATE_INPUT_FORMAT, toDmy, dmyToIso, isoToDmy } from "~/utils/dates";

// ---------------------------------------------------------------------------
// Create/edit a landed cost. Ported from jurnal-frontend-app
// src/pages/purchases/landed_cost/landed_cost.ts + .vue.
//
// Two tables and one rule that ties them together: the expenses you list must
// be fully spread across the purchase's products. The allocation is manual —
// you type how much of the cost lands on each line — with a running Remaining
// figure that has to reach zero before it can be saved, plus a "Distribute by
// value" shortcut for the common case.
//
// Reached from a purchase's Actions menu (`?purchase=<id>`), like Returns —
// a landed cost has no meaning without the purchase it is costing.
// ---------------------------------------------------------------------------

const props = defineProps<{ recordId?: number }>();

const route = useRoute();
const isEdit = computed(() => props.recordId != null);
const existing = computed(() =>
  props.recordId != null ? getLandedCostById(props.recordId) : undefined
);

/** Editing rows carry a grouped-string mirror beside each numeric field, the
 *  same pattern the money forms use (see docs/patterns/page-recipes.md). */
type ExpenseRow = LandedCostExpense & { amountText: string; amountUsedText: string };
type AllocationRow = LandedCostAllocation & { allocatedText: string };

const form = reactive({
  purchaseId: null as number | null,
  createdDateIso: toDmy(new Date()),
  transactionNo: "",
  tags: [] as string[],
  expenses: [] as ExpenseRow[],
  allocations: [] as AllocationRow[]
});
const submitted = ref(false);

const purchase = computed(() =>
  form.purchaseId != null ? getPurchaseTransactionById(form.purchaseId) : undefined
);

let expenseKeySeq = 0;
function blankExpense(name = ""): ExpenseRow {
  return {
    id: ++expenseKeySeq,
    expense: name,
    description: "",
    amount: 0,
    amountText: "",
    amountUsed: 0,
    amountUsedText: ""
  };
}

function loadFromPurchase(purchaseId: number) {
  const p = getPurchaseTransactionById(purchaseId);
  if (!p) return;
  form.purchaseId = purchaseId;
  form.allocations = allocationsForPurchase(p).map((a) => ({ ...a, allocatedText: "" }));
}

function loadFromExisting() {
  const lc = existing.value;
  if (!lc) return;
  form.purchaseId = lc.purchaseId;
  form.createdDateIso = isoToDmy(lc.createdDateSort);
  form.transactionNo = lc.number;
  form.tags = [...lc.tags];
  form.expenses = lc.expenses.map((e) => ({
    ...e,
    id: ++expenseKeySeq,
    amountText: e.amount ? formatAmount(e.amount) : "",
    amountUsedText: e.amountUsed ? formatAmount(e.amountUsed) : ""
  }));
  form.allocations = lc.allocations.map((a) => ({
    ...a,
    allocatedText: a.allocated ? formatAmount(a.allocated) : ""
  }));
}
watch(existing, loadFromExisting, { immediate: true });

// Reached from a purchase's Actions menu, which passes the purchase id.
watch(
  () => route.query.purchase,
  (q) => {
    if (isEdit.value || !q) return;
    const id = Number(q);
    if (id) loadFromPurchase(id);
  },
  { immediate: true }
);

const pageTitle = computed(() =>
  isEdit.value ? `Edit ${existing.value?.number ?? "landed cost"}` : "Create Landed Cost"
);

const availableTags = computed(() => TAG_OPTIONS.filter((t) => !form.tags.includes(t)));
function addTag(tag: unknown) {
  const value = String(tag ?? "");
  if (value && !form.tags.includes(value)) form.tags.push(value);
}
function removeTag(tag: string) {
  form.tags = form.tags.filter((t) => t !== tag);
}

function addExpenseFrom(name: unknown) {
  const value = String(name ?? "");
  if (!value) return;
  form.expenses.push(blankExpense(value));
}
function removeExpense(index: number) {
  form.expenses.splice(index, 1);
}

// Grouped-string money editing: parse on every keystroke, format on blur only.
// Live-reformatting at two decimals makes incremental typing impossible.
type MoneyRow = Record<string, unknown>;
function onMoneyInput(row: MoneyRow, field: string) {
  row[field] = parseAmount(String(row[`${field}Text`] ?? ""));
}
function onMoneyBlur(row: MoneyRow, field: string) {
  const value = parseAmount(String(row[`${field}Text`] ?? ""));
  row[field] = value;
  row[`${field}Text`] = value ? formatAmount(value) : "";
}

const expenseTotal = computed(() =>
  form.expenses.reduce((sum, e) => sum + (Number(e.amountUsed) || 0), 0)
);
const allocatedTotal = computed(() =>
  form.allocations.reduce((sum, a) => sum + (Number(a.allocated) || 0), 0)
);
const remaining = computed(() => expenseTotal.value - allocatedTotal.value);

function landedUnitPrice(a: AllocationRow) {
  return calcLandedUnitPrice(a);
}
function landedAmount(a: AllocationRow) {
  return calcLandedAmount(a);
}

/** Spreads the expense total across the lines in proportion to their value —
 *  the common case, and the only way to land exactly on zero remaining without
 *  the user chasing rounding. The last line absorbs the rounding difference. */
function distributeByValue() {
  const total = expenseTotal.value;
  const lineTotal = form.allocations.reduce((sum, a) => sum + a.amount, 0);
  if (!total || !lineTotal) return;
  let assigned = 0;
  form.allocations.forEach((a, i) => {
    const share =
      i === form.allocations.length - 1
        ? total - assigned
        : Math.round((a.amount / lineTotal) * total);
    a.allocated = share;
    a.allocatedText = share ? formatAmount(share) : "";
    assigned += share;
  });
}

const overUsed = computed(() =>
  form.expenses.filter((e) => e.amountUsed > e.amount).map((e) => e.expense || "an expense")
);
const isValid = computed(
  () =>
    Boolean(form.purchaseId && form.createdDateIso) &&
    form.expenses.some((e) => e.expense && e.amountUsed > 0) &&
    remaining.value === 0 &&
    overUsed.value.length === 0
);
const missingFields = computed(() => {
  const missing: string[] = [];
  if (!form.createdDateIso) missing.push("Created date");
  if (!form.expenses.some((e) => e.expense && e.amountUsed > 0))
    missing.push("at least one expense with an amount used");
  if (remaining.value !== 0)
    missing.push(`${formatCurrency(Math.abs(remaining.value))} still to allocate`);
  if (overUsed.value.length)
    missing.push(`an amount used within what's available (${overUsed.value.join(", ")})`);
  return missing;
});

function onSubmit() {
  submitted.value = true;
  if (!isValid.value || form.purchaseId == null) return;
  const input = {
    purchaseId: form.purchaseId,
    createdDateIso: dmyToIso(form.createdDateIso),
    transactionNo: form.transactionNo,
    tags: form.tags,
    expenses: form.expenses.map(({ id, expense, description, amount, amountUsed }) => ({
      id,
      expense,
      description,
      amount,
      amountUsed
    })),
    allocations: form.allocations.map(({ product, quantity, unitPrice, amount, allocated }) => ({
      product,
      quantity,
      unitPrice,
      amount,
      allocated
    }))
  };
  if (isEdit.value && props.recordId != null) {
    const updated = updateLandedCost(props.recordId, input);
    navigateTo(`/purchase/landed-cost/${updated?.id ?? props.recordId}`);
    return;
  }
  const created = createLandedCost(input);
  navigateTo(`/purchase/landed-cost/${created.id}`);
}

function onCancel() {
  if (isEdit.value && props.recordId != null) navigateTo(`/purchase/landed-cost/${props.recordId}`);
  else if (form.purchaseId) navigateTo(`/purchase/invoice/${form.purchaseId}`);
  else navigateTo("/purchase");
}

// All css() below uses Pixel 3 token shortcuts only (token mode 2.1).
// The addon supplies no padding of its own: Pixel's "input with prefix and
// suffix" pattern (docs.mekari.design/patterns/input.html) pads the addon's
// content by 12px, without which the prefix sits flush against both edges.
const addonTextClass = css({ px: 3 });
const topRowClass = css({
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 6,
  alignItems: "start"
});
const totalColClass = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: 1,
  textAlign: "right",
  mt: 6
});
const dividerClass = css({ my: 6 });
const metaGridClass = css({
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 6,
  alignItems: "start"
});
const labelWithIconClass = css({ display: "inline-flex", alignItems: "center", gap: 1 });
const tagListClass = css({ mt: 2 });
const sectionHeadingClass = css({ fontSize: "lg", mb: 4, mt: 8, display: "block" });

const scrollShadowClass = css({
  backgroundImage:
    "linear-gradient(to right, var(--mp-colors-white) 30%, transparent), linear-gradient(to left, var(--mp-colors-white) 30%, transparent), linear-gradient(to right, rgba(29,31,36,0.16), transparent), linear-gradient(to left, rgba(29,31,36,0.16), transparent)",
  backgroundPosition: "left center, right center, left center, right center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "36px 100%, 36px 100%, 12px 100%, 12px 100%",
  backgroundAttachment: "local, local, scroll, scroll"
});
const tableHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
const expenseTableClass = css({ tableLayout: "fixed", width: "full", minWidth: "900px" });
const landedTableClass = css({ tableLayout: "fixed", width: "full", minWidth: "1180px" });
const lineCellClass = css({ verticalAlign: "top" });
const wrapCellClass = css({ whiteSpace: "normal!", wordBreak: "break-word", textAlign: "left" });

const balanceRowClass = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: 6,
  mt: 6,
  flexWrap: "wrap"
});
const balanceFiguresClass = css({
  display: "flex",
  flexDirection: "column",
  gap: 2,
  minWidth: "280px"
});
const balanceLineClass = css({ display: "flex", justifyContent: "space-between", gap: 6 });

const validationSummaryClass = css({ display: "flex", justifyContent: "flex-end", mt: 8 });
const actionBarClass = css({
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: 2,
  mt: 8
});
</script>
