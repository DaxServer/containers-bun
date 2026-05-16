<script setup lang="ts">
const store = useCollectionsStore()

const {
  internalDescription,
  internalCategories,
  descriptionHighlighted,
  categoriesHighlighted,
  previewItems,
  titleStatus,
  descriptionStatus,
  categoriesStatus,
  missingCategories,
  titleTemplate,
} = useTemplateEditor()

const { error: titleError, highlightedTemplate, template } = titleTemplate

onMounted(() => {
  titleTemplate.applyTemplate()
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex justify-between items-center">
      <span class="font-semibold text-lg">Templates</span>
    </div>

    <div class="flex flex-row gap-6">
      <!-- Left column: field cards -->
      <div class="flex-3 flex flex-col gap-4 min-w-0">
        <!-- Title field -->
        <Card class="border-l-4 border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-300">
          <template #title>
            <div class="flex justify-between items-center">
              <span>Title</span>
              <TemplateStatusBadge :status="titleStatus" />
            </div>
          </template>
          <template #content>
            <div class="flex flex-col gap-2 mt-1">
              <HighlightedTextarea
                v-model="template"
                :highlighted="highlightedTemplate"
                :invalid="!!titleError"
              />
              <small
                v-if="titleError"
                class="text-red-500"
              >
                {{ titleError }}
              </small>
            </div>
          </template>
        </Card>

        <!-- Description field -->
        <Card class="border-l-4 border-green-500 focus-within:ring-2 focus-within:ring-green-300">
          <template #title>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span>Description</span>
                <Select
                  :model-value="store.globalLanguage"
                  :options="[
                    { label: 'English', value: 'en' },
                    { label: 'Deutsch', value: 'de' },
                  ]"
                  option-label="label"
                  option-value="value"
                  size="small"
                  @update:model-value="(v: string) => (store.globalLanguage = v)"
                />
              </div>
              <TemplateStatusBadge :status="descriptionStatus" />
            </div>
          </template>
          <template #subtitle>
            <span class="text-sm text-gray-500">
              Added as Caption. Description in Information template is loaded via SDC.
            </span>
          </template>
          <template #content>
            <HighlightedTextarea
              v-model="internalDescription"
              :highlighted="descriptionHighlighted"
              :rows="2"
              class="mt-1"
            />
          </template>
        </Card>

        <!-- Categories field -->
        <Card class="border-l-4 border-amber-500 focus-within:ring-2 focus-within:ring-amber-300">
          <template #title>
            <div class="flex justify-between items-center">
              <span>Categories</span>
              <TemplateStatusBadge :status="categoriesStatus" />
            </div>
          </template>
          <template #subtitle>
            <span class="text-sm text-gray-500">Wikitext to be appended at the end</span>
          </template>
          <template #content>
            <div class="flex flex-col gap-4 mt-1">
              <HighlightedTextarea
                v-model="internalCategories"
                :highlighted="categoriesHighlighted"
                :rows="3"
              />
              <CategoryValidationMessages
                :missing-categories="missingCategories"
                show-auto-added
              />
            </div>
          </template>
        </Card>

        <!-- Others -->
        <Card class="border-l-4 border-transparent">
          <template #title>
            <div class="flex items-center gap-2">
              <i class="pi pi-info-circle text-blue-600" />
              <span>Others</span>
            </div>
          </template>
          <template #content>
            <DateCategorySetting />
          </template>
        </Card>

        <!-- Preview -->
        <div
          v-if="previewItems.length > 0"
          class="flex flex-col gap-2 p-3 bg-blue-50 rounded border border-gray-200"
        >
          <span class="text-md font-medium text-gray-600">Preview</span>
          <div
            v-for="(item, idx) in previewItems"
            :key="item.id"
            class="flex flex-col gap-1 text-sm"
            :class="{ 'opacity-60': idx > 0 }"
          >
            <span class="font-thin text-gray-500">#{{ item.index }}</span>
            <span class="text-gray-900 font-mono break-words">{{ item.title || '(empty)' }}</span>
            <span
              v-if="item.description"
              class="text-gray-700 font-mono break-words"
            >
              {{ item.description }}
            </span>
            <span
              v-if="item.categories"
              class="text-gray-600 font-mono break-words text-xs"
            >
              {{ item.categories }}
            </span>
          </div>
        </div>
      </div>

      <!-- Right column: chip bank -->
      <TemplateVariableBank />
    </div>
  </div>
</template>
