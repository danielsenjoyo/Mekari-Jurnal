<template>
  <MpTableContainer :class="scrollShadowClass">
    <MpTable is-hoverable :class="tableFixedClass">
      <colgroup>
        <col v-for="col in columns" :key="col.key" :style="{ width: `${col.width}px` }" />
      </colgroup>

      <MpTableHead is-fixed :class="tableHeadClass">
        <MpTableRow>
          <MpTableCell
            v-for="col in columns"
            :key="col.key"
            as="th"
            :class="isRightAligned(col) ? numCellClass : undefined"
          >
            <button
              v-if="sortKey !== undefined"
              type="button"
              :class="sortHeaderClass"
              @click="$emit('sort', col.key)"
            >
              <span>{{ col.label }}</span>
              <MpIcon :name="sortIconFor(col.key)" size="sm" color="gray.400" />
            </button>
            <template v-else>{{ col.label }}</template>
          </MpTableCell>
        </MpTableRow>
      </MpTableHead>

      <MpTableBody v-if="isLoading">
        <MpTableRow v-for="n in 5" :key="`skeleton-${n}`">
          <MpTableCell v-for="col in columns" :key="col.key" as="td">
            <MpSkeleton is-loading><span :class="skeletonBarClass" /></MpSkeleton>
          </MpTableCell>
        </MpTableRow>
      </MpTableBody>

      <MpTableBody v-else>
        <MpTableRow v-for="(row, index) in rows" :key="rowKey(row, index)">
          <MpTableCell
            v-for="col in columns"
            :key="col.key"
            as="td"
            :class="isRightAligned(col) ? numCellClass : undefined"
          >
            <!-- A page overrides only the cells that aren't plain text —
                 links, badges, tag chips — and lets the rest fall through. -->
            <slot name="cell" :row="row" :col="col" :value="cellValue(row, col)">
              {{ cellValue(row, col) }}
            </slot>
          </MpTableCell>
        </MpTableRow>

        <!-- TOTAL row. Production renders it only on the last page, which hides
             it entirely unless you navigate there; this one is always present
             and sums every filtered row, not just the page — which is what the
             number is actually for. -->
        <MpTableRow v-if="totalRows" :class="totalRowClass">
          <MpTableCell
            v-for="(col, index) in columns"
            :key="col.key"
            as="td"
            :class="isRightAligned(col) ? numCellClass : undefined"
          >
            <MpText v-if="index === 0" weight="semiBold" color="dark">TOTAL</MpText>
            <MpText v-else-if="isTotalled(col)" weight="semiBold" color="dark">
              {{ totalText(col) }}
            </MpText>
          </MpTableCell>
        </MpTableRow>
      </MpTableBody>
    </MpTable>
  </MpTableContainer>
</template>

<script setup lang="ts" generic="Row extends object">
import {
  css,
  MpIcon,
  MpSkeleton,
  MpTable,
  MpTableBody,
  MpTableCell,
  MpTableContainer,
  MpTableHead,
  MpTableRow,
  MpText
} from "@mekari/pixel3";
import { isRightAligned, isTotalled, sumColumn, type ReportColumn } from "~/data/report-column";
import { formatAmount, formatDisplayDate } from "~/data/purchase-transactions";

/**
 * The report table: fixed layout, sticky header, optional sortable headers, a
 * skeleton state, and a TOTAL footer row. See
 * `docs/patterns/reports-page-format.md`.
 *
 * No checkboxes, no bulk bar, no pinned Actions column — a report row is not
 * an actionable record, which is the main way this differs from
 * `docs/patterns/TablePage.md`.
 */
/** Quantities and counts group thousands but carry no decimals — the same
 *  Indonesian convention as `formatAmount`, minus the money part. */
const NUMBER_FORMAT = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });
/** Percentages always show their one decimal, so a column of them reads as a
 *  column — `18,0` under `19,5`, not `18`. */
