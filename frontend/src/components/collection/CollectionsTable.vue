<script setup lang="ts">
defineProps<{
  placeholder: string
  emptyMessage: string
  idLabel: string
  altPrefix: string
}>()

const store = useCollectionsStore()
const { loadCollection } = useCollections()
const { cancelTitleVerification } = useCommons()

const onStepperUpdate = (next: string) => {
  if (store.stepper === '3' && next === '4') {
    cancelTitleVerification()
  }
  store.stepper = next
}
</script>

<template>
  <div :class="['flex flex-col gap-4', store.stepper !== '3' && 'max-w-7xl mx-auto']">
    <div :class="store.stepper === '3' && 'max-w-7xl mx-auto w-full'">
      <Stepper
        :value="store.stepper"
        @update:value="onStepperUpdate"
      >
        <StepList>
          <Step value="1">Retrieve</Step>
          <Step value="2">Select</Step>
          <Step value="3">Edit</Step>
          <Step value="4">Preview</Step>
          <Step value="5">Upload</Step>
        </StepList>
        <StepPanels>
          <StepPanel value="1">
            <Form
              @submit="loadCollection"
              class="mt-4 mb-4 flex flex-col gap-4"
              v-focustrap
            >
              <label
                for="input"
                class="w-full text-xl font-medium text-gray-700"
              >
                Mapillary URL / Sequence ID
              </label>
              <InputText
                autofocus
                id="input"
                v-model="store.input"
                :placeholder="placeholder"
              />
              <div class="flex items-center gap-4">
                <Button
                  color="primary"
                  type="submit"
                  :loading="store.isLoading"
                  :disabled="!store.input.trim() || store.isLoading"
                  :label="store.isLoading ? 'Loading...' : 'Load sequence'"
                  class="w-fit"
                />
                <Message
                  v-if="store.isBatchLoading && store.batchLoadingStatus"
                  severity="info"
                  icon="pi pi-spin pi-spinner"
                  :closable="false"
                  class="!m-0"
                >
                  {{ store.batchLoadingStatus }}
                </Message>
              </div>
            </Form>

            <div class="text-center py-48 text-gray-500">
              <i class="pi pi-image mb-4 text-4xl" />
              <p class="text-base">{{ emptyMessage }}</p>
            </div>
          </StepPanel>
        </StepPanels>
      </Stepper>
    </div>

    <CollectionsInfoCard
      v-if="store.stepper !== '1'"
      :input="store.input"
      :selected-count="store.selectedCount"
      :total-images="store.totalImages"
      :id-label="idLabel"
    />

    <SequenceMap v-if="store.stepper === '2'" />

    <SdcWarningMessage v-if="store.stepper === '2' && store.anyItemsWithExistingFiles" />

    <CollectionsDataView
      v-if="['2', '3', '4', '5'].includes(store.stepper)"
      :alt-prefix="altPrefix"
    >
      <template #metadata="{ item }">
        <slot
          name="metadata"
          :item="item"
        ></slot>
      </template>
    </CollectionsDataView>

    <!-- <div
        v-if="store.totalImages === 0 && !store.isLoading"
        class="text-center py-8 text-gray-500"
      >
        <i class="pi pi-image mb-4 text-4xl" />
        <p class="text-base">{{ emptyMessage }}</p>
      </div> -->
  </div>
</template>
