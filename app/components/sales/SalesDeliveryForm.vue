<template>
  <DefaultPageContent :title="pageTitle" breadcrumb="Sales" breadcrumb-to="/sales">
    <template v-if="!isEdit" #actions>
      <div :class="typeSelectClass">
        <MpSelect :model-value="'delivery'" is-full-width @update:model-value="onTypeSwitch">
          <option v-for="opt in TYPE_SWITCH_OPTIONS" :key="opt.type" :value="opt.type">
            {{ opt.label }}
          </option>
        </MpSelect>
      </div>
    </template>

    <!-- Zone 1 — customer / email / source order. No running total: a Delivery
         records what physically shipped, not what it costs. Its only money
         field is the shipping fee, further down. -->
    <div :class="topGridClass">
      <MpFormControl is-required :is-invalid="submitted && !form.customerName">
        <MpFormLabel>Customer</MpFormLabel>
        <MpAutocomplete
          v-model="form.customerName"
          label-prop="name"
          value-prop="name"
          :data="CUSTOMER_OPTIONS"
          placeholder="Select customer"
          is-searchable
          is-full-width
        />
        <MpFormErrorMessage>Customer is required.</MpFormErrorMessage>
      </MpFormControl>

      <MpFormControl>
        <MpFormLabel>Email</MpFormLabel>
        <MpInput v-model="emailText" placeholder="e.g. john@example.com" is-full-width />
      </MpFormControl>

      <!-- A sales delivery usually fulfils an order. Picking one copies the
           customer and its lines across, which is how the reference app's
           "Create delivery" flow arrives here (`?order=<id>`). It stays
           optional: a delivery can also be raised on its own. -->
      <MpFormControl v-if="!isEdit">
        <MpFormLabel>Sales order</MpFormLabel>
        <MpSelect
          :model-value="sourceOrderId ? String(sourceOrderId) : ''"
          is-full-width
          @update:model-value="onOrderChange"
        >
          <option value="">Select an order to fulfil</option>
          <option v-for="order in openOrders" :key="order.id" :value="String(order.id)">
            {{ order.number }} — {{ order.customerName }}
          </option>
        </MpSelect>
        <MpFormHelpText>Optional — copies the order's customer and items.</MpFormHelpText>
      </MpFormControl>
      <div v-else />

      <div />
    </div>

    <MpDivider variant="dashed" :class="dividerClass" />

    <!-- Zone 2 — shipping is UNCONDITIONAL here (TYPE_CAPABILITIES.delivery
         .shipping === "always"), unlike the money types where it hides behind
         a checkbox. It is the point of the document. -->
    <div :class="metaGridClass">
      <div :class="metaColClass">
        <MpFormControl>
          <MpFormLabel>Shipping address</MpFormLabel>
          <MpTextarea
            v-model="form.shippingAddress"
            placeholder="e.g. Jalan Indonesia Blok C No. 22"
            is-full-width
          />
        </MpFormControl>
      </div>

      <div :class="metaColClass">
        <MpFormControl is-required :is-invalid="submitted && !form.shippingDateIso">
          <MpFormLabel>Shipping date</MpFormLabel>
          <MpDatePicker
            v-model="form.shippingDateIso"
            value-type="string"
            :format="DATE_INPUT_FORMAT"
            placeholder="DD/MM/YYYY"
            use-portal
          />
        </MpFormControl>
        <MpFormControl>
          <MpFormLabel>Ship via</MpFormLabel>
          <MpSelect v-model="form.shipVia" is-full-width is-clearable>
            <option value="">Select carrier</option>
            <option v-for="s in SHIP_VIA_OPTIONS" :key="s" :value="s">{{ s }}</option>
          </MpSelect>
        </MpFormControl>
        <MpFormControl>
          <MpFormLabel>Tracking no.</MpFormLabel>
          <MpInput v-model="form.trackingNo" placeholder="e.g. TRK-200027" is-full-width />
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
          <MpFormLabel>Customer reference number</MpFormLabel>
          <MpInput v-model="form.referenceNo" is-full-width />
        </MpFormControl>
        <MpFormControl>
          <MpFormLabel>Warehouse</MpFormLabel>
          <MpSelect v-model="form.warehouse" is-full-width is-clearable>
            <option value="">Select warehouse</option>
            <option v-for="wh in WAREHOUSE_OPTIONS" :key="wh" :value="wh">{{ wh }}</option>
          </MpSelect>
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
        <MpFormControl>
          <MpFormLabel>Currency</MpFormLabel>
          <MpSelect v-model="form.currency" is-full-width>
            <option v-for="c in CURRENCY_OPTIONS" :key="c" :value="c">{{ c }}</option>
          </MpSelect>
        </MpFormControl>
      </div>
    </div>

    <!-- Zone 3 — items: what shipped and how much of it. No pricing columns,
         matching the Delivery detail page. -->
    <MpTableContainer :class="scrollShadowClass">
      <MpTable :class="itemsTableClass">
        <colgroup>
          <col :style="{ width: '30%' }" />
          <col :style="{ width: '40%' }" />
          <col :style="{ width: '12%' }" />
          <col :style="{ width: '18%' }" />
          <col :style="{ width: '40px' }" />
        </colgroup>
        <MpTableHead :class="itemsHeadClass">
          <MpTableRow>
            <MpTableCell as="th">Product</MpTableCell>
            <MpTableCell as="th">Description</MpTableCell>
            <MpTableCell as="th">Qty</MpTableCell>
            <MpTableCell as="th">Units</MpTableCell>
            <MpTableCell as="th" />
          </MpTableRow>
        </MpTableHead>
        <MpTableBody>
          <MpTableRow v-for="(line, index) in form.lines" :key="line.key">
            <MpTableCell as="td" :class="lineCellClass">
              <MpSelect v-model="line.product" is-full-width @change="applyProduct(index)">
                <option value="">Select product</option>
                <option v-for="p in PRODUCT_OPTIONS" :key="p.name" :value="p.name">
                  {{ p.name }}
                </option>
              </MpSelect>
            </MpTableCell>
            <MpTableCell as="td" :class="lineCellClass">
              <MpTextarea
                v-model="line.description"
                placeholder="Enter description"
                rows="1"
                is-full-width
              />
            </MpTableCell>
            <MpTableCell as="td" :class="lineCellClass">
              <MpInput v-model.number="line.quantity" type="number" is-full-width />
            </MpTableCell>
            <MpTableCell as="td" :class="lineCellClass">
              <MpSelect v-model="line.unit" :is-disabled="!line.product" is-full-width>
                <option value="">Select unit</option>
                <option v-for="u in unitOptionsFor(line.product)" :key="u" :value="u">
                  {{ u }}
                </option>
              </MpSelect>
            </MpTableCell>
            <MpTableCell as="td" :class="lineCellClass">
              <MpButton
                variant="ghost"
                size="sm"
                left-icon="minus-circular"
                aria-label="Remove line"
                @click="removeLine(index)"
              />
            </MpTableCell>
          </MpTableRow>

          <MpTableRow>
            <MpTableCell as="td" :class="lineCellClass">
              <MpSelect :model-value="''" is-full-width @update:model-value="addLineFromProduct">
                <option value="">Select product</option>
                <option v-for="p in PRODUCT_OPTIONS" :key="p.name" :value="p.name">
                  {{ p.name }}
                </option>
              </MpSelect>
            </MpTableCell>
            <MpTableCell v-for="n in 4" :key="n" as="td" :class="lineCellClass" />
          </MpTableRow>
        </MpTableBody>
      </MpTable>
    </MpTableContainer>

    <MpFormControl v-if="submitted && !hasValidLine" :is-invalid="true" :class="lineErrorClass">
      <MpFormErrorMessage>Add at least one line with a product and quantity.</MpFormErrorMessage>
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
          <MpText>Shipping fee</MpText>
          <!-- Formatted on focusout, never while typing — same as the money
               form's unit price. -->
          <div :class="shippingFeeInputClass" @focusout="onShippingFeeBlur">
            <MpInputGroup>
              <MpInputLeftAddon>
                <MpText weight="semiBold" :class="addonTextClass">Rp</MpText>
              </MpInputLeftAddon>
              <MpInput
                v-model="shippingFeeText"
                type="text"
                inputmode="decimal"
                :class="numInputClass"
                @update:model-value="onShippingFeeInput"
              />
            </MpInputGroup>
          </div>
        </div>
        <div :class="totalsRowClass">
          <MpText weight="semiBold" color="dark">Total items</MpText>
          <MpText weight="semiBold" color="dark">{{ totalItems }}</MpText>
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
  MpAutocomplete,
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
  CURRENCY_OPTIONS,
  CUSTOMER_OPTIONS,
  PRODUCT_OPTIONS,
  SHIP_VIA_OPTIONS,
  TAG_OPTIONS,
  TRANSACTION_TYPE_LABEL,
  TYPE_CAPABILITIES,
  WAREHOUSE_OPTIONS,
  createTransaction,
  emptyTransactionInput,
  formatAmount,
  getSalesTransactionById,
  getSalesTransactionsByType,
  getTransactionOfType,
  parseAmount,
  updateTransaction,
  type SalesTransaction,
  type SalesTransactionInput,
  type TransactionType
} from "~/data/sales-transactions";
import { DATE_INPUT_FORMAT, toDmy, dmyToIso, isoToDmy } from "~/utils/dates";

