<template>
  <DefaultPageContent :title="pageTitle" breadcrumb="Sales" breadcrumb-to="/sales">
    <template v-if="!isEdit" #actions>
      <div :class="typeSelectClass">
        <MpSelect :model-value="'join_invoice'" is-full-width @update:model-value="onTypeSwitch">
          <option v-for="opt in TYPE_SWITCH_OPTIONS" :key="opt.type" :value="opt.type">
            {{ opt.label }}
          </option>
        </MpSelect>
      </div>
    </template>

    <!-- Zone 1 — customer / email / running total. The total is NOT typed: a
         join invoice has no figures of its own, it just sums the invoices it
         bundles. Picking a different customer clears the selection, because an
         invoice can only be joined with others billed to the same customer. -->
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
        <MpInput v-model="emailText" placeholder="Enter email" is-full-width />
      </MpFormControl>

      <div />

      <div :class="totalPreviewClass">
        <MpText color="gray.600">Total join invoice</MpText>
        <MpText size="h3" weight="semiBold" color="dark">{{ formatCurrency(totals.total) }}</MpText>
      </div>
    </div>

    <MpDivider variant="dashed" :class="dividerClass" />

    <!-- Zone 2 — three columns only, matching the Join Invoice detail page: no
         warehouse, no reference no., no tags, because a join invoice carries
         none of its own. -->
    <div :class="metaGridClass">
      <div :class="metaColClass">
        <MpFormControl>
          <MpFormLabel>Billing address</MpFormLabel>
          <MpTextarea v-model="form.customerAddress" :class="addressFieldClass" is-full-width />
        </MpFormControl>
      </div>

      <div :class="metaColClass">
        <MpFormControl>
          <MpFormLabel>Transaction date</MpFormLabel>
          <MpDatePicker
            v-model="form.transactionDateIso"
            value-type="string"
            :format="DATE_INPUT_FORMAT"
            placeholder="DD/MM/YYYY"
            use-portal
          />
        </MpFormControl>
        <MpFormControl is-required :is-invalid="submitted && !form.dueDateIso">
          <MpFormLabel>Due date</MpFormLabel>
          <MpDatePicker
            v-model="form.dueDateIso"
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
            :placeholder="isEdit ? '' : 'Join Invoice - [AUTO]'"
            is-full-width
          />
        </MpFormControl>
        <MpFormControl>
          <MpFormLabel>Terms of payment</MpFormLabel>
          <MpSelect v-model="form.term" is-full-width>
            <option value="">Select term</option>
            <option v-for="term in TERM_OPTIONS" :key="term" :value="term">{{ term }}</option>
          </MpSelect>
        </MpFormControl>
      </div>

      <div />
    </div>

    <!-- Zone 3 — the "line items" are whole Invoice records. The picker is the
         trailing row's first cell, exactly like the product picker on the other
         forms: choosing an invoice appends it and a fresh picker appears. It
         stays disabled until a customer is chosen, since invoices can only be
         joined with others billed to the same customer. -->
    <MpTableContainer :class="scrollShadowClass">
      <MpTable :class="itemsTableClass">
        <colgroup>
          <col :style="{ width: '24%' }" />
          <col :style="{ width: '18%' }" />
          <col :style="{ width: '13%' }" />
          <col :style="{ width: '13%' }" />
          <col :style="{ width: '16%' }" />
          <col :style="{ width: '16%' }" />
          <col :style="{ width: '40px' }" />
        </colgroup>
        <MpTableHead :class="itemsHeadClass">
          <MpTableRow>
            <MpTableCell as="th">Sales invoice</MpTableCell>
            <MpTableCell as="th">Description</MpTableCell>
            <MpTableCell as="th">Due date</MpTableCell>
            <MpTableCell as="th">Status</MpTableCell>
            <MpTableCell as="th" :class="numCellClass">Amount billed</MpTableCell>
            <MpTableCell as="th" :class="numCellClass">Remaining billed</MpTableCell>
            <MpTableCell as="th" />
          </MpTableRow>
        </MpTableHead>
        <MpTableBody>
          <MpTableRow v-for="inv in joinedInvoices" :key="inv.id">
            <MpTableCell as="td">{{ inv.number }}</MpTableCell>
            <MpTableCell as="td" :class="wrapCellClass">{{ inv.memo || "—" }}</MpTableCell>
            <MpTableCell as="td">{{ formatDisplayDate(inv.dueDateSort) }}</MpTableCell>
            <MpTableCell as="td">
              <MpBadge for="tableStatus" :type="SALES_STATUS_TYPE[inv.status]">{{
                SALES_STATUS_LABEL[inv.status]
              }}</MpBadge>
            </MpTableCell>
            <MpTableCell as="td" :class="numCellClass">{{ formatCurrency(inv.total) }}</MpTableCell>
            <MpTableCell as="td" :class="numCellClass">{{
              formatCurrency(inv.balanceDue)
            }}</MpTableCell>
            <MpTableCell as="td">
              <MpButton
                variant="ghost"
                size="sm"
                left-icon="minus-circular"
                aria-label="Remove invoice"
                @click="removeInvoice(inv.id)"
              />
            </MpTableCell>
          </MpTableRow>

          <MpTableRow>
            <MpTableCell as="td" :class="lineCellClass">
              <MpSelect
                :model-value="''"
                :is-disabled="!form.customerName"
                is-full-width
                @update:model-value="addInvoice"
              >
                <option value="">
                  {{ form.customerName ? "Search or select invoice" : "Select a customer first" }}
                </option>
                <option v-for="inv in selectableInvoices" :key="inv.id" :value="String(inv.id)">
                  {{ inv.number }} — {{ formatCurrency(inv.balanceDue) }} outstanding
                </option>
              </MpSelect>
            </MpTableCell>
            <MpTableCell v-for="n in 6" :key="n" as="td" :class="lineCellClass" />
          </MpTableRow>
        </MpTableBody>
      </MpTable>
    </MpTableContainer>

    <MpText
      v-if="joinedInvoices.length"
      size="body-small"
      color="gray.600"
      :class="lineCaptionClass"
    >
      Showing {{ joinedInvoices.length }} of {{ joinedInvoices.length }} invoice{{
        joinedInvoices.length === 1 ? "" : "s"
      }}
    </MpText>
    <!-- The source app's own bound: joining one invoice achieves nothing, and
         the batch is capped at 150 (returns/i18n.json → invalid_invoice_line). -->
    <MpFormControl v-if="submitted && !hasValidSelection" :is-invalid="true" :class="lineErrorClass">
      <MpFormErrorMessage>Min. 2 invoices &amp; max. 150 invoices.</MpFormErrorMessage>
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
          <MpFormHelpText
            >Files can be Excel, Word, PDF, JPG, PNG, or ZIP (maximum 5 files and 10 MB per
            file).</MpFormHelpText
          >
        </MpFormControl>
      </div>

      <div :class="totalsColClass">
        <div :class="totalsCardClass">
          <MpText weight="semiBold" color="dark">Total remaining billed</MpText>
          <MpText weight="semiBold" color="dark">{{ formatCurrency(totals.balanceDue) }}</MpText>
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
  </DefaultPageContent>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import {
  css,
  MpAutocomplete,
  MpBadge,
  MpBanner,
  MpBannerDescription,
  MpBannerIcon,
  MpButton,
  MpDatePicker,
  MpDivider,
  MpFormControl,
  MpFormErrorMessage,
  MpFormHelpText,
  MpFormLabel,
  MpIcon,
  MpInput,
  MpSelect,
  MpTable,
  MpTableBody,
  MpTableCell,
  MpTableContainer,
  MpTableHead,
  MpTableRow,
  MpText,
  MpTextarea,
  MpTooltip,
  MpUpload
} from "@mekari/pixel3";
import DefaultPageContent from "~/components/template/DefaultPageContent.vue";
import { SALES_STATUS_LABEL, SALES_STATUS_TYPE } from "~/data/sales-status";
import {
  CUSTOMER_OPTIONS,
  TERM_OPTIONS,
  TRANSACTION_TYPE_LABEL,
  TYPE_CAPABILITIES,
  createTransaction,
  emptyTransactionInput,
  formatCurrency,
  formatDisplayDate,
  getSalesTransactionById,
  getTransactionOfType,
  joinableInvoices,
  updateTransaction,
  type SalesTransaction,
  type SalesTransactionInput,
  type TransactionType
} from "~/data/sales-transactions";
import { DATE_INPUT_FORMAT, toDmy, dmyToIso, isoToDmy } from "~/utils/dates";

