<template>
  <DefaultPageContent :title="pageTitle" breadcrumb="Purchases" breadcrumb-to="/purchase">
    <!-- Zone 1 — vendor / email / running total. Vendor is derived from the
         chosen invoice rather than picked: a return credits one specific
         invoice, so its vendor is not an independent choice. -->
    <div :class="topGridClass">
      <MpFormControl :is-disabled="true">
        <MpFormLabel>Vendor</MpFormLabel>
        <MpInput
          :model-value="form.vendorName"
          placeholder="Choose an invoice first"
          is-read-only
          is-full-width
        />
      </MpFormControl>

      <MpFormControl :is-disabled="true">
        <MpFormLabel>Email</MpFormLabel>
        <MpInput :model-value="emailText" is-read-only is-full-width />
      </MpFormControl>

      <div />

      <div :class="totalPreviewClass">
        <MpText color="gray.600">Total return</MpText>
        <MpText size="h3" weight="semiBold" color="dark">{{ formatCurrency(totals.total) }}</MpText>
      </div>
    </div>

    <MpDivider variant="dashed" :class="dividerClass" />

    <div :class="metaGridClass">
      <div :class="metaColClass">
        <MpFormControl is-required :is-invalid="submitted && !form.linkedInvoiceId">
          <MpFormLabel>Purchase invoice</MpFormLabel>
          <MpSelect
            :model-value="form.linkedInvoiceId ? String(form.linkedInvoiceId) : ''"
            :is-disabled="isEdit"
            is-full-width
            @update:model-value="onInvoiceChange"
          >
            <option value="">Select an invoice to return against</option>
            <option v-for="inv in returnableInvoices" :key="inv.id" :value="String(inv.id)">
              {{ inv.number }} — {{ inv.vendorName }}
            </option>
          </MpSelect>
          <MpFormHelpText v-if="isEdit"
            >A return stays attached to the invoice it was raised from.</MpFormHelpText
          >
          <MpFormErrorMessage>Choose the invoice this return credits.</MpFormErrorMessage>
        </MpFormControl>

        <MpFormControl>
          <MpFormLabel>Billing address</MpFormLabel>
          <MpTextarea v-model="form.vendorAddress" :class="addressFieldClass" is-full-width />
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
          <MpFormLabel>Shipping date</MpFormLabel>
          <MpDatePicker
            v-model="form.shippingDateIso"
            value-type="string"
            :format="DATE_INPUT_FORMAT"
            placeholder="DD/MM/YYYY"
            use-portal
          />
        </MpFormControl>
      </div>

      <div :class="metaColClass">
        <MpFormControl :is-disabled="isEdit">
          <MpFormLabel>
            <span :class="labelWithIconClass">
              Transaction no.
              <MpTooltip label="Set the transaction number format">
                <MpIcon name="settings" size="sm" color="gray.600" />
              </MpTooltip>
            </span>
          </MpFormLabel>
          <MpInput
            v-model="form.transactionNo"
            :placeholder="isEdit ? '' : '[Auto]'"
            is-full-width
          />
        </MpFormControl>
        <MpFormControl>
          <MpFormLabel>Shipping address</MpFormLabel>
          <MpTextarea v-model="form.shippingAddress" :class="addressFieldClass" is-full-width />
        </MpFormControl>
        <MpFormControl>
          <MpFormLabel>Warehouse</MpFormLabel>
          <MpSelect v-model="form.warehouse" is-full-width is-clearable>
            <option value="">Select warehouse</option>
            <option v-for="wh in WAREHOUSE_OPTIONS" :key="wh" :value="wh">{{ wh }}</option>
          </MpSelect>
        </MpFormControl>
      </div>

      <div />
    </div>

    <div :class="currencyRowClass">
      <MpFormControl>
        <MpFormLabel>Tags</MpFormLabel>
        <div :class="tagFieldClass">
          <MpSelect :model-value="''" is-full-width @update:model-value="addTag">
            <option value="">Choose tag</option>
            <option v-for="tag in availableTags" :key="tag" :value="tag">{{ tag }}</option>
          </MpSelect>
        </div>
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

      <MpCheckbox :is-checked="priceIncludesTax" @change="priceIncludesTax = !priceIncludesTax">
        Price includes tax
      </MpCheckbox>
    </div>

    <!-- Zone 3 — the invoice's lines, with a return quantity per line. Unlike
         every other form here there is NO product picker and no trailing "add"
         row: you can only return what was invoiced, so the rows are fixed by
         the chosen invoice and the only editable figure is how many come back.
         Qty is capped at what's still returnable (invoiced less any earlier
         return), so two returns can't send back more than was bought. -->
    <MpTableContainer :class="scrollShadowClass">
      <MpTable :class="itemsTableClass">
        <colgroup>
          <col :style="{ width: '22%' }" />
          <col :style="{ width: '20%' }" />
          <col :style="{ width: '12%' }" />
          <col :style="{ width: '10%' }" />
          <col :style="{ width: '9%' }" />
          <col :style="{ width: '15%' }" />
          <col :style="{ width: '12%' }" />
        </colgroup>
        <MpTableHead :class="itemsHeadClass">
          <MpTableRow>
            <MpTableCell as="th">Product</MpTableCell>
            <MpTableCell as="th">Description</MpTableCell>
            <MpTableCell as="th">Return qty</MpTableCell>
            <MpTableCell as="th">Units</MpTableCell>
            <MpTableCell as="th">Discount</MpTableCell>
            <MpTableCell as="th" :class="numCellClass">Unit price</MpTableCell>
            <MpTableCell as="th" :class="numCellClass">Amount</MpTableCell>
          </MpTableRow>
        </MpTableHead>
        <MpTableBody>
          <MpTableRow v-for="line in form.lines" :key="line.key">
            <MpTableCell as="td" :class="lineCellClass">
              <MpText>{{ line.product }}</MpText>
            </MpTableCell>
            <MpTableCell as="td" :class="[lineCellClass, wrapCellClass]">{{
              line.description || "—"
            }}</MpTableCell>
            <MpTableCell as="td" :class="lineCellClass">
              <MpInput
                v-model.number="line.quantity"
                type="number"
                min="0"
                :max="line.maxQuantity"
                :is-invalid="line.quantity > line.maxQuantity"
                is-full-width
              />
              <!-- Plain MpText, not MpFormHelpText: the help-text part reads
                   its state from MpFormControl's provided context, so outside
                   one it throws on render (reading 'value' of undefined). -->
              <MpText size="body-small" color="gray.600">of {{ line.maxQuantity }}</MpText>
            </MpTableCell>
            <MpTableCell as="td" :class="lineCellClass">
              <MpText color="gray.600">{{ line.unit || "—" }}</MpText>
            </MpTableCell>
            <MpTableCell as="td" :class="lineCellClass">
              <MpText color="gray.600">{{ line.discountPercent }}%</MpText>
            </MpTableCell>
            <MpTableCell as="td" :class="[lineCellClass, numCellClass]">
              <MpText>{{ formatCurrency(line.unitPrice) }}</MpText>
            </MpTableCell>
            <MpTableCell as="td" :class="[lineCellClass, numCellClass]">
              <MpText>{{ formatCurrency(computeLineAmount(line)) }}</MpText>
            </MpTableCell>
          </MpTableRow>

          <MpTableRow v-if="!form.lines.length">
            <MpTableCell as="td" :colspan="7" :class="emptyCellClass">
              <MpText size="body-small" color="gray.600">
                Choose a purchase invoice above to load the lines you can return.
              </MpText>
            </MpTableCell>
          </MpTableRow>
        </MpTableBody>
      </MpTable>
    </MpTableContainer>

    <MpFormControl v-if="submitted && !hasValidLine" :is-invalid="true" :class="lineErrorClass">
      <MpFormErrorMessage>Set a return quantity on at least one line.</MpFormErrorMessage>
    </MpFormControl>
    <MpFormControl v-if="overReturned.length" :is-invalid="true" :class="lineErrorClass">
      <MpFormErrorMessage>
        You can't return more than was invoiced: {{ overReturned.join(", ") }}.
      </MpFormErrorMessage>
    </MpFormControl>

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
      </div>

      <div :class="totalsColClass">
        <div :class="totalsRowClass">
          <MpText weight="semiBold" color="dark">Subtotal</MpText>
          <MpText weight="semiBold" color="dark">{{ formatCurrency(totals.subtotal) }}</MpText>
        </div>
        <div :class="totalsRowClass">
          <MpText>Discount per lines</MpText>
          <MpText>{{ formatCurrency(totals.discountPerLines) }}</MpText>
        </div>
        <div :class="totalsRowClass">
          <MpFlex align="center" gap="3">
            <MpText>Discount</MpText>
            <div :class="discountInputClass">
              <MpInputGroup>
                <MpInputLeftAddon>
                  <MpText weight="semiBold" :class="addonTextClass">%</MpText>
                </MpInputLeftAddon>
                <MpInput v-model.number="discountValue" type="number" :class="numInputClass" />
              </MpInputGroup>
            </div>
          </MpFlex>
          <MpText>{{ formatCurrency(totals.discount) }}</MpText>
        </div>
        <div v-for="tax in totals.taxes" :key="tax.label" :class="totalsRowClass">
          <MpText>{{ tax.label }}</MpText>
          <MpText>{{ formatCurrency(tax.amount) }}</MpText>
        </div>

        <MpDivider variant="dashed" :class="totalsDividerClass" />

        <div :class="totalsRowClass">
          <MpText size="h3" weight="semiBold" color="dark">Total</MpText>
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
      <MpButton v-if="isEdit" variant="primary" @click="onSubmit()">Save changes</MpButton>
      <MpFlex v-else>
        <MpButton variant="primary" :class="saveButtonClass" @click="onSubmit()">Save</MpButton>
        <MpPopover placement="bottom-end" use-portal is-adaptive-width>
          <template #default>
            <MpPopoverTrigger>
              <MpButton
                variant="primary"
                :class="saveCaretButtonClass"
                right-icon="caret-down"
                aria-label="More save options"
              />
            </MpPopoverTrigger>
            <MpPopoverContent>
              <MpPopoverList>
                <MpPopoverListItem role="menuitem" @click="onSubmit({ andNew: true })"
                  >Save and create another</MpPopoverListItem
                >
              </MpPopoverList>
            </MpPopoverContent>
          </template>
        </MpPopover>
      </MpFlex>
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
  MpCheckbox,
  MpDatePicker,
  MpDivider,
  MpFlex,
  MpFormControl,
  MpFormErrorMessage,
  MpFormHelpText,
  MpFormLabel,
  MpIcon,
  MpInput,
  MpInputGroup,
  MpInputLeftAddon,
  MpPopover,
  MpPopoverContent,
  MpPopoverList,
  MpPopoverListItem,
  MpPopoverTrigger,
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
  MpTooltip
} from "@mekari/pixel3";
import DefaultPageContent from "~/components/template/DefaultPageContent.vue";
import {
  TAG_OPTIONS,
  TRANSACTION_TYPE_LABEL,
  WAREHOUSE_OPTIONS,
  computeInvoiceTotals,
  computeLineAmount,
  createTransaction,
  emptyTransactionInput,
  formatCurrency,
  getPurchaseTransactionById,
  getPurchaseTransactions,
  getTransactionOfType,
  returnableQuantities,
  updateTransaction,
  type PurchaseTransaction,
  type PurchaseTransactionInput
} from "~/data/purchase-transactions";
import { DATE_INPUT_FORMAT, toDmy, dmyToIso, isoToDmy } from "~/utils/dates";

