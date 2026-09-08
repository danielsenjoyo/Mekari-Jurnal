<template>
  <DefaultPageContent>
    <div :class="gridClass">
      <article v-for="entry in entries" :key="entry.slug" :class="cardClass">
        <div>
          <MpText size="h3" weight="semiBold" color="dark" :class="cardTitleClass">
            {{ entry.title }}
          </MpText>
          <MpText size="body-small" color="gray.600">{{ entry.description }}</MpText>
        </div>
        <MpFlex gap="2" mt="4" align-items="center">
          <MpButton variant="secondary" @click="navigateTo(`/other-lists/${entry.slug}`)">
            View list
          </MpButton>
        </MpFlex>
      </article>
    </div>
  </DefaultPageContent>
</template>

<script setup lang="ts">
import { css, MpButton, MpFlex, MpText } from "@mekari/pixel3";
import DefaultPageContent from "~/components/template/DefaultPageContent.vue";

// ---------------------------------------------------------------------------
// Other lists. Cloned from jurnal-frontend-app src/pages/other-lists/, the
// catalog of tenant-wide vocabulary lists that live outside any one module —
// following the same card-grid shape as the Reports catalog
// (docs/patterns/reports-index-format.md).
//
// The source's own catalog also carries tag categories, payment terms, taxes,
// currencies, audits and several more — none of which this prototype models
// anywhere else, so a card for any of them would open onto a page with
// nothing behind it. Listed here are only the two product-scoped lists this
// module actually has data for; adding a real page for another entity is what
// earns it a card, the same rule the Reports grid follows for an unbuilt slug.
// ---------------------------------------------------------------------------

useHead({ title: "Other lists — Mekari Jurnal" });

const entries = [
  {
    slug: "product-categories",
    title: "Product categories",
    description: "The categories your products and product masters are grouped by."
  },
  {
    slug: "product-units",
    title: "Product units",
    description: "The units of measure your products and product masters are sold in."
  }
];

// Same grid the Reports catalog uses: two columns down to one under 1024px.
const gridClass = css({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  columnGap: 12,
  rowGap: 8,
  "@media (max-width: 1024px)": { gridTemplateColumns: "minmax(0, 1fr)" }
});
// Buttons pin to the bottom so every card in a row lines its CTA up, however
// many lines the description takes.
const cardClass = css({
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  height: "full",
  minWidth: 0
});
const cardTitleClass = css({ display: "block", mb: 1 });
</script>