// ---------------------------------------------------------------------------
// Create/edit for a Join Invoice — the reference app's merged_invoices form
// (src/pages/sales/merged_invoices/new_and_edit.vue). Structurally unlike
// every other form in this module: it has no line items and no figures of its
// own. You pick whole Invoice RECORDS to bundle, and its total/balance are the
// sum of theirs (createTransaction applies that via applyBundledInvoiceTotals,
// so the preview here and the saved record use the same rule).
// ---------------------------------------------------------------------------

const props = defineProps<{ recordId?: number }>();

const isEdit = computed(() => props.recordId != null);
const existing = computed(() =>
  props.recordId != null ? getTransactionOfType(props.recordId, "join_invoice") : undefined
);

/** The source app's own bounds on a batch. */
const MIN_JOINED = 2;
const MAX_JOINED = 150;

const TYPE_SWITCH_OPTIONS: { type: TransactionType; label: string }[] = [
  { type: "invoice", label: TRANSACTION_TYPE_LABEL.invoice },
  { type: "join_invoice", label: TRANSACTION_TYPE_LABEL.join_invoice },
  { type: "order", label: TRANSACTION_TYPE_LABEL.order },
  { type: "quotation", label: TRANSACTION_TYPE_LABEL.quotation },
  { type: "delivery", label: TRANSACTION_TYPE_LABEL.delivery }
];
function onTypeSwitch(next: unknown) {
  const type = String(next ?? "") as TransactionType;
  if (!type || type === "join_invoice") return;
  navigateTo(`/sales/${TYPE_CAPABILITIES[type].route}/new`);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

const form = reactive({
  customerName: "",
  customerAddress: "",
  transactionDateIso: toDmy(new Date()),
  dueDateIso: toDmy(addDays(new Date(), 30)),
  term: "Net 30",
  transactionNo: "",
  message: "",
  memo: "",
  joinedInvoiceIds: [] as number[]
});
const emailText = ref("");
const attachments = ref<string[]>([]);
const submitted = ref(false);

function loadFromExisting() {
  const r = existing.value;
  if (!r) return;
  form.customerName = r.customerName;
  form.customerAddress = r.customerAddress;
  form.transactionDateIso = isoToDmy(r.transactionDateSort);
  form.dueDateIso = isoToDmy(r.dueDateSort);
  form.term = r.term;
  form.transactionNo = r.number;
  form.message = r.message;
  form.memo = r.memo;
  form.joinedInvoiceIds = [...r.joinedInvoiceIds];
  emailText.value = r.email.join(", ");
  attachments.value = [...r.attachments];
}
watch(existing, loadFromExisting, { immediate: true });

// "Join Sales Invoice" is the whole title — the source app names it as a
// phrase, unlike every other create form's "Create {Entity}". Joining is the
// action, so "Create Join Invoice" would read as a double verb.
const pageTitle = computed(() =>
  isEdit.value ? `Edit ${existing.value?.number ?? "Join Sales Invoice"}` : "Join Sales Invoice"
);

// Changing customer invalidates the selection — invoices billed to a different
// customer can't be paid together.
watch(
  () => form.customerName,
  (name, previous) => {
    const customer = CUSTOMER_OPTIONS.find((c) => c.name === name);
    if (customer) form.customerAddress = customer.address;
    if (previous && name !== previous) form.joinedInvoiceIds = [];
  }
);

const joinedInvoices = computed<SalesTransaction[]>(() =>
  form.joinedInvoiceIds
    .map((id) => getSalesTransactionById(id))
    .filter((t): t is SalesTransaction => Boolean(t))
);

// Candidates: this customer's invoices that still owe something, aren't
// already on this join invoice, and aren't claimed by another one.
const selectableInvoices = computed<SalesTransaction[]>(() => {
  if (!form.customerName) return [];
  return joinableInvoices(form.customerName, props.recordId).filter(
    (t) => !form.joinedInvoiceIds.includes(t.id)
  );
});

function addInvoice(next: unknown) {
  const id = Number(next);
  if (!id || form.joinedInvoiceIds.includes(id)) return;
  if (form.joinedInvoiceIds.length >= MAX_JOINED) return;
  form.joinedInvoiceIds.push(id);
}
function removeInvoice(id: number) {
  form.joinedInvoiceIds = form.joinedInvoiceIds.filter((x) => x !== id);
}

// Same summing rule the writer applies, so the preview can't disagree with
// what gets saved.
const totals = computed(() => ({
  total: joinedInvoices.value.reduce((sum, t) => sum + t.total, 0),
  balanceDue: joinedInvoices.value.reduce((sum, t) => sum + t.balanceDue, 0)
}));

const hasValidSelection = computed(
  () =>
    joinedInvoices.value.length >= MIN_JOINED && joinedInvoices.value.length <= MAX_JOINED
);
const isValid = computed(
  () => Boolean(form.customerName && form.dueDateIso) && hasValidSelection.value
);
const missingFields = computed(() => {
  const missing: string[] = [];
  if (!form.customerName) missing.push("Customer");
  if (!form.dueDateIso) missing.push("Due date");
  if (!hasValidSelection.value) missing.push("between 2 and 150 joined invoices");
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
    customerAddress: form.customerAddress,
    email: emailText.value
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean),
    transactionDateIso: dmyToIso(form.transactionDateIso),
    dueDateIso: dmyToIso(form.dueDateIso),
    term: form.term,
    transactionNo: form.transactionNo,
    message: form.message,
    memo: form.memo,
    attachments: attachments.value,
    joinedInvoiceIds: [...form.joinedInvoiceIds]
  };
}