// ---------------------------------------------------------------------------
// Create/edit for a Purchase Return. Ported from jurnal-frontend-app
// src/pages/purchases/returns/new_and_edit.vue.
//
// The one thing that makes this form unlike the other five: you don't build a
// document from scratch, you pick an Invoice and choose how much of it comes
// back. So there is no product picker and no trailing "add line" row — the
// rows are whatever that invoice has, and the only editable figure per row is
// the return quantity, capped at what hasn't already been returned.
//
// Reached from an invoice's Actions menu (`?invoice=<id>` pre-selects it),
// which is how the reference app does it — there is no Return list tab.
// ---------------------------------------------------------------------------

const props = defineProps<{ recordId?: number }>();

const route = useRoute();
const isEdit = computed(() => props.recordId != null);
const existing = computed(() =>
  props.recordId != null ? getTransactionOfType(props.recordId, "return") : undefined
);

interface LineForm {
  key: number;
  product: string;
  description: string;
  quantity: number;
  /** Invoiced quantity less anything already returned on other returns. */
  maxQuantity: number;
  unit: string;
  unitPrice: number;
  discountPercent: number;
  tax: string;
}

let lineKeySeq = 0;

const form = reactive({
  linkedInvoiceId: null as number | null,
  vendorName: "",
  vendorAddress: "",
  shippingAddress: "",
  transactionDateIso: toDmy(new Date()),
  dueDateIso: toDmy(addDays(new Date(), 30)),
  shippingDateIso: toDmy(new Date()),
  transactionNo: "",
  warehouse: "",
  tags: [] as string[],
  message: "",
  memo: "",
  lines: [] as LineForm[]
});
const emailText = ref("");
const priceIncludesTax = ref(false);
const discountValue = ref(0);
const submitted = ref(false);

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

