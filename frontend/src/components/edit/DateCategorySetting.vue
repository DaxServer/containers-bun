<script lang="ts" setup>
const store = useCollectionsStore()

defineProps<{
  readonly?: boolean
}>()

const takenOn = '{{Taken on|...}}'
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-center gap-2">
      <Checkbox
        :model-value="store.globalDateCategory"
        binary
        inputId="dateCategory_input"
        :disabled="readonly"
        @update:model-value="store.setGlobalDateCategory($event)"
      />
      <label
        for="dateCategory_input"
        :class="readonly ? 'cursor-default select-none' : 'cursor-pointer select-none'"
      >
        Exclude from date category
      </label>
    </div>
    <SimpleMessage
      severity="secondary"
      variant="simple"
      size="small"
      class="pl-7"
    >
      Adds
      <code class="bg-gray-200 px-1">|cat=no</code>
      to
      <code class="bg-gray-200 px-1">{{ takenOn }}</code>
      template to prevent automatic categorization by date (
      <ExternalLink
        href="https://commons.wikimedia.org/wiki/Template:Taken_on"
        :icon-size="10"
        class="hover:underline hover:text-primary"
      >
        Template:Taken on
      </ExternalLink>
      )
    </SimpleMessage>
  </div>
</template>