function onSubmit() {
  submitted.value = true;
  if (!isValid.value) return;
  const input = buildInput();
  if (isEdit.value && props.recordId != null) {
    const updated = updateTransaction(props.recordId, input);
    navigateTo(`/sales/join-invoice/${updated?.id ?? props.recordId}`);
    return;
  }
  const created = createTransaction("join_invoice", input);
  navigateTo(`/sales/join-invoice/${created.id}`);
}

function onCancel() {
  if (isEdit.value && props.recordId != null) navigateTo(`/sales/join-invoice/${props.recordId}`);
  else navigateTo("/sales");
}

// All css() below uses Pixel 3 token shortcuts only (token mode 2.1).
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
const labelWithIconClass = css({ display: "inline-flex", alignItems: "center", gap: 1 });

// Pure-CSS horizontal scroll affordance — see the same block on the other
// forms in this module.
const scrollShadowClass = css({
  backgroundImage:
    "linear-gradient(to right, var(--mp-colors-white) 30%, transparent), linear-gradient(to left, var(--mp-colors-white) 30%, transparent), linear-gradient(to right, rgba(29,31,36,0.16), transparent), linear-gradient(to left, rgba(29,31,36,0.16), transparent)",
  backgroundPosition: "left center, right center, left center, right center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "36px 100%, 36px 100%, 12px 100%, 12px 100%",
  backgroundAttachment: "local, local, scroll, scroll"
});
const itemsTableClass = css({ tableLayout: "fixed", width: "full", minWidth: "1080px", mt: 8 });
const itemsHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
const lineCellClass = css({ verticalAlign: "top" });
const wrapCellClass = css({ whiteSpace: "normal!", wordBreak: "break-word", textAlign: "left" });
const numCellClass = css({ textAlign: "right" });
const lineCaptionClass = css({ mt: 3 });
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
const totalsCardClass = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 3,
  bg: "gray.25",
  rounded: "md",
  px: 4,
  py: 3
});

const validationSummaryClass = css({ display: "flex", justifyContent: "flex-end", mt: 8 });
const actionBarClass = css({
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: 2,
  mt: 8
});
</script>