// Only invoices that still have something left to send back.
const returnableInvoices = computed<PurchaseTransaction[]>(() =>
  getPurchaseTransactions().filter((t) => {
    if (t.type !== "invoice") return false;
    if (form.linkedInvoiceId === t.id) return true;
    const remaining = returnableQuantities(t.id);
    return [...remaining.values()].some((qty) => qty > 0);
  })
);

/** Rebuilds the line rows from an invoice, capping each at what's returnable.
 *  `keep` carries over quantities already entered (used when editing). */
function loadLinesFromInvoice(invoiceId: number, keep?: Map<string, number>) {
  const invoice = getPurchaseTransactionById(invoiceId);
  if (!invoice) {
    form.lines = [];
    return;
  }
  const remaining = returnableQuantities(invoiceId, props.recordId);
  form.lines = invoice.lines.map((l) => {
    const max = Math.max(0, remaining.get(l.product) ?? 0);
    return {
      key: ++lineKeySeq,
      product: l.product,
      description: l.description,
      quantity: keep?.get(l.product) ?? 0,
      maxQuantity: max,
      unit: l.unit,
      unitPrice: l.unitPrice,
      discountPercent: l.discountPercent,
      tax: l.tax
    };
  });
}

function applyInvoice(invoice: PurchaseTransaction) {
  form.vendorName = invoice.vendorName;
  form.vendorAddress = invoice.vendorAddress;
  if (!form.shippingAddress) form.shippingAddress = invoice.vendorAddress;
  form.warehouse = invoice.warehouse;
  emailText.value = invoice.email.join(", ");
}

