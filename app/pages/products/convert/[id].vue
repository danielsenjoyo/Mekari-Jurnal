<template>
  <DefaultPageContent
    :title="conversion ? conversion.number : 'Conversion not found'"
    breadcrumb="Product list"
    breadcrumb-to="/products"
  >
    <BlankSlate
      v-if="!conversion"
      title="Conversion not found"
      description="This conversion may have been reverted, or the link you followed may be out of date."
    >
      <MpButton variant="secondary" @click="navigateTo('/products')">Back to Product list</MpButton>
    </BlankSlate>

    <template v-else>
      <MpBanner id="conversion-detail-banner" variant="info" is-inline :class="bannerClass">
        <MpBannerIcon id="conversion-detail-icon" />
        <MpBannerDescription id="conversion-detail-desc">
          Latest values will update once inventory value recalculation is complete. Please recheck
          when this information disappears.
        </MpBannerDescription>
      </MpBanner>

      <div :class="topRowClass">
        <div :class="metaFieldClass">
          <MpText color="gray.600">Product</MpText>
          <MpTextlink
            :class="textlinkAlignClass"
            as="button"
            variant="primary"
            @click="navigateTo(`/products/detail/${conversion.sourceProductId}`)"
          >
            {{ conversion.sourceProductName }}
          </MpTextlink>
        </div>

        <div :class="metaFieldClass">
          <MpText color="gray.600">Conversion date</MpText>
          <MpText>{{ formatDisplayDate(conversion.date) }}</MpText>
        </div>

        <div :class="headlineColClass">
          <MpText weight="semiBold" color="dark">
            Total conversion cost {{ formatCurrency(totals.total) }}
          </MpText>
          <MpTextlink
            :class="textlinkAlignClass"
            as="button"
            variant="secondary"
            @click="onAction('journal-entry')"
          >
            View journal entry
          </MpTextlink>
        </div>
      </div>

      <MpDivider variant="dashed" :class="dividerClass" />

      <div :class="metaGridClass">
        <div :class="metaFieldClass">
          <MpText color="gray.600">Qty converted</MpText>
          <MpText>{{ formatQuantity(conversion.quantity) }} {{ conversion.sourceUnit }}</MpText>
        </div>
        <div :class="metaFieldClass">
          <MpText color="gray.600">Warehouse</MpText>
          <MpText>{{ conversion.warehouse || "—" }}</MpText>
        </div>
        <div :class="metaFieldClass">
          <MpText color="gray.600">Cost per unit</MpText>
          <MpText>{{ formatCurrency(totals.costPerUnit) }}</MpText>
        </div>
      </div>

      <MpText weight="semiBold" color="dark" :class="sectionHeadingClass"
        >Conversion details</MpText
      >
      <MpTableContainer :class="scrollShadowClass">
        <MpTable :class="lineTableClass">
          <MpTableHead is-fixed :class="tableHeadClass">
            <MpTableRow>
              <MpTableCell as="th">Product name</MpTableCell>
              <MpTableCell as="th" :class="numCellClass">
                Qty per {{ conversion.sourceUnit }}
              </MpTableCell>
              <MpTableCell as="th" :class="numCellClass">Total qty</MpTableCell>
              <MpTableCell as="th" :class="numCellClass">Estimated cost per unit</MpTableCell>
              <MpTableCell as="th" :class="numCellClass">Estimated total</MpTableCell>
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <MpTableRow v-for="line in conversion.results" :key="line.name">
              <MpTableCell as="td" :class="wrapCellClass">{{ line.name }}</MpTableCell>
              <MpTableCell as="td" :class="[wrapCellClass, numCellClass]">
                {{ formatQuantity(line.quantityPer) }}
              </MpTableCell>
              <MpTableCell as="td" :class="[wrapCellClass, numCellClass]">
                {{ formatQuantity(line.quantityPer * conversion.quantity) }}
              </MpTableCell>
              <MpTableCell as="td" :class="[wrapCellClass, numCellClass]">
                {{ formatAmount(line.costPerUnit) }}
              </MpTableCell>
              <MpTableCell as="td" :class="[wrapCellClass, numCellClass]">
                {{ formatAmount(line.costPerUnit * line.quantityPer * conversion.quantity) }}
              </MpTableCell>
            </MpTableRow>
          </MpTableBody>
        </MpTable>
      </MpTableContainer>

      <template v-if="conversion.additionalCosts.length">
        <MpText weight="semiBold" color="dark" :class="sectionHeadingClass">Fixed cost</MpText>
        <MpTableContainer>
          <MpTable :class="costTableClass">
            <MpTableHead is-fixed :class="tableHeadClass">
              <MpTableRow>
                <MpTableCell as="th">Account</MpTableCell>
                <MpTableCell as="th" :class="numCellClass">Total</MpTableCell>
              </MpTableRow>
            </MpTableHead>
            <MpTableBody>
              <MpTableRow v-for="cost in conversion.additionalCosts" :key="cost.account">
                <MpTableCell as="td" :class="wrapCellClass">{{ cost.account }}</MpTableCell>
                <MpTableCell as="td" :class="[wrapCellClass, numCellClass]">
                  {{ formatAmount(cost.amount) }}
                </MpTableCell>
              </MpTableRow>
            </MpTableBody>
          </MpTable>
        </MpTableContainer>
      </template>

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
        </div>
      </div>

      <!-- The source calls this "Revert", not "Delete": the record documents
           stock that physically moved, so undoing it reverses the journal
           entry rather than erasing a mistake. The modal spells out both
           consequences, as the source's does. -->
      <div :class="bottomActionsClass">
        <MpButton variant="ghost" @click="isRevertModalOpen = true">Revert</MpButton>
        <div />
      </div>

      <MpModal
        id="conversion-revert-modal"
        :is-open="isRevertModalOpen"
        size="sm"
        @close="isRevertModalOpen = false"
      >
        <MpModalOverlay />
        <MpModalContent>
          <MpModalHeader>
            <span :class="modalTitleClass">Revert conversion result?</span>
            <MpModalCloseButton />
          </MpModalHeader>
          <MpModalBody>
            <MpText size="body" color="gray.700">By reverting conversion result:</MpText>
            <ul :class="bulletListClass">
              <li>
                <MpText size="body" color="gray.700">Data in journal entry will be deleted.</MpText>
              </li>
              <li>
                <MpText size="body" color="gray.700">
                  Transactions related to product conversion will be deleted.
                </MpText>
              </li>
            </ul>
          </MpModalBody>
          <MpModalFooter>
            <div :class="modalFooterClass">
              <MpButton variant="secondary" @click="isRevertModalOpen = false">Cancel</MpButton>
              <MpButton variant="danger" @click="confirmRevert">Revert</MpButton>
            </div>
          </MpModalFooter>
        </MpModalContent>
      </MpModal>
    </template>
  </DefaultPageContent>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import {
  css,
  MpBanner,
  MpBannerDescription,
  MpBannerIcon,
  MpButton,
  MpDivider,
  MpModal,
  MpModalBody,
  MpModalCloseButton,
  MpModalContent,
  MpModalFooter,
  MpModalHeader,
  MpModalOverlay,
  MpTable,
  MpTableBody,
  MpTableCell,
  MpTableContainer,
  MpTableHead,
  MpTableRow,
  MpText,
  MpTextlink
} from "@mekari/pixel3";
import DefaultPageContent from "~/components/template/DefaultPageContent.vue";
import { formatAmount, formatCurrency, formatDisplayDate, formatQuantity } from "~/data/products";
import { computeConversionTotal, getConversionById } from "~/data/product-records";
import { textlinkAlignClass } from "~/utils/textlink-align";