// ---------------------------------------------------------------------------
// Create/edit for a Sales Delivery — its own component, matching the reference
// app's sales/deliveries/new_and_edit.vue. What makes it distinct: the shipping
// block is unconditional (it IS the document), the line items carry no
// pricing, the only money on the screen is a shipping fee, and it can be
// seeded from the Sales Order it fulfils.
// Zones mirror the Delivery detail page.
// ---------------------------------------------------------------------------

const props = defineProps<{ recordId?: number }>();

const route = useRoute();
const isEdit = computed(() => props.recordId != null);
const existing = computed(() =>
  props.recordId != null ? getTransactionOfType(props.recordId, "delivery") : undefined
);

const TYPE_SWITCH_OPTIONS: { type: TransactionType; label: string }[] = [
  { type: "invoice", label: TRANSACTION_TYPE_LABEL.invoice },
  { type: "order", label: TRANSACTION_TYPE_LABEL.order },
  { type: "delivery", label: TRANSACTION_TYPE_LABEL.delivery }
];
function onTypeSwitch(next: unknown) {
  const type = String(next ?? "") as TransactionType;
  if (!type || type === "delivery") return;
  navigateTo(`/sales/${TYPE_CAPABILITIES[type].route}/new`);
}

interface LineForm {
  key: number;
  product: string;
  description: string;
  quantity: number;
  unit: string;
}
let lineKeySeq = 0;
function blankLine(): LineForm {
  lineKeySeq += 1;
  return { key: lineKeySeq, product: "", description: "", quantity: 1, unit: "" };
}