function onInvoiceChange(next: unknown) {
  const id = Number(next);
  form.linkedInvoiceId = id || null;
  if (!id) {
    form.lines = [];
    return;
  }
  const invoice = getPurchaseTransactionById(id);
  if (invoice) applyInvoice(invoice);
  loadLinesFromInvoice(id);
}

function loadFromExisting() {
  const r = existing.value;
  if (!r) return;
  form.linkedInvoiceId = r.linkedInvoiceId;
  form.vendorName = r.vendorName;
  form.vendorAddress = r.vendorAddress;
  form.shippingAddress = r.shippingAddress;
  form.transactionDateIso = isoToDmy(r.transactionDateSort);
  form.dueDateIso = isoToDmy(r.dueDateSort);
  form.shippingDateIso = r.shippingDateSort
    ? isoToDmy(r.shippingDateSort)
    : isoToDmy(r.transactionDateSort);
  form.transactionNo = r.number;
  form.warehouse = r.warehouse;
  form.tags = [...r.tags];
  form.message = r.message;
  form.memo = r.memo;
  emailText.value = r.email.join(", ");
  priceIncludesTax.value = r.priceIncludesTax;
  discountValue.value = r.discountValue;
  if (r.linkedInvoiceId != null) {
    loadLinesFromInvoice(r.linkedInvoiceId, new Map(r.lines.map((l) => [l.product, l.quantity])));
  }
}
watch(existing, loadFromExisting, { immediate: true });

