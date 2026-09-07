<template>
  <DefaultPageContent :title="pageTitle" breadcrumb="Purchases" breadcrumb-to="/purchase">
    <!-- Title-band action is the transaction-type switcher, NOT the save/cancel
         buttons — those live at the bottom of the form (see the action bar at
         the end of this template). Mirrors the source page's page-header slot,
         which holds only the purchase_type autocomplete. -->
    <template #actions>
      <!-- Switching the type here NAVIGATES to that type's own create route,
           rather than mutating this form in place: each type has its own
           required fields, so carrying half-filled state across would produce
           a record that was never actually reviewed as that type. Only offered
           while creating — an existing record's type is fixed. -->
      <div v-if="!isEdit" :class="typeSelectClass">
        <MpSelect :model-value="props.type" is-full-width @update:model-value="onTypeSwitch">
          <option v-for="opt in TYPE_SWITCH_OPTIONS" :key="opt.type" :value="opt.type">
            {{ opt.label }}
          </option>
        </MpSelect>
      </div>
    </template>

    <!-- Zone 1 — vendor / email / shipping toggle / running total. -->
    <div :class="topGridClass">
      <MpFormControl is-required :is-invalid="submitted && !form.vendorName">
        <MpFormLabel>Vendor</MpFormLabel>
        <MpAutocomplete
          v-model="form.vendorName"
          label-prop="name"
          value-prop="name"
          :data="VENDOR_OPTIONS"
          placeholder="Select vendor"
          is-searchable
          is-full-width
        />
        <MpFormErrorMessage>Vendor is required.</MpFormErrorMessage>
      </MpFormControl>

      <MpFormControl>
        <MpFormLabel>Email</MpFormLabel>
        <MpInput v-model="emailText" placeholder="e.g. john@example.com" is-full-width />
      </MpFormControl>

      <div :class="shippingToggleClass">
        <MpCheckbox
          v-if="cap.shipping === 'toggle'"
          :is-checked="shippingInfo"
          @change="shippingInfo = !shippingInfo"
        >
          Shipping info
        </MpCheckbox>
      </div>

      <div :class="totalPreviewClass">
        <MpText size="h3" weight="semiBold" color="dark"
          >Total {{ formatCurrency(totals.total) }}</MpText
        >
      </div>
    </div>

    <MpDivider variant="dashed" :class="dividerClass" />

    <!-- Zone 2 — addresses / dates / identifiers / tag. The shipping column
         only exists while "Shipping info" is checked, same as the source. -->
    <div :class="[metaGridClass, shippingInfo ? metaGridShippingClass : '']">
      <div :class="metaColClass">
        <MpFormControl>
          <MpFormLabel>Billing address</MpFormLabel>
          <MpTextarea
            v-model="form.vendorAddress"
            placeholder="e.g. Jalan Indonesia Blok C No. 22"
            is-full-width
          />
        </MpFormControl>

        <MpFormControl v-if="shippingInfo">
          <MpFormLabel>Shipping address</MpFormLabel>
          <MpTextarea
            v-if="!sameAddress"
            v-model="form.shippingAddress"
            placeholder="e.g. Jalan Indonesia Blok C No. 22"
            is-full-width
          />
          <MpCheckbox
            :class="sameAddressClass"
            :is-checked="sameAddress"
            @change="sameAddress = !sameAddress"
          >
            Same as billing address
          </MpCheckbox>
        </MpFormControl>
      </div>

      <div :class="metaColClass">
        <MpFormControl is-required :is-invalid="submitted && !form.transactionDateIso">
          <MpFormLabel>Transaction date</MpFormLabel>
          <MpDatePicker
            v-model="form.transactionDateIso"
            value-type="string"
            :format="DATE_INPUT_FORMAT"
            placeholder="DD/MM/YYYY"
            use-portal
          />
        </MpFormControl>
        <MpFormControl v-if="cap.term">
          <MpFormLabel>{{ cap.dueDateLabel }}</MpFormLabel>
          <MpDatePicker
            v-model="form.dueDateIso"
            value-type="string"
            :format="DATE_INPUT_FORMAT"
            placeholder="DD/MM/YYYY"
            use-portal
          />
        </MpFormControl>
        <MpFormControl v-if="cap.term">
          <MpFormLabel>Term</MpFormLabel>
          <MpSelect v-model="form.term" is-full-width>
            <option value="">Select term</option>
            <option v-for="term in TERM_OPTIONS" :key="term" :value="term">{{ term }}</option>
          </MpSelect>
        </MpFormControl>
      </div>

      <div v-if="shippingInfo" :class="metaColClass">
        <MpFormControl>
          <MpFormLabel>Shipping date</MpFormLabel>
          <MpDatePicker
            v-model="form.shippingDateIso"
            value-type="string"
            :format="DATE_INPUT_FORMAT"
            placeholder="DD/MM/YYYY"
            use-portal
          />
        </MpFormControl>
        <MpFormControl>
          <MpFormLabel>Ship via</MpFormLabel>
          <MpInput v-model="form.shipVia" is-full-width />
        </MpFormControl>
        <MpFormControl>
          <MpFormLabel>Tracking no.</MpFormLabel>
          <MpInput v-model="form.trackingNo" is-full-width />
        </MpFormControl>
      </div>

      <div :class="metaColClass">
        <MpFormControl :is-disabled="isEdit">
          <MpFormLabel>
            <span :class="labelWithIconClass">
              Transaction no.
              <MpTooltip label="Set the transaction number format">
                <MpIcon name="settings" size="sm" color="gray.600" />
              </MpTooltip>
            </span>
          </MpFormLabel>
          <MpInput
            v-model="form.transactionNo"
            :placeholder="isEdit ? '' : '[Auto]'"
            is-full-width
          />
        </MpFormControl>
        <MpFormControl>
          <MpFormLabel>Vendor reference number</MpFormLabel>
          <MpInput v-model="form.referenceNo" is-full-width />
        </MpFormControl>
        <MpFormControl v-if="cap.warehouse">
          <MpFormLabel>Warehouse</MpFormLabel>
          <MpSelect v-model="form.warehouse" is-full-width is-clearable>
            <option value="">Select warehouse</option>
            <option v-for="wh in WAREHOUSE_OPTIONS" :key="wh" :value="wh">{{ wh }}</option>
          </MpSelect>
        </MpFormControl>
      </div>

      <div :class="metaColClass">
        <MpFormControl>
          <MpFormLabel>
            <span :class="labelWithIconClass">
              Tag
              <MpText v-if="form.tags.length" as="span" size="body-small" color="gray.600"
                >({{ form.tags.length }})</MpText
              >
            </span>
          </MpFormLabel>
          <MpSelect :model-value="''" is-full-width @update:model-value="addTag">
            <option value="">Choose tag</option>
            <option v-for="tag in availableTags" :key="tag" :value="tag">{{ tag }}</option>
          </MpSelect>
          <MpFlex v-if="form.tags.length" gap="2" wrap="wrap" :class="tagListClass">
            <MpTag
              v-for="tag in form.tags"
              :key="tag"
              variant="gray"
              size="sm"
              is-closable
              @close="removeTag(tag)"
            >
              {{ tag }}
            </MpTag>
          </MpFlex>
        </MpFormControl>
      </div>
    </div>

    <!-- Zone 3 — currency (left) + price-includes-tax (right). -->
    <div :class="currencyRowClass">
      <MpFormControl :class="currencyFieldClass">
        <MpFormLabel>Currency</MpFormLabel>
        <MpSelect v-model="currency" is-full-width>
          <option v-for="c in CURRENCY_OPTIONS" :key="c" :value="c">{{ c }}</option>
        </MpSelect>
      </MpFormControl>

      <MpCheckbox :is-checked="priceIncludesTax" @change="priceIncludesTax = !priceIncludesTax">
        Price includes tax
      </MpCheckbox>
    </div>

    <!-- Zone 4 — line items. Column set + widths mirror the source page's
         `heads` map (new_and_edit.ts): product 300 / description 200 /
         qty 90 / units / unit price 200 (right) / discount 120 / tax 150 /
         amount 200 (right) / a 40px remove-icon column. -->
    <MpTableContainer :class="scrollShadowClass">
      <MpTable :class="itemsTableClass">
        <!-- Proportional, not fixed px: the table fills the stage width (as in
             the reference) and only scrolls below the min-width floor set in
             itemsTableClass. Fixed px widths summing past the container pushed
             the remove-icon column out of view. -->
        <!-- Widths are tuned to the LONGEST realistic value, not the empty
             state: with an `Rp` addon eating ~40px, a money column narrower
             than ~15% clips "Rp 8.400.000" mid-number, and Product below ~16%
             truncates names like "Whiteboard Marker Set" to the point two
             products can't be told apart. Verify at your largest amount. -->
        <colgroup>
          <col :style="{ width: '17%' }" />
          <col :style="{ width: '12%' }" />
          <col :style="{ width: '6%' }" />
          <col :style="{ width: '9%' }" />
          <col :style="{ width: '17%' }" />
          <col :style="{ width: '8%' }" />
          <col :style="{ width: '12%' }" />
          <col :style="{ width: '19%' }" />
          <col :style="{ width: '40px' }" />
        </colgroup>
        <MpTableHead :class="itemsHeadClass">
          <MpTableRow>
            <MpTableCell as="th">Product</MpTableCell>
            <MpTableCell as="th">Description</MpTableCell>
            <MpTableCell as="th">Qty</MpTableCell>
            <MpTableCell as="th">Units</MpTableCell>
            <MpTableCell as="th" :class="numCellClass">Unit price</MpTableCell>
            <MpTableCell as="th">Discount</MpTableCell>
            <MpTableCell as="th">Tax</MpTableCell>
            <MpTableCell as="th" :class="numCellClass">Amount</MpTableCell>
            <MpTableCell as="th" />
          </MpTableRow>
        </MpTableHead>
        <MpTableBody>
          <MpTableRow v-for="(line, index) in form.lines" :key="line.key">
            <MpTableCell as="td" :class="lineCellClass">
              <MpSelect v-model="line.product" is-full-width @change="onLineProductChange(index)">
                <option value="">Select product</option>
                <option v-for="p in PRODUCT_OPTIONS" :key="p.name" :value="p.name">
                  {{ p.name }}
                </option>
              </MpSelect>
            </MpTableCell>
            <MpTableCell as="td" :class="lineCellClass">
              <MpTextarea
                v-model="line.description"
                placeholder="Enter description"
                rows="1"
                is-full-width
              />
            </MpTableCell>
            <MpTableCell as="td" :class="lineCellClass">
              <MpInput v-model.number="line.quantity" type="number" is-full-width />
            </MpTableCell>
            <MpTableCell as="td" :class="lineCellClass">
              <!-- Units is a select, not static text: a product can be bought
                   in any of its packaging units. It's disabled until a product
                   is chosen, since the unit list comes from the product. -->
              <MpSelect v-model="line.unit" :is-disabled="!line.product" is-full-width>
                <option value="">Select unit</option>
                <option v-for="u in unitOptionsFor(line.product)" :key="u" :value="u">
                  {{ u }}
                </option>
              </MpSelect>
            </MpTableCell>
            <MpTableCell as="td" :class="lineCellClass">
              <!-- Shows "1.250.000,00" at rest, matching the Amount beside it,
                   but strips to plain digits while focused — live-reformatting
                   with decimals is unusable ("1" → "1,00", then the next key
                   gives "1,002", which parses back to 1).
                   Formatting happens on `focusout` only — bound on the wrapper
                   because MpInput forwards neither `@blur` nor `@focusin`, but
                   `focusout` bubbles so the wrapper still catches it. Nothing
                   reformats while typing, which is what keeps editing usable:
                   `@update:model-value` only re-parses the number, it never
                   rewrites the text under the caret.
                   Must be `v-model`, never `:model-value` + an update listener
                   — MpInput is fully controlled that way and keystrokes never
                   land. type="text" because a grouped string isn't valid for
                   type="number". -->
              <div @focusout="onPriceBlur(line)">
                <MpInputGroup>
                  <MpInputLeftAddon>
                    <MpText weight="semiBold" :class="addonTextClass">Rp</MpText>
                  </MpInputLeftAddon>
                  <MpInput
                    v-model="line.unitPriceText"
                    type="text"
                    inputmode="decimal"
                    :class="numInputClass"
                    @update:model-value="onPriceInput(line)"
                  />
                </MpInputGroup>
              </div>
            </MpTableCell>
            <MpTableCell as="td" :class="lineCellClass">
              <MpInputGroup>
                <MpInputLeftAddon>
                  <MpText weight="semiBold" :class="addonTextClass">%</MpText>
                </MpInputLeftAddon>
                <MpInput
                  v-model.number="line.discountPercent"
                  type="number"
                  :class="numInputClass"
                />
              </MpInputGroup>
            </MpTableCell>
            <MpTableCell as="td" :class="lineCellClass">
              <MpSelect v-model="line.tax" is-full-width>
                <option value="">Select tax</option>
                <option v-for="t in TAX_OPTIONS" :key="t.label" :value="t.label">
                  {{ t.label }}
                </option>
              </MpSelect>
            </MpTableCell>
            <MpTableCell as="td" :class="lineCellClass">
              <!-- Amount is computed, but still rendered as a (read-only)
                   Rp-addon field so the column lines up with Unit price. -->
              <MpInputGroup>
                <MpInputLeftAddon>
                  <MpText weight="semiBold" :class="addonTextClass">Rp</MpText>
                </MpInputLeftAddon>
                <MpInput
                  :model-value="formatAmount(computeLineAmount(line))"
                  :class="numInputClass"
                  is-read-only
                />
              </MpInputGroup>
            </MpTableCell>
            <MpTableCell as="td" :class="lineCellClass">
              <MpButton
                variant="ghost"
                size="sm"
                left-icon="minus-circular"
                aria-label="Remove line"
                @click="removeLine(index)"
              />
            </MpTableCell>
          </MpTableRow>

          <!-- Trailing placeholder row: only the product picker, every other
               cell blank — picking a product here is what appends a real line
               (the source page's own "add" row, new_and_edit.vue:1023). There
               is no separate "Add line" button; this row is the affordance. -->
          <MpTableRow>
            <MpTableCell as="td" :class="lineCellClass">
              <MpSelect :model-value="''" is-full-width @update:model-value="addLineFromProduct">
                <option value="">Select product</option>
                <option v-for="p in PRODUCT_OPTIONS" :key="p.name" :value="p.name">
                  {{ p.name }}
                </option>
              </MpSelect>
            </MpTableCell>
            <MpTableCell v-for="n in 8" :key="n" as="td" :class="lineCellClass" />
          </MpTableRow>
        </MpTableBody>
      </MpTable>
    </MpTableContainer>

    <MpFormControl v-if="submitted && !hasValidLine" :is-invalid="true" :class="lineErrorClass">
      <MpFormErrorMessage
        >Add at least one line with a product, quantity, and unit price.</MpFormErrorMessage
      >
    </MpFormControl>

    <!-- Zone 5 — notes + attachments (left, 25%) / totals (right, 50%). -->
    <div :class="bottomRowClass">
      <div :class="notesColClass">
        <MpFormControl>
          <MpFormLabel>Message</MpFormLabel>
          <MpTextarea v-model="form.message" placeholder="Message" is-full-width />
        </MpFormControl>
        <MpFormControl>
          <MpFormLabel>Memo</MpFormLabel>
          <MpTextarea v-model="form.memo" placeholder="Memo" is-full-width />
        </MpFormControl>
        <MpFormControl>
          <MpFormLabel>Attachments</MpFormLabel>
          <MpUpload
            placeholder="or drag & drop file here"
            accept=".xlsx,.xls,.doc,.docx,.pdf,.jpg,.jpeg,.png,.zip"
            is-multiple
            is-full-width
            @change="onAttachmentChange"
          />
          <MpFormHelpText>
            Files can be Excel, Word, PDF, JPG, PNG, or ZIP (maximum 5 files and 10 MB per file).
          </MpFormHelpText>
        </MpFormControl>
      </div>

      <div :class="totalsColClass">
        <div :class="totalsRowClass">
          <MpText weight="semiBold" color="dark">Subtotal</MpText>
          <MpText weight="semiBold" color="dark">{{ formatCurrency(totals.subtotal) }}</MpText>
        </div>

        <div :class="totalsRowClass">
          <MpText>Discount per lines</MpText>
          <MpText>{{ formatCurrency(totals.discountPerLines) }}</MpText>
        </div>

        <div :class="totalsRowClass">
          <MpFlex align="center" gap="3">
            <MpText>Discount</MpText>
            <div :class="discountInputClass">
              <MpInputGroup>
                <MpInputLeftAddon>
                  <MpPopover use-portal is-adaptive-width>
                    <MpPopoverTrigger>
                      <button type="button" :class="discountTypeButtonClass">
                        <MpText weight="semiBold">{{
                          discountType === "percent" ? "%" : "Rp"
                        }}</MpText>
                        <MpIcon name="chevrons-down" size="sm" />
                      </button>
                    </MpPopoverTrigger>
                    <MpPopoverContent>
                      <MpPopoverList>
                        <MpPopoverListItem
                          :is-active="discountType === 'percent'"
                          @click="discountType = 'percent'"
                        >
                          %
                        </MpPopoverListItem>
                        <MpPopoverListItem
                          :is-active="discountType === 'value'"
                          @click="discountType = 'value'"
                        >
                          Rp
                        </MpPopoverListItem>
                      </MpPopoverList>
                    </MpPopoverContent>
                  </MpPopover>
                </MpInputLeftAddon>
                <MpInput v-model.number="discountValue" type="number" :class="numInputClass" />
              </MpInputGroup>
            </div>
          </MpFlex>
          <MpText>{{ formatCurrency(totals.discount) }}</MpText>
        </div>

        <div v-for="tax in totals.taxes" :key="tax.label" :class="totalsRowClass">
          <MpText>{{ tax.label }}</MpText>
          <MpText>{{ formatCurrency(tax.amount) }}</MpText>
        </div>

        <div v-if="shippingInfo" :class="totalsRowClass">
          <MpText>Shipping fee</MpText>
          <div :class="shippingFeeInputClass">
            <MpInput
              v-model.number="shippingFee"
              type="number"
              :class="numInputClass"
              is-full-width
            />
          </div>
        </div>

        <MpDivider variant="dashed" :class="totalsDividerClass" />

        <div :class="totalsRowClass">
          <MpText weight="semiBold" color="dark">Total</MpText>
          <MpText weight="semiBold" color="dark">{{ formatCurrency(totals.total) }}</MpText>
        </div>

        <div v-if="cap.withholding" :class="totalsCheckRowClass">
          <MpCheckbox :is-checked="withholdingCheck" @change="withholdingCheck = !withholdingCheck">
            Withholding
          </MpCheckbox>
          <MpFlex
            v-if="withholdingCheck"
            align="center"
            justify="space-between"
            gap="3"
            :class="totalsCheckFieldClass"
          >
            <div :class="discountInputClass">
              <MpInputGroup>
                <MpInputLeftAddon>
                  <MpText weight="semiBold" :class="addonTextClass">%</MpText>
                </MpInputLeftAddon>
                <MpInput v-model.number="withholdingPercent" type="number" :class="numInputClass" />
              </MpInputGroup>
            </div>
            <MpText>{{ formatCurrency(totals.withholding) }}</MpText>
          </MpFlex>
        </div>

        <div v-if="cap.deposit" :class="totalsCheckRowClass">
          <MpCheckbox :is-checked="depositCheck" @change="depositCheck = !depositCheck"
            >Deposit</MpCheckbox
          >
          <div v-if="depositCheck" :class="[shippingFeeInputClass, totalsCheckFieldClass]">
            <MpInput
              v-model.number="depositAmount"
              type="number"
              :class="numInputClass"
              is-full-width
            />
          </div>
        </div>

        <MpDivider variant="dashed" :class="totalsDividerClass" />

        <div :class="totalsRowClass">
          <MpText size="h3" weight="semiBold" color="dark">Balance due</MpText>
          <MpText size="h3" weight="semiBold" color="dark">{{
            formatCurrency(totals.balanceDue)
          }}</MpText>
        </div>
      </div>
    </div>

    <!-- Zone 6 — action bar, bottom right (source page's "Action section"). -->
    <!-- Commit buttons are deliberately NEVER disabled. Gating them on
         `isValid` while `submitted` (which reveals every MpFormErrorMessage)
         is only set inside onSubmit() makes the validation messages
         unreachable: a disabled button can't fire the handler that would
         explain what's missing, so the user just sees dead controls. Let the
         click through, let onSubmit() mark the form submitted, and surface
         both the per-field errors and the summary below. -->
    <div v-if="submitted && !isValid" :class="validationSummaryClass">
      <MpBanner variant="danger" is-inline>
        <MpBannerIcon />
        <MpBannerDescription>
          {{
            missingFields.length === 1
              ? "One thing is still missing:"
              : `${missingFields.length} things are still missing:`
          }}
          {{ missingFields.join(", ") }}.
        </MpBannerDescription>
      </MpBanner>
    </div>

    <div :class="actionBarClass">
      <MpButton variant="ghost" @click="onCancel">Cancel</MpButton>

      <MpButton v-if="isEdit" variant="primary" @click="onSubmit()">Save changes</MpButton>
      <!-- Create is the SECONDARY (outlined) split button and "Save & pay with
           Mekari Pay" is the primary — the source page flips Create to
           `outline` exactly when the pay button is shown
           (new_and_edit.vue:1478). Don't make both solid. -->
      <template v-else>
        <MpFlex>
          <MpButton variant="secondary" :class="createButtonClass" @click="onSubmit()">
            Create
          </MpButton>
          <MpPopover placement="bottom-end" use-portal is-adaptive-width>
            <template #default>
              <MpPopoverTrigger>
                <MpButton
                  variant="secondary"
                  :class="createCaretButtonClass"
                  right-icon="caret-down"
                  aria-label="More create options"
                />
              </MpPopoverTrigger>
              <MpPopoverContent>
                <MpPopoverList>
                  <MpPopoverListItem role="menuitem" @click="onSubmit({ andNew: true })"
                    >Create and new</MpPopoverListItem
                  >
                </MpPopoverList>
              </MpPopoverContent>
            </template>
          </MpPopover>
        </MpFlex>
        <MpButton variant="primary" @click="onSubmit()">Save &amp; pay with Mekari Pay</MpButton>
      </template>
    </div>
  </DefaultPageContent>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import {
  css,
  MpAutocomplete,
  MpBanner,
  MpBannerDescription,
  MpBannerIcon,
  MpButton,
  MpCheckbox,
  MpDatePicker,
  MpDivider,
  MpFlex,
  MpFormControl,
  MpFormErrorMessage,
  MpFormHelpText,
  MpFormLabel,
  MpIcon,
  MpInput,
  MpInputGroup,
  MpInputLeftAddon,
  MpPopover,
  MpPopoverContent,
  MpPopoverList,
  MpPopoverListItem,
  MpPopoverTrigger,
  MpSelect,
  MpTable,
  MpTableBody,
  MpTableCell,
  MpTableContainer,
  MpTableHead,
  MpTableRow,
  MpTag,
  MpText,
  MpTextarea,
  MpTooltip,
  MpUpload
} from "@mekari/pixel3";
import DefaultPageContent from "~/components/template/DefaultPageContent.vue";
import {
  CURRENCY_OPTIONS,
  PRODUCT_OPTIONS,
  TAG_OPTIONS,
  TAX_OPTIONS,
  TERM_OPTIONS,
  VENDOR_OPTIONS,
  WAREHOUSE_OPTIONS,
  computeInvoiceTotals,
  computeLineAmount,
  formatAmount,
  formatCurrency,
  parseAmount,
  TRANSACTION_TYPE_LABEL,
  TYPE_CAPABILITIES,
  createTransaction,
  emptyTransactionInput,
  getTransactionOfType,
  updateTransaction,
  type DiscountType,
  type PurchaseTransactionInput,
  type TransactionType
} from "~/data/purchase-transactions";
import { DATE_INPUT_FORMAT, toDmy, dmyToIso, isoToDmy } from "~/utils/dates";

// ---------------------------------------------------------------------------
// Layout matched to the live app's "Create Purchase Invoice" screen, with
// jurnal-frontend-app src/pages/purchases/new_and_edit.vue as the behavioural
// reference (its `heads` map in new_and_edit.ts drives the line-item columns).
//
// Zone order, top to bottom — this is what the screenshot fixes in place:
//   1. vendor / email / shipping-info checkbox / running Total (right)
//   2. dashed divider
//   3. billing address | dates+term | transaction no.+ref+warehouse | tag
//      (+ a shipping column that only appears when "Shipping info" is on)
//   4. currency (left) + "Price includes tax" (right)
//   5. line-items table
//   6. message/memo/attachments (left ~25%) + totals stack (right ~50%)
//   7. Cancel / Create▾ / Save & pay with Mekari Pay — bottom right, NOT in
//      the page title band. The title band holds the transaction-type select.
//
// Every control on this screen persists: PurchaseInvoiceInput carries the
// currency, price-includes-tax, shipping block, per-line unit/discount/tax,
// transaction discount, withholding, deposit and attachments, and the totals
// come from the data module's computeInvoiceTotals — the same function the
// create/update writers use, so the preview on screen and the saved record
// can't disagree. What is still out of scope is genuinely backend work: FX
// conversion, a real tax engine, withholding/deposit ledger accounts, Mekari
// Pay, delivery/order chaining and inventory tracking.
//
// One component serves both routes:
//   app/pages/purchase/{invoice,order,quote}/new.vue
//     → <PurchaseTransactionForm type="invoice|order|quote" />
//   app/pages/purchase/{invoice,order,quote}/edit/[id].vue
//     → <PurchaseTransactionForm type="…" :record-id="…" />
//
// Request, Delivery and Join Invoice have their own components — their field
// sets differ in kind, not just by which zones are shown. See
// docs/patterns/form-page-format.md § "One form per type, or one for several?"
// ---------------------------------------------------------------------------

const props = defineProps<{
  /** Which kind of record this form creates/edits. Drives every conditional
   *  zone below via TYPE_CAPABILITIES — see docs/patterns/form-page-format.md. */
  type: TransactionType;
  recordId?: number;
}>();

const cap = computed(() => TYPE_CAPABILITIES[props.type]);

// Every type that has a create route, in the order the "Create new purchase"
// menu lists them.
const TYPE_SWITCH_OPTIONS: { type: TransactionType; label: string }[] = [
  { type: "invoice", label: TRANSACTION_TYPE_LABEL.invoice },
  { type: "join_invoice", label: TRANSACTION_TYPE_LABEL.join_invoice },
  { type: "order", label: TRANSACTION_TYPE_LABEL.order },
  { type: "quote", label: TRANSACTION_TYPE_LABEL.quote },
  { type: "request", label: TRANSACTION_TYPE_LABEL.request },
  { type: "delivery", label: TRANSACTION_TYPE_LABEL.delivery }
];
function onTypeSwitch(next: unknown) {
  const type = String(next ?? "") as TransactionType;
  if (!type || type === props.type) return;
  navigateTo(`/purchase/${TYPE_CAPABILITIES[type].route}/new`);
}
const typeLabel = computed(() => TRANSACTION_TYPE_LABEL[props.type]);

const isEdit = computed(() => props.recordId != null);
const existing = computed(() =>
  props.recordId != null ? getTransactionOfType(props.recordId, props.type) : undefined
);

const currency = ref("IDR");
const priceIncludesTax = ref(false);
const shippingInfo = ref(false);
const sameAddress = ref(false);

const discountType = ref<DiscountType>("percent");
const discountValue = ref(0);
const shippingFee = ref(0);
const withholdingCheck = ref(false);
const withholdingPercent = ref(0);
const depositCheck = ref(false);
const depositAmount = ref(0);
const attachments = ref<string[]>([]);

// Packaging units offered in the Units select alongside the product's own.
const GENERIC_UNITS = ["pcs", "pack", "set", "roll", "box", "Gram", "ml"];

interface LineForm {
  key: number;
  product: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  /** Display mirror of unitPrice, grouped ("210.000") — see onPriceInput. */
  unitPriceText: string;
  discountPercent: number;
  tax: string;
}

let lineKeySeq = 0;
function blankLine(): LineForm {
  lineKeySeq += 1;
  return {
    key: lineKeySeq,
    product: "",
    description: "",
    quantity: 1,
    unit: "",
    unitPrice: 0,
    unitPriceText: "",
    discountPercent: 0,
    tax: ""
  };
}

// Dates are held as "DD/MM/YYYY" strings — that's MpDatePicker's `format` with
// value-type="string", and it's what the screenshot shows in the inputs. They
// convert to the dataset's "yyyy-mm-dd" form only at save time (toIsoDate).
const form = reactive({
  vendorName: "",
  vendorAddress: "",
  shippingAddress: "",
  transactionDateIso: toDmy(new Date()),
  dueDateIso: toDmy(addDays(new Date(), 30)),
  shippingDateIso: toDmy(new Date()),
  shipVia: "",
  trackingNo: "",
  term: "Net 30",
  transactionNo: "",
  referenceNo: "",
  warehouse: "",
  tags: [] as string[],
  message: "",
  memo: "",
  lines: [] as LineForm[]
});
const emailText = ref("");
const submitted = ref(false);

// --- date helpers ---------------------------------------------------------
// Local calendar components only — never Date#toISOString(), which shifts the
// day in any non-UTC timezone (see the same note in purchase-transactions.ts).
function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function loadFromExisting() {
  const inv = existing.value;
  if (!inv) return;
  form.vendorName = inv.vendorName;
  form.vendorAddress = inv.vendorAddress;
  form.transactionDateIso = isoToDmy(inv.transactionDateSort);
  form.dueDateIso = isoToDmy(inv.dueDateSort);
  form.term = inv.term;
  form.transactionNo = inv.number;
  form.referenceNo = inv.referenceNo;
  form.warehouse = inv.warehouse;
  form.tags = [...inv.tags];
  form.message = inv.message;
  form.memo = inv.memo;
  form.lines = inv.lines.map((l) => ({
    key: ++lineKeySeq,
    product: l.product,
    description: l.description,
    quantity: l.quantity,
    unit: l.unit,
    unitPrice: l.unitPrice,
    unitPriceText: formatAmount(l.unitPrice),
    discountPercent: l.discountPercent,
    tax: l.tax
  }));
  emailText.value = inv.email.join(", ");

  currency.value = inv.currency;
  priceIncludesTax.value = inv.priceIncludesTax;
  shippingInfo.value = inv.shippingInfo;
  form.shippingAddress = inv.shippingAddress;
  sameAddress.value = Boolean(inv.shippingAddress) && inv.shippingAddress === inv.vendorAddress;
  form.shippingDateIso = inv.shippingDateSort ? isoToDmy(inv.shippingDateSort) : toDmy(new Date());
  form.shipVia = inv.shipVia;
  form.trackingNo = inv.trackingNo;
  shippingFee.value = inv.shippingFee;
  discountType.value = inv.discountType;
  discountValue.value = inv.discountValue;
  withholdingCheck.value = inv.withholdingPercent > 0;
  withholdingPercent.value = inv.withholdingPercent;
  depositCheck.value = inv.depositAmount > 0;
  depositAmount.value = inv.depositAmount;
  attachments.value = [...inv.attachments];
}
watch(existing, loadFromExisting, { immediate: true });

const pageTitle = computed(() =>
  isEdit.value ? `Edit ${existing.value?.number ?? typeLabel.value}` : `Create ${typeLabel.value}`
);

// Prefill the vendor address whenever the vendor selection changes — the
// field stays editable afterward.
watch(
  () => form.vendorName,
  (name) => {
    const vendor = VENDOR_OPTIONS.find((v) => v.name === name);
    if (vendor) form.vendorAddress = vendor.address;
  }
);

const availableTags = computed(() => TAG_OPTIONS.filter((t) => !form.tags.includes(t)));
function addTag(tag: unknown) {
  const value = String(tag ?? "");
  if (value && !form.tags.includes(value)) form.tags.push(value);
}
function removeTag(tag: string) {
  form.tags = form.tags.filter((t) => t !== tag);
}

// Picking a product in the trailing placeholder row appends a real line —
// that row is the only "add" affordance, matching the source page.
function addLineFromProduct(product: unknown) {
  const name = String(product ?? "");
  if (!name) return;
  const line = blankLine();
  line.product = name;
  form.lines.push(line);
  applyProduct(form.lines.length - 1);
}
function removeLine(index: number) {
  form.lines.splice(index, 1);
}
function onLineProductChange(index: number) {
  applyProduct(index);
}
function applyProduct(index: number) {
  const line = form.lines[index];
  if (!line) return;
  const product = PRODUCT_OPTIONS.find((p) => p.name === line.product);
  if (!product) return;
  line.unitPrice = product.price;
  line.unitPriceText = formatAmount(product.price);
  line.unit = product.unit;
  if (!line.description) line.description = product.name;
}
// The unit-price cell edits `unitPriceText` and mirrors it into the numeric
// `unitPrice` the totals engine and persistence use. While focused the text is
// left exactly as typed (so the caret doesn't jump and decimals don't fight the
// user); it's formatted to "1.250.000,00" on the way out.
function onPriceInput(line: LineForm) {
  line.unitPrice = parseAmount(line.unitPriceText);
}
function onPriceBlur(line: LineForm) {
  line.unitPrice = parseAmount(line.unitPriceText);
  line.unitPriceText = line.unitPrice ? formatAmount(line.unitPrice) : "";
}

function onAttachmentChange(event: Event) {
  const files = (event.target as HTMLInputElement)?.files;
  // Names only — this prototype never uploads or stores the bytes.
  attachments.value = files ? [...files].map((f) => f.name) : [];
}

// The unit choices for a line. A product has one canonical unit; the rest are
// the generic packaging units, so the select always has somewhere to go.
function unitOptionsFor(productName: string): string[] {
  const canonical = PRODUCT_OPTIONS.find((p) => p.name === productName)?.unit;
  return [...new Set([canonical, ...GENERIC_UNITS].filter(Boolean) as string[])];
}

// Totals come from the data module — the same function createPurchaseInvoice/
// updatePurchaseInvoice call, so this preview always matches what gets saved.
const totals = computed(() =>
  computeInvoiceTotals(form.lines, {
    discountType: discountType.value,
    discountValue: discountValue.value,
    priceIncludesTax: priceIncludesTax.value,
    shippingFee: shippingInfo.value ? shippingFee.value : 0,
    withholdingPercent: withholdingCheck.value ? withholdingPercent.value : 0,
    depositAmount: depositCheck.value ? depositAmount.value : 0
  })
);

const hasValidLine = computed(() =>
  form.lines.some((l) => l.product && l.quantity > 0 && l.unitPrice > 0)
);
const isValid = computed(
  () => Boolean(form.vendorName && form.transactionDateIso) && hasValidLine.value
);

// Named so the validation summary can say what is actually outstanding rather
// than just "the form is invalid" — the summary is the only feedback a user
// gets for the missing-line case, which has no field of its own to mark red.
const missingFields = computed(() => {
  const missing: string[] = [];
  if (!form.vendorName) missing.push("Vendor");
  if (!form.transactionDateIso) missing.push("Transaction date");
  if (!hasValidLine.value)
    missing.push("at least one line with a product, quantity and unit price");
  return missing;
});

function buildInput(): PurchaseTransactionInput {
  return {
    // Start from the empty shape so a new field on PurchaseTransactionInput is
    // a compile error here only when this form is the one that must supply it.
    ...emptyTransactionInput(),
    vendorName: form.vendorName,
    vendorAddress: form.vendorAddress,
    email: emailText.value
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean),
    transactionDateIso: dmyToIso(form.transactionDateIso),
    dueDateIso: dmyToIso(form.dueDateIso),
    term: form.term,
    transactionNo: form.transactionNo,
    referenceNo: form.referenceNo,
    warehouse: form.warehouse,
    tags: form.tags,
    currency: currency.value,
    priceIncludesTax: priceIncludesTax.value,
    shippingInfo: shippingInfo.value,
    // "Same as billing address" is a UI convenience — resolve it here so the
    // saved record carries a real address rather than a flag.
    shippingAddress: sameAddress.value ? form.vendorAddress : form.shippingAddress,
    shippingDateIso: dmyToIso(form.shippingDateIso),
    shipVia: form.shipVia,
    trackingNo: form.trackingNo,
    shippingFee: shippingFee.value,
    discountType: discountType.value,
    discountValue: discountValue.value,
    withholdingPercent: withholdingCheck.value ? withholdingPercent.value : 0,
    depositAmount: depositCheck.value ? depositAmount.value : 0,
    attachments: attachments.value,
    message: form.message,
    memo: form.memo,
    lines: form.lines
      .filter((l) => l.product && l.quantity > 0 && l.unitPrice > 0)
      .map((l) => ({
        product: l.product,
        description: l.description,
        unit: l.unit,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discountPercent: l.discountPercent,
        tax: l.tax
      }))
  };
}

function resetForm() {
  form.vendorName = "";
  form.vendorAddress = "";
  form.shippingAddress = "";
  form.transactionDateIso = toDmy(new Date());
  form.dueDateIso = toDmy(addDays(new Date(), 30));
  form.shippingDateIso = toDmy(new Date());
  form.shipVia = "";
  form.trackingNo = "";
  form.term = "Net 30";
  form.transactionNo = "";
  form.referenceNo = "";
  form.warehouse = "";
  form.tags = [];
  form.message = "";
  form.memo = "";
  form.lines = [];
  emailText.value = "";
  submitted.value = false;
  currency.value = "IDR";
  priceIncludesTax.value = false;
  shippingInfo.value = false;
  sameAddress.value = false;
  shippingFee.value = 0;
  discountType.value = "percent";
  discountValue.value = 0;
  withholdingCheck.value = false;
  withholdingPercent.value = 0;
  depositCheck.value = false;
  depositAmount.value = 0;
  attachments.value = [];
}

function onSubmit(opts?: { andNew: boolean }) {
  submitted.value = true;
  if (!isValid.value) return;

  const input = buildInput();
  if (isEdit.value && props.recordId != null) {
    const updated = updateTransaction(props.recordId, input);
    navigateTo(`${detailBase.value}/${updated?.id ?? props.recordId}`);
    return;
  }

  const created = createTransaction(props.type, input);
  if (opts?.andNew) {
    resetForm();
    return;
  }
  navigateTo(`${detailBase.value}/${created.id}`);
}

const detailBase = computed(() => `/purchase/${cap.value.route}`);

function onCancel() {
  if (isEdit.value && props.recordId != null) {
    navigateTo(`${detailBase.value}/${props.recordId}`);
  } else {
    navigateTo("/purchase");
  }
}

// All css() below uses Pixel 3 token shortcuts only (token mode 2.1).
// The addon supplies no padding of its own: Pixel's "input with prefix and
// suffix" pattern (docs.mekari.design/patterns/input.html) pads the addon's
// content by 12px, without which the prefix sits flush against both edges.
const addonTextClass = css({ px: 3 });
const typeSelectClass = css({ width: "200px" });

const topGridClass = css({
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 6,
  alignItems: "start"
});
const shippingToggleClass = css({ display: "flex", alignItems: "center", height: "10", mt: 6 });
const totalPreviewClass = css({
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  height: "10",
  mt: 6
});

const dividerClass = css({ my: 6 });

const metaGridClass = css({
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 6,
  alignItems: "start"
});
const metaGridShippingClass = css({ gridTemplateColumns: "repeat(5, 1fr)!" });
const metaColClass = css({ display: "flex", flexDirection: "column", gap: 5 });
const labelWithIconClass = css({ display: "inline-flex", alignItems: "center", gap: 1 });
const sameAddressClass = css({ mt: 2 });
const tagListClass = css({ mt: 2 });

const currencyRowClass = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: 6,
  mt: 8,
  mb: 4
});
const currencyFieldClass = css({ width: "160px" });

