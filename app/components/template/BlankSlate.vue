<template>
  <div :class="rootClass">
    <!-- Straight from Pixel's illustration library. The empty-state block
         (`get-block general-display-empty-state`) says it outright: "Do not
         generate new illustrations — use existing 3D-style assets." Lazy
         loading is off because on a blank slate the illustration IS the
         content; fading it in late is worse than the wait. -->
    <MpImage
      :src="ILLUSTRATIONS[variant]"
      alt=""
      layout="fixed"
      :width="240"
      :height="200"
      object-fit="contain"
      :is-lazy="false"
      :is-show-loading="false"
    />
    <!-- Title and description are one block: they read as a sentence and a
         gloss on it, so they sit at `gap: 1` inside the slate's own `gap: 4`.
         Spacing them all equally makes the description look like a third,
         unrelated line. -->
    <div :class="textClass">
      <MpText weight="semiBold" color="dark" :class="titleClass">{{ title }}</MpText>
      <MpText size="body-small" color="gray.600" :class="descriptionClass">
        {{ description }}
      </MpText>
    </div>
    <!-- Recovery action, when there is one to offer (see BlankSlate.md). -->
    <slot />
  </div>
</template>

<script setup lang="ts">
import { css, MpImage, MpText } from "@mekari/pixel3";

/**
 * The one blank slate — used for an empty table, an empty page section, and a
 * record that couldn't be found (`docs/patterns/BlankSlate.md`).
 *
 * It exists because the illustration, the type scale and the spacing between
 * title and description were being re-declared at every call site, and drifted:
 * three of them had a hand-drawn asset, and every one of them spaced the
 * description as far from its title as the title was from the illustration.
 */
const ILLUSTRATIONS = {
  /** Nothing has been created here yet. */
  "no-data": "https://cdn.mekari.design/illustration/blank-slate/NoData_PB_L_01.png",
  /** A search, a filter or a URL asked for something that isn't there. */
  "not-found": "https://cdn.mekari.design/illustration/blank-slate/NotResultFound_PB_L_01.png"
} as const;

withDefaults(
  defineProps<{
    /** Which of the two causes this slate is reporting. Getting this wrong is
     *  the common bug: the magnifier asset on a never-had-data list tells the
     *  user their search failed when they never ran one. */
    variant?: keyof typeof ILLUSTRATIONS;
    title: string;
    description: string;
  }>(),
  { variant: "not-found" }
);

const rootClass = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
  py: 16,
  textAlign: "center"
});
const textClass = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 1
});
const titleClass = css({ fontSize: "lg" });
const descriptionClass = css({ maxWidth: "320px" });
</script>
