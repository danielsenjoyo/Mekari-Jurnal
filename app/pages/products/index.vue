<template>
  <DefaultPageContent title="Products">
    <!-- Title-band actions. One "Actions" dropdown and nothing else, as the
         source has it (src/pages/products/components/action-dropdown), grouped
         into PRODUCT / WAREHOUSE / PRICE RULE sections — the sections are what
         stop a nine-item menu reading as a flat list, and the grouping is how a
         user finds "Transfer warehouse" without knowing it is a warehouse
         action.

         Import and Export are NOT here. They belong to one list each, so they
         sit on that list's toolbar (Zone C) where the source puts them. -->
    <template #actions>
      <!-- `is-close-on-select`: one of these entries opens a drawer rather
           than navigating, and a menu left standing over it covers the thing
           it just opened. -->
      <MpPopover placement="bottom-end" use-portal is-adaptive-width is-close-on-select>
        <template #default>
          <MpPopoverTrigger>
            <MpButton variant="primary" right-icon="caret-down">Actions</MpButton>
          </MpPopoverTrigger>
          <MpPopoverContent>
            <template v-for="(group, index) in ACTION_GROUPS" :key="group.title">
              <!-- A rule between groups, never above the first: the heading
                   alone doesn't separate nine entries into three decisions. -->
              <MpDivider v-if="index > 0" :class="menuDividerClass" />
              <MpText as="p" size="overline" color="gray.600" :class="menuSectionClass">
                {{ group.title }}
              </MpText>
              <MpPopoverList>
                <MpPopoverListItem
                  v-for="item in group.items"
                  :key="item.key"
                  role="menuitem"
                  @click="onAction(item.key)"
                >
                  {{ item.label }}
                </MpPopoverListItem>
              </MpPopoverList>
            </template>
          </MpPopoverContent>
        </template>
      </MpPopover>
    </template>

    <!-- Page-level tabs — the source's three "segments" (Goods & services,
         Warehouses, Price rules). They switch between sibling views rather
         than filtering one list, which is why they sit on the shell above the
         stage rather than inside it (docs/patterns/Tabs.md).

         `is-manual` is required, not optional: without it MpTabs keeps its own
         index and `v-model` is effectively one-way (component → parent), so a
         tab set from code — the `?tab=` deep link below, the detail pages'
         breadcrumbs — is silently ignored while clicks still work. -->
    <template #tabs>
      <MpTabs v-model="activeSegmentIndex" is-manual variant-color="blue">
        <MpTabList>
          <MpTab v-for="segment in SEGMENTS" :key="segment.key">
            <span :class="tabLabelClass">{{ segment.label }}</span>
          </MpTab>
        </MpTabList>
      </MpTabs>
    </template>

    <!-- Zone A — Summary boxes. These count PRODUCTS across the whole
         catalogue: they don't follow the active tab, the quick filter or the
         search, and they stay put on the Warehouses segment too (the source
         shows the same strip on both). That is the labelled-scope resolution
         from docs/patterns/SummaryBox.md — the caption underneath says what
         they cover, rather than the strip being re-scoped to whatever happens
         to be in the table below it. -->
    <template v-if="showSummary">
      <div :class="statsGridClass">
        <SummaryBox
          variant="green"
          label="Available stock"
          caption="Total product"
          :amount="formatCount(summary.availableStock)"
        >
          <template #top-right-content>
            <MpTooltip label="See the inventory summary report" placement="bottom">
              <MpIcon name="newtab" size="sm" color="gray.400" />
            </MpTooltip>
          </template>
        </SummaryBox>
        <SummaryBox
          variant="orange"
          label="Low stock"
          caption="Total product"
          :amount="formatCount(summary.lowStock)"
        >
          <template #top-right-content>
            <MpTooltip label="See the inventory summary report" placement="bottom">
              <MpIcon name="newtab" size="sm" color="gray.400" />
            </MpTooltip>
          </template>
        </SummaryBox>
        <SummaryBox
          variant="red"
          label="Out of stock"
          caption="Total product"
          :amount="formatCount(summary.outOfStock)"
        >
          <template #top-right-content>
            <MpTooltip label="See the inventory summary report" placement="bottom">
              <MpIcon name="newtab" size="sm" color="gray.400" />
            </MpTooltip>
          </template>
        </SummaryBox>
        <SummaryBox
          variant="blue"
          label="Warehouse"
          caption="Listed"
          :amount="formatCount(summary.warehouseTotal)"
        >
          <template #top-right-content>
            <MpTooltip label="See the warehouse stock report" placement="bottom">
              <MpIcon name="newtab" size="sm" color="gray.400" />
            </MpTooltip>
          </template>
        </SummaryBox>
      </div>
      <div :class="statsCaptionClass">
        <MpText size="body-small" color="gray.600">
          Counts every product in the catalogue, not the rows below. A product appears here once
          "Track stock for this item" is ticked.
        </MpText>
      </div>
    </template>

    <!-- Zone B — content tabs. One row per segment; the Price rules segment
         has a single list, so it gets no tab row at all rather than a
         one-tab one. -->
    <MpTabs v-if="tabs.length > 1" v-model="activeTabIndex" is-manual variant-color="blue">
      <MpTabList>
        <MpTab v-for="tab in tabs" :key="tab.key">
          <span :class="tabLabelClass">
            {{ tab.label }}
            <MpBadge
              v-if="approvalCountFor(tab.key)"
              for="additionalInformation"
              type="announcement"
            >
              {{ approvalCountFor(tab.key) }}
            </MpBadge>
          </span>
        </MpTab>
      </MpTabList>
    </MpTabs>

    <!-- Zone C — the list toolbar. Which controls appear is per-tab
         (TOOLBAR_BY_TAB): eight tabs over eight entities share almost no
         control, and the source gives each tab only what acts on its own list.
         Left holds the controls that change how the list reads; right holds the
         file actions, then search, then Filter. -->
    <div :class="filterBarClass">
      <div :class="filterLeftClass">
        <!-- Column picker — icon only, on every tab that has one.
             `aria-label` is the accessible name the dropped label used to give
             it: an MpButton with icons and no slot content renders as a
             button-icon (data-has-label=false), and the name has to come from
             somewhere. No MpTooltip on it either — a tooltip between
             MpPopoverTrigger and its button swallows the click.

             NOTE: nothing may sit inside MpPopoverTrigger except the button —
             not even an HTML comment. The trigger renders the FIRST node of its
             slot, and a comment is a node, so a comment there makes the whole
             control vanish (docs/patterns/FilterBar.md). -->
        <MpPopover
          v-if="toolbar.hasColumnPicker"
          placement="bottom-start"
          use-portal
          is-adaptive-width
        >
          <template #default>
            <MpPopoverTrigger>
              <MpButton
                variant="secondary"
                left-icon="table-view-column"
                right-icon="caret-down"
                aria-label="Shown columns"
              />
            </MpPopoverTrigger>
            <MpPopoverContent>
              <div :class="columnMenuClass">
                <!-- Not is-close-on-select: picking columns is several
                     decisions, and a menu that shuts on the first one makes the
                     user reopen it for each. -->
                <MpCheckbox
                  v-for="column in COLUMNS_BY_TAB[activeTabKey]"
                  :id="`column-toggle-${column.key}`"
                  :key="column.key"
                  :is-checked="!hiddenColumns.includes(column.key)"
                  :is-disabled="column.link"
                  @change="toggleColumn(column.key, $event)"
                >
                  {{ column.label }}
                </MpCheckbox>
              </div>
            </MpPopoverContent>
          </template>
        </MpPopover>

        <MpButton
          v-if="toolbar.hasManageCategory"
          variant="secondary"
          @click="isCategoryModalOpen = true"
        >
          Manage product category
        </MpButton>
      </div>

      <div :class="filterRightClass">
        <!-- The warehouse list's own switch, in place of a status filter: a
             deactivated warehouse is hidden rather than filtered out, so the
             question is "show them too?", not "which status?". -->
        <MpToggle
          v-if="toolbar.hasInactiveToggle"
          id="show-inactive-warehouses"
          :is-checked="showInactiveWarehouses"
          @change="onToggleInactiveWarehouses"
        >
          Show inactive warehouses
        </MpToggle>

        <!-- The product list imports three different things, so it gets a menu.
             Every other tab imports exactly one, so it gets a button. -->
        <MpPopover
          v-if="toolbar.importKind === 'menu'"
          placement="bottom-end"
          use-portal
          is-adaptive-width
          is-close-on-select
        >
          <template #default>
            <MpPopoverTrigger>
              <MpButton variant="secondary" right-icon="caret-down">Import</MpButton>
            </MpPopoverTrigger>
            <MpPopoverContent>
              <template v-for="(group, index) in IMPORT_GROUPS" :key="group.title">
                <MpDivider v-if="index > 0" :class="menuDividerClass" />
                <MpText as="p" size="overline" color="gray.600" :class="menuSectionClass">
                  {{ group.title }}
                </MpText>
                <MpPopoverList>
                  <MpPopoverListItem
                    v-for="item in group.items"
                    :key="item.kind"
                    role="menuitem"
                    @click="openImport(item.kind)"
                  >
                    {{ item.label }}
                  </MpPopoverListItem>
                </MpPopoverList>
              </template>
            </MpPopoverContent>
          </template>
        </MpPopover>
        <MpButton
          v-else-if="toolbar.importKind"
          variant="secondary"
          @click="openImport(toolbar.importKind)"
        >
          Import
        </MpButton>

        <!-- Two product exports, not one: a bundle's rows are its components,
             so it can't share a one-row-per-product sheet. Products opens the
             column picker; bundles have a fixed shape and download straight
             away. Other tabs export the list in front of the user, which needs
             no choosing, so they get a button. -->
        <MpPopover
          v-if="toolbar.hasExportMenu"
          placement="bottom-end"
          use-portal
          is-adaptive-width
          is-close-on-select
        >
          <template #default>
            <MpPopoverTrigger>
              <MpButton variant="secondary" right-icon="caret-down">Export</MpButton>
            </MpPopoverTrigger>
            <MpPopoverContent>
              <MpPopoverList>
                <MpPopoverListItem role="menuitem" @click="isExportModalOpen = true">
                  All products
                </MpPopoverListItem>
                <MpPopoverListItem role="menuitem" @click="exportBundles">
                  Product bundles &amp; composition
                </MpPopoverListItem>
              </MpPopoverList>
            </MpPopoverContent>
          </template>
        </MpPopover>
        <MpButton v-else-if="toolbar.hasExport" variant="secondary" @click="exportCurrentTab">
          Export
        </MpButton>

        <!-- Filter sits immediately LEFT of the search field, so the two
             narrowing controls read as one pair with the file actions before
             them (docs/patterns/FilterBar.md). -->
        <div v-if="toolbar.hasFilter" :class="filterButtonWrapClass">
          <MpButton variant="secondary" left-icon="filter" @click="isFilterDrawerOpen = true">
            Filter
          </MpButton>
          <!-- A staged drawer closes over its own settings, so the button is
               the only place the user can see that a filter is still on. -->
          <span v-if="hasActiveFilter" :class="filterDotClass" aria-hidden="true" />
        </div>

        <div :class="[searchGroupClass, toolbar.isWideSearch && wideSearchClass]">
          <MpInputGroup>
            <MpInputLeftAddon>
              <MpIcon name="search" size="sm" color="gray.400" />
            </MpInputLeftAddon>
            <MpInput
              v-model="search"
              :placeholder="searchPlaceholder"
              :aria-label="searchPlaceholder"
            />
          </MpInputGroup>
          <button
            v-if="searchTerm"
            type="button"
            data-search-clear
            aria-label="Clear search"
            :class="searchClearClass"
            @click="search = ''"
          >
            <MpIcon name="reset" size="sm" color="gray.400" />
          </button>
        </div>
      </div>
    </div>

    <ProductsFilterDrawer
      :is-open="isFilterDrawerOpen"
      :active-tab="activeTabKey"
      :applied="filter"
      @close="isFilterDrawerOpen = false"
      @apply="onApplyFilter"
    />

    <!-- Delete confirmation — shared by the row-level and bulk Delete actions
         (pendingIds holds either one row or the whole selection). Destructive
         action, per docs/patterns/Modal.md. -->
    <!-- Each MpModal carries its own `id`, as every example in the Pixel modal
         docs does — it names the portal target and the dialog for assistive
         tech. Two modals coexist on this page without conflict (only the open
         one is in the DOM at all: `is-keep-alive` defaults to false). -->
    <MpModal
      id="products-delete-modal"
      :is-open="showDeleteModal"
      size="sm"
      @close="closeDeleteModal"
    >
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          <span :class="modalTitleClass">{{ deleteModalTitle }}</span>
          <MpModalCloseButton />
        </MpModalHeader>
        <MpModalBody>
          <MpText size="body" color="gray.700">This can't be undone.</MpText>
        </MpModalBody>
        <MpModalFooter>
          <div :class="modalFooterClass">
            <MpButton variant="secondary" @click="closeDeleteModal">Cancel</MpButton>
            <MpButton variant="danger" @click="confirmDelete">Delete</MpButton>
          </div>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>

    <!-- Approve confirmation. The body says where the record goes, verbatim
         from the source's approve modal — without it "Approve" gives no clue
         that the row is about to leave this list for another one. -->
    <MpModal
      id="products-approve-modal"
      :is-open="showApproveModal"
      size="sm"
      @close="closeApproveModal"
    >
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          <span :class="modalTitleClass">{{ approveModalTitle }}</span>
          <MpModalCloseButton />
        </MpModalHeader>
        <MpModalBody>
          <MpText size="body" color="gray.700">{{ approveModalBody }}</MpText>
        </MpModalBody>
        <MpModalFooter>
          <div :class="modalFooterClass">
            <MpButton variant="secondary" @click="closeApproveModal">Cancel</MpButton>
            <MpButton variant="primary" @click="confirmApprove">Approve</MpButton>
          </div>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>

    <!-- Zone D/E — table + pager, OR the blank slate. -->
    <template v-if="filteredRows.length">
      <MpTableContainer ref="tableContainerRef" :class="scrollShadowClass">
        <MpTable is-hoverable :class="tableFixedClass">
          <colgroup>
            <col v-for="(w, i) in colWidths" :key="i" :style="{ width: w }" />
            <!-- Filler column — no width, so it's the one that absorbs
                 leftover space on a wide viewport. -->
            <col />
          </colgroup>
          <MpTableHead is-fixed :class="tableHeadClass">
            <!-- The bulk bar is its own row ABOVE the header, never a
                 replacement for it — swapping the header out removes the
                 column labels at exactly the moment the user is deciding which
                 rows to act on. See docs/patterns/BulkActionBar.md. -->
            <MpTableRow v-if="selected.length && isSelectable">
              <MpTableCell as="th" :colspan="columns.length + 2" :class="bulkCellClass">
                <div :class="bulkBarClass">
                  <MpText size="label" weight="semiBold" color="dark">
                    {{ selected.length }} selected
                  </MpText>
                  <MpButton
                    v-if="canArchive"
                    size="sm"
                    variant="secondary"
                    @click="onArchive(selected)"
                  >
                    Archive
                  </MpButton>
                  <MpButton size="sm" variant="danger" @click="openDeleteModal(selected)">
                    Delete
                  </MpButton>
                  <MpTextlink as="button" variant="secondary" @click="selected = []">
                    Clear selection
                  </MpTextlink>
                </div>
              </MpTableCell>
            </MpTableRow>

            <MpTableRow>
              <MpTableCell v-if="isSelectable" as="th" :class="checkboxCellClass">
                <MpCheckbox
                  :is-checked="allOnPageSelected"
                  :is-indeterminate="someOnPageSelected && !allOnPageSelected"
                  @change="toggleAllOnPage"
                />
              </MpTableCell>
              <MpTableCell v-else as="th" :class="checkboxCellClass" />
              <MpTableCell
                v-for="col in columns"
                :key="col.key"
                as="th"
                :class="col.numeric ? numCellClass : undefined"
              >
                <button type="button" :class="sortHeaderClass" @click="toggleSort(col.key)">
                  <span :class="headerLabelClass">{{ col.label }}</span>
                  <MpIcon :name="sortIconFor(col.key)" size="sm" color="gray.400" />
                </button>
              </MpTableCell>
              <!-- Row-action column: no label, per docs/patterns/TablePage.md. -->
              <MpTableCell v-if="isApprovalTab" as="th" />
              <!-- Filler cell — matches the widthless trailing <col> above. -->
              <MpTableCell as="th" />
            </MpTableRow>
          </MpTableHead>

          <MpTableBody v-if="isLoading">
            <MpTableRow v-for="n in 5" :key="`skeleton-${n}`">
              <MpTableCell as="td" :class="checkboxCellClass">
                <MpSkeleton is-loading><span :class="skeletonCheckboxClass" /></MpSkeleton>
              </MpTableCell>
              <MpTableCell v-for="col in columns" :key="col.key" as="td">
                <MpSkeleton is-loading><span :class="skeletonBarClass" /></MpSkeleton>
              </MpTableCell>
              <MpTableCell v-if="isApprovalTab" as="td" />
              <MpTableCell as="td" />
            </MpTableRow>
          </MpTableBody>

          <MpTableBody v-else>
            <template v-for="row in pagedRows" :key="row.id">
              <MpTableRow>
                <MpTableCell v-if="isSelectable" as="td" :class="checkboxCellClass">
                  <MpCheckbox :is-checked="selected.includes(row.id)" @change="toggleRow(row.id)" />
                </MpTableCell>
                <!-- The variant tab spends this column on the expander instead of
                   a checkbox: the master is a header for the rows underneath
                   it, not a record to select. -->
                <MpTableCell v-else-if="row.isGroup" as="td" :class="checkboxCellClass">
                  <MpButton
                    variant="ghost"
                    size="sm"
                    :left-icon="isExpanded(row.id) ? 'caret-down' : 'caret-right'"
                    :aria-label="`${isExpanded(row.id) ? 'Collapse' : 'Expand'} ${row.title}`"
                    :aria-expanded="isExpanded(row.id)"
                    @click="toggleExpanded(row.id)"
                  />
                </MpTableCell>
                <MpTableCell v-else as="td" :class="checkboxCellClass" />

                <MpTableCell
                  v-for="col in columns"
                  :key="col.key"
                  as="td"
                  :class="col.numeric ? numCellClass : undefined"
                >
                  <!-- The link column: record name/number, an optional second
                     line, and the row's markers (Variant / Bundle / Archived). -->
                  <template v-if="col.link">
                    <!-- Rendered as a link only where a detail page exists — the
                       four transaction tabs have no cloned detail route, and a
                       link that goes nowhere is worse than plain text. -->
                    <MpTextlink
                      v-if="hasDetailRoute"
                      as="button"
                      variant="primary"
                      :class="linkCellClass"
                      @click="onOpen(row)"
                    >
                      {{ row.title }}
                    </MpTextlink>
                    <span v-else :class="wrapCellClass">{{ row.title }}</span>
                    <div v-if="row.badges.length" :class="badgeRowClass">
                      <MpBadge
                        v-for="badge in row.badges"
                        :key="badge"
                        for="additionalInformation"
                        :type="BADGE_TYPE[badge]"
                      >
                        {{ BADGE_LABEL[badge] }}
                      </MpBadge>
                    </div>
                    <MpText
                      v-if="row.subtitle"
                      size="body-small"
                      color="gray.600"
                      :class="wrapCellClass"
                    >
                      {{ row.subtitle }}
                    </MpText>
                  </template>
                  <template v-else-if="col.key === 'status'">
                    <MpBadge
                      for="tableStatus"
                      :type="ACTIVE_STATUS_TYPE[row.status as ActiveStatus]"
                    >
                      {{ ACTIVE_STATUS_LABEL[row.status as ActiveStatus] }}
                    </MpBadge>
                  </template>
                  <template v-else-if="col.key === 'tags'">
                    <MpText v-if="row.tags.length" size="body-small" :class="wrapCellClass">
                      {{ row.tags.join(", ") }}
                    </MpText>
                    <MpText v-else size="body-small" color="gray.400">—</MpText>
                  </template>
                  <!-- A master carries no figures of its own — every number on
                     this tab belongs to a variant — so its other cells stay
                     empty rather than repeating a zero twelve times. -->
                  <template v-else-if="row.isGroup" />
                  <template v-else>
                    <span :class="wrapCellClass">{{ cellText(row, col.key) }}</span>
                  </template>
                </MpTableCell>

                <!-- Row action. Only the two approval queues have one, and it
                   gets its own fixed-width column rather than sharing the
                   width-less filler — the filler collapses to 0 as soon as the
                   columns fill the container, which would clip the button
                   exactly when the table starts scrolling. -->
                <MpTableCell v-if="isApprovalTab" as="td">
                  <MpButton size="sm" variant="secondary" @click="openApproveModal([row.id])">
                    Approve
                  </MpButton>
                </MpTableCell>
                <!-- Filler cell — matches the widthless trailing <col> above. -->
                <MpTableCell as="td" />
              </MpTableRow>

              <!-- The variants, in one full-width cell holding a nested table.
                 A <tbody> can't be given its own scrollbar without dropping out
                 of table layout and taking the column widths with it, so the
                 scroll lives on a plain div and the nested table repeats this
                 table's <colgroup> — with `table-layout: fixed` on both, the
                 two align exactly. -->
              <MpTableRow v-if="row.isGroup && isExpanded(row.id)">
                <MpTableCell as="td" :colspan="colWidths.length + 1" :class="expansionCellClass">
                  <div :class="expansionScrollClass" :data-variant-scroller="row.id">
                    <MpTable :class="tableFixedClass">
                      <colgroup>
                        <col v-for="(w, i) in colWidths" :key="i" :style="{ width: w }" />
                        <col />
                      </colgroup>
                      <MpTableBody>
                        <MpTableRow v-for="variant in variantRowsFor(row.id)" :key="variant.id">
                          <!-- Aligns under the expander, and carries the accent
                             that ties the group together. -->
                          <MpTableCell as="td" :class="[checkboxCellClass, variantAccentClass]" />
                          <MpTableCell
                            v-for="col in columns"
                            :key="col.key"
                            as="td"
                            :class="col.numeric ? numCellClass : undefined"
                          >
                            <template v-if="col.link">
                              <span :class="wrapCellClass">{{ variant.title }}</span>
                              <div :class="badgeRowClass">
                                <MpBadge
                                  v-for="badge in variant.badges"
                                  :key="badge"
                                  for="additionalInformation"
                                  :type="BADGE_TYPE[badge]"
                                >
                                  {{ BADGE_LABEL[badge] }}
                                </MpBadge>
                              </div>
                            </template>
                            <template v-else>
                              <span :class="wrapCellClass">{{ cellText(variant, col.key) }}</span>
                            </template>
                          </MpTableCell>
                          <MpTableCell as="td" />
                        </MpTableRow>
                      </MpTableBody>
                    </MpTable>
                  </div>
                </MpTableCell>
              </MpTableRow>
            </template>
          </MpTableBody>
        </MpTable>
      </MpTableContainer>

      <div :class="paginationClass">
        <div :class="pagerLeftClass">
          <MpText size="body-small" color="gray.600">Rows per page</MpText>
          <MpPopover use-portal is-adaptive-width>
            <MpPopoverTrigger>
              <MpButton variant="ghost" size="sm" right-icon="chevrons-down">
                {{ perPage }}
              </MpButton>
            </MpPopoverTrigger>
            <MpPopoverContent>
              <MpPopoverList>
                <MpPopoverListItem
                  v-for="opt in [10, 25, 50]"
                  :key="opt"
                  :is-active="perPage === opt"
                  @click="setPerPage(opt)"
                >
                  {{ opt }}
                </MpPopoverListItem>
              </MpPopoverList>
            </MpPopoverContent>
          </MpPopover>
          <MpText size="body-small" color="gray.600">
            Showing {{ rangeStart }}-{{ rangeEnd }} of {{ filteredRows.length }}
          </MpText>
        </div>

        <div :class="pagerRightClass">
          <div :class="pageJumpClass">
            <MpAutocomplete
              :class="pageJumpInnerClass"
              :data="pageOptions"
              :model-value="page"
              is-searchable
              is-full-width
              @change="onJumpPage"
            />
          </div>
          <MpText size="body-small" color="gray.600">of {{ pageCount }} page</MpText>
          <MpTooltip label="Previous page">
            <MpButton
              variant="ghost"
              size="sm"
              left-icon="chevrons-left"
              :is-disabled="page <= 1"
              aria-label="Previous page"
              @click="page--"
            />
          </MpTooltip>
          <MpTooltip label="Next page">
            <MpButton
              variant="ghost"
              size="sm"
              left-icon="chevrons-right"
              :is-disabled="page >= pageCount"
              aria-label="Next page"
              @click="page++"
            />
          </MpTooltip>
        </div>
      </div>
    </template>

    <BlankSlate v-else :variant="emptyVariant" :title="emptyTitle" :description="emptyDescription">
      <!-- The filter lives in a staged drawer, so an empty list has no visible
           cause once it is shut — the slate has to offer the way out.
           docs/patterns/BlankSlate.md. -->
      <MpButton v-if="hasActiveFilter" variant="secondary" @click="resetFilters">
        Clear filters
      </MpButton>
    </BlankSlate>

    <StorageLocationDrawer
      :is-open="isStorageDrawerOpen"
      @close="isStorageDrawerOpen = false"
      @created="onStorageLocationCreated"
    />

    <!-- A rename here rewrites the category on every product carrying it, so
         the list underneath has to re-read after any change. -->
    <ProductCategoryModal
      :is-open="isCategoryModalOpen"
      @close="isCategoryModalOpen = false"
      @changed="refreshTick++"
    />

    <ProductImportModal
      :is-open="isImportModalOpen"
      :kind="importKind"
      @close="isImportModalOpen = false"
    />

    <ProductExportModal :is-open="isExportModalOpen" @close="isExportModalOpen = false" />
  </DefaultPageContent>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import {
  css,
  MpAutocomplete,
  MpBadge,
  MpDivider,
  MpButton,
  MpCheckbox,
  MpIcon,
  MpInput,
  MpInputGroup,
  MpInputLeftAddon,
  MpModal,
  MpModalBody,
  MpModalCloseButton,
  MpModalContent,
  MpModalFooter,
  MpModalHeader,
  MpModalOverlay,
  MpPopover,
  MpPopoverContent,
  MpPopoverList,
  MpPopoverListItem,
  MpPopoverTrigger,
  MpSkeleton,
  MpTab,
  MpTabList,
  MpTable,
  MpTableBody,
  MpTableCell,
  MpTableContainer,
  MpTableHead,
  MpTableRow,
  MpTabs,
  MpText,
  MpToggle,
  MpTextlink,
  MpTooltip
} from "@mekari/pixel3";
import DefaultPageContent from "~/components/template/DefaultPageContent.vue";
import SummaryBox from "~/components/template/SummaryBox.vue";
import ProductsFilterDrawer from "~/components/products/ProductsFilterDrawer.vue";
import ProductCategoryModal from "~/components/products/ProductCategoryModal.vue";
import ProductExportModal from "~/components/products/ProductExportModal.vue";
import ProductImportModal from "~/components/products/ProductImportModal.vue";
import { downloadCsv, toCsv } from "~/utils/csv";
import {
  BUNDLE_EXPORT_COLUMNS,
  EXPORT_FILE_NAME,
  IMPORT_GROUPS,
  type ProductImportKind
} from "~/data/products-io";
import {
  emptyProductsFilter,
  isFilterActive,
  matchesProductsFilter,
  type FilterableProductRow,
  type ProductsFilter,
  type ProductsTabKey
} from "~/data/products-filter";
import {
  ADJUSTMENT_TYPE_LABEL,
  APPROVAL_TYPE_LABEL,
  PRICE_RULE_TYPE_LABEL,
  approveProductTransactions,
  approveWarehouseTransfers,
  archiveProducts,
  deleteProductRecords,
  formatAmount,
  formatCount,
  formatDisplayDate,
  formatQuantity,
  getPriceRules,
  getProductApprovals,
  getProductMasters,
  getProductSummary,
  getProducts,
  getStockAdjustments,
  getWarehouseApprovals,
  getWarehouseTransfers,
  getWarehouses,
  isStorageLocationFeatureActive,
  ACTIVE_STATUS_LABEL,
  ACTIVE_STATUS_TYPE,
  priceRuleScopeSummary,
  type ActiveStatus
} from "~/data/products";

