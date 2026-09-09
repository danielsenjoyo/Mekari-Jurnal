<template>
  <DefaultPageContent :title="pageTitle" breadcrumb="Sales" breadcrumb-to="/sales">
    <!-- Zone 1 — customer / email / running total. Customer is derived from the
         chosen invoice rather than picked: a return credits one specific
         invoice, so its customer is not an independent choice. -->
    <div :class="topGridClass">
      <MpFormControl :is-disabled="true">
        <MpFormLabel>Customer</MpFormLabel>
        <MpInput
          :model-value="form.customerName"
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
          <MpFormLabel>Sales invoice</MpFormLabel>
          <MpSelect
            :model-value="form.linkedInvoiceId ? String(form.linkedInvoiceId) : ''"
            :is-disabled="isEdit"
            is-full-width
            @update:model-value="onInvoiceChange"
          >
            <option value="">Select an invoice to return against</option>
            <option v-for="inv in returnableInvoices" :key="inv.id" :value="String(inv.id)">
              {{ inv.number }} — {{ inv.customerName }}
            </option>
          </MpSelect>
          <MpFormHelpText v-if="isEdit"
            >A return stays attached to the invoice it was raised from.</MpFormHelpText
          >
          <MpFormErrorMessage>Choose the invoice this return credits.</MpFormErrorMessage>
        </MpFormControl>

        <!-- Which deliveries the goods are coming back on. Only offered when
             the chosen invoice actually bills for one — an invoice with no
             delivery is returned against as a whole, which is the simpler and
             more common case. -->
        <MpFormControl v-if="availableDeliveries.length">
          <MpFormLabel>Delivery no.</MpFormLabel>
          <MpFlex direction="column" gap="2" align-items="flex-start">
            <MpButton variant="secondary" size="sm" @click="isDeliveryDrawerOpen = true">
              {{ selectedDeliveries.length ? "Change delivery" : "Select delivery" }}
            </MpButton>
            <MpFlex v-if="selectedDeliveries.length" gap="2" wrap="wrap">
              <MpTag
                v-for="delivery in selectedDeliveries"
                :key="delivery.id"
                variant="gray"
                size="sm"
                is-closable
                @close="removeDelivery(delivery.id)"
              >
                {{ delivery.number }}
              </MpTag>
            </MpFlex>
          </MpFlex>
          <MpFormHelpText>
            {{
              selectedDeliveries.length
                ? "Returnable quantities are capped at what these deliveries shipped."
                : "Optional — returning against the whole invoice instead."
            }}
          </MpFormHelpText>
        </MpFormControl>

        <MpFormControl>
          <MpFormLabel>Billing address</MpFormLabel>
          <MpTextarea v-model="form.customerAddress" :class="addressFieldClass" is-full-width />
        </MpFormControl>
      </div>

      <div :class="metaColClass">
        <MpFormControl
          is-required
          :is-invalid="submitted && (!form.transactionDateIso || returnDateTooEarly)"
        >
          <MpFormLabel>Return date</MpFormLabel>
          <MpDatePicker
            v-model="form.transactionDateIso"
            value-type="string"
            :format="DATE_INPUT_FORMAT"
            placeholder="DD/MM/YYYY"
            use-portal
          />
          <!-- The source app's own rule: goods can't come back before they were
               invoiced (returns/i18n.json → validation.exceed_invoice_date). -->
          <MpFormErrorMessage>{{
            returnDateTooEarly
              ? "Return date must be on or after the invoice date."
              : "Return date is required."
          }}</MpFormErrorMessage>
          <MpFormHelpText v-if="linkedInvoice && !returnDateTooEarly">
            Invoiced on {{ linkedInvoice.transactionDate }}.
          </MpFormHelpText>
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
              Return no.
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
         row: a customer can only send back what was invoiced, so the rows are
         fixed by the chosen invoice and the only editable figure is how many
         come back. Qty is capped at what's still returnable (invoiced less any
         earlier return), so two returns can't credit more than was sold. -->
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
          <template v-for="group in lineGroups" :key="group.key">
            <!-- A group header only earns its row when the lines are actually
                 split across deliveries; with one source there is nothing to
                 tell apart, and the header would be noise. -->
            <MpTableRow v-if="group.label">
              <MpTableCell as="td" :colspan="7" :class="groupHeaderClass">
                <MpText size="label" weight="semiBold" color="dark">{{ group.label }}</MpText>
              </MpTableCell>
            </MpTableRow>
            <MpTableRow v-for="line in group.lines" :key="line.key">
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
              <MpText size="body-small" color="gray.600"
                >Returnable qty {{ line.maxQuantity }}</MpText
              >
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
          </template>

          <MpTableRow v-if="!form.lines.length">
            <MpTableCell as="td" :colspan="7" :class="emptyCellClass">
              <MpText size="body-small" color="gray.600">
                Choose a sales invoice above to load the lines you can return.
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
        Qty exceeds the returnable limit: {{ overReturned.join(", ") }}.
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
          <MpText size="h3" weight="semiBold" color="dark">Total return</MpText>
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
    <SalesReturnDeliveryDrawer
      :is-open="isDeliveryDrawerOpen"
      :deliveries="availableDeliveries"
      :selected="form.deliveryIds"
      @close="isDeliveryDrawerOpen = false"
      @apply="onApplyDeliveries"
    />
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
  MpTooltip,
  MpUpload
} from "@mekari/pixel3";
import DefaultPageContent from "~/components/template/DefaultPageContent.vue";
import SalesReturnDeliveryDrawer from "~/components/sales/SalesReturnDeliveryDrawer.vue";
import {
  TAG_OPTIONS,
  TRANSACTION_TYPE_LABEL,
  WAREHOUSE_OPTIONS,
  computeTransactionTotals,
  computeLineAmount,
  createTransaction,
  deliveriesForInvoice,
  emptyTransactionInput,
  formatCurrency,
  getSalesTransactionById,
  getSalesTransactions,
  getTransactionOfType,
  returnableQuantities,
  updateTransaction,
  type SalesTransaction,
  type SalesTransactionInput
} from "~/data/sales-transactions";
import { DATE_INPUT_FORMAT, toDmy, dmyToIso, isoToDmy } from "~/utils/dates";

