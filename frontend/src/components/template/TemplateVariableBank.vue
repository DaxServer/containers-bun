<script setup lang="ts">
const { allMissingOptionalFieldPaths, onDragStart, titleTemplate } = useTemplateEditor()

const { usedOptionalFields, getVariableToken } = titleTemplate

const GROUP_BORDER_TOP: Record<FieldGroup, string> = {
  image: 'border-t-blue-400',
  captured: 'border-t-purple-400',
  camera: 'border-t-indigo-400',
  creator: 'border-t-orange-400',
  location: 'border-t-green-400',
}

const GROUP_LABEL_COLOR: Record<FieldGroup, string> = {
  image: 'text-blue-600',
  captured: 'text-purple-600',
  camera: 'text-indigo-600',
  creator: 'text-orange-600',
  location: 'text-green-600',
}

const getGroupBorderTop = (group: FieldGroup) => GROUP_BORDER_TOP[group]
const getGroupLabelColor = (group: FieldGroup) => GROUP_LABEL_COLOR[group]

const isOptionalFieldUsedAndMissing = (fieldPath: string): boolean =>
  (usedOptionalFields.value as readonly string[]).includes(fieldPath) &&
  allMissingOptionalFieldPaths.value.has(fieldPath)

const getOptionalFieldTooltip = (field: { description: string; path: string }) => {
  if (isOptionalFieldUsedAndMissing(field.path)) {
    return { value: `${field.description} - some items are missing this field`, severity: 'warn' }
  }
  return { value: field.description }
}
</script>

<template>
  <div class="flex-2 flex flex-col gap-4 sticky top-4 self-start">
    <SimpleMessage
      class="w-fit"
      severity="info"
      variant="simple"
      size="small"
      icon="pi pi-info-circle"
    >
      Drag to insert
    </SimpleMessage>

    <div
      v-for="(fields, group) in AVAILABLE_IMAGE_FIELDS"
      :key="group"
      class="flex flex-col gap-2"
    >
      <span
        class="text-xs font-semibold uppercase"
        :class="getGroupLabelColor(group)"
      >
        {{ group }}
      </span>
      <div class="flex flex-wrap gap-2">
        <div
          v-for="(field, key) in fields"
          :key="key"
          v-tooltip.top="getOptionalFieldTooltip(field)"
          class="flex flex-col items-start gap-0.5 rounded cursor-grab active:cursor-grabbing px-2 py-1 border border-t-2"
          :class="
            isOptionalFieldUsedAndMissing(field.path)
              ? 'bg-amber-50 border-amber-300 border-t-amber-400'
              : ['bg-white border-gray-200', getGroupBorderTop(group)]
          "
          draggable="true"
          @dragstart="onDragStart($event, field.path)"
        >
          <div class="flex items-center gap-1">
            <i
              v-if="
                (OPTIONAL_FIELD_PATHS as readonly string[]).includes(field.path) &&
                allMissingOptionalFieldPaths.has(field.path)
              "
              class="pi pi-exclamation-triangle text-xs"
              :class="
                isOptionalFieldUsedAndMissing(field.path) ? 'text-amber-500' : 'text-gray-400'
              "
            />
            <span class="text-sm font-semibold text-gray-700">{{ field.name }}</span>
          </div>
          <span class="text-xs font-mono text-gray-500">{{ getVariableToken(field.path) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