useHead({ title: "Products — Mekari Jurnal" });

// ---------------------------------------------------------------------------
// Cloned from jurnal-frontend-app src/pages/products/. The source splits this
// screen into three "segments" under the page title (Goods & services /
// Warehouses / Price rules) and nests a second tab row inside the first two —
// eight lists in total, each over a different entity. Here the segments are
// page-level tabs (they switch sibling views) and the inner rows are content
// tabs, per docs/patterns/Tabs.md.
//
// UI-only prototype: no backend, no role/package gating (the source hides
// price and quantity columns per role), no paywall or onboarding modals, no
// Mixpanel. What is ported is the shape of the screens — segments, tabs,
// column sets, filter fields, the summary strip, the bulk and approve actions,
// and the empty-state copy.
//
// Import and export are the exception: they produce real files, built in the
// browser from the data in memory (app/utils/csv.ts), because the whole point
// of both screens is the file and a prototype that hands back nothing
// demonstrates neither. What is still missing is the other direction — nothing
// reads an uploaded file back in.
//
// Detail and form routes (product detail, product form, master form, batch,
// conversion, price-rule form) are a follow-up pass; the record links here are
// deliberately inert until those pages exist, rather than pointing at a 404.
// ---------------------------------------------------------------------------

type SegmentKey = "goods" | "warehouses" | "price_rules";

