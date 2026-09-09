<template>
  <DefaultPageContent :title="pageTitle" breadcrumb="Sales" breadcrumb-to="/sales">
    <template v-if="!isEdit" #actions>
      <div :class="typeSelectClass">
        <MpSelect :model-value="'proforma_order'" is-full-width @update:model-value="onTypeSwitch">
          <option v-for="opt in TYPE_SWITCH_OPTIONS" :key="opt.type" :value="opt.type">
            {{ opt.label }}
          </option>
        </MpSelect>
      </div>
    </template>

    <!-- Zone 1 — the order being billed, its customer, and what this document
         claims. Customer is derived from the order rather than picked: a
         progress bill draws down one specific order, so its customer is not an
         independent choice. -->
    <div :class="topGridClass">
      <MpFormControl is-required :is-invalid="submitted && !form.linkedOrderId">
        <MpFormLabel>Sales order</MpFormLabel>
        <MpSelect
          :model-value="form.linkedOrderId ? String(form.linkedOrderId) : ''"
          :is-disabled="isEdit"
          is-full-width
          @update:model-value="onOrderChange"
        >
          <option value="">Select an order to bill</option>
          <option v-for="order in orderOptions" :key="order.id" :value="String(order.id)">
            {{ order.number }} — {{ order.customerName }}
          </option>
        </MpSelect>
        <MpFormHelpText v-if="isEdit"
          >A pro forma order stays attached to the order it bills.</MpFormHelpText
        >
        <MpFormErrorMessage>Choose the order this pro forma bills against.</MpFormErrorMessage>
      </MpFormControl>

      <MpFormControl :is-disabled="true">
        <MpFormLabel>Customer</MpFormLabel>
        <MpInput
          :model-value="form.customerName"
          placeholder="Choose an order first"
          is-read-only
          is-full-width
        />
      </MpFormControl>

      <div />

      <div :class="totalPreviewClass">
        <MpText color="gray.600">Total billed</MpText>
        <MpText size="h3" weight="semiBold" color="dark">{{ formatCurrency(totals.total) }}</MpText>
      </div>
    </div>

    <MpDivider variant="dashed" :class="dividerClass" />

    <!-- Zone 2 — the billing method and the share. This is what makes a pro
         forma order a *progress* bill: the same order gets invoiced in stages,
         and the method decides how each stage is expressed. -->
    <div :class="metaGridClass">
      <div :class="metaColClass">
        <MpFormControl>
          <MpFormLabel>Billing method</MpFormLabel>
          <MpSelect v-model="form.billingMethod" is-full-width>
            <option v-for="method in BILLING_METHODS" :key="method" :value="method">
              {{ BILLING_METHOD_LABEL[method] }}
            </option>
          </MpSelect>
          <MpFormHelpText>{{ billingMethodHint }}</MpFormHelpText>
        </MpFormControl>

        <MpFormControl :is-invalid="submitted && overBilled">
          <MpFormLabel>Share of this order</MpFormLabel>
          <MpInputGroup>
            <MpInputLeftAddon>
              <MpText weight="semiBold" :class="addonTextClass">%</MpText>
            </MpInputLeftAddon>
            <MpInput
              v-model.number="form.billingPercent"
              type="number"
              min="0"
              :max="remainingPercent"
              :class="numInputClass"
            />
          </MpInputGroup>
          <MpFormHelpText v-if="form.linkedOrderId && !overBilled">
            {{ alreadyBilledPercent }}% of this order is already billed —
            {{ remainingPercent }}% remains.
          </MpFormHelpText>
          <MpFormErrorMessage>
            Only {{ remainingPercent }}% of this order is left to bill.
          </MpFormErrorMessage>
        </MpFormControl>
      </div>

      <div :class="metaColClass">
        <MpFormControl is-required :is-invalid="submitted && !form.transactionDateIso">
          <MpFormLabel>Transaction date</MpFormLabel>
          <MpDatePicker
            v-model="form.transactionDateIso"
            value-type="string"
            :format="DATE_INPUT_FORMAT"
            placeholder="DD/MM/YYYY"
            use-portal
          />
        </MpFormControl>
        <MpFormControl>
          <MpFormLabel>Due date</MpFormLabel>
          <MpDatePicker
            v-model="form.dueDateIso"
            value-type="string"
            :format="DATE_INPUT_FORMAT"
            placeholder="DD/MM/YYYY"
            use-portal
          />
        </MpFormControl>
        <MpFormControl>
          <MpFormLabel>Term</MpFormLabel>
          <MpSelect v-model="form.term" is-full-width>
            <option value="">Select term</option>
            <option v-for="term in TERM_OPTIONS" :key="term" :value="term">{{ term }}</option>
          </MpSelect>
        </MpFormControl>
      </div>

      <div :class="metaColClass">
        <MpFormControl :is-disabled="isEdit">
          <MpFormLabel>Transaction no.</MpFormLabel>
          <MpInput
            v-model="form.transactionNo"
            :placeholder="isEdit ? '' : '[Auto]'"
            is-full-width
          />
        </MpFormControl>
        <MpFormControl>
          <MpFormLabel>Billing address</MpFormLabel>
          <MpTextarea v-model="form.customerAddress" :class="addressFieldClass" is-full-width />
        </MpFormControl>
      </div>

      <div :class="metaColClass">
        <MpFormControl>
          <MpFormLabel>Tags</MpFormLabel>
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
    </div>

    <!-- Zone 3 — the order's lines, read-only. They are not editable here: a
         progress bill claims a share of what was already ordered, so changing
         the items would make it something other than a draw-down. The Billed
         column shows what this document's share works out to per line. -->
    <MpTableContainer :class="scrollShadowClass">
      <MpTable :class="itemsTableClass">
        <colgroup>
          <col :style="{ width: '26%' }" />
          <col :style="{ width: '24%' }" />
          <col :style="{ width: '10%' }" />
          <col :style="{ width: '10%' }" />
          <col :style="{ width: '15%' }" />
          <col :style="{ width: '15%' }" />
        </colgroup>
        <MpTableHead :class="itemsHeadClass">
          <MpTableRow>
            <MpTableCell as="th">Product</MpTableCell>
            <MpTableCell as="th">Description</MpTableCell>
            <MpTableCell as="th" :class="numCellClass">Qty</MpTableCell>
            <MpTableCell as="th">Units</MpTableCell>
            <MpTableCell as="th" :class="numCellClass">Order amount</MpTableCell>
            <MpTableCell as="th" :class="numCellClass">Billed</MpTableCell>
          </MpTableRow>
        </MpTableHead>
        <MpTableBody>
          <MpTableRow v-for="line in orderLines" :key="line.id">
            <MpTableCell as="td">{{ line.product }}</MpTableCell>
            <MpTableCell as="td" :class="wrapCellClass">{{ line.description || "—" }}</MpTableCell>
            <MpTableCell as="td" :class="numCellClass">{{ line.quantity }}</MpTableCell>
            <MpTableCell as="td">{{ line.unit }}</MpTableCell>
            <MpTableCell as="td" :class="numCellClass">{{
              formatCurrency(line.amount)
            }}</MpTableCell>
            <MpTableCell as="td" :class="numCellClass">{{
              formatCurrency(billedForLine(line.amount))
            }}</MpTableCell>
          </MpTableRow>

          <MpTableRow v-if="!orderLines.length">
            <MpTableCell as="td" :colspan="6" :class="emptyCellClass">
              <MpText size="body-small" color="gray.600">
                Choose a sales order above to load the items it covers.
              </MpText>
            </MpTableCell>
          </MpTableRow>
        </MpTableBody>
      </MpTable>
    </MpTableContainer>

    <div :class="bottomRowClass">
      <div :class="notesColClass">
        <MpFormControl>
          <MpFormLabel>Message</MpFormLabel>
          <MpTextarea v-model="form.message" placeholder="Message" is-full-width />
        </MpFormControl>
        <MpFormControl>
          <MpFormLabel>Memo</MpFormLabel>
          <MpTextarea v-model="form.memo" placeholder="Memo" is-full-width />
        </MpFormControl>
        <MpFormControl>
          <MpFormLabel>Attachments</MpFormLabel>
          <MpUpload
            placeholder="or drag & drop file here"
            accept=".xlsx,.xls,.doc,.docx,.pdf,.jpg,.jpeg,.png,.zip"
            is-multiple
            is-full-width
            @change="onAttachmentChange"
          />
          <MpFormHelpText>
            Files can be Excel, Word, PDF, JPG, PNG, or ZIP (maximum 5 files and 10 MB per file).
          </MpFormHelpText>
        </MpFormControl>
      </div>

      <div :class="totalsColClass">
        <div :class="totalsRowClass">
          <MpText>Order value</MpText>
          <MpText>{{ formatCurrency(orderSubtotal) }}</MpText>
        </div>
        <div :class="totalsRowClass">
          <MpText weight="semiBold" color="dark">Subtotal ({{ form.billingPercent }}%)</MpText>
          <MpText weight="semiBold" color="dark">{{ formatCurrency(totals.subtotal) }}</MpText>
        </div>
        <div v-for="tax in totals.taxes" :key="tax.label" :class="totalsRowClass">
          <MpText>{{ tax.label }}</MpText>
          <MpText>{{ formatCurrency(tax.amount) }}</MpText>
        </div>

        <MpDivider variant="dashed" :class="totalsDividerClass" />

        <div :class="totalsRowClass">
          <MpText size="h3" weight="semiBold" color="dark">Total billed</MpText>
          <MpText size="h3" weight="semiBold" color="dark">{{
            formatCurrency(totals.total)
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
        isEdit ? "Save changes" : "Create"
      }}</MpButton>
    </div>
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
  MpFormErrorMessage,
  MpFormHelpText,
  MpFormLabel,
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
  MpTextarea,
  MpUpload
} from "@mekari/pixel3";
import DefaultPageContent from "~/components/template/DefaultPageContent.vue";
import {
  BILLING_METHOD_LABEL,
  TAG_OPTIONS,
  TERM_OPTIONS,
  TRANSACTION_TYPE_LABEL,
  TYPE_CAPABILITIES,
  billableOrders,
  billedPercentForOrder,
  computeTransactionTotals,
  createTransaction,
  emptyTransactionInput,
  formatCurrency,
  getSalesTransactionById,
  getTransactionOfType,
  updateTransaction,
  type BillingMethod,
  type SalesTransaction,
  type SalesTransactionInput,
  type TransactionType
} from "~/data/sales-transactions";
import { DATE_INPUT_FORMAT, toDmy, dmyToIso, isoToDmy } from "~/utils/dates";