const form = reactive({
  customerName: "",
  shippingAddress: "",
  shippingDateIso: toDmy(new Date()),
  shipVia: "",
  trackingNo: "",
  transactionNo: "",
  referenceNo: "",
  warehouse: "",
  currency: "IDR",
  tags: [] as string[],
  message: "",
  memo: "",
  lines: [] as LineForm[]
});
const emailText = ref("");
const shippingFee = ref(0);
const shippingFeeText = ref("");
const sourceOrderId = ref<number | null>(null);
const attachments = ref<string[]>([]);
const submitted = ref(false);

const GENERIC_UNITS = ["pcs", "pack", "set", "roll", "box", "Gram", "ml"];

/** Orders still worth fulfilling — a closed one has nothing left to ship. */
const openOrders = computed<SalesTransaction[]>(() =>
  getSalesTransactionsByType("order").filter((o) => o.status !== "closed")
);

function applyOrder(order: SalesTransaction) {
  form.customerName = order.customerName;
  form.shippingAddress = order.shippingAddress || order.customerAddress;
  form.warehouse = order.warehouse;
  form.referenceNo = order.referenceNo;
  form.currency = order.currency;
  form.tags = [...order.tags];
  emailText.value = order.email.join(", ");
  form.lines = order.lines.map((l) => ({
    key: ++lineKeySeq,
    product: l.product,
    description: l.description,
    quantity: l.quantity,
    unit: l.unit
  }));
}

