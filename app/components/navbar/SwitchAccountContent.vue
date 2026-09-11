<template>
  <div :class="rootClass">
    <!-- ============================ MENU VIEW ============================ -->
    <template v-if="view === 'menu'">
      <!-- Header card: centered avatar + name + company (0px gap between them) -->
      <header :class="headerClass">
        <MpAvatar
          :class="avatarClass"
          :name="accountInformation.fullName"
          variant-color="violet"
          size="lg"
        />
        <div :class="headerTextClass">
          <MpText weight="semiBold" color="dark">{{ accountInformation.fullName }}</MpText>
          <MpText size="body-small" color="gray.600">{{ accountInformation.companyName }}</MpText>
        </div>
      </header>

      <!-- Section 1: profile, support, companies, API credentials -->
      <section :class="sectionClass">
        <button :class="rowClass" type="button" role="menuitem">
          <MpText color="dark">{{ t("personalInfo") }}</MpText>
        </button>

        <a :class="rowClass" href="#" target="_blank" rel="noopener" role="menuitem">
          <MpText color="dark">{{ t("supportCenter") }}</MpText>
          <MpIcon name="newtab" size="sm" color="gray.600" />
        </a>

        <button
          :class="rowClass"
          type="button"
          role="menuitem"
          :aria-expanded="companiesExpanded"
          @click="companiesExpanded = !companiesExpanded"
        >
          <MpText color="dark">{{ t("companies") }}</MpText>
          <MpIcon
            :name="companiesExpanded ? 'caret-up' : 'caret-down'"
            size="sm"
            color="gray.600"
          />
        </button>

        <div v-if="companiesExpanded" :class="companiesWrapperClass">
          <div :class="companiesCardClass">
            <ul :class="companiesListClass">
              <li v-for="c in companies" :key="c.id" :class="companyClass">
                <div :class="companyTextClass">
                  <MpText :weight="c.current ? 'semiBold' : 'regular'" color="dark">
                    {{ c.name }}
                  </MpText>
                  <MpText size="body-small" color="gray.600"
                    >{{ t("companyId") }}: {{ c.id }}</MpText
                  >
                </div>
                <MpIcon v-if="c.current" name="check" size="sm" color="gray.600" />
              </li>
            </ul>
            <a :class="viewAllClass" href="#">{{ t("viewAllCompanies") }}</a>
          </div>
        </div>

        <button :class="rowClass" type="button" role="menuitem">
          <MpText color="dark">{{ t("apiCredentials") }}</MpText>
        </button>
      </section>

      <!-- Section 2: language + sign out -->
      <section :class="sectionClass">
        <button :class="rowClass" type="button" role="menuitem" @click="view = 'language'">
          <MpText color="dark">{{ t("changeLanguage") }}</MpText>
          <MpText color="gray.600">{{ localeName(locale) }}</MpText>
        </button>
        <button :class="rowClass" type="button" role="menuitem" @click="onClosePopover">
          <MpText color="dark">{{ t("signOut") }}</MpText>
        </button>
      </section>

      <footer :class="footerClass">
        <div :class="legalRowClass">
          <MpText size="overline" color="gray.600">{{ t("privacyPolicy") }}</MpText>
          <MpText size="overline" color="gray.600">{{ t("termsOfService") }}</MpText>
          <MpText size="overline" color="gray.600">{{ t("aboutMekari") }}</MpText>
        </div>
        <MpText size="overline" color="gray.600">© 2025 PT Mid Solusi Nusantara</MpText>
      </footer>
    </template>

    <!-- ========================== LANGUAGE VIEW ========================== -->
    <template v-else>
      <!-- Toolbar header: back arrow returns to the menu view -->
      <header :class="langHeaderClass">
        <button :class="backButtonClass" type="button" aria-label="Back" @click="view = 'menu'">
          <MpIcon name="arrows-left" size="md" color="dark" />
        </button>
        <MpText weight="semiBold" color="dark">{{ t("changeLanguage") }}</MpText>
      </header>

      <section :class="sectionClass">
        <button
          v-for="option in localeOptions"
          :key="option.code"
          :class="rowClass"
          type="button"
          role="menuitemradio"
          :aria-checked="option.code === locale"
          @click="selectLocale(option.code)"
        >
          <MpText :weight="option.code === locale ? 'semiBold' : 'regular'" color="dark">
            {{ option.name }}
          </MpText>
          <MpIcon v-if="option.code === locale" name="check" size="sm" color="gray.600" />
        </button>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { css, MpAvatar, MpIcon, MpText } from "@mekari/pixel3";