// Floor raised from 1080px: below ~1240px the money columns start clipping
// their own values even at the proportions above. The table is allowed to
// scroll horizontally — a clipped amount is not an acceptable alternative.
// Pure-CSS horizontal scroll affordance. The two `local` white gradients sit
// on the content and scroll away with it; the two `scroll` radial shadows are
// pinned to the container's edges. The result: a soft shadow appears on
// whichever side has more content and disappears once you reach that end — so
// a table that overflows says so, with no ResizeObserver and no JS state.
// Without it the last column just gets clipped at the viewport edge and the
// user has no way to tell there is anything past it.
const scrollShadowClass = css({
  backgroundImage:
    "linear-gradient(to right, var(--mp-colors-white) 30%, transparent), linear-gradient(to left, var(--mp-colors-white) 30%, transparent), linear-gradient(to right, rgba(29,31,36,0.16), transparent), linear-gradient(to left, rgba(29,31,36,0.16), transparent)",
  backgroundPosition: "left center, right center, left center, right center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "36px 100%, 36px 100%, 12px 100%, 12px 100%",
  backgroundAttachment: "local, local, scroll, scroll"
});
const itemsTableClass = css({ tableLayout: "fixed", width: "full", minWidth: "1320px" });
const itemsHeadClass = css({ boxShadow: "0 1px 0 0 var(--mp-colors-gray-100)!" });
const lineCellClass = css({ verticalAlign: "top" });
const numCellClass = css({ textAlign: "right" });
const numInputClass = css({ textAlign: "right" });
const lineErrorClass = css({ mt: 2 });