const SEGMENTS: { key: SegmentKey; label: string }[] = [
  { key: "goods", label: "Goods & services" },
  { key: "warehouses", label: "Warehouses" },
  { key: "price_rules", label: "Price rules" }
];

const TABS_BY_SEGMENT: Record<SegmentKey, { key: ProductsTabKey; label: string }[]> = {
  goods: [
    { key: "products_and_services", label: "Product list" },
    { key: "masters", label: "Product with variant" },
    { key: "stock_adjustments", label: "Stock adjustment" },
    { key: "product_index_approval", label: "Require approval" }
  ],
  warehouses: [
    { key: "warehouses", label: "Warehouse list" },
    { key: "warehouse_transfers", label: "Warehouse transfer" },
    { key: "warehouse_transfers_approval", label: "Require approval" }
  ],
  price_rules: [{ key: "price_rules", label: "Price rules" }]
};

/**
 * The title-band menu, grouped exactly as the source groups it: letter-spaced
 * capitals over each list and a rule between groups.
 *
 * There is no "New stock in/out" entry. Both stock movements are one screen,
 * and since that screen now opens on a Prepare step whose first question is
 * the adjustment type, a second menu entry would only pre-answer a question
 * the user is about to be asked anyway.
 */
const ACTION_GROUPS = computed<{ title: string; items: { key: string; label: string }[] }[]>(() => [
  {
    title: "Product",
    items: [
      { key: "create-product", label: "Add new product" },
      { key: "create-product-master", label: "Add new product with variant" }
    ]
  },
  {
    title: "Warehouse",
    items: [
      { key: "create-warehouse", label: "Add new warehouse" },
      // In the menu rather than the title band: the band is the Actions button
      // and nothing else, as the source has it.
      { key: "warehouse-settings", label: "Warehouse settings" },
      // Hidden while the storage-location feature is off: with no locations
      // anywhere, the entry leads to a drawer that can't save anything.
      ...(isStorageLocationFeatureActive()
        ? [{ key: "add-storage", label: "Add new storage location" }]
        : []),
      { key: "stock-count", label: "Adjust stock (stock opname)" },
      { key: "warehouse-transfer", label: "Transfer warehouse" }
    ]
  },
  {
    title: "Price rule",
    items: [{ key: "create-price-rule", label: "Create new price rule" }]
  }
]);

