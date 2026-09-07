<template>
  <DefaultPageContent
    title="Convert product"
    :breadcrumb="source ? 'Product details' : 'Product list'"
    :breadcrumb-to="source ? `/products/detail/${source.id}` : '/products'"
  >
    <!-- A conversion has no meaning without a bundle to break up, and the
         source reaches this screen only from a product's own Actions menu
         (passing the id in the query). Landing here without one is a broken
         link, so it gets the same treatment as any other not-found. -->
    <BlankSlate
      v-if="!source"
      title="No product to convert"
      description="Start a conversion from a bundle product's Actions menu, so the components to produce are known."
    >
      <MpButton variant="secondary" @click="navigateTo('/products')">Back to Product list</MpButton>
    </BlankSlate>

    <template v-else>
      <MpBanner
        v-if="submitted && missingFields.length"
        id="conversion-missing-banner"
        variant="danger"
        :class="bannerClass"
      >
        <MpBannerIcon id="conversion-missing-icon" />
        <MpBannerTitle id="conversion-missing-title">Conversion can't be saved yet</MpBannerTitle>
        <MpBannerDescription id="conversion-missing-desc">
          Complete these before saving: {{ missingFields.join(", ") }}.
        </MpBannerDescription>
      </MpBanner>

      <MpBanner id="conversion-recalc-banner" variant="info" is-inline :class="bannerClass">
        <MpBannerIcon id="conversion-recalc-icon" />
        <MpBannerDescription id="conversion-recalc-desc">
          Once saved, the system will recalculate your inventory value. Estimated costs and totals
          may change until the process is complete.
        </MpBannerDescription>
      </MpBanner>

      <!-- Zone A — identity row with the running total. This is the number the
           user watches while changing the qty, so it belongs here rather than
           only at the bottom of the totals block. -->
      <div :class="gridClass">
        <div :class="metaFieldClass">
          <MpText color="gray.600">Product</MpText>
          <MpText weight="semiBold" color="dark">{{ source.name }}</MpText>
        </div>

        <MpFormControl is-required :is-invalid="submitted && quantity <= 0">
          <MpFormLabel>Qty</MpFormLabel>
          <MpInputGroup>
            <MpInput v-model="quantityText" type="text" inputmode="numeric" />
            <MpInputRightAddon>{{ source.unit }}</MpInputRightAddon>
          </MpInputGroup>
          <MpFormErrorMessage>Qty must be above 0</MpFormErrorMessage>
        </MpFormControl>

        <MpFormControl is-required :is-invalid="submitted && !date">
          <MpFormLabel>Conversion date</MpFormLabel>
          <MpDatePicker
            v-model="date"
            value-type="string"
            :format="DATE_INPUT_FORMAT"
            placeholder="DD/MM/YYYY"
            use-portal
          />
          <MpFormErrorMessage>Select a conversion date</MpFormErrorMessage>
        </MpFormControl>

        <div :class="runningTotalClass">
          <MpText size="body-small" color="gray.600">Total conversion cost</MpText>
          <MpText weight="semiBold" color="dark">{{ formatCurrency(totals.total) }}</MpText>
        </div>
      </div>

      <div :class="gridClass">
        <MpFormControl is-required :is-invalid="submitted && !warehouse">
          <MpFormLabel>Warehouse</MpFormLabel>
          <MpSelect v-model="warehouse" is-full-width>
            <option value="">Select warehouse</option>
            <option v-for="option in WAREHOUSE_OPTIONS" :key="option" :value="option">
              {{ option }}
            </option>
          </MpSelect>
          <MpFormErrorMessage>Select a warehouse</MpFormErrorMessage>
        </MpFormControl>
        <div />
        <div />
        <div />
      </div>

      <MpDivider variant="dashed" :class="dividerClass" />

      <!-- Zone D — what the conversion produces. Read-only: the components and
           their costs come from the bundle's own definition and the catalogue's
           current average prices, so the only editable figure is the qty above.
           Same rule as the Purchase Return form — when the lines aren't yours
           to add, there is no picker and no trailing add row. -->
      <MpText weight="semiBold" color="dark" :class="sectionHeadingClass"
        >Conversion details</MpText
      >
      <MpTableContainer :class="scrollShadowClass">
        <MpTable :class="lineTableClass">
          <MpTableHead is-fixed :class="tableHeadClass">
            <MpTableRow>
              <MpTableCell as="th">Product name</MpTableCell>
              <MpTableCell as="th" :class="numCellClass">Qty per {{ source.unit }}</MpTableCell>
              <MpTableCell as="th" :class="numCellClass">Total qty</MpTableCell>
              <MpTableCell as="th" :class="numCellClass">Estimated cost per unit</MpTableCell>
              <MpTableCell as="th" :class="numCellClass">Estimated total</MpTableCell>
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <MpTableRow v-for="line in results" :key="line.name">
              <MpTableCell as="td" :class="wrapCellClass">{{ line.name }}</MpTableCell>
              <MpTableCell as="td" :class="[wrapCellClass, numCellClass]">
                {{ formatQuantity(line.quantityPer) }}
              </MpTableCell>
              <MpTableCell as="td" :class="[wrapCellClass, numCellClass]">
                {{ formatQuantity(line.quantityPer * quantity) }}
              </MpTableCell>
              <MpTableCell as="td" :class="[wrapCellClass, numCellClass]">
                {{ formatAmount(line.costPerUnit) }}
              </MpTableCell>
              <MpTableCell as="td" :class="[wrapCellClass, numCellClass]">
                {{ formatAmount(line.costPerUnit * line.quantityPer * quantity) }}
              </MpTableCell>
            </MpTableRow>
          </MpTableBody>
        </MpTable>
      </MpTableContainer>

      <!-- Additional costs — the one editable table. Trailing placeholder row
           IS the add affordance (docs/patterns/form-page-format.md). -->
      <MpText weight="semiBold" color="dark" :class="sectionHeadingClass">Fixed cost</MpText>
      <MpTableContainer :class="scrollShadowClass">
        <MpTable :class="costTableClass">
          <MpTableHead is-fixed :class="tableHeadClass">
            <MpTableRow>
              <MpTableCell as="th">Account</MpTableCell>
              <MpTableCell as="th">Total</MpTableCell>
              <MpTableCell as="th" />
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <MpTableRow v-for="(cost, index) in additionalCosts" :key="index">
              <MpTableCell as="td">
                <MpSelect
                  :model-value="cost.account"
                  is-full-width
                  @update:model-value="onCostAccountChange(index, $event)"
                >
                  <option value="">Select account</option>
                  <option v-for="option in BUY_ACCOUNT_OPTIONS" :key="option" :value="option">
                    {{ option }}
                  </option>
                </MpSelect>
              </MpTableCell>
              <MpTableCell as="td">
                <div @focusout="onCostBlur(index)">
                  <MpInputGroup>
                    <MpInputLeftAddon>
                      <MpText weight="semiBold" :class="addonTextClass">Rp</MpText>
                    </MpInputLeftAddon>
                    <MpInput
                      v-model="costText[index]"
                      type="text"
                      inputmode="decimal"
                      aria-label="Fixed cost amount"
                      @update:model-value="onCostInput(index)"
                    />
                  </MpInputGroup>
                </div>
              </MpTableCell>
              <MpTableCell as="td">
                <MpButton
                  variant="ghost"
                  size="sm"
                  left-icon="minus-circular"
                  aria-label="Remove cost"
                  @click="removeCost(index)"
                />
              </MpTableCell>
            </MpTableRow>

            <MpTableRow>
              <MpTableCell as="td">
                <MpSelect model-value="" is-full-width @update:model-value="onAddCost">
                  <option value="">Select account</option>
                  <option v-for="option in BUY_ACCOUNT_OPTIONS" :key="option" :value="option">
                    {{ option }}
                  </option>
                </MpSelect>
              </MpTableCell>
              <MpTableCell as="td" />
              <MpTableCell as="td" />
            </MpTableRow>
          </MpTableBody>
        </MpTable>
      </MpTableContainer>

      <!-- Totals stack: what the components cost, what was added on top, the
           total, and what that makes one converted unit worth. -->
      <div :class="totalsRowClass">
        <div :class="totalsColClass">
          <div :class="totalsLineClass">
            <MpText color="gray.600">Component cost</MpText>
            <MpText>{{ formatCurrency(totals.componentTotal) }}</MpText>
          </div>
          <div :class="totalsLineClass">
            <MpText color="gray.600">Fixed cost</MpText>
            <MpText>{{ formatCurrency(totals.additionalTotal) }}</MpText>
          </div>
          <MpDivider variant="dashed" :class="totalsDividerClass" />
          <div :class="totalsLineClass">
            <MpText weight="semiBold" color="dark">Total conversion cost</MpText>
            <MpText weight="semiBold" color="dark">{{ formatCurrency(totals.total) }}</MpText>
          </div>
          <div :class="totalsLineClass">
            <MpText color="gray.600">Cost per unit</MpText>
            <MpText>{{ formatCurrency(totals.costPerUnit) }}</MpText>
          </div>
        </div>
      </div>

      <div :class="actionRowClass">
        <MpButton variant="ghost" @click="navigateTo(`/products/detail/${source.id}`)">
          Cancel
        </MpButton>
        <MpButton variant="primary" @click="onSubmit">Save</MpButton>
      </div>
    </template>
  </DefaultPageContent>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import {
  css,
  MpBanner,
  MpBannerDescription,
  MpBannerIcon,
  MpBannerTitle,
  MpButton,
  MpDatePicker,
  MpDivider,
  MpFormControl,
  MpFormErrorMessage,
  MpFormLabel,
  MpInput,
  MpInputGroup,
  MpInputLeftAddon,
  MpInputRightAddon,
  MpSelect,
  MpTable,
  MpTableBody,
  MpTableCell,
  MpTableContainer,
  MpTableHead,
  MpTableRow,
  MpText
} from "@mekari/pixel3";
import DefaultPageContent from "~/components/template/DefaultPageContent.vue";
import {
  BUY_ACCOUNT_OPTIONS,
  formatAmount,
  formatCurrency,
  formatQuantity,
  getProductById,
  parseAmount,
  todayIsoDate,
  WAREHOUSE_OPTIONS
} from "~/data/products";
import {
  computeConversionTotal,
  createConversion,
  resultLinesForBundle
} from "~/data/product-records";
import { DATE_INPUT_FORMAT, dmyToIso, isoToDmy } from "~/utils/dates";

