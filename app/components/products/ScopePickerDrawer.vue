<template>
  <MpDrawer :is-open="isOpen" placement="right" size="xl" @close="emit('close')">
    <MpDrawerOverlay />
    <MpDrawerContent>
      <MpDrawerHeader>
        <span :class="titleClass">{{ title }}</span>
        <MpDrawerCloseButton />
      </MpDrawerHeader>

      <!-- The body is the flex column that lets the two panes stretch, so the
           rule between them runs the full height rather than stopping under
           the last row. -->
      <MpDrawerBody :class="bodyClass">
        <MpText color="gray.600" :class="introClass">{{ intro }}</MpText>

        <div :class="panesClass">
          <!-- Left: everything that can be picked. -->
          <div :class="listPaneClass">
            <div :class="listToolsClass">
              <MpSegmentedControl
                v-if="tabs.length"
                :id="`${idBase}-tabs`"
                v-model="tab"
                :name="`${idBase}-tabs`"
                :data="segmentedData"
              />

              <!-- Search sits beside whatever narrows the list — the filter
                   select where there is one, the heading otherwise — so the
                   heading always sits directly above the rows it names. -->
              <div :class="listHeadClass">
                <MpText v-if="!filters.length" weight="semiBold" color="dark" :class="headingClass">
                  {{ listTitle }}
                </MpText>
                <div :class="listSearchClass">
                  <MpInputGroup>
                    <MpInputLeftAddon>
                      <MpIcon name="search" size="sm" color="gray.400" />
                    </MpInputLeftAddon>
                    <MpInput
                      v-model="listSearch"
                      :placeholder="`Search ${noun}`"
                      :aria-label="`Search ${noun} list`"
                    />
                  </MpInputGroup>
                </div>
                <div v-if="filters.length" :class="filterSelectClass">
                  <MpSelect v-model="filter" is-full-width :aria-label="`Filter ${noun} list`">
                    <option value="">{{ filterAllLabel }}</option>
                    <option v-for="option in filters" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </MpSelect>
                </div>
              </div>

              <div v-if="filters.length" :class="listHeadClass">
                <MpText weight="semiBold" color="dark">{{ listTitle }}</MpText>
              </div>
            </div>

            <div :class="rowsClass">
              <!-- A row is the control, so the whole line is the hit target —
                   the source list has no per-row checkbox. -->
              <Pixel.button
                v-for="option in visibleOptions"
                :key="option.value"
                type="button"
                :class="rowClass"
                :aria-pressed="isPicked(option)"
                @click="toggle(option)"
              >
                <MpAvatar
                  :id="`${idBase}-avatar-${slug(option.value)}`"
                  size="md"
                  :variant="avatar === 'icon' ? 'square' : 'circle'"
                  variant-color="gray"
                  :name="avatar === 'initial' ? option.label : undefined"
                  :icon="avatar === 'icon' ? icon : undefined"
                />
                <div :class="rowTextClass">
                  <MpText color="dark">{{ option.label }}</MpText>
                  <MpText v-if="option.caption" size="body-small" color="gray.600">
                    {{ option.caption }}
                  </MpText>
                </div>
                <MpIcon v-if="isPicked(option)" name="check" size="sm" color="blue.400" />
              </Pixel.button>

              <MpText v-if="!visibleOptions.length" size="body-small" color="gray.600">
                No {{ nounPlural }} match this search.
              </MpText>
            </div>
          </div>

          <!-- Right: what has been picked so far. -->
          <div :class="selectedPaneClass">
            <div :class="selectedSearchClass">
              <MpInputGroup>
                <MpInputLeftAddon>
                  <MpIcon name="search" size="sm" color="gray.400" />
                </MpInputLeftAddon>
                <MpInput
                  v-model="selectedSearch"
                  :placeholder="`Search ${noun}`"
                  :aria-label="`Search selected ${nounPlural}`"
                />
              </MpInputGroup>
            </div>

            <div :class="selectedHeadClass">
              <MpText weight="semiBold" color="dark">
                {{ draft.length }} selected {{ noun }}
              </MpText>
              <MpTextlink v-if="draft.length" @click="clearAll">Delete all</MpTextlink>
            </div>

            <div v-if="!draft.length" :class="emptyStateClass">
              <div :class="emptyIconClass"><MpIcon :name="icon" color="blue.400" /></div>
              <MpText weight="semiBold" color="dark" :class="emptyTitleClass">
                No selected {{ noun }} yet
              </MpText>
              <MpText size="body-small" color="gray.600" :class="emptyDescClass">
                Select your {{ noun }} from the list. Once you select one, it will appear here.
              </MpText>
            </div>

            <div v-else :class="rowsClass">
              <!-- The same row as the left pane, so a picked thing reads the
                   same on both sides. Clicking it takes it back off the rule —
                   the only remove affordance, as in the source. -->
              <Pixel.button
                v-for="option in visibleSelected"
                :key="option.value"
                type="button"
                :class="rowClass"
                :aria-label="`Remove ${option.label}`"
                @click="toggle(option)"
              >
                <MpAvatar
                  :id="`${idBase}-selected-${slug(option.value)}`"
                  size="md"
                  :variant="avatar === 'icon' ? 'square' : 'circle'"
                  variant-color="gray"
                  :name="avatar === 'initial' ? option.label : undefined"
                  :icon="avatar === 'icon' ? icon : undefined"
                />
                <div :class="rowTextClass">
                  <MpText color="dark">{{ option.label }}</MpText>
                  <MpText v-if="option.caption" size="body-small" color="gray.600">
                    {{ option.caption }}
                  </MpText>
                </div>
              </Pixel.button>
              <MpText v-if="!visibleSelected.length" size="body-small" color="gray.600">
                No selected {{ nounPlural }} match this search.
              </MpText>
            </div>
          </div>
        </div>
      </MpDrawerBody>

      <MpDrawerFooter>
        <div :class="footerClass">
          <!-- "All" is a standing instruction, not 87 ticks: it keeps covering
               whatever is added later, which is why it is a checkbox of its own
               rather than a shortcut for picking every row. -->
          <MpCheckbox
            :id="`${idBase}-select-all`"
            :is-checked="isAll"
            :is-indeterminate="draft.length > 0 && !isAll"
            @change="toggleAll"
          >
            Select all {{ selectableValues.length }} {{ nounPlural }}
            <template #description>
              If a new {{ noun }} is added, the price rule will automatically apply to that
              {{ noun }}.
            </template>
          </MpCheckbox>
          <div :class="footerActionsClass">
            <MpButton variant="ghost" @click="emit('close')">Cancel</MpButton>
            <MpButton variant="primary" :is-disabled="!isChanged" @click="onSave">Save</MpButton>
          </div>
        </div>
      </MpDrawerFooter>
    </MpDrawerContent>
  </MpDrawer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  css,
  MpAvatar,
  MpButton,
  MpCheckbox,
  MpDrawer,
  MpDrawerBody,
  MpDrawerCloseButton,
  MpDrawerContent,
  MpDrawerFooter,
  MpDrawerHeader,
  MpDrawerOverlay,
  MpIcon,
  MpInput,
  MpInputGroup,
  MpInputLeftAddon,
  MpSegmentedControl,
  MpSelect,
  MpText,
  MpTextlink,
  Pixel
} from "@mekari/pixel3";
import type { IconName } from "@mekari/pixel3";