type ColumnKey =
  | "productName"
  | "productCode"
  | "barcode"
  | "productCategory"
  | "quantity"
  | "quantityAvailable"
  | "buffer"
  | "unit"
  | "variantCount"
  | "lastBuyPrice"
  | "avgPrice"
  | "buyPrice"
  | "sellPrice"
  | "date"
  | "number"
  | "transactionType"
  | "adjustmentCategory"
  | "account"
  | "warehouse"
  | "tags"
  | "warehouseCode"
  | "warehouseName"
  | "address"
  | "pic"
  | "description"
  | "status"
  | "fromWarehouse"
  | "toWarehouse"
  | "memo"
  | "ruleName"
  | "ruleType"
  | "productContact";

interface ColumnDef {
  key: ColumnKey;
  label: string;
  /** Marks a figure column. Kept as metadata rather than as an alignment
   *  switch — see numCellClass for why these stay left-aligned. */
  numeric?: boolean;
  /** The record link. Exactly one per tab; it also hosts the row's badges. */
  link?: boolean;
}

// Per-tab column sets. The product list's set is the source's `defaultProductCols`
// plus Average price, which the source ships default-off behind the column
// picker — see DEFAULT_HIDDEN_COLUMNS. Its Product image and
// Total-product-in-warehouse columns have no data behind them here (no image
// storage, no per-warehouse stock breakdown on a product row), so they are not
// offered rather than offered empty.
const COLUMNS_BY_TAB: Record<ProductsTabKey, ColumnDef[]> = {
  products_and_services: [
    { key: "productName", label: "Product name", link: true },
    { key: "productCode", label: "Product code" },
    { key: "barcode", label: "Barcode" },
    { key: "productCategory", label: "Product category" },
    { key: "quantity", label: "Total stock", numeric: true },
    { key: "quantityAvailable", label: "Available qty", numeric: true },
    { key: "buffer", label: "Minimum stock", numeric: true },
    { key: "unit", label: "Unit" },
    { key: "lastBuyPrice", label: "Last buy price", numeric: true },
    { key: "avgPrice", label: "Average price", numeric: true },
    { key: "buyPrice", label: "Buy price", numeric: true },
    { key: "sellPrice", label: "Sell price", numeric: true }
  ],
  // The same set as the product list: this tab's figures live on the variants,
  // and a variant carries everything a product does. The master row itself is a
  // group header — it renders its name and nothing else (see `isGroup`).
  masters: [
    { key: "productName", label: "Product name", link: true },
    { key: "productCode", label: "Product code" },
    { key: "barcode", label: "Barcode" },
    { key: "productCategory", label: "Product category" },
    { key: "quantity", label: "Total stock", numeric: true },
    { key: "quantityAvailable", label: "Available qty", numeric: true },
    { key: "buffer", label: "Minimum stock", numeric: true },
    { key: "unit", label: "Unit" },
    { key: "avgPrice", label: "Average price", numeric: true },
    { key: "lastBuyPrice", label: "Last buy price", numeric: true },
    { key: "buyPrice", label: "Buy price", numeric: true },
    { key: "sellPrice", label: "Sell price", numeric: true }
  ],
  stock_adjustments: [
    { key: "date", label: "Date" },
    { key: "number", label: "Transaction no.", link: true },
    { key: "adjustmentCategory", label: "Category" },
    { key: "account", label: "Account" },
    { key: "warehouse", label: "Warehouse" },
    { key: "tags", label: "Tags" }
  ],
  product_index_approval: [
    { key: "date", label: "Date" },
    { key: "number", label: "Transaction no.", link: true },
    { key: "transactionType", label: "Transaction type" },
    { key: "account", label: "Account" },
    { key: "warehouse", label: "Warehouse" },
    { key: "tags", label: "Tags" }
  ],
  warehouses: [
    { key: "warehouseCode", label: "Warehouse code" },
    { key: "warehouseName", label: "Warehouse name", link: true },
    { key: "address", label: "Address" },
    { key: "pic", label: "PIC" },
    { key: "description", label: "Description" },
    { key: "status", label: "Status" }
  ],
  warehouse_transfers: [
    { key: "date", label: "Date" },
    { key: "number", label: "Transaction no.", link: true },
    { key: "fromWarehouse", label: "From warehouse" },
    { key: "toWarehouse", label: "To warehouse" },
    { key: "memo", label: "Memo" }
  ],
  warehouse_transfers_approval: [
    { key: "date", label: "Date" },
    { key: "number", label: "Transaction no.", link: true },
    { key: "fromWarehouse", label: "From warehouse" },
    { key: "toWarehouse", label: "To warehouse" },
    { key: "memo", label: "Memo" }
  ],
  price_rules: [
    { key: "ruleName", label: "Price rule name", link: true },
    { key: "ruleType", label: "Rule type" },
    { key: "productContact", label: "Product & contact" },
    { key: "status", label: "Status" }
  ]
};

/** Row markers shown beside the record name. */
type RowBadge = "variant" | "bundle" | "archived";

const BADGE_LABEL: Record<RowBadge, string> = {
  variant: "Variant",
  bundle: "Bundle",
  archived: "Archived"
};

const BADGE_TYPE: Record<RowBadge, "announcement" | "information"> = {
  variant: "information",
  bundle: "information",
  archived: "announcement"
};

/**
 * One row shape for all eight tabs. It extends the filter's normalised shape
 * (so `matchesProductsFilter` reads it directly) and adds the display-only
 * fields the columns render.
 *
 * A union of eight record types would be more precise, but every consumer here
 * — the sort comparator, the cell renderer, the selection model — is keyed by
 * column, and a column only ever appears on tabs whose records carry it. One
 * flat shape with unused fields left empty is what keeps those three generic;
 * the same trade the Purchase list makes with its single `Row`.
 */
interface Row extends FilterableProductRow {
  id: number;
  /** Whatever the link column shows: product name, transaction no., warehouse
   *  name, price-rule name. */
  title: string;
  /** Optional second line under the title. */
  subtitle: string;
  /** A master on the variant tab: a header for the variants underneath it, not
   *  a record with figures of its own. Renders its name and nothing else. */
  isGroup?: boolean;
  badges: RowBadge[];
  code: string;
  barcode: string;
  /** `null` where stock isn't tracked — rendered "—", not "0". */
  quantity: number | null;
  quantityAvailable: number | null;
  buffer: number | null;
  unit: string;
  variantCount: number;
  lastBuyPrice: number;
  avgPrice: number;
  buyPrice: number;
  sellPrice: number;
  account: string;
  fromWarehouse: string;
  toWarehouse: string;
  memo: string;
  address: string;
  pic: string;
  description: string;
  productContact: string;
  /** Human label for `transactionType` / `ruleType`, resolved once at map time
   *  so the cell renderer doesn't have to know which vocabulary a tab uses. */
  typeLabel: string;
}

/** Everything a Row carries, empty. Each tab's mapper overrides what it has,
 *  which keeps the eight mappers to just their own fields. */