// ---------------------------------------------------------------------------
// Convert product. Cloned from jurnal-frontend-app
// src/pages/products/conversion/form/.
//
// Reached from a bundle product's detail page (Actions → Convert product),
// which passes the product id in the query exactly as the source does.
// ---------------------------------------------------------------------------

useHead({ title: "Convert product — Mekari Jurnal" });

const route = useRoute();
const source = computed(() => {
  const id = Number(route.query.from);
  const product = id ? getProductById(id) : undefined;
  // Only a bundle has components to convert into.
  return product?.isBundle ? product : undefined;
});

const quantityText = ref("1");
const quantity = computed(() => {
  const digits = quantityText.value.replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
});

const date = ref(isoToDmy(todayIsoDate()));
const warehouse = ref("");
const submitted = ref(false);

const additionalCosts = reactive<{ account: string; amount: number }[]>([]);
/** Grouped-string mirrors, formatted on focusout only — live reformatting at
 *  two decimals makes incremental typing impossible. */
const costText = reactive<string[]>([]);

const results = computed(() => resultLinesForBundle(source.value?.bundleItems ?? []));

/** The same engine the writer and the detail page use, so what is on screen
 *  and what gets stored can't disagree. */
const totals = computed(() =>
  computeConversionTotal(quantity.value, results.value, additionalCosts)
);