// Reached from an invoice's Actions menu, which passes the invoice id.
watch(
  () => route.query.invoice,
  (q) => {
    if (isEdit.value || !q) return;
    const id = Number(q);
    const invoice = id ? getPurchaseTransactionById(id) : undefined;
    if (invoice?.type !== "invoice") return;
    form.linkedInvoiceId = invoice.id;
    applyInvoice(invoice);
    loadLinesFromInvoice(invoice.id);
  },
  { immediate: true }
);

const pageTitle = computed(() =>
  isEdit.value
    ? `Edit ${existing.value?.number ?? TRANSACTION_TYPE_LABEL.return}`
    : `Create ${TRANSACTION_TYPE_LABEL.return}`
);

const availableTags = computed(() => TAG_OPTIONS.filter((t) => !form.tags.includes(t)));
function addTag(tag: unknown) {
  const value = String(tag ?? "");
  if (value && !form.tags.includes(value)) form.tags.push(value);
}
function removeTag(tag: string) {
  form.tags = form.tags.filter((t) => t !== tag);
}

/** Lines whose entered quantity exceeds what's actually returnable. Surfaced
 *  as its own message because the number is per-line, so a generic "invalid"
 *  wouldn't say which product is over. */
const overReturned = computed(() =>
  form.lines.filter((l) => l.quantity > l.maxQuantity).map((l) => l.product)
);

const returnedLines = computed(() => form.lines.filter((l) => l.quantity > 0));

const totals = computed(() =>
  computeInvoiceTotals(
    returnedLines.value.map((l) => ({
      product: l.product,
      description: l.description,
      unit: l.unit,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discountPercent: l.discountPercent,
      tax: l.tax
    })),
    {
      discountType: "percent",
      discountValue: discountValue.value,
      priceIncludesTax: priceIncludesTax.value
    }
  )
);

const hasValidLine = computed(() => returnedLines.value.length > 0);
const isValid = computed(
  () =>
    Boolean(form.linkedInvoiceId && form.transactionDateIso) &&
    hasValidLine.value &&
    overReturned.value.length === 0
);
const missingFields = computed(() => {
  const missing: string[] = [];
  if (!form.linkedInvoiceId) missing.push("Purchase invoice");
  if (!form.transactionDateIso) missing.push("Transaction date");
  if (!hasValidLine.value) missing.push("a return quantity on at least one line");
  if (overReturned.value.length) missing.push("a quantity within what was invoiced");
  return missing;
});

function buildInput(): PurchaseTransactionInput {
  return {
    ...emptyTransactionInput(),
    linkedInvoiceId: form.linkedInvoiceId,
    vendorName: form.vendorName,
    vendorAddress: form.vendorAddress,
    email: emailText.value
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean),
    transactionDateIso: dmyToIso(form.transactionDateIso),
    dueDateIso: dmyToIso(form.dueDateIso),
    shippingInfo: true,
    shippingAddress: form.shippingAddress,
    shippingDateIso: dmyToIso(form.shippingDateIso),
    transactionNo: form.transactionNo,
    warehouse: form.warehouse,
    tags: form.tags,
    priceIncludesTax: priceIncludesTax.value,
    discountType: "percent",
    discountValue: discountValue.value,
    message: form.message,
    memo: form.memo,
    lines: returnedLines.value.map((l) => ({
      product: l.product,
      description: l.description,
      unit: l.unit,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discountPercent: l.discountPercent,
      tax: l.tax
    }))
  };
}