/**
 * The two-pane "Add contact" / "Add product" picker, as a drawer: everything
 * pickable on the left, everything picked on the right, one Save at the end.
 *
 * One component for both because they differ only in what fills the panes — the
 * left pane's tabs/filter, the row's avatar, and the noun. Two copies would
 * drift the moment either changed, and the source's two drawers already behave
 * identically apart from those details.
 */
interface PickerOption {
  /** What gets stored when the option is picked. */
  value: string;
  label: string;
  caption?: string;
  /** A group option picks its members rather than itself: the rule is stored
   *  against individual names, so a group is a shortcut, not a third scope. */
  members?: string[];
  /** Which tab the option belongs to. Ignored when there are no tabs. */
  tab?: string;
  /** Matched against the filter select. Ignored when there is no filter. */
  filter?: string;
}

const props = withDefaults(
  defineProps<{
    isOpen: boolean;
    /** Drawer title, e.g. "Add contact". */
    title: string;
    intro: string;
    /** Singular noun used throughout the copy, e.g. "contact". */
    noun: string;
    nounPlural: string;
    /** Heading above the left pane's rows, e.g. "Contact list". */
    listTitle: string;
    options: PickerOption[];
    selected: string[];
    /** True when the rule covers everything — including whatever is added after
     *  it is saved. Distinct from "every row happens to be ticked". */
    isAllSelected?: boolean;
    tabs?: { label: string; value: string }[];
    filters?: { label: string; value: string }[];
    filterAllLabel?: string;
    /** Initials for people, a square icon tile for things. */
    avatar?: "initial" | "icon";
    icon: IconName;
  }>(),
  { tabs: () => [], filters: () => [], filterAllLabel: "All", avatar: "initial" }
);