function onAddCost(value: unknown) {
  const account = typeof value === "string" ? value : "";
  if (!account) return;
  additionalCosts.push({ account, amount: 0 });
  costText.push("");
}

function onCostAccountChange(index: number, value: unknown) {
  const cost = additionalCosts[index];
  if (cost) cost.account = typeof value === "string" ? value : "";
}

function onCostInput(index: number) {
  const cost = additionalCosts[index];
  if (cost) cost.amount = parseAmount(costText[index] ?? "");
}

function onCostBlur(index: number) {
  const cost = additionalCosts[index];
  if (cost) costText[index] = cost.amount ? formatAmount(cost.amount) : "";
}

function removeCost(index: number) {
  additionalCosts.splice(index, 1);
  costText.splice(index, 1);
}

const missingFields = computed(() => {
  const missing: string[] = [];
  if (quantity.value <= 0) missing.push("Qty");
  if (!dmyToIso(date.value)) missing.push("Conversion date");
  if (!warehouse.value) missing.push("Warehouse");
  if (results.value.length === 0) missing.push("Bundle components");
  // A cost row with an account but no amount would silently contribute
  // nothing to a total the user thinks it is in.
  if (additionalCosts.some((cost) => cost.account && cost.amount <= 0)) {
    missing.push("Fixed cost amount");
  }
  return missing;
});