function emptyRow(id: number): Row {
  return {
    id,
    title: "",
    subtitle: "",
    badges: [],
    code: "",
    barcode: "",
    quantity: null,
    quantityAvailable: null,
    buffer: null,
    unit: "",
    variantCount: 0,
    lastBuyPrice: 0,
    avgPrice: 0,
    buyPrice: 0,
    sellPrice: 0,
    account: "",
    fromWarehouse: "",
    toWarehouse: "",
    memo: "",
    address: "",
    pic: "",
    description: "",
    productContact: "",
    typeLabel: "",
    // FilterableProductRow
    searchText: [],
    category: "",
    productType: "",
    warehouse: "",
    transactionType: "",
    adjustmentCategory: "",
    ruleType: "",
    status: "",
    dateSort: "",
    tags: [],
    isArchived: false
  };
}

function rowsForTab(tab: ProductsTabKey): Row[] {
  switch (tab) {
    case "products_and_services":
      return getProducts().map((p) => ({
        ...emptyRow(p.id),
        title: p.name,
        subtitle: p.description,
        badges: [
          ...(p.isBundle ? (["bundle"] as RowBadge[]) : []),
          ...(p.isArchived ? (["archived"] as RowBadge[]) : [])
        ],
        code: p.code,
        barcode: p.barcode,
        quantity: p.quantity,
        quantityAvailable: p.quantityAvailable,
        buffer: p.buffer,
        unit: p.unit,
        lastBuyPrice: p.lastBuyPrice,
        avgPrice: p.avgPrice,
        buyPrice: p.buyPrice,
        sellPrice: p.sellPrice,
        searchText: [p.name, p.code, p.barcode, p.category, p.description, ...p.tags],
        category: p.category,
        productType: p.type,
        warehouse: p.warehouse,
        tags: p.tags,
        isArchived: p.isArchived
      }));
    case "masters":
      return getProductMasters().map((m) => ({
        ...emptyRow(m.id),
        isGroup: true,
        title: m.name,
        subtitle: m.description,
        badges: m.isArchived ? (["archived"] as RowBadge[]) : [],
        searchText: [m.name, m.code, m.category, m.description, ...m.tags],
        category: m.category,
        tags: m.tags,
        isArchived: m.isArchived
      }));
    case "stock_adjustments":
      return getStockAdjustments().map((a) => ({
        ...emptyRow(a.id),
        title: a.number,
        subtitle: a.memo,
        account: a.account,
        typeLabel: ADJUSTMENT_TYPE_LABEL[a.adjustmentType],
        searchText: [a.number, a.category, a.account, a.warehouse, a.memo, ...a.tags],
        warehouse: a.warehouse,
        transactionType: a.adjustmentType,
        adjustmentCategory: a.category,
        dateSort: a.date,
        tags: a.tags
      }));
    case "product_index_approval":
      return getProductApprovals().map((a) => ({
        ...emptyRow(a.id),
        title: a.number,
        subtitle: a.memo,
        account: a.account,
        typeLabel: APPROVAL_TYPE_LABEL[a.transactionType],
        searchText: [a.number, a.account, a.warehouse, a.memo, ...a.tags],
        warehouse: a.warehouse,
        transactionType: a.transactionType,
        dateSort: a.date,
        tags: a.tags
      }));
    case "warehouses":
      // Inactive warehouses are out of the list unless the toggle asks for
      // them — the source's default, and why this tab has no status filter.
      return getWarehouses()
        .filter((w) => showInactiveWarehouses.value || w.isActive)
        .map((w) => ({
          ...emptyRow(w.id),
          title: w.name,
          code: w.code,
          address: w.address,
          // Several people can share a warehouse; the column shows them as one
          // line, which is what a list column can carry.
          pic: w.pics.join(", "),
          description: w.description,
          searchText: [w.code, w.name, w.address, ...w.pics, w.description],
          warehouse: w.name,
          status: w.isActive ? "active" : "inactive"
        }));
    case "warehouse_transfers":
    case "warehouse_transfers_approval":
      return (
        tab === "warehouse_transfers" ? getWarehouseTransfers() : getWarehouseApprovals()
      ).map((t) => ({
        ...emptyRow(t.id),
        title: t.number,
        fromWarehouse: t.fromWarehouse,
        toWarehouse: t.toWarehouse,
        memo: t.memo,
        searchText: [t.number, t.fromWarehouse, t.toWarehouse, t.memo],
        // The filter's warehouse field matches a transfer's ORIGIN — see the
        // drawer's "From warehouse" label.
        warehouse: t.fromWarehouse,
        dateSort: t.date
      }));
    case "price_rules":
      return getPriceRules().map((r) => {
        // Derived from the rule's own product/contact lists rather than stored
        // beside them — an empty list means "All products", which is a scope,
        // not an absence. See priceRuleScopeSummary.
        const products = priceRuleScopeSummary(r.products, "product");
        const contacts = priceRuleScopeSummary(r.contacts, "contact");
        return {
          ...emptyRow(r.id),
          title: r.name,
          productContact: `${products} · ${contacts}`,
          typeLabel: PRICE_RULE_TYPE_LABEL[r.ruleType],
          searchText: [
            r.name,
            PRICE_RULE_TYPE_LABEL[r.ruleType],
            products,
            contacts,
            ...r.products,
            ...r.contacts
          ],
          ruleType: r.ruleType,
          status: r.isActive ? "active" : "inactive"
        };
      });
  }
}

// ---- Quick filters ------------------------------------------------------
//
// Per-tab toolbar. Each tab gets only the controls that act on its own list —
// the set the source gives it — rather than a fixed bar that would be inert on
// most of the eight.

interface ToolbarSpec {
  hasColumnPicker?: boolean;
  hasManageCategory?: boolean;
  /** "menu" for the product list's three imports; a kind for a single import. */
  importKind?: "menu" | ProductImportKind;
  /** The product list's two-entry Export menu. */
  hasExportMenu?: boolean;
  /** A plain Export of the rows in front of the user. */
  hasExport?: boolean;
  hasInactiveToggle?: boolean;
  hasFilter?: boolean;
  /** Price rules has no other control, so its search takes the room. */
  isWideSearch?: boolean;
}

const TOOLBAR_BY_TAB: Record<ProductsTabKey, ToolbarSpec> = {
  products_and_services: {
    hasColumnPicker: true,
    hasManageCategory: true,
    importKind: "menu",
    hasExportMenu: true,
    hasFilter: true
  },
  masters: { hasColumnPicker: true },
  stock_adjustments: { hasExport: true, hasFilter: true },
  product_index_approval: { hasFilter: true },
  warehouses: { hasInactiveToggle: true, importKind: "warehouse-create" },
  warehouse_transfers: { importKind: "transfer-create" },
  warehouse_transfers_approval: { importKind: "transfer-create" },
  price_rules: { isWideSearch: true }
};

// ---- Page state ---------------------------------------------------------

const activeSegmentIndex = ref(0);
const activeSegmentKey = computed<SegmentKey>(() => SEGMENTS[activeSegmentIndex.value]!.key);
const tabs = computed(() => TABS_BY_SEGMENT[activeSegmentKey.value]);

const activeTabIndex = ref(0);

/**
 * Open on a named tab: `/products?tab=masters`, `/products?segment=price_rules`.
 *
 * Every detail page under this module breadcrumbs back to the list it came
 * from, and for six of the eight that list is a TAB, not a route. Without
 * this, "Back to Product with variant list" would land on Product list — a
 * breadcrumb that names one place and goes to another.
 *
 * Applied **after mount**, not during setup: MpTabs settles on its own index
 * when it mounts and emits it back through `v-model`, which overwrites
 * anything set beforehand — the tab silently stayed on the first one. Read
 * once and only once, too: the tabs are local state afterwards, so re-syncing
 * them to the URL on every change would fight the user's own clicks.
 */
const route = useRoute();
onMounted(async () => {
  const wanted = String(route.query.tab ?? route.query.segment ?? "");
  if (!wanted) return;
  const segmentIndex = SEGMENTS.findIndex(
    (segment) =>
      segment.key === wanted || TABS_BY_SEGMENT[segment.key].some((tab) => tab.key === wanted)
  );
  if (segmentIndex < 0) return;
  activeSegmentIndex.value = segmentIndex;
  const tabIndex = TABS_BY_SEGMENT[SEGMENTS[segmentIndex]!.key].findIndex(
    (tab) => tab.key === wanted
  );
  if (tabIndex <= 0) return;
  // The segment change above swaps the tab row and resets its index, so wait
  // for that to land before picking a tab inside the new row.
  await nextTick();
  activeTabIndex.value = tabIndex;
});
const activeTabKey = computed<ProductsTabKey>(
  () => tabs.value[activeTabIndex.value]?.key ?? tabs.value[0]!.key
);

/**
 * Columns the picker starts with unticked.
 *
 * Average price is the source's default-off column and the reason the picker
 * exists at all: it is the twelfth column on an already-scrolling table, and
 * only a stock controller reconciling inventory value wants it.
 */
const DEFAULT_HIDDEN_COLUMNS: ColumnKey[] = ["avgPrice"];

// Held across tabs, and only ever populated with keys of a tab that has a
// picker. An array rather than a Set: it is read in the template on every
// render, and a Set mutated in place wouldn't re-trigger it.
const hiddenColumns = ref<ColumnKey[]>([...DEFAULT_HIDDEN_COLUMNS]);

function toggleColumn(key: ColumnKey, isChecked: boolean) {
  hiddenColumns.value = isChecked
    ? hiddenColumns.value.filter((hidden) => hidden !== key)
    : [...hiddenColumns.value, key];
}

const columns = computed(() =>
  COLUMNS_BY_TAB[activeTabKey.value].filter((column) => !hiddenColumns.value.includes(column.key))
);
const toolbar = computed(() => TOOLBAR_BY_TAB[activeTabKey.value]);

// The strip counts products and warehouses, both of which the first two
// segments are about. Price rules have nothing to do with stock levels, so the
// strip would be describing an unrelated dataset there.
const showSummary = computed(() => activeSegmentKey.value !== "price_rules");