const emit = defineEmits<{ close: []; save: [values: string[], isAll: boolean] }>();

const draft = ref<string[]>([]);
const isAll = ref(false);
const tab = ref("");
const filter = ref("");
const listSearch = ref("");
const selectedSearch = ref("");

/** Ids have to be stable per picker, not per app — two pickers on one page must
 *  not share a checkbox id. */
const idBase = computed(() => `scope-picker-${slug(props.noun)}`);

const segmentedData = computed(() =>
  props.tabs.map((entry) => ({
    id: `${idBase.value}-tab-${slug(entry.value)}`,
    label: entry.label,
    value: entry.value
  }))
);

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function matches(value: string, term: string) {
  return value.toLowerCase().includes(term.trim().toLowerCase());
}

const visibleOptions = computed(() =>
  props.options.filter((option) => {
    if (tab.value && option.tab && option.tab !== tab.value) return false;
    if (filter.value && option.filter !== filter.value) return false;
    return matches(option.label, listSearch.value);
  })
);

/** What "all" covers: the individual records. A group is a way of picking
 *  several of them at once, so counting it too would double-count its members. */
const selectableValues = computed(() =>
  props.options.filter((option) => !option.members).map((option) => option.value)
);

/** The names actually stored: a picked group becomes its members, so nothing
 *  downstream has to resolve a group again. */
const draftValues = computed(() => [
  ...new Set(draft.value.flatMap((value) => valuesOf(optionFor(value))))
]);

const byValue = computed(() => new Map(props.options.map((option) => [option.value, option])));

/** A value the picker doesn't know (a contact removed from the list since the
 *  rule was saved) still has to render, so it falls back to itself. */
function optionFor(value: string): PickerOption {
  return byValue.value.get(value) ?? { value, label: value };
}

function valuesOf(option: PickerOption) {
  return option.members ?? [option.value];
}

function isPicked(option: PickerOption) {
  return draft.value.includes(option.value);
}

/** Touching a row turns a standing "all" into a list: the user has started
 *  naming names, and "all plus whatever arrives tomorrow" is no longer what
 *  they asked for. */
function toggle(option: PickerOption) {
  isAll.value = false;
  if (isPicked(option)) {
    draft.value = draft.value.filter((value) => value !== option.value);
    return;
  }
  draft.value = [...draft.value, option.value];
}

function clearAll() {
  isAll.value = false;
  draft.value = [];
}

const visibleSelected = computed(() =>
  draft.value.map(optionFor).filter((option) => matches(option.label, selectedSearch.value))
);

function toggleAll(isChecked: boolean) {
  isAll.value = isChecked;
  draft.value = isChecked ? [...selectableValues.value] : [];
}

/** Reset on every open: a picker that reopens holding a half-made selection
 *  saves something the user didn't mean. */