import { usePixelLayout } from "~/composables/usePixelLayout";
import { useLanguage, type AppLocale } from "~/composables/useLanguage";

defineProps<{ onClosePopover: () => void }>();

const { accountInformation } = usePixelLayout();
const { t, locale, setLocale, localeName, localeOptions } = useLanguage();

/** Which panel is showing inside the popover. Resets to "menu" on every
 *  reopen because MpPopoverContent unmounts its slot when closed. */
const view = ref<"menu" | "language">("menu");

function selectLocale(code: AppLocale) {
  setLocale(code);
  // Apply + return to the menu so the user sees the popover relabel itself.
  view.value = "menu";
}

const companies = [
  { name: "ATK Abadi Jaya", id: "203426" },
  { name: "PT Jatayu Furnitur", id: "63692" },
  { name: "PT Central Perk Indonesia", id: "193423", current: true },
  { name: "CV Bina Sejahtera", id: "88210" },
  { name: "PT Sinar Mas Group", id: "50124" },
  { name: "Toko Maju Bersama", id: "74553" }
];

const companiesExpanded = ref(true);

/* Root: 320px card, no outline border — `sm` (S) shadow alone defines the edge. */
const rootClass = css({
  width: "320px",
  bg: "white",
  rounded: "md",
  shadow: "sm",
  overflow: "hidden"
});

/* Header: avatar over name+company, 8px (gap-2) between avatar and text, 0px between rows. */
const headerClass = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 2,
  p: 4,
  bg: "gray.25",
  borderBottomWidth: "sm",
  borderColor: "gray.100"
});

const headerTextClass = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 0
});

/* Language-view toolbar: back arrow + title, left-aligned. */
const langHeaderClass = css({
  display: "flex",
  alignItems: "center",
  gap: 3,
  px: 4,
  py: 3,
  bg: "gray.25",
  borderBottomWidth: "sm",
  borderColor: "gray.100"
});

const backButtonClass = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  bg: "transparent",
  border: "0",
  p: 0,
  cursor: "pointer"
});

/* Popover avatar: 48×48 override (Pixel `lg`=36, `xl`=80). */
const avatarClass = css({
  width: "12!",
  height: "12!"
});

const sectionClass = css({
  py: 2,
  display: "flex",
  flexDirection: "column"
});

const rowClass = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "full",
  minHeight: "9",
  px: 3,
  py: 2,
  bg: "transparent",
  border: "0",
  textAlign: "left",
  cursor: "pointer",
  _hover: { backgroundColor: "gray.50" }
});

const companiesWrapperClass = css({ px: 3, py: 2 });

const companiesCardClass = css({
  bg: "gray.25",
  borderWidth: "sm",
  borderColor: "gray.50",
  rounded: "md"
});

const companiesListClass = css({
  listStyle: "none",
  margin: 0,
  padding: 0,
  maxHeight: "180px",
  overflowY: "auto"
});

const companyClass = css({
  display: "flex",
  alignItems: "center",
  gap: 2,
  px: 3,
  py: 2,
  cursor: "pointer",
  _hover: { backgroundColor: "gray.50" }
});

const companyTextClass = css({
  display: "flex",
  flexDirection: "column",
  gap: 0,
  flex: "1 1 auto",
  minWidth: 0,
  textAlign: "left"
});

const viewAllClass = css({
  display: "block",
  px: 3,
  py: 2,
  color: "blue.400",
  textDecoration: "none"
});

const footerClass = css({
  display: "flex",
  flexDirection: "column",
  gap: 1,
  px: 3,
  py: 4,
  borderTopWidth: "sm",
  borderColor: "gray.50"
});

const legalRowClass = css({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "flex-start",
  gap: 2
});
</script>