function onOrderChange(next: unknown) {
  const id = Number(next);
  sourceOrderId.value = id || null;
  if (!id) return;
  const order = getSalesTransactionById(id);
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
    sourceOrderId.value = order.id;
    applyOrder(order);
  },
  { immediate: true }
);

function loadFromExisting() {
  const r = existing.value;
  if (!r) return;
  form.customerName = r.customerName;
  form.shippingAddress = r.shippingAddress || r.customerAddress;
  form.shippingDateIso = r.shippingDateSort
    ? isoToDmy(r.shippingDateSort)
    : isoToDmy(r.transactionDateSort);
  form.shipVia = r.shipVia;
  form.trackingNo = r.trackingNo;
  form.transactionNo = r.number;
  form.referenceNo = r.referenceNo;
  form.warehouse = r.warehouse;
  form.currency = r.currency;
  form.tags = [...r.tags];
  form.message = r.message;
  form.memo = r.memo;
  attachments.value = [...r.attachments];
  form.lines = r.lines.map((l) => ({
    key: ++lineKeySeq,
    product: l.product,
    description: l.description,
    quantity: l.quantity,
    unit: l.unit
  }));
  emailText.value = r.email.join(", ");
  shippingFee.value = r.shippingFee;
  shippingFeeText.value = r.shippingFee ? formatAmount(r.shippingFee) : "";
}
watch(existing, loadFromExisting, { immediate: true });

const pageTitle = computed(() =>
  isEdit.value
    ? `Edit ${existing.value?.number ?? TRANSACTION_TYPE_LABEL.delivery}`
    : `Create ${TRANSACTION_TYPE_LABEL.delivery}`
);

watch(
  () => form.customerName,
  (name) => {
    const customer = CUSTOMER_OPTIONS.find((c) => c.name === name);
    if (customer && !form.shippingAddress) form.shippingAddress = customer.address;
  }
);

const availableTags = computed(() => TAG_OPTIONS.filter((t) => !form.tags.includes(t)));
function addTag(tag: unknown) {
  const value = String(tag ?? "");
  if (value && !form.tags.includes(value)) form.tags.push(value);
}
function removeTag(tag: string) {
  form.tags = form.tags.filter((t) => t !== tag);
}

function unitOptionsFor(productName: string): string[] {
  const canonical = PRODUCT_OPTIONS.find((p) => p.name === productName)?.unit;
  return [...new Set([canonical, ...GENERIC_UNITS].filter(Boolean) as string[])];
}
function addLineFromProduct(product: unknown) {
  const name = String(product ?? "");
  if (!name) return;
  const line = blankLine();
  line.product = name;
  form.lines.push(line);
  applyProduct(form.lines.length - 1);
}
function removeLine(index: number) {
  form.lines.splice(index, 1);
}
function applyProduct(index: number) {
  const line = form.lines[index];
  if (!line) return;
  const product = PRODUCT_OPTIONS.find((p) => p.name === line.product);
  if (!product) return;
  line.unit = product.unit;
  if (!line.description) line.description = product.name;
}
// Grouped-string mirror, same pattern as the money form's unit price.
function onShippingFeeInput() {
  shippingFee.value = parseAmount(shippingFeeText.value);
}
function onShippingFeeBlur() {
  shippingFee.value = parseAmount(shippingFeeText.value);
  shippingFeeText.value = shippingFee.value ? formatAmount(shippingFee.value) : "";
}

