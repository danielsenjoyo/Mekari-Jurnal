<template>
  <Pixel.div
    data-slot="globalSearch"
    :class="css({ flex: '1', maxWidth: '480px', marginLeft: '6' })"
  >
    <Pixel.button :class="pillClass" aria-label="Open search" @click="isOpen = true">
      <MpIcon name="search" size="sm" color="gray.500" />

      <MpText size="body" color="gray.500" :class="css({ flex: '1', textAlign: 'left' })">
        Search here...
      </MpText>

      <Pixel.div :class="kbdClass">
        <MpText size="label" color="inherit">⌘K</MpText>
      </Pixel.div>
    </Pixel.button>

    <AireneModal :open="isOpen" @close="isOpen = false" />
  </Pixel.div>
</template>

<script setup lang="ts">
import { css, Pixel, MpIcon, MpText } from "@mekari/pixel3";
import { ref, onMounted, onBeforeUnmount } from "vue";
import AireneModal from "~/components/navbar/AireneModal.vue";

const isOpen = ref(false);

/** Global ⌘K / Ctrl+K opens the Airene search modal. */
function onKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    isOpen.value = true;
  }
}

onMounted(() => window.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));

/** Single continuous stadium-pill border — no addon dividers. */
const pillClass = css({
  display: "flex",
  alignItems: "center",
  gap: "2",
  width: "full",
  height: "10",
  paddingX: "3",
  borderWidth: "sm",
  borderColor: "gray.100",
  borderRadius: "var(--border-radius-full)",
  bg: "white",
  cursor: "pointer",
  _hover: { borderColor: "gray.200" }
});

const kbdClass = css({
  display: "flex",
  alignItems: "center",
  flexShrink: "0",
  bg: "gray.50",
  color: "gray.600",
  borderRadius: "var(--border-radius-full)",
  paddingX: "1.5",
  paddingY: "0.5"
});
</script>
