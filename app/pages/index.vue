<template>
  <main data-pixel-component="PixelContent" :class="mainClass">
    <section :class="stageClass">
      <div :class="columnClass">
        <HomeActivities />
        <HomeHighlights v-if="showHighlights" @dismiss="showHighlights = false" />
        <HomeAddOns />
        <HomeLiveTraining />
        <HomeOptimizeBusiness />
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { css } from "@mekari/pixel3";
import HomeActivities from "~/components/home/HomeActivities.vue";
import HomeHighlights from "~/components/home/HomeHighlights.vue";
import HomeAddOns from "~/components/home/HomeAddOns.vue";
import HomeLiveTraining from "~/components/home/HomeLiveTraining.vue";
import HomeOptimizeBusiness from "~/components/home/HomeOptimizeBusiness.vue";

useHead({ title: "Home — Mekari Jurnal" });

/**
 * Home is the one page that renders a PageStage without a PageTitle band
 * (see `docs/design.md` §1). Its first section already opens with the
 * greeting and "What activity do you want to do?" — a title band reading
 * "Home" above that would say the same thing twice. Every other page keeps
 * the `DefaultPageContent` title + stage pairing.
 */

/** In-memory only — production persists the dismissal to localStorage. */
const showHighlights = ref(true);

const mainClass = css({
  display: "flex",
  flexDirection: "column",
  flex: "1 1 auto",
  minWidth: 0,
  width: "full",
  paddingTop: "var(--pixel-navbar-height)",
  minHeight: "100svh"
});

// Home's stage bleeds flush to the top of the shell: no title band, no top
// border, no rounded top-left, no top gap — only the left border stays as the
// separator from the sidebar. Every other page keeps DefaultPageContent's
// bordered + rounded stage.
const stageClass = css({
  bg: "white",
  borderLeftWidth: "sm",
  borderColor: "gray.100",
  px: 6,
  py: 8,
  flex: "1 1 auto",
  minHeight: "0"
});

/**
 * One 776px column, centred — the width every Home section is built to.
 *
 * The two carousels hang their prev/next arrows 44px outside this column, so
 * it also reserves 80px of gutter on each side. Without that the left arrow
 * is clipped by the stage edge once the viewport drops near 1024px.
 */
const columnClass = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 12,
  width: "calc(100% - 160px)",
  maxWidth: "776px",
  mx: "auto"
});
</script>