const isApprovalTab = computed(
  () =>
    activeTabKey.value === "product_index_approval" ||
    activeTabKey.value === "warehouse_transfers_approval"
);
// Approval queues are acted on one row at a time (Approve), so they carry no
// checkbox column — the same call the Purchase list's "Need approval" tab makes.
// The variant tab has none either: its first column is the expander, and its
// rows are group headers rather than records to act on in bulk.
const isSelectable = computed(() => !isApprovalTab.value && !isGroupedTab.value);

/** The variant tab: master rows that expand to the variants underneath them. */
const isGroupedTab = computed(() => activeTabKey.value === "masters");

// Which masters are open. Reset on tab change with everything else scoped to
// one list, so switching away and back doesn't restore a stale expansion.
const expandedIds = ref<number[]>([]);

function isExpanded(id: number) {
  return expandedIds.value.includes(id);
}

async function toggleExpanded(id: number) {
  const opening = !isExpanded(id);
  expandedIds.value = opening
    ? [...expandedIds.value, id]
    : expandedIds.value.filter((x) => x !== id);
  if (opening) {
    await nextTick();
    capExpansionHeight(id);
  }
}

/**
 * Clip the group after MAX_EXPANDED_ROWS and let the rest scroll.
 *
 * The cut has to land exactly on a row boundary, and a variant row's height
 * isn't knowable up front — it depends on whether the name wraps — so the
 * height is measured from the rendered rows rather than guessed at in css().
 * Written to `style.maxHeight` for the same reason the <colgroup> widths are
 * inline: it is a value only layout can supply.
 */
function capExpansionHeight(id: number) {
  const scroller = document.querySelector<HTMLElement>(`[data-variant-scroller="${id}"]`);
  if (!scroller) return;
  const rows = scroller.querySelectorAll<HTMLElement>("tbody tr");
  if (rows.length <= MAX_EXPANDED_ROWS) {
    scroller.style.maxHeight = "";
    return;
  }
  const last = rows[MAX_EXPANDED_ROWS - 1]!;
  scroller.style.maxHeight = `${last.offsetTop + last.offsetHeight}px`;
}

/**
 * One row per variant of a master, in the same shape the table's cells read.
 *
 * Built here rather than folded into `rowsForTab` because variants are not
 * rows of this list: they never paginate, never sort and never match the
 * filter on their own — they exist only underneath the master that owns them.
 */
function variantRowsFor(masterId: number): Row[] {
  const master = getProductMasters().find((m) => m.id === masterId);
  if (!master) return [];
  return master.variants.map((variant) => ({
    ...emptyRow(variant.id),
    title: variant.name,
    badges: ["variant" as RowBadge, ...(master.isArchived ? (["archived"] as RowBadge[]) : [])],
    code: variant.code,
    barcode: variant.barcode,
    quantity: variant.quantity,
    quantityAvailable: variant.quantityAvailable,
    buffer: variant.buffer,
    unit: master.unit,
    buyPrice: variant.buyPrice,
    sellPrice: variant.sellPrice,
    category: master.category
  }));
}
const canArchive = computed(
  () => activeTabKey.value === "products_and_services" || activeTabKey.value === "masters"
);

const isCategoryModalOpen = ref(false);
const isImportModalOpen = ref(false);
const isExportModalOpen = ref(false);
const importKind = ref<ProductImportKind>("single-create");

function openImport(kind: ProductImportKind) {
  importKind.value = kind;
  isImportModalOpen.value = true;
}

/**
 * The bundle export has no column picker: a bundle's own fields are few, and
 * the rows are its components, so there is nothing to choose. One row per
 * component, with the bundle's columns repeated — the flat-file shape for a
 * nested record.
 */
function exportBundles() {
  const rows = getProducts()
    .filter((product) => product.isBundle)
    .flatMap((bundle) =>
      bundle.bundleItems.map((item) => [
        bundle.name,
        bundle.code,
        bundle.category,
        formatAmount(bundle.sellPrice),
        item.name,
        formatQuantity(item.quantity)
      ])
    );
  downloadCsv(EXPORT_FILE_NAME.bundles, toCsv(BUNDLE_EXPORT_COLUMNS, rows));
}

/**
 * Export the list the user is looking at, using its own visible columns.
 *
 * There is nothing to choose here — a transaction list has one shape — so this
 * tab's Export is a button, not a modal. It writes the filtered, sorted rows
 * rather than the whole table: the file should be the list on screen.
 */
function exportCurrentTab() {
  const visible = columns.value;
  const rows = filteredRows.value.map((row) =>
    visible.map((column) => (column.link ? row.title : cellText(row, column.key)))
  );
  downloadCsv(
    `${activeTabKey.value.replace(/_/g, "-")}.csv`,
    toCsv(
      visible.map((column) => column.label),
      rows
    )
  );
}

/**
 * The warehouse list's own switch, in place of a status filter.
 *
 * A deactivated warehouse is hidden rather than filtered out — it still holds
 * stock and still appears on old movements — so the question the list asks is
 * "show them too?" rather than "which status?".
 */
const showInactiveWarehouses = ref(false);

function onToggleInactiveWarehouses(isChecked: boolean) {
  showInactiveWarehouses.value = isChecked;
  page.value = 1;
  selected.value = [];
}

const isFilterDrawerOpen = ref(false);
// One object, not loose refs: the drawer stages a copy of exactly this shape
// and Apply swaps it in. The search box edits its `key` field directly — a
// shortcut into the same filter, not a second one layered on top.
const filter = ref<ProductsFilter>(emptyProductsFilter());
const search = computed({
  get: () => filter.value.key,
  set: (value: string) => (filter.value.key = value)
});
const hasActiveFilter = computed(() => isFilterActive(filter.value));
const searchTerm = computed(() => (search.value ?? "").trim());

const page = ref(1);
const perPage = ref(10);
const selected = ref<number[]>([]);
const sortKey = ref<ColumnKey | null>(null);
const sortDir = ref<"asc" | "desc">("asc");
const isLoading = ref(false);
const showDeleteModal = ref(false);
const showApproveModal = ref(false);
const pendingIds = ref<number[]>([]);
// The shared dataset (app/data/products.ts) is a plain (non-reactive) set of
// arrays — bumping this after a mutation is what makes filteredRows, the
// summary and the tab counts re-read it.
const refreshTick = ref(0);

const searchPlaceholder = computed(() => {
  switch (activeTabKey.value) {
    case "products_and_services":
      return "Search product";
    case "masters":
      // "Search product", not "Search product with variant": the tab already
      // says which list this is, and the source uses the shorter one.
      return "Search product";
    case "warehouses":
      return "Search warehouse";
    case "price_rules":
      // The source's own placeholder. This tab has no other control, so the
      // field is wide and unlabelled by anything around it.
      return "Search...";
    default:
      return "Search transaction";
  }
});

const tableContainerRef = ref<{ $el?: HTMLElement } | HTMLElement | null>(null);

/** Reset everything that is scoped to one list. Called on both tab and segment
 *  changes: the two rows of tabs both swap the entity underneath. */
function resetForTabChange() {
  page.value = 1;
  selected.value = [];
  sortKey.value = null;
  expandedIds.value = [];
  // The tabs hold different entities, so a filter carried across could be
  // narrowing by a control the new tab doesn't even show.
  filter.value = emptyProductsFilter();
  // MpTableContainer is the horizontal-scroll element and it is NOT remounted
  // on tab change, so a scroll position left over from a wider table otherwise
  // carries straight into the new one — the first column can open scrolled
  // halfway out of view.
  nextTick(() => {
    const container: unknown = tableContainerRef.value;
    const el =
      container instanceof HTMLElement
        ? container
        : ((container as { $el?: HTMLElement } | null)?.$el ?? null);
    el?.scrollTo({ left: 0 });
  });
}

watch(activeTabIndex, resetForTabChange);
watch(activeSegmentIndex, () => {
  // Each segment starts on its own first tab. Assigning 0 only fires the
  // watcher above when it was non-zero, so reset explicitly here too.
  activeTabIndex.value = 0;
  resetForTabChange();
});

function approvalCountFor(tab: ProductsTabKey): number {
  void refreshTick.value;
  if (tab === "product_index_approval") return getProductApprovals().length;
  if (tab === "warehouse_transfers_approval") return getWarehouseApprovals().length;
  return 0;
}

function sortValue(row: Row, key: ColumnKey): string | number {
  switch (key) {
    case "productName":
    case "number":
    case "warehouseName":
    case "ruleName":
      return row.title;
    case "productCode":
    case "warehouseCode":
      return row.code;
    case "productCategory":
      return row.category;
    case "adjustmentCategory":
      return row.adjustmentCategory;
    case "transactionType":
    case "ruleType":
      return row.typeLabel;
    case "date":
      return row.dateSort;
    case "warehouse":
      return row.warehouse;
    case "tags":
      return row.tags.join(", ");
    case "quantity":
    case "quantityAvailable":
    case "buffer":
      // Untracked stock sorts as -1 so the "—" rows group together at one end
      // rather than mixing in with the genuine zeros.
      return row[key] ?? -1;
    default:
      return (row as unknown as Record<string, string | number>)[key] ?? "";
  }
}

/** A stock figure that isn't tracked reads "—", never "0" — a zero here would
 *  say "out of stock" when the truth is "not counted". */
function stockText(value: number | null): string {
  return value === null ? "—" : formatQuantity(value);
}