function resetForm() {
  form.linkedInvoiceId = null;
  form.vendorName = "";
  form.vendorAddress = "";
  form.shippingAddress = "";
  form.transactionDateIso = toDmy(new Date());
  form.dueDateIso = toDmy(addDays(new Date(), 30));
  form.shippingDateIso = toDmy(new Date());
  form.transactionNo = "";
  form.warehouse = "";
  form.tags = [];
  form.message = "";
  form.memo = "";
  form.lines = [];
  emailText.value = "";
  priceIncludesTax.value = false;
  discountValue.value = 0;
  submitted.value = false;
}

function onSubmit(opts?: { andNew: boolean }) {
  submitted.value = true;
  if (!isValid.value) return;
  const input = buildInput();
  if (isEdit.value && props.recordId != null) {
    const updated = updateTransaction(props.recordId, input);
    navigateTo(`/purchase/return/${updated?.id ?? props.recordId}`);
    return;
  }
  const created = createTransaction("return", input);
  if (opts?.andNew) {
    resetForm();
    return;
  }
  navigateTo(`/purchase/return/${created.id}`);
}

function onCancel() {
  if (isEdit.value && props.recordId != null) navigateTo(`/purchase/return/${props.recordId}`);
  else if (form.linkedInvoiceId) navigateTo(`/purchase/invoice/${form.linkedInvoiceId}`);
  else navigateTo("/purchase");
}

// All css() below uses Pixel 3 token shortcuts only (token mode 2.1).
// The addon supplies no padding of its own: Pixel's "input with prefix and
// suffix" pattern (docs.mekari.design/patterns/input.html) pads the addon's
// content by 12px, without which the prefix sits flush against both edges.
const addonTextClass = css({ px: 3 });
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
const labelWithIconClass = css({ display: "inline-flex", alignItems: "center", gap: 1 });

const currencyRowClass = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: 6,
  mt: 8,
  mb: 4
});
const tagFieldClass = css({ width: "240px" });
const tagListClass = css({ mt: 2 });

const scrollShadowClass = css({
  backgroundImage:
    "linear-gradient(to right, var(--mp-colors-white) 30%, transparent), linear-gradient(to left, var(--mp-colors-white) 30%, transparent), linear-gradient(to right, rgba(29,31,36,0.16), transparent), linear-gradient(to left, rgba(29,31,36,0.16), transparent)",
  backgroundPosition: "left center, right center, left center, right center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "36px 100%, 36px 100%, 12px 100%, 12px 100%",
  backgroundAttachment: "local, local, scroll, scroll"
});
const itemsTableClass = css({ tableLayout: "fixed", width: "full", minWidth: "1100px" });
const itemsHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
const lineCellClass = css({ verticalAlign: "top" });
const wrapCellClass = css({ whiteSpace: "normal!", wordBreak: "break-word", textAlign: "left" });
const numCellClass = css({ textAlign: "right" });
const numInputClass = css({ textAlign: "right" });
const emptyCellClass = css({ textAlign: "center", py: "6!" });
const lineErrorClass = css({ mt: 2 });

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
const discountInputClass = css({ width: "130px" });

const validationSummaryClass = css({ display: "flex", justifyContent: "flex-end", mt: 8 });
const actionBarClass = css({
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: 2,
  mt: 8
});
const saveButtonClass = css({ borderRightRadius: "0!" });
const saveCaretButtonClass = css({
  borderLeftRadius: "0!",
  borderLeftWidth: "sm!",
  borderLeftColor: "blue.600!"
});
</script>