// ---------------------------------------------------------------------------
// Create/edit for a Pro Forma Order — the reference app's pro_forma_orders
// form (progress billing). Unlike every other money form here, you don't
// compose line items: you pick a Sales Order and claim a SHARE of it. The
// order's own lines are shown read-only, and the share drives every figure.
//
// The share is capped at whatever earlier pro formas left unbilled, so a
// sequence of progress bills against one order can never exceed it.
// ---------------------------------------------------------------------------

const props = defineProps<{ recordId?: number }>();

const route = useRoute();
const isEdit = computed(() => props.recordId != null);
const existing = computed(() =>
  props.recordId != null ? getTransactionOfType(props.recordId, "proforma_order") : undefined
);

const BILLING_METHODS: BillingMethod[] = ["percentage", "quantity", "amount"];

const BILLING_METHOD_HINT: Record<BillingMethod, string> = {
  percentage: "Bills a percentage of the order's value.",
  quantity: "Bills whole line quantities as they are delivered.",
  amount: "Bills a fixed figure agreed with the customer."
};

const TYPE_SWITCH_OPTIONS: { type: TransactionType; label: string }[] = [
  { type: "invoice", label: TRANSACTION_TYPE_LABEL.invoice },
  { type: "order", label: TRANSACTION_TYPE_LABEL.order },
  { type: "proforma_invoice", label: TRANSACTION_TYPE_LABEL.proforma_invoice },
  { type: "proforma_order", label: TRANSACTION_TYPE_LABEL.proforma_order }
];
function onTypeSwitch(next: unknown) {
  const type = String(next ?? "") as TransactionType;
  if (!type || type === "proforma_order") return;
  navigateTo(`/sales/${TYPE_CAPABILITIES[type].route}/new`);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

const form = reactive({
  linkedOrderId: null as number | null,
  customerName: "",
  customerAddress: "",
  transactionDateIso: toDmy(new Date()),
  dueDateIso: toDmy(addDays(new Date(), 30)),
  term: "Net 30",
  transactionNo: "",
  billingMethod: "percentage" as BillingMethod,
  billingPercent: 50,
  tags: [] as string[],
  message: "",
  memo: ""
});
const attachments = ref<string[]>([]);
const submitted = ref(false);

const linkedOrder = computed(() =>
  form.linkedOrderId != null ? getSalesTransactionById(form.linkedOrderId) : undefined
);
const orderLines = computed(() => linkedOrder.value?.lines ?? []);
const orderSubtotal = computed(() => linkedOrder.value?.subtotal ?? 0);

/** Orders still worth billing, plus whichever one this record already bills
 *  (an edit must keep showing its own order even once it is fully claimed). */
const orderOptions = computed<SalesTransaction[]>(() => {
  const options = billableOrders();
  const current = linkedOrder.value;
  return current && !options.some((o) => o.id === current.id) ? [current, ...options] : options;
});

const alreadyBilledPercent = computed(() =>
  form.linkedOrderId != null ? billedPercentForOrder(form.linkedOrderId, props.recordId) : 0
);
const remainingPercent = computed(() => Math.max(0, 100 - alreadyBilledPercent.value));
const overBilled = computed(
  () => form.billingPercent <= 0 || form.billingPercent > remainingPercent.value
);

function applyOrder(order: SalesTransaction) {
  form.customerName = order.customerName;
  form.customerAddress = order.customerAddress;
  form.term = order.term;
  form.tags = [...order.tags];
}

function onOrderChange(next: unknown) {
  const id = Number(next);
  form.linkedOrderId = id || null;
  const order = id ? getSalesTransactionById(id) : undefined;
  if (order?.type === "order") applyOrder(order);
}

// Reached from an order's Actions menu, which passes the order id.
watch(
  () => route.query.order,
  (q) => {
    if (isEdit.value || !q) return;
    const id = Number(q);
    const order = id ? getSalesTransactionById(id) : undefined;
    if (order?.type !== "order") return;
    form.linkedOrderId = order.id;
    applyOrder(order);
  },
  { immediate: true }
);

function loadFromExisting() {
  const r = existing.value;
  if (!r) return;
  form.linkedOrderId = r.linkedOrderId;
  form.customerName = r.customerName;
  form.customerAddress = r.customerAddress;
  form.transactionDateIso = isoToDmy(r.transactionDateSort);
  form.dueDateIso = isoToDmy(r.dueDateSort);
  form.term = r.term;
  form.transactionNo = r.number;
  form.billingMethod = r.billingMethod ?? "percentage";
  form.billingPercent = r.billingPercent;
  form.tags = [...r.tags];
  form.message = r.message;
  form.memo = r.memo;
  attachments.value = [...r.attachments];
}
watch(existing, loadFromExisting, { immediate: true });

const pageTitle = computed(() =>
  isEdit.value
    ? `Edit ${existing.value?.number ?? TRANSACTION_TYPE_LABEL.proforma_order}`
    : `Create ${TRANSACTION_TYPE_LABEL.proforma_order}`
);

const billingMethodHint = computed(() => BILLING_METHOD_HINT[form.billingMethod]);

const availableTags = computed(() => TAG_OPTIONS.filter((t) => !form.tags.includes(t)));
function addTag(tag: unknown) {
  const value = String(tag ?? "");
  if (value && !form.tags.includes(value)) form.tags.push(value);
}
function removeTag(tag: string) {
  form.tags = form.tags.filter((t) => t !== tag);
}

const share = computed(() => (Number(form.billingPercent) || 0) / 100);
function billedForLine(amount: number) {
  return Math.round(amount * share.value);
}

// The billed lines are the order's, scaled to this document's share — built
// through the shared totals engine so the preview and the saved record agree.
const billedLines = computed(() =>
  orderLines.value.map((l) => ({
    product: l.product,
    description: l.description,
    unit: l.unit,
    quantity: l.quantity,
    unitPrice: Math.round(l.unitPrice * share.value),
    discountPercent: l.discountPercent,
    tax: l.tax
  }))
);
const totals = computed(() => computeTransactionTotals(billedLines.value));

const isValid = computed(
  () => Boolean(form.linkedOrderId && form.transactionDateIso) && !overBilled.value
);
const missingFields = computed(() => {
  const missing: string[] = [];
  if (!form.linkedOrderId) missing.push("Sales order");
  if (!form.transactionDateIso) missing.push("Transaction date");
  if (overBilled.value) missing.push(`a share within the ${remainingPercent.value}% still unbilled`);
  return missing;
});

function onAttachmentChange(event: Event) {
  const files = (event.target as HTMLInputElement)?.files;
  // Names only — this prototype never uploads or stores the bytes.
  attachments.value = files ? [...files].map((f) => f.name) : [];
}

function buildInput(): SalesTransactionInput {
  return {
    ...emptyTransactionInput(),
    linkedOrderId: form.linkedOrderId,
    billingMethod: form.billingMethod,
    billingPercent: Number(form.billingPercent) || 0,
    customerName: form.customerName,
    customerAddress: form.customerAddress,
    email: linkedOrder.value ? [...linkedOrder.value.email] : [],
    transactionDateIso: dmyToIso(form.transactionDateIso),
    dueDateIso: dmyToIso(form.dueDateIso),
    term: form.term,
    transactionNo: form.transactionNo,
    warehouse: linkedOrder.value?.warehouse ?? "",
    tags: form.tags,
    message: form.message,
    memo: form.memo,
    attachments: attachments.value,
    lines: billedLines.value
  };
}

function onSubmit() {
  submitted.value = true;
  if (!isValid.value) return;
  const input = buildInput();
  if (isEdit.value && props.recordId != null) {
    const updated = updateTransaction(props.recordId, input);
    navigateTo(`/sales/proforma-order/${updated?.id ?? props.recordId}`);
    return;
  }
  const created = createTransaction("proforma_order", input);
  navigateTo(`/sales/proforma-order/${created.id}`);
}

function onCancel() {
  if (isEdit.value && props.recordId != null)
    navigateTo(`/sales/proforma-order/${props.recordId}`);
  else if (form.linkedOrderId) navigateTo(`/sales/order/${form.linkedOrderId}`);
  else navigateTo("/sales");
}

// All css() below uses Pixel 3 token shortcuts only (token mode 2.1).
// The addon supplies no padding of its own: Pixel's "input with prefix and
// suffix" pattern pads the addon's content by 12px.
const addonTextClass = css({ px: 3 });
const typeSelectClass = css({ width: "200px" });
const topGridClass = css({
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 6,
  alignItems: "start"
});
const totalPreviewClass = css({
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
const metaColClass = css({ display: "flex", flexDirection: "column", gap: 5 });
const addressFieldClass = css({ "& textarea": { minHeight: "92px" } });
const tagListClass = css({ mt: 2 });

const scrollShadowClass = css({
  backgroundImage:
    "linear-gradient(to right, var(--mp-colors-white) 30%, transparent), linear-gradient(to left, var(--mp-colors-white) 30%, transparent), linear-gradient(to right, rgba(29,31,36,0.16), transparent), linear-gradient(to left, rgba(29,31,36,0.16), transparent)",
  backgroundPosition: "left center, right center, left center, right center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "36px 100%, 36px 100%, 12px 100%, 12px 100%",
  backgroundAttachment: "local, local, scroll, scroll"
});
const itemsTableClass = css({ tableLayout: "fixed", width: "full", minWidth: "960px", mt: 8 });
const itemsHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
const wrapCellClass = css({ whiteSpace: "normal!", wordBreak: "break-word", textAlign: "left" });
const numCellClass = css({ textAlign: "right" });
const numInputClass = css({ textAlign: "right" });
const emptyCellClass = css({ textAlign: "center", py: "6!" });

const bottomRowClass = css({
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  flexWrap: "wrap",
  mt: 8
});
const notesColClass = css({
  display: "flex",
  flexDirection: "column",
  gap: 5,
  width: "25%",
  minWidth: "260px"
});
const totalsColClass = css({
  display: "flex",
  flexDirection: "column",
  gap: 4,
  width: "50%",
  minWidth: "320px"
});
const totalsRowClass = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 3
});
const totalsDividerClass = css({ my: 1 });

const validationSummaryClass = css({ display: "flex", justifyContent: "flex-end", mt: 8 });
const actionBarClass = css({
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: 2,
  mt: 8
});
</script>