const totalItems = computed(() =>
  form.lines.reduce((sum, l) => sum + (Number(l.quantity) || 0), 0)
);
const hasValidLine = computed(() => form.lines.some((l) => l.product && l.quantity > 0));
const isValid = computed(
  () => Boolean(form.customerName && form.shippingDateIso) && hasValidLine.value
);
const missingFields = computed(() => {
  const missing: string[] = [];
  if (!form.customerName) missing.push("Customer");
  if (!form.shippingDateIso) missing.push("Shipping date");
  if (!hasValidLine.value) missing.push("at least one line with a product and quantity");
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
    customerName: form.customerName,
    customerAddress: form.shippingAddress,
    email: emailText.value
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean),
    // A delivery's own date IS the shipping date — there's no separate
    // transaction date on its form in the reference app either.
    transactionDateIso: dmyToIso(form.shippingDateIso),
    shippingInfo: true,
    shippingAddress: form.shippingAddress,
    shippingDateIso: dmyToIso(form.shippingDateIso),
    shipVia: form.shipVia,
    trackingNo: form.trackingNo,
    shippingFee: shippingFee.value,
    transactionNo: form.transactionNo,
    referenceNo: form.referenceNo,
    warehouse: form.warehouse,
    currency: form.currency,
    tags: form.tags,
    message: form.message,
    memo: form.memo,
    attachments: attachments.value,
    lines: form.lines
      .filter((l) => l.product && l.quantity > 0)
      .map((l) => ({
        product: l.product,
        description: l.description,
        unit: l.unit,
        quantity: l.quantity,
        unitPrice: 0,
        discountPercent: 0,
        tax: ""
      }))
  };
}

function onSubmit() {
  submitted.value = true;
  if (!isValid.value) return;
  const input = buildInput();
  if (isEdit.value && props.recordId != null) {
    const updated = updateTransaction(props.recordId, input);
    navigateTo(`/sales/delivery/${updated?.id ?? props.recordId}`);
    return;
  }
  const created = createTransaction("delivery", input);
  // Fulfilling an order links the two, so the order's detail page can show
  // which delivery covers it — the same link the generated dataset carries.
  if (sourceOrderId.value != null) {
    const order = getSalesTransactionById(sourceOrderId.value);
    if (order?.type === "order") order.linkedDeliveryId = created.id;
  }
  navigateTo(`/sales/delivery/${created.id}`);
}

function onCancel() {
  if (isEdit.value && props.recordId != null) navigateTo(`/sales/delivery/${props.recordId}`);
  else navigateTo("/sales");
}

// All css() below uses Pixel 3 token shortcuts only (token mode 2.1).
// The addon supplies no padding of its own: Pixel's "input with prefix and
// suffix" pattern (docs.mekari.design/patterns/input.html) pads the addon's
// content by 12px, without which the prefix sits flush against both edges.
const addonTextClass = css({ px: 3 });
const typeSelectClass = css({ width: "200px" });
const topGridClass = css({
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 6,
  alignItems: "start"
});
const dividerClass = css({ my: 6 });
const metaGridClass = css({
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 6,
  alignItems: "start"
});
const metaColClass = css({ display: "flex", flexDirection: "column", gap: 5 });
const tagListClass = css({ mt: 2 });

const scrollShadowClass = css({
  backgroundImage:
    "linear-gradient(to right, var(--mp-colors-white) 30%, transparent), linear-gradient(to left, var(--mp-colors-white) 30%, transparent), linear-gradient(to right, rgba(29,31,36,0.16), transparent), linear-gradient(to left, rgba(29,31,36,0.16), transparent)",
  backgroundPosition: "left center, right center, left center, right center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "36px 100%, 36px 100%, 12px 100%, 12px 100%",
  backgroundAttachment: "local, local, scroll, scroll"
});
const itemsTableClass = css({ tableLayout: "fixed", width: "full", minWidth: "760px", mt: 8 });
const itemsHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
const lineCellClass = css({ verticalAlign: "top" });
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
const shippingFeeInputClass = css({ width: "200px" });
const numInputClass = css({ textAlign: "right" });

const validationSummaryClass = css({ display: "flex", justifyContent: "flex-end", mt: 8 });
const actionBarClass = css({
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: 2,
  mt: 8
});
</script>
