<script lang="ts" setup>
const props = defineProps<{ item: Item; altPrefix: string }>()

const store = useCollectionsStore()
</script>

<template>
  <!-- Bottom content: ItemInputs -->
  <ItemInputs
    :language="item.meta.description.language"
    :description="item.meta.description.value"
    :categories="item.meta.categories"
    show-fallback-messages
    @update:language="
      (language: string) =>
        store.updateItem(item.id, 'description', {
          ...item.meta.description,
          language,
        })
    "
    @update:description="
      (value: string) =>
        store.updateItem(item.id, 'description', {
          ...item.meta.description,
          value,
        })
    "
    @update:categories="(categories: string) => store.updateItem(item.id, 'categories', categories)"
  />
</template>