const bottomRowClass = css({
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  flexWrap: "wrap",
  mt: 8
});
const notesColClass = css({
  display: "flex",
  flexDirection: "column",
  gap: 5,
  width: "25%",
  minWidth: "260px"
});
const totalsColClass = css({
  display: "flex",
  flexDirection: "column",
  gap: 4,
  width: "50%",
  minWidth: "320px"
});
const totalsRowClass = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 3
});
const totalsCheckRowClass = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 3
});
const totalsCheckFieldClass = css({ flex: "1 1 auto", maxWidth: "320px" });
const totalsDividerClass = css({ my: 1 });
const discountInputClass = css({ width: "150px" });
const discountTypeButtonClass = css({
  display: "inline-flex",
  alignItems: "center",
  gap: 1,
  px: 2,
  border: "0",
  bg: "transparent",
  cursor: "pointer"
});
const shippingFeeInputClass = css({ width: "200px" });

const validationSummaryClass = css({ display: "flex", justifyContent: "flex-end", mt: 8 });
const actionBarClass = css({
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: 2,
  mt: 8
});

// Split "Create" button: primary body + a narrow caret segment opening the
// "Create and new" popover, matching the source page's split action button.
// Divider between the two halves is the secondary button's own gray border,
// not a blue one — the halves are outlined, not solid.
const createButtonClass = css({ borderRightRadius: "0!" });
const createCaretButtonClass = css({ borderLeftRadius: "0!", ml: "-1px!" });
</script>