function onSubmit() {
  submitted.value = true;
  if (missingFields.value.length || !source.value) return;
  const created = createConversion({
    sourceProductId: source.value.id,
    quantity: quantity.value,
    date: dmyToIso(date.value),
    warehouse: warehouse.value,
    additionalCosts: additionalCosts.map((cost) => ({ ...cost }))
  });
  navigateTo(`/products/convert/${created.id}`);
}

// All css() below uses Pixel 3 token shortcuts only (token mode 2.1).
// The addon supplies no padding of its own: Pixel's "input with prefix and
// suffix" pattern (docs.mekari.design/patterns/input.html) pads the addon's
// content by 12px, without which the prefix sits flush against both edges.
const addonTextClass = css({ px: 3 });
const bannerClass = css({ mb: 6 });
const gridClass = css({
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 5,
  alignItems: "start",
  mb: 5
});
const metaFieldClass = css({ display: "flex", flexDirection: "column", gap: 1, minWidth: "0" });
const runningTotalClass = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: 1,
  textAlign: "right"
});
const dividerClass = css({ my: 6 });
const sectionHeadingClass = css({ fontSize: "lg", mt: 8, mb: 4 });

const tableHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
const lineTableClass = css({ tableLayout: "auto", width: "full", minWidth: "760px" });
const costTableClass = css({ tableLayout: "fixed", width: "full", minWidth: "560px" });
const numCellClass = css({ textAlign: "right" });
const wrapCellClass = css({ whiteSpace: "normal!", wordBreak: "break-word", textAlign: "left" });
const scrollShadowClass = css({
  backgroundImage:
    "linear-gradient(to right, var(--mp-colors-white) 30%, transparent), linear-gradient(to left, var(--mp-colors-white) 30%, transparent), linear-gradient(to right, rgba(29,31,36,0.16), transparent), linear-gradient(to left, rgba(29,31,36,0.16), transparent)",
  backgroundPosition: "left center, right center, left center, right center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "36px 100%, 36px 100%, 12px 100%, 12px 100%",
  backgroundAttachment: "local, local, scroll, scroll"
});

const totalsRowClass = css({ display: "flex", justifyContent: "flex-end", mt: 6 });
const totalsColClass = css({
  display: "flex",
  flexDirection: "column",
  gap: 2,
  width: "40%",
  minWidth: "280px"
});
const totalsLineClass = css({ display: "flex", justifyContent: "space-between", gap: 3 });
const totalsDividerClass = css({ my: 2 });

const actionRowClass = css({
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: 2,
  mt: 8,
  pt: 6,
  borderTopWidth: "sm",
  borderColor: "gray.100"
});
</script>