function cellText(row: Row, key: ColumnKey): string {
  switch (key) {
    case "productCode":
    case "warehouseCode":
      return row.code;
    case "barcode":
      return row.barcode || "—";
    case "productCategory":
      return row.category;
    case "quantity":
      return stockText(row.quantity);
    case "quantityAvailable":
      return stockText(row.quantityAvailable);
    case "buffer":
      return stockText(row.buffer);
    case "unit":
      return row.unit;
    case "variantCount":
      return formatCount(row.variantCount);
    case "lastBuyPrice":
      return formatAmount(row.lastBuyPrice);
    case "avgPrice":
      return formatAmount(row.avgPrice);
    case "buyPrice":
      return formatAmount(row.buyPrice);
    case "sellPrice":
      return formatAmount(row.sellPrice);
    case "date":
      return formatDisplayDate(row.dateSort);
    case "transactionType":
    case "ruleType":
      return row.typeLabel;
    case "adjustmentCategory":
      return row.adjustmentCategory;
    case "account":
      return row.account;
    case "warehouse":
      return row.warehouse;
    case "address":
      return row.address;
    case "pic":
      return row.pic;
    case "description":
      return row.description || "—";
    case "fromWarehouse":
      return row.fromWarehouse;
    case "toWarehouse":
      return row.toWarehouse;
    case "memo":
      return row.memo || "—";
    case "productContact":
      return row.productContact;
    default:
      return "";
  }
}

const filteredRows = computed(() => {
  void refreshTick.value;
  let result = rowsForTab(activeTabKey.value).filter((row) =>
    matchesProductsFilter(row, filter.value)
  );

  if (sortKey.value) {
    const key = sortKey.value;
    const dir = sortDir.value === "asc" ? 1 : -1;
    result = [...result].sort((a, b) => {
      const av = sortValue(a, key);
      const bv = sortValue(b, key);
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }
  return result;
});

const summary = computed(() => {
  void refreshTick.value;
  return getProductSummary();
});

const pageCount = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / perPage.value)));
const pageOptions = computed(() =>
  Array.from({ length: pageCount.value }, (_, i) => ({ label: String(i + 1), value: i + 1 }))
);
const pagedRows = computed(() => {
  const start = (page.value - 1) * perPage.value;
  return filteredRows.value.slice(start, start + perPage.value);
});
const rangeStart = computed(() =>
  filteredRows.value.length === 0 ? 0 : (page.value - 1) * perPage.value + 1
);
const rangeEnd = computed(() => Math.min(page.value * perPage.value, filteredRows.value.length));

watch([page, pageCount], () => {
  if (page.value < 1) page.value = 1;
  else if (page.value > pageCount.value) page.value = pageCount.value;
});

const allOnPageSelected = computed(
  () => pagedRows.value.length > 0 && pagedRows.value.every((r) => selected.value.includes(r.id))
);
const someOnPageSelected = computed(() =>
  pagedRows.value.some((r) => selected.value.includes(r.id))
);

function toggleRow(id: number) {
  selected.value = selected.value.includes(id)
    ? selected.value.filter((x) => x !== id)
    : [...selected.value, id];
}
function toggleAllOnPage() {
  const ids = pagedRows.value.map((r) => r.id);
  selected.value = allOnPageSelected.value
    ? selected.value.filter((x) => !ids.includes(x))
    : [...new Set([...selected.value, ...ids])];
}
function toggleSort(key: ColumnKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
  } else {
    sortKey.value = key;
    sortDir.value = "asc";
  }
  page.value = 1;
}
function sortIconFor(key: ColumnKey) {
  if (sortKey.value !== key) return "sort-default";
  return sortDir.value === "asc" ? "sort-ascending" : "sort-descending";
}
function setPerPage(n: number) {
  perPage.value = n;
  page.value = 1;
}
function onJumpPage(val: unknown) {
  const v = val && typeof val === "object" ? (val as { value: number }).value : val;
  const n = Number(v);
  if (!Number.isNaN(n)) page.value = n;
}

/** A list that has simply never had a row is not a failed search, and must
 *  not borrow the magnifier illustration to say so. */
const emptyVariant = computed(() =>
  searchTerm.value || hasActiveFilter.value ? "not-found" : "no-data"
);

const emptyTitle = computed(() => {
  if (searchTerm.value) return `"${searchTerm.value}" not found`;
  if (hasActiveFilter.value) return "No results found";
  return "No data yet";
});
const emptyDescription = computed(() => {
  if (searchTerm.value) return "Check the keywords you entered and try your search again.";
  if (hasActiveFilter.value)
    return "No items match your filters. Try adjusting them, or clear all filters to start over.";
  return "There's nothing here yet.";
});

function resetFilters() {
  filter.value = emptyProductsFilter();
  page.value = 1;
}

function onApplyFilter(next: ProductsFilter) {
  filter.value = next;
  // Any change to the criteria can shrink the result set below the current
  // page, which would otherwise leave the user staring at an empty page 4.
  page.value = 1;
  selected.value = [];
  isFilterDrawerOpen.value = false;
}

/**
 * Where a row opens, per tab. Every tab now has one — the two approval queues
 * share their committed sibling's page, because a record waiting for approval
 * is the same record with a different decision available on it.
 */
const DETAIL_ROUTE_BY_TAB: Record<ProductsTabKey, (id: number) => string> = {
  products_and_services: (id) => `/products/detail/${id}`,
  masters: (id) => `/products/master/${id}`,
  stock_adjustments: (id) => `/products/stock-adjustment/${id}`,
  product_index_approval: (id) => `/products/stock-adjustment/${id}`,
  warehouses: (id) => `/products/warehouse/${id}`,
  warehouse_transfers: (id) => `/products/warehouse-transfer/${id}`,
  warehouse_transfers_approval: (id) => `/products/warehouse-transfer/${id}`,
  // A price rule has no read-only page in the source either — its name links
  // straight to the edit form.
  price_rules: (id) => `/products/price-rules/edit/${id}`
};

const hasDetailRoute = computed(() => Boolean(DETAIL_ROUTE_BY_TAB[activeTabKey.value]));

function onOpen(row: Row) {
  const route = DETAIL_ROUTE_BY_TAB[activeTabKey.value];
  if (route) navigateTo(route(row.id));
}

/**
 * Where each title-band Actions entry goes.
 *
 * Both stock entries open the same form — "Adjust stock" and "New stock
 * in/out" are one screen with its Adjustment type preset, which is exactly how
 * the source's two menu items behave.
 *
 * "Add new storage location" is the exception: it has no route at all. A
 * location is four fields, so it opens the same drawer the warehouse page
 * uses, with the warehouse picked inside it rather than beforehand — sending
 * the user to the warehouse list first made them find the warehouse, open it,
 * and then do the thing they had already asked for.
 */
const ACTION_ROUTES: Record<string, string> = {
  "create-product": "/products/new",
  "create-product-master": "/products/master/new",
  "create-warehouse": "/products/warehouse/new",
  "stock-count": "/products/stock-adjustment/new?type=stock_count",
  "warehouse-transfer": "/products/warehouse-transfer/new",
  "create-price-rule": "/products/price-rules/new",
  "warehouse-settings": "/products/warehouse/settings"
};

const isStorageDrawerOpen = ref(false);

function onAction(action: string) {
  if (action === "add-storage") {
    isStorageDrawerOpen.value = true;
    return;
  }
  const route = ACTION_ROUTES[action];
  if (route) navigateTo(route);
}

/** Land the user on the list the new location joined, so the result of the
 *  action is on screen rather than somewhere they have to go and look. */
function onStorageLocationCreated(location: { warehouseId: number }) {
  navigateTo(`/products/warehouse/${location.warehouseId}?tab=locations`);
}

// ---- Archive / delete / approve -----------------------------------------

function onArchive(ids: number[]) {
  if (!ids.length) return;
  archiveProducts(activeTabKey.value, ids);
  selected.value = [];
  refreshTick.value++;
}

const deleteModalTitle = computed(() => {
  const ids = pendingIds.value;
  if (ids.length === 1) {
    const record = rowsForTab(activeTabKey.value).find((r) => r.id === ids[0]);
    return `Delete ${record?.title ?? "this item"}?`;
  }
  return `Delete ${ids.length} items?`;
});

function openDeleteModal(ids: number[]) {
  if (!ids.length) return;
  pendingIds.value = ids;
  showDeleteModal.value = true;
}

function closeDeleteModal() {
  showDeleteModal.value = false;
  pendingIds.value = [];
}

function confirmDelete() {
  const ids = pendingIds.value;
  deleteProductRecords(activeTabKey.value, ids);
  selected.value = selected.value.filter((id) => !ids.includes(id));
  refreshTick.value++;
  closeDeleteModal();
}

const approveModalTitle = computed(() => {
  const record = rowsForTab(activeTabKey.value).find((r) => r.id === pendingIds.value[0]);
  return `Approve ${record?.title ?? "this transaction"}?`;
});

// Copy is the source's own, and it carries the one fact the button doesn't:
// approving moves the record to another list.
const approveModalBody = computed(() =>
  activeTabKey.value === "warehouse_transfers_approval"
    ? "The approved transaction will move to the warehouse transfer list."
    : "The approved transaction will move to the stock adjustment list."
);

function openApproveModal(ids: number[]) {
  if (!ids.length) return;
  pendingIds.value = ids;
  showApproveModal.value = true;
}

function closeApproveModal() {
  showApproveModal.value = false;
  pendingIds.value = [];
}

function confirmApprove() {
  const ids = pendingIds.value;
  if (activeTabKey.value === "warehouse_transfers_approval") approveWarehouseTransfers(ids);
  else approveProductTransactions(ids);
  refreshTick.value++;
  closeApproveModal();
}

// Per-column widths sized to the content each column actually holds, NOT an
// even split — see docs/index-page-pattern.md §9.1. Splitting the container
// width evenly makes every column as narrow as the narrowest one needs to be.
// When these don't all fit, MpTableContainer scrolls horizontally (the
// intended behaviour) instead of squeezing the columns.
const COLUMN_WIDTH: Record<ColumnKey, number> = {
  productName: 260,
  productCode: 140,
  barcode: 150,
  productCategory: 160,
  quantity: 120,
  quantityAvailable: 140,
  buffer: 150,
  unit: 90,
  variantCount: 110,
  // Money columns carry two decimals ("1.690.000,00"), so they need ~30px
  // more than a bare integer would.
  lastBuyPrice: 160,
  avgPrice: 160,
  buyPrice: 150,
  sellPrice: 150,
  date: 120,
  number: 200,
  transactionType: 170,
  adjustmentCategory: 180,
  account: 200,
  warehouse: 180,
  tags: 150,
  warehouseCode: 150,
  warehouseName: 200,
  address: 300,
  pic: 170,
  description: 240,
  status: 120,
  fromWarehouse: 180,
  toWarehouse: 180,
  memo: 260,
  ruleName: 260,
  ruleType: 210,
  productContact: 230
};
const CHECKBOX_COLUMN_WIDTH = 44;
// The Approve column — 140px ≈ the sm button plus cell padding, the same
// figure docs/patterns/TablePage.md gives the Actions column.
const ACTION_COLUMN_WIDTH = 140;