// Product conversion detail. Cloned from jurnal-frontend-app
// src/pages/products/conversion/detail/.

const route = useRoute();
const conversionId = computed(() => Number(route.params.id));
const conversion = computed(() => getConversionById(conversionId.value));

useHead({
  title: computed(() =>
    conversion.value
      ? `${conversion.value.number} — Mekari Jurnal`
      : "Conversion not found — Mekari Jurnal"
  )
});

/** The same engine the form's running total uses. */
const totals = computed(() =>
  conversion.value
    ? computeConversionTotal(
        conversion.value.quantity,
        conversion.value.results,
        conversion.value.additionalCosts
      )
    : { componentTotal: 0, additionalTotal: 0, total: 0, costPerUnit: 0 }
);

const isRevertModalOpen = ref(false);

function confirmRevert() {
  isRevertModalOpen.value = false;
  // Reverting would have to unwind the stock movements it created, which this
  // prototype doesn't model — so it returns to the product rather than
  // pretending the record is gone.
  navigateTo(`/products/detail/${conversion.value?.sourceProductId ?? ""}`);
}

function onAction(action: string) {
  void action;
}

// All css() below uses Pixel 3 token shortcuts only (token mode 2.1).
const bannerClass = css({ mb: 6 });
const topRowClass = css({
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 6,
  alignItems: "start"
});
const headlineColClass = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: 1,
  textAlign: "right"
});
const dividerClass = css({ my: 6 });
const metaGridClass = css({ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 });
const metaFieldClass = css({ display: "flex", flexDirection: "column", gap: 1, minWidth: "0" });
const sectionHeadingClass = css({ fontSize: "lg", mt: 8, mb: 4 });

const tableHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
const lineTableClass = css({ tableLayout: "auto", width: "full", minWidth: "760px" });
const costTableClass = css({ tableLayout: "auto", width: "full", minWidth: "420px" });
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

const bulletListClass = css({ pl: 5, mt: 2, listStyleType: "disc" });

const modalTitleClass = css({ fontSize: "lg" });
const modalFooterClass = css({ display: "flex", justifyContent: "flex-end", gap: 2 });

const bottomActionsClass = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  mt: 8,
  pt: 6,
  borderTopWidth: "sm",
  borderColor: "gray.100"
});
</script>
