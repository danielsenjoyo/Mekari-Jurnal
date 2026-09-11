<template>
  <nav
    ref="navbarNode"
    data-pixel-component="TheNavbar"
    data-slot="root"
    :class="
      css({
        position: 'fixed',
        zIndex: 'sticky',
        width: 'full',
        bg: 'white',
        px: '6',
        display: 'flex',
        alignItems: 'center',
        borderBottomWidth: 'sm',
        borderColor: 'gray.100',
        height: 'var(--layout-header-height)'
      })
    "
  >
    <div
      data-slot="leftContent"
      :class="css({ display: 'flex', alignItems: 'center', flex: '1' })"
    >
      <NuxtLink to="/" :class="logoLinkClass">
        <img
          :class="css({ display: 'block' })"
          src="/logo-jurnal.svg"
          alt="Mekari Jurnal"
          height="32"
          width="auto"
        />
      </NuxtLink>

      <GlobalSearch />
    </div>

    <div
      data-slot="rightContent"
      :class="css({ display: 'flex', gap: '1', alignItems: 'center', marginLeft: 'auto' })"
    >
      <QuickAction :icon-class="iconBtnClass" />

      <MpTooltip placement="bottom" use-portal label="Live chat">
        <MpButton variant="ghost" size="md" icon-only aria-label="Live chat" :class="iconBtnClass">
          <MpIcon name="headphone" size="md" />
        </MpButton>
      </MpTooltip>

      <MpTooltip placement="bottom" use-portal label="Referral">
        <MpButton variant="ghost" size="md" icon-only aria-label="Referral" :class="iconBtnClass">
          <MpIcon name="gift" size="md" />
        </MpButton>
      </MpTooltip>

      <MpTooltip placement="bottom" use-portal label="Help">
        <MpButton variant="ghost" size="md" icon-only aria-label="Help" :class="iconBtnClass">
          <MpIcon name="help" size="md" />
        </MpButton>
      </MpTooltip>

      <MpTooltip placement="bottom" use-portal label="Activity log">
        <MpButton
          variant="ghost"
          size="md"
          icon-only
          aria-label="Activity log"
          :class="iconBtnClass"
        >
          <MpIcon name="time" size="md" />
        </MpButton>
      </MpTooltip>

      <Notification :icon-class="iconBtnClass" />

      <MpTooltip placement="bottom" use-portal label="Switch app">
        <MpButton variant="ghost" size="md" icon-only aria-label="Switch app" :class="iconBtnClass">
          <MpIcon name="shortcuts" size="md" />
        </MpButton>
      </MpTooltip>

      <SwitchAccount v-slot="{ onClosePopover }">
        <SwitchAccountContent :on-close-popover="onClosePopover" />
      </SwitchAccount>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { css, MpButton, MpIcon, MpTooltip } from "@mekari/pixel3";
import { usePixelLayout } from "~/composables/usePixelLayout";
import GlobalSearch from "~/components/navbar/GlobalSearch.vue";
import QuickAction from "~/components/navbar/QuickAction.vue";
import Notification from "~/components/navbar/Notification.vue";
import SwitchAccount from "~/components/navbar/SwitchAccount.vue";
import SwitchAccountContent from "~/components/navbar/SwitchAccountContent.vue";

const { navbarNode, setAccountInformation } = usePixelLayout();

setAccountInformation({
  companyId: "102938",
  companyName: "PT Central Perk Indonesia",
  fullName: "Rizal Candra",
  userPhoto: "https://i.pravatar.cc/64?img=12"
});

const logoLinkClass = css({
  display: "flex",
  alignItems: "center"
});

/** Icon-only navbar buttons share `padding: 1.5` (--mp-spacing-1.5 = 6px, Figma spec). */
const iconBtnClass = css({
  padding: "1.5"
});
</script>