// The <colgroup>'s widths, for the active tab. Built as one array so the
// template's <col> stays a single line — the only inline style the pattern
// (and scripts/pixel-police.sh) allows is a <col> width, and it has to be on
// the `<col>`'s own line to be recognised as that. The trailing width-less
// filler <col> is written in the template, not here.
const colWidths = computed(() => [
  `${CHECKBOX_COLUMN_WIDTH}px`,
  ...columns.value.map((col) => `${COLUMN_WIDTH[col.key]}px`),
  ...(isApprovalTab.value ? [`${ACTION_COLUMN_WIDTH}px`] : [])
]);

// All css() below uses Pixel 3 token shortcuts only (token mode 2.1).
const statsGridClass = css({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 4
});
const statsCaptionClass = css({ display: "flex", justifyContent: "flex-end", mt: 2, mb: 4 });

// whiteSpace:nowrap keeps two-word labels ("Product with variant") and the
// badge label on one line — MpTab doesn't reserve enough width for its content
// by default, so without this the text wraps to 2 lines instead of the tab
// sizing to fit it.
const tabLabelClass = css({
  display: "inline-flex",
  alignItems: "center",
  gap: 2,
  whiteSpace: "nowrap"
});

// Popover section heading — the sanctioned Pixel pattern for a grouped menu
// (see the "Title" usage in the Popover docs): a caption above each list,
// not a disabled list item.
// `size="overline"` supplies the type scale; the capitals and tracking are the
// section-heading treatment the source uses, and Pixel leaves both to the
// caller (its own overline examples are written in caps).
const menuSectionClass = css({
  pt: 3,
  px: 3,
  pb: 1,
  textTransform: "uppercase",
  letterSpacing: "wider"
});
const menuDividerClass = css({ my: 1 });

const filterButtonWrapClass = css({ position: "relative", display: "inline-flex" });
const filterDotClass = css({
  position: "absolute",
  top: "-2px",
  right: "-2px",
  width: "10px",
  height: "10px",
  borderRadius: "full",
  bg: "red.400",
  borderWidth: "2px",
  borderColor: "white"
});
const filterBarClass = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 3,
  flexWrap: "wrap",
  mt: 5,
  mb: 5
});
const filterLeftClass = css({ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap" });
const filterRightClass = css({ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" });

// The search field hosts its own clear (×) — the library's native is-clearable
// renders an svg whose click emits `undefined`. Hidden at rest, faded in on
// hover/focus, and only rendered when there is a keyword.
const searchGroupClass = css({
  position: "relative",
  width: "280px",
  "& [data-search-clear]": { opacity: 0, transition: "opacity 0.12s ease" },
  "&:hover [data-search-clear], &:focus-within [data-search-clear]": { opacity: 1 }
});
const searchClearClass = css({
  position: "absolute",
  top: "50%",
  right: "3",
  transform: "translateY(-50%)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "0",
  bg: "transparent",
  p: 0,
  cursor: "pointer",
  lineHeight: "0"
});
// Price rules carries nothing but a search box, so the field takes the room
// the other tabs give to their file actions and Filter.
const wideSearchClass = css({ width: "360px!" });
// The column picker's body. Padded like MpPopoverList (which this isn't — its
// rows are checkboxes, not menu items that dismiss on click).
const columnMenuClass = css({
  display: "flex",
  flexDirection: "column",
  gap: 3,
  px: 4,
  py: 3,
  minWidth: "220px"
});

// Pure-CSS horizontal scroll affordance. The two `local` white gradients ride
// with the content and scroll away; the two `scroll` shadows stay pinned to the
// container's edges — so a table that overflows says so, with no
// ResizeObserver and no reactive state. Without it the last column is simply
// clipped and nothing indicates there is more to the right.
const scrollShadowClass = css({
  backgroundImage:
    "linear-gradient(to right, var(--mp-colors-white) 30%, transparent), linear-gradient(to left, var(--mp-colors-white) 30%, transparent), linear-gradient(to right, rgba(29,31,36,0.16), transparent), linear-gradient(to left, rgba(29,31,36,0.16), transparent)",
  backgroundPosition: "left center, right center, left center, right center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "36px 100%, 36px 100%, 12px 100%, 12px 100%",
  backgroundAttachment: "local, local, scroll, scroll"
});
// `width: 100%` is doing more work than it looks. With table-layout: fixed the
// <colgroup> widths are authoritative, so the table lays out at whichever is
// larger: the container (a wide viewport — the width-less filler <col> soaks
// up the surplus) or the sum of the column widths (a narrow one — the table
// overflows and MpTableContainer scrolls). Measured at 1714px in a 1015px
// container, and 2400px in a 2400px one.
//
// Two nearby variants do NOT work, so don't "simplify" to either:
//   - `width: auto` silently opts the table back into the AUTOMATIC layout
//     algorithm (CSS 2.1 §17.5.2), which treats the <colgroup> as a hint and
//     squeezes the columns — Product name came out at 142px instead of 260px.
//   - the extra `min-width: <sum>px` the Purchase list carries is redundant
//     here, and it can only be an inline style (the sum changes per tab, and
//     Panda extracts css() statically).
const tableFixedClass = css({ tableLayout: "fixed", width: "100%" });
const tableHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
// Figure columns are LEFT-aligned, like every other column — the same call the
// Purchase list made. Right-aligning them looks misaligned rather than tidy:
// the sortable header puts its sort icon after the label, so a right-aligned
// label stops ~24px short of where the right-aligned figures end, and no two
// edges line up.
const numCellClass = css({ textAlign: "left" });
const checkboxCellClass = css({ width: "44px", pl: "3!", pr: "0!" });

// MpTableCell defaults to white-space:nowrap + overflow:visible, so long text
// (addresses, memos) spills sideways into the neighbouring cell. Wrap it inside
// the cell instead — never clip: an ellipsis mid-way through a transaction
// number is unreadable, and these columns are sized (COLUMN_WIDTH) to fit their
// content in one line anyway, so wrapping only kicks in for the outliers.
//
// The `!` overrides matter: MpTextlink ships its own display:inline-flex +
// white-space:nowrap, which sizes to content and centres it. `display:flex!` +
// justifyContent re-anchor the text to the cell's edge, and `width:full!` makes
// it fill the column rather than hug its own content.
const wrapCellBase = {
  display: "flex!",
  width: "full!",
  minWidth: "0!",
  whiteSpace: "normal!",
  wordBreak: "break-word",
  textAlign: "left!",
  justifyContent: "flex-start!"
} as const;
const wrapCellClass = css(wrapCellBase);
// MpTextlink's recipe gives its <button> 2px of inline padding, so its glyphs
// sit 2px right of the plain-text siblings above and below it — a stagger
// repeated down every row. Cancelled with a negative margin rather than by
// zeroing the padding, because the recipe declares that padding `!important`
// and unlayered, which outranks both a Panda `pl:"0!"` utility and an inline
// style (both silently do nothing). See docs/patterns/TablePage.md.
const linkCellClass = css({ ...wrapCellBase, ml: "-2px", mr: "-2px" });
const badgeRowClass = css({ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 });

// ---- The variant tab's expanded group -----------------------------------

/** Five variant rows, then the group scrolls — the point where a group stops
 *  being something you can take in at a glance and starts pushing the next
 *  master off screen. The pixel height is measured, not assumed: see
 *  `capExpansionHeight`. */
const MAX_EXPANDED_ROWS = 5;

// The cell is only a container for the scroller: no padding, so the nested
// table's own cell padding is the only padding, and its rows line up with the
// outer table's.
const expansionCellClass = css({ p: "0!", bg: "gray.25" });
const expansionScrollClass = css({ overflowY: "auto" });
// The accent down the left of the group, drawn on the cell that sits under the
// expander so it reads as one block rather than a run of loose rows.
const variantAccentClass = css({ boxShadow: "inset 3px 0 0 0 var(--mp-colors-blue-400)" });

const sortHeaderClass = css({
  display: "flex",
  alignItems: "center",
  gap: 1,
  border: "0",
  bg: "transparent",
  p: 0,
  cursor: "pointer",
  color: "inherit",
  font: "inherit",
  width: "full"
});
const headerLabelClass = css({
  minWidth: "0",
  whiteSpace: "nowrap",
  textAlign: "left"
});

const bulkBarClass = css({ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap" });
// Matches the default header row's height exactly (py:16 + 20px label = 52px;
// the sm button is 30px, so 11 + 30 + 11 = 52) so the 1px bottom border stays
// on the same sub-pixel line and the body doesn't jump.
const bulkCellClass = css({ py: "11px!" });

const skeletonBarClass = css({ display: "block", height: "4", rounded: "sm" });
// Sized to MpCheckbox's own 18px control rather than stretching full width —
// a full-width bar in a 44px cell would render wider than the checkbox it
// stands in for.
const skeletonCheckboxClass = css({
  display: "block",
  width: "18px",
  height: "18px",
  rounded: "sm"
});

const paginationClass = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: 3,
  py: 3
});
const pagerLeftClass = css({ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" });
const pagerRightClass = css({ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" });
const pageJumpClass = css({ width: "100px" });
const pageJumpInnerClass = css({ h: "7.5" });

const modalTitleClass = css({ fontSize: "lg" });
const modalFooterClass = css({ display: "flex", justifyContent: "flex-end", gap: 2 });
</script>