const PERCENT_FORMAT = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
});

const props = defineProps<{
  columns: ReportColumn[];
  /** The current page's rows. */
  rows: readonly Row[];
  /**
   * Every filtered row, for the TOTAL line — deliberately not `rows`, so the
   * totals describe the report rather than the page you happen to be on. Omit
   * to render no TOTAL row.
   */
  totalRows?: readonly Row[];
  isLoading?: boolean;
  /** Omit to render plain, unsortable headers. */
  sortKey?: string;
  sortDir?: "asc" | "desc";
}>();

defineEmits<{ sort: [key: string] }>();

/** Rows are read by column key, which is a string — so indexing needs the
 *  widened view even though the generic keeps the *slot* properly typed for
 *  the page supplying the rows. */
function fields(row: Row): Record<string, unknown> {
  return row as Record<string, unknown>;
}

function rowKey(row: Row, index: number): string | number {
  const id = fields(row).id;
  return typeof id === "string" || typeof id === "number" ? id : index;
}

/** The four cases every report shares — money, a plain number, a date, text —
 *  with an em dash standing in for anything empty. */
function cellValue(row: Row, col: ReportColumn): string {
  const value = fields(row)[col.key];
  if (col.format === "money") return formatAmount(Number(value ?? 0));
  if (col.format === "number") return NUMBER_FORMAT.format(Number(value ?? 0));
  if (col.format === "percent") return PERCENT_FORMAT.format(Number(value ?? 0));
  if (col.format === "date") return formatDisplayDate(String(value ?? ""));
  return String(value ?? "") || "—";
}

/** A totalled column is summed in its own format, so a quantity column adds up
 *  as a count rather than being dressed as rupiah. */
function totalText(col: ReportColumn): string {
  const sum = sumColumn(props.totalRows ?? [], col.key);
  return col.format === "money" ? formatAmount(sum) : NUMBER_FORMAT.format(sum);
}

function sortIconFor(key: string) {
  if (props.sortKey !== key) return "sort-default" as const;
  return props.sortDir === "asc" ? ("sort-ascending" as const) : ("sort-descending" as const);
}

// `width: max-content` makes the table exactly as wide as its <colgroup>
// widths add up to, so the container scrolls instead of squeezing columns —
// without an inline style, which a variable column set would otherwise force
// (a css() value has to be statically extractable). `minWidth: full` keeps a
// narrow column set filling the stage rather than stopping short of it.
const tableFixedClass = css({ tableLayout: "fixed", width: "max-content", minWidth: "full" });
// The library draws the sticky header's bottom border as a 2px box-shadow on
// <thead>; override it to 1px.
const tableHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
const numCellClass = css({ textAlign: "right" });
const totalRowClass = css({ "& td": { borderTopWidth: "sm!", borderColor: "gray.300!" } });

const sortHeaderClass = css({
  display: "inline-flex",
  alignItems: "center",
  gap: 1,
  border: "0",
  bg: "transparent",
  p: 0,
  cursor: "pointer",
  color: "inherit",
  font: "inherit"
});

const skeletonBarClass = css({ display: "block", height: "4", rounded: "sm" });

// See docs/patterns/TablePage.md § Horizontal scroll affordance — the two
// `local` white gradients ride with the content, the two `scroll` shadows stay
// pinned, so a shadow shows on whichever side still has content.
const scrollShadowClass = css({
  backgroundImage:
    "linear-gradient(to right, var(--mp-colors-white) 30%, transparent), linear-gradient(to left, var(--mp-colors-white) 30%, transparent), linear-gradient(to right, rgba(29,31,36,0.16), transparent), linear-gradient(to left, rgba(29,31,36,0.16), transparent)",
  backgroundPosition: "left center, right center, left center, right center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "36px 100%, 36px 100%, 12px 100%, 12px 100%",
  backgroundAttachment: "local, local, scroll, scroll"
});
</script>
