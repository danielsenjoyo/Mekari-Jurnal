<template>
  <MpModal id="product-import-modal" :is-open="isOpen" size="lg" @close="emit('close')">
    <MpModalOverlay />
    <MpModalContent>
      <MpModalHeader>
        <span :class="modalTitleClass">{{ title }}</span>
        <MpModalCloseButton />
      </MpModalHeader>

      <!-- Step 1-2-3, the upload form. -->
      <template v-if="stage === 'upload'">
        <MpModalBody>
          <MpText color="gray.700">You can follow these steps to import data to Jurnal.</MpText>

          <div :class="stepsClass">
            <div :class="stepClass">
              <span :class="stepNumberClass">
                <MpText size="body" color="white">1</MpText>
              </span>
              <div :class="stepBodyClass">
                <MpText weight="semiBold" color="dark" :class="stepTitleClass">
                  Download template file
                </MpText>
                <MpText size="body-small" color="gray.700">
                  To import the data correctly, avoid using a template other than provided. This
                  template file has been aligned with Jurnal's system requirement.
                </MpText>
                <MpButton variant="secondary" left-icon="download" @click="downloadTemplate">
                  Download template
                </MpButton>
              </div>
            </div>

            <MpDivider />

            <div :class="stepClass">
              <span :class="stepNumberClass">
                <MpText size="body" color="white">2</MpText>
              </span>
              <div :class="stepBodyClass">
                <MpText weight="semiBold" color="dark" :class="stepTitleClass">
                  Fill the data in template file
                </MpText>
                <MpText size="body-small" color="gray.700">
                  Make sure the data you have filled in are aligned with filling conditions. Please
                  do not edit or change the columns to avoid data import issues.
                </MpText>

                <!-- The conditions are five lines of rules nobody reads twice,
                     so they start collapsed behind their own toggle — the same
                     call the source makes. -->
                <div v-if="areConditionsOpen" :class="conditionsClass">
                  <MpText size="label" weight="semiBold" color="dark">Filling conditions</MpText>
                  <ul :class="conditionListClass">
                    <li v-for="condition in FILLING_CONDITIONS" :key="condition">
                      <MpText size="body-small" color="gray.700">{{ condition }}</MpText>
                    </li>
                  </ul>
                  <MpText size="label" weight="semiBold" color="dark">Filling tip</MpText>
                  <MpText size="body-small" color="gray.700">
                    If you fill in numbers data with Microsoft Excel, add (`) symbol before the
                    numbers. For example: `6-6003 or `11-02-2016
                  </MpText>
                </div>

                <MpButton variant="secondary" @click="areConditionsOpen = !areConditionsOpen">
                  {{ areConditionsOpen ? "Hide filling conditions" : "Show filling conditions" }}
                </MpButton>
              </div>
            </div>

            <MpDivider />

            <div :class="stepClass">
              <span :class="stepNumberClass">
                <MpText size="body" color="white">3</MpText>
              </span>
              <div :class="stepBodyClass">
                <MpText weight="semiBold" color="dark" :class="stepTitleClass">
                  Upload template file
                </MpText>
                <MpText size="body-small" color="gray.700">
                  You can upload the previously filled template file without changing its format
                  (.csv). If it needs to be changed, please use .xls or .xlsx
                </MpText>
                <MpFormControl :is-invalid="isWrongFileType">
                  <MpUpload
                    :key="uploadKey"
                    accept=".csv, .xlsx, .xls"
                    button-text="Choose file"
                    placeholder="No file chosen"
                    :is-invalid="isWrongFileType"
                    @change="onFileChange"
                    @clear="onFileClear"
                  />
                  <MpFormErrorMessage>
                    Please choose file based on template and filling conditions
                  </MpFormErrorMessage>
                  <MpFormHelpText v-if="!fileName && !isWrongFileType">
                    {{ helperText }}
                  </MpFormHelpText>
                </MpFormControl>
              </div>
            </div>
          </div>
        </MpModalBody>

        <MpModalFooter>
          <div :class="modalFooterClass">
            <MpButton variant="secondary" @click="emit('close')">Cancel</MpButton>
            <MpButton variant="primary" :is-disabled="!canContinue" @click="continueFromUpload">
              Continue
            </MpButton>
          </div>
        </MpModalFooter>
      </template>

      <!-- An update import overwrites records that already exist, so it asks
           what to do with the blanks before it runs. A create import has
           nothing to overwrite and skips straight to the last stage. -->
      <template v-else-if="stage === 'preference'">
        <MpModalBody>
          <MpText color="gray.700" :class="preferenceIntroClass">
            Select the action for Jurnal after importing your data.
          </MpText>
          <MpCheckbox
            id="product-import-ignore-empty"
            :is-checked="ignoreEmptyData"
            @change="ignoreEmptyData = $event"
          >
            Ignore empty data (will not replace existing data in Jurnal)
          </MpCheckbox>
          <MpCheckbox
            id="product-import-add-as-new"
            :is-checked="addAsNew"
            :class="secondPreferenceClass"
            @change="addAsNew = $event"
          >
            Add as a new product if the product data are not available in Jurnal
          </MpCheckbox>
        </MpModalBody>
        <MpModalFooter>
          <div :class="modalFooterClass">
            <MpButton variant="secondary" @click="stage = 'upload'">Back</MpButton>
            <MpButton variant="primary" @click="stage = 'progress'">Continue</MpButton>
          </div>
        </MpModalFooter>
      </template>

      <!-- Nothing to wait for on screen: the source hands the file to a
           background job and tells the user where the result will show up. -->
      <template v-else>
        <MpModalBody>
          <div :class="progressClass">
            <MpText weight="semiBold" color="dark">Your file is being processed</MpText>
            <MpText size="body-small" color="gray.700" :class="progressTextClass">
              You will be informed through email and the Notifications feature
              {{ PROGRESS_SUFFIX[kind] }}
            </MpText>
          </div>
        </MpModalBody>
        <MpModalFooter>
          <div :class="modalFooterClass">
            <MpButton variant="primary" @click="emit('close')">Understood</MpButton>
          </div>
        </MpModalFooter>
      </template>
    </MpModalContent>
  </MpModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  css,
  MpButton,
  MpCheckbox,
  MpDivider,
  MpFormControl,
  MpFormErrorMessage,
  MpFormHelpText,
  MpModal,
  MpModalBody,
  MpModalCloseButton,
  MpModalContent,
  MpModalFooter,
  MpModalHeader,
  MpModalOverlay,
  MpText,
  MpUpload
} from "@mekari/pixel3";
import { downloadCsv, toCsv } from "~/utils/csv";
import {
  IMPORT_TEMPLATE_COLUMNS,
  IMPORT_TEMPLATE_FILE_NAME,
  IMPORT_TITLE,
  type ProductImportKind
} from "~/data/products-io";

// ---------------------------------------------------------------------------
// Product import. Cloned from jurnal-frontend-app
// src/components/pim/import-modal, driven by the product list's Import menu.
//
// Three numbered steps in one modal — get the template, fill it, upload it —
// then a stage that says where the result will appear. The steps are numbered
// because they are sequential and the first one produces the file the third one
// wants; a plain upload box with a template link beside it loses that order.
//
// The template download is real (built from IMPORT_TEMPLATE_COLUMNS, see
// app/utils/csv.ts). Everything after the upload is not: there is no importer
// here, so Continue advances the stages without reading the file. Not ported:
// the "see example" screenshot previewer, the emailed template-with-data
// option, and the COGS-recalculation warning banner.
// ---------------------------------------------------------------------------

const props = defineProps<{ isOpen: boolean; kind: ProductImportKind }>();
const emit = defineEmits<{ close: [] }>();

const FILLING_CONDITIONS = [
  "Date format is dd/mm/yyyy (day/month/year)",
  "Maximum rows of transactions are 1.000 rows",
  "For thousands nominal, no need for comma or period",
  "To separate decimals, use period",
  "No need to put currency symbols (Rp, $, etc.)"
];

/** Completes "…the Notifications feature <suffix>". */
const PROGRESS_SUFFIX: Record<ProductImportKind, string> = {
  "single-create": "if new products are imported.",
  "single-update": "if products are imported and updated.",
  "bundle-create": "if new product bundles are imported.",
  "warehouse-create": "if new warehouses are imported.",
  "transfer-create": "if warehouse transfers are imported."
};

type Stage = "upload" | "preference" | "progress";

const stage = ref<Stage>("upload");
const areConditionsOpen = ref(false);
const fileName = ref("");
const isWrongFileType = ref(false);
const ignoreEmptyData = ref(true);
const addAsNew = ref(false);
// Bumped to remount MpUpload, which is the only way to clear the underlying
// file input's own value when the modal is reopened.
const uploadKey = ref(0);

const title = computed(() =>
  stage.value === "preference" ? "Product data update preference" : IMPORT_TITLE[props.kind]
);

const HELPER_TEXT: Record<ProductImportKind, string> = {
  "single-create": "Accepted formats: .csv, .xls, .xlsx",
  "single-update": "Make sure the products you have updated are available in Jurnal",
  "bundle-create": "Accepted formats: .csv, .xls, .xlsx",
  "warehouse-create": "Accepted formats: .csv, .xls, .xlsx",
  "transfer-create": "Make sure the products you transfer are available in Jurnal"
};

const helperText = computed(() => HELPER_TEXT[props.kind]);

const canContinue = computed(() => Boolean(fileName.value) && !isWrongFileType.value);

// A reopened modal starts at step 1 with nothing chosen — otherwise a file
// picked for last week's bundle import is still sitting in step 3.
watch(
  () => props.isOpen,
  (open) => {
    if (!open) return;
    stage.value = "upload";
    areConditionsOpen.value = false;
    fileName.value = "";
    isWrongFileType.value = false;
    ignoreEmptyData.value = true;
    addAsNew.value = false;
    uploadKey.value++;
  }
);

const ACCEPTED_EXTENSIONS = [".csv", ".xls", ".xlsx"];

function onFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return onFileClear();
  fileName.value = file.name;
  const lower = file.name.toLowerCase();
  isWrongFileType.value = !ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function onFileClear() {
  fileName.value = "";
  isWrongFileType.value = false;
}

function downloadTemplate() {
  downloadCsv(
    IMPORT_TEMPLATE_FILE_NAME[props.kind],
    toCsv(IMPORT_TEMPLATE_COLUMNS[props.kind], [])
  );
}

function continueFromUpload() {
  stage.value = props.kind === "single-update" ? "preference" : "progress";
}

// All css() below uses Pixel 3 token shortcuts only (token mode 2.1).
const modalTitleClass = css({ fontSize: "lg" });
const modalFooterClass = css({ display: "flex", justifyContent: "flex-end", gap: 2 });
const stepsClass = css({ display: "flex", flexDirection: "column", gap: 5, mt: 6 });
const stepClass = css({ display: "flex", gap: 5 });
// The numeral badge. Fixed 36px so all three line up regardless of their text.
const stepNumberClass = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "none",
  width: "36px",
  height: "36px",
  borderRadius: "full",
  bg: "blue.400"
});
const stepBodyClass = css({ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 });
const stepTitleClass = css({ fontSize: "lg" });
const conditionsClass = css({ display: "flex", flexDirection: "column", gap: 2 });
const conditionListClass = css({ pl: 5, listStyleType: "disc" });
const preferenceIntroClass = css({ display: "block", mb: 3 });
const secondPreferenceClass = css({ mt: 2 });
const progressClass = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 2,
  py: 8,
  textAlign: "center"
});
const progressTextClass = css({ maxWidth: "420px" });
</script>