watch(
  () => props.isOpen,
  (isOpen) => {
    if (!isOpen) return;
    isAll.value = props.isAllSelected ?? false;
    // "All" stores no list, so the right pane shows what it covers today rather
    // than reopening empty.
    draft.value = isAll.value ? [...selectableValues.value] : [...props.selected];
    tab.value = props.tabs[0]?.value ?? "";
    filter.value = "";
    listSearch.value = "";
    selectedSearch.value = "";
  },
  { immediate: true }
);

/** Nothing to save until the scope differs from what the rule already carries —
 *  a selection emptied on purpose counts, and so does the switch between "all"
 *  and a list that happens to hold everything. */
const isChanged = computed(() => {
  if (isAll.value !== (props.isAllSelected ?? false)) return true;
  if (isAll.value) return false;
  if (draftValues.value.length !== props.selected.length) return true;
  return draftValues.value.some((value) => !props.selected.includes(value));
});

function onSave() {
  emit("save", isAll.value ? [] : draftValues.value, isAll.value);
  emit("close");
}

// All css() below uses Pixel 3 token shortcuts only (token mode 2.1).
const titleClass = css({ fontSize: "lg" });
const introClass = css({ display: "block", mb: 5 });

// The body owns the height so the panes can stretch to it: that is what makes
// the rule between them run the full drawer rather than the length of the list.
const bodyClass = css({
  display: "flex!",
  flexDirection: "column",
  minHeight: "full"
});

// Two panes side by side, each scrolling on its own so a long list never
// pushes the other pane's heading out of view.
const panesClass = css({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 6,
  alignItems: "stretch",
  flex: 1,
  minHeight: 0
});
const listPaneClass = css({
  display: "flex",
  flexDirection: "column",
  gap: 4,
  minHeight: 0,
  pr: 6,
  borderRightWidth: "sm",
  borderStyle: "solid",
  borderColor: "gray.100"
});
const selectedPaneClass = css({
  display: "flex",
  flexDirection: "column",
  gap: 4,
  minHeight: 0
});
const listToolsClass = css({ display: "flex", flexDirection: "column", gap: 4 });
// Both panes' heads are two bands of the same height — the tallest thing in
// either is a search field — so the two lists start on the same line and each
// picked row sits opposite its counterpart (docs/design.md §8.3 allows a Figma
// layout size in px).
const HEAD_ROW_HEIGHT = "38px";
const listHeadClass = css({
  display: "flex",
  alignItems: "center",
  gap: 3,
  minHeight: HEAD_ROW_HEIGHT
});
const headingClass = css({ flexShrink: 0 });
const listSearchClass = css({ flex: 1, minWidth: 0 });
const filterSelectClass = css({ width: "160px", flexShrink: 0 });
const selectedSearchClass = css({ width: "full" });

const selectedHeadClass = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 3,
  minHeight: HEAD_ROW_HEIGHT
});

// Each list scrolls inside its pane, so the footer's Save and the counts above
// stay put however long the list runs.
const rowsClass = css({ display: "flex", flexDirection: "column", overflowY: "auto", minHeight: 0 });
const rowClass = css({
  display: "flex",
  alignItems: "center",
  gap: 3,
  width: "full",
  textAlign: "left",
  py: 3,
  bg: "transparent",
  cursor: "pointer",
  // Only a rule between rows: a button's own border would box every row in.
  borderStyle: "solid",
  borderColor: "gray.100",
  borderTopWidth: 0,
  borderLeftWidth: 0,
  borderRightWidth: 0,
  borderBottomWidth: "sm",
  rounded: "none",
  _hover: { bg: "gray.25" }
});
const rowTextClass = css({ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 });

const emptyStateClass = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 3,
  py: 12,
  textAlign: "center"
});
const emptyIconClass = css({ width: "48px", height: "48px", color: "blue.400" });
const emptyTitleClass = css({ fontSize: "lg" });
const emptyDescClass = css({ maxWidth: "320px" });

const footerClass = css({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 4,
  width: "full",
  flexWrap: "wrap"
});
const footerActionsClass = css({ display: "flex", alignItems: "center", gap: 2 });
</script>