// ---------------------------------------------------------------------------
// Create/edit for a Sales Return. Mirrors
// app/components/purchase/PurchaseReturnForm.vue, with jurnal-frontend-app
// src/pages/sales/returns/new_and_edit.vue as the behavioural reference.
//
// The one thing that makes this form unlike the others: you don't build a
// document from scratch, you pick an Invoice and choose how much of it comes
// back. So there is no product picker and no trailing "add line" row — the
// rows are whatever that invoice has, and the only editable figure per row is
// the return quantity, capped at what hasn't already been returned.
//
// Reached from an invoice's Actions menu (`?invoice=<id>` pre-selects it),
// which is how the reference app does it.
// ---------------------------------------------------------------------------

const props = defineProps<{ recordId?: number }>();

const route = useRoute();
const isEdit = computed(() => props.recordId != null);
const existing = computed(() =>
  props.recordId != null ? getTransactionOfType(props.recordId, "return") : undefined
);

interface LineForm {
  key: number;
  /** Which delivery this line came back on, when the return is raised against
   *  deliveries rather than the invoice as a whole. */
  deliveryId: number | null;
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
  deliveryIds: [] as number[],
  customerName: "",
  customerAddress: "",
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
const isDeliveryDrawerOpen = ref(false);
const priceIncludesTax = ref(false);
const discountValue = ref(0);
const attachments = ref<string[]>([]);
const submitted = ref(false);

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

// Only invoices that still have something left to send back.
const returnableInvoices = computed<SalesTransaction[]>(() =>
  getSalesTransactions().filter((t) => {
    if (t.type !== "invoice") return false;
    if (form.linkedInvoiceId === t.id) return true;
    const remaining = returnableQuantities(t.id);
    return [...remaining.values()].some((qty) => qty > 0);
  })
);

const linkedInvoice = computed(() =>
  form.linkedInvoiceId != null ? getSalesTransactionById(form.linkedInvoiceId) : undefined
);

/** The deliveries this invoice bills for — the return's possible sources. */
const availableDeliveries = computed<SalesTransaction[]>(() =>
  form.linkedInvoiceId != null ? deliveriesForInvoice(form.linkedInvoiceId) : []
);
const selectedDeliveries = computed<SalesTransaction[]>(() =>
  form.deliveryIds
    .map((id) => getSalesTransactionById(id))
    .filter((t): t is SalesTransaction => Boolean(t))
);

function onApplyDeliveries(deliveryIds: number[]) {
  const kept = enteredQuantities();
  form.deliveryIds = deliveryIds;
  isDeliveryDrawerOpen.value = false;
  loadLines(kept);
}
function removeDelivery(id: number) {
  onApplyDeliveries(form.deliveryIds.filter((x) => x !== id));
}

/** The line rows, split by the delivery they came back on. One group with no
 *  label is the ungrouped case — see the template's note on why a lone header
 *  would be noise. */
const lineGroups = computed(() => {
  if (!form.deliveryIds.length) {
    return [{ key: "invoice", label: "", lines: form.lines }];
  }
  return form.deliveryIds
    .map((deliveryId) => {
      const delivery = getSalesTransactionById(deliveryId);
      return {
        key: String(deliveryId),
        // The number already reads "Sales Delivery #24042", so prefixing it again
        // would stutter — the source app prefixes because its numbers are bare.
        label: delivery?.number ?? `Delivery ${deliveryId}`,
        lines: form.lines.filter((l) => l.deliveryId === deliveryId)
      };
    })
    .filter((group) => group.lines.length > 0);
});

/** The source app's rule: goods can't come back before they were invoiced.
 *  Compared on the sortable ISO form, so it's a plain string comparison. */
const returnDateTooEarly = computed(() => {
  const invoice = linkedInvoice.value;
  const returnIso = dmyToIso(form.transactionDateIso);
  if (!invoice || !returnIso) return false;
  return returnIso < invoice.transactionDateSort;
});

/** Rebuilds the line rows from an invoice, capping each at what's returnable.
 *  `keep` carries over quantities already entered (used when editing).
 *
 *  With deliveries chosen, the rows come from THOSE deliveries instead — one
 *  row per product per delivery — and each is capped by two things at once:
 *  what that delivery shipped, and what the invoice still has left to return.
 *  Either bound alone would let a return overstate itself. */
function loadLines(keep?: Map<string, number>) {
  const invoiceId = form.linkedInvoiceId;
  const invoice = invoiceId != null ? getSalesTransactionById(invoiceId) : undefined;
  if (!invoice || invoiceId == null) {
    form.lines = [];
    return;
  }
  const remaining = returnableQuantities(invoiceId, props.recordId);

  if (!form.deliveryIds.length) {
    form.lines = invoice.lines.map((l) => ({
      key: ++lineKeySeq,
      deliveryId: null,
      product: l.product,
      description: l.description,
      quantity: keep?.get(lineKeyFor(null, l.product)) ?? 0,
      maxQuantity: Math.max(0, remaining.get(l.product) ?? 0),
      unit: l.unit,
      unitPrice: l.unitPrice,
      discountPercent: l.discountPercent,
      tax: l.tax
    }));
    return;
  }

  // Invoice lines carry the pricing; the deliveries carry the quantities. A
  // product shipped on two deliveries gets a row under each.
  const priced = new Map(invoice.lines.map((l) => [l.product, l]));
  const rows: LineForm[] = [];
  for (const deliveryId of form.deliveryIds) {
    const delivery = getSalesTransactionById(deliveryId);
    if (delivery?.type !== "delivery") continue;
    for (const line of delivery.lines) {
      const invoiceLine = priced.get(line.product);
      if (!invoiceLine) continue; // shipped but not on this invoice
      rows.push({
        key: ++lineKeySeq,
        deliveryId,
        product: line.product,
        description: invoiceLine.description,
        quantity: keep?.get(lineKeyFor(deliveryId, line.product)) ?? 0,
        maxQuantity: Math.min(line.quantity, Math.max(0, remaining.get(line.product) ?? 0)),
        unit: invoiceLine.unit,
        unitPrice: invoiceLine.unitPrice,
        discountPercent: invoiceLine.discountPercent,
        tax: invoiceLine.tax
      });
    }
  }
  form.lines = rows;
}

/** Identifies a row across a reload. Product alone is not enough once the same
 *  product can appear under two deliveries. */
function lineKeyFor(deliveryId: number | null, product: string) {
  return `${deliveryId ?? "invoice"}::${product}`;
}

/** Quantities currently entered, so a reload doesn't discard them. */
function enteredQuantities(): Map<string, number> {
  return new Map(form.lines.map((l) => [lineKeyFor(l.deliveryId, l.product), l.quantity]));
}

function applyInvoice(invoice: SalesTransaction) {
  form.customerName = invoice.customerName;
  form.customerAddress = invoice.customerAddress;
  if (!form.shippingAddress) form.shippingAddress = invoice.customerAddress;
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
  const invoice = getSalesTransactionById(id);
  if (invoice) applyInvoice(invoice);
  form.deliveryIds = [];
  loadLines();
}

function loadFromExisting() {
  const r = existing.value;
  if (!r) return;
  form.linkedInvoiceId = r.linkedInvoiceId;
  form.customerName = r.customerName;
  form.customerAddress = r.customerAddress;
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
  attachments.value = [...r.attachments];
  emailText.value = r.email.join(", ");
  priceIncludesTax.value = r.priceIncludesTax;
  discountValue.value = r.discountValue;
  if (r.linkedInvoiceId != null) {
    form.deliveryIds = [...r.deliveryIds];
    loadLines(new Map(r.lines.map((l) => [lineKeyFor(l.deliveryId ?? null, l.product), l.quantity])));
  }
}
watch(existing, loadFromExisting, { immediate: true });

// Reached from an invoice's Actions menu, which passes the invoice id.
watch(
  () => route.query.invoice,
  (q) => {
    if (isEdit.value || !q) return;
    const id = Number(q);
    const invoice = id ? getSalesTransactionById(id) : undefined;
    if (invoice?.type !== "invoice") return;
    form.linkedInvoiceId = invoice.id;
    applyInvoice(invoice);
    loadLines();
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
  computeTransactionTotals(
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
    overReturned.value.length === 0 &&
    !returnDateTooEarly.value
);
const missingFields = computed(() => {
  const missing: string[] = [];
  if (!form.linkedInvoiceId) missing.push("Sales invoice");
  if (!form.transactionDateIso) missing.push("Return date");
  if (returnDateTooEarly.value) missing.push("a return date on or after the invoice date");
  if (!hasValidLine.value) missing.push("a return quantity on at least one line");
  if (overReturned.value.length) missing.push("a quantity within what was invoiced");
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
    linkedInvoiceId: form.linkedInvoiceId,
    deliveryIds: [...form.deliveryIds],
    customerName: form.customerName,
    customerAddress: form.customerAddress,
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
    attachments: attachments.value,
    lines: returnedLines.value.map((l) => ({
      deliveryId: l.deliveryId,
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
  form.deliveryIds = [];
  form.customerName = "";
  form.customerAddress = "";
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
    navigateTo(`/sales/return/${updated?.id ?? props.recordId}`);
    return;
  }
  const created = createTransaction("return", input);
  if (opts?.andNew) {
    resetForm();
    return;
  }
  navigateTo(`/sales/return/${created.id}`);
}

function onCancel() {
  if (isEdit.value && props.recordId != null) navigateTo(`/sales/return/${props.recordId}`);
  else if (form.linkedInvoiceId) navigateTo(`/sales/invoice/${form.linkedInvoiceId}`);
  else navigateTo("/sales");
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
// The delivery a run of rows came back on. Tinted rather than bold-on-white so
// it reads as a divider between groups, not as another line item.
const groupHeaderClass = css({ bg: "gray.25", py: "2!" });
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
