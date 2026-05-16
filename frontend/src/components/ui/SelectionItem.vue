<script setup lang="ts">
const props = defineProps<{
  item: Item
  altPrefix: string
  layout: Layout
}>()

const store = useCollectionsStore()

const getCardClass = () => {
  return props.item.meta.selected ? 'bg-green-100!' : ''
}
</script>

<template>
  <Card :class="getCardClass()">
    <template #content>
      <template v-if="item.isSkeleton">
        <MediaSkeleton layout="grid" />
      </template>
      <template v-else>
        <Image
          :src="item.image.urls.thumbnail"
          :alt="`${altPrefix} ${item.id}`"
          class="cursor-pointer w-full"
          @click.stop="store.updateItem(item.id, 'selected', !item.meta.selected)"
        />
        <!-- Metadata slot for remaining content -->
        <slot
          name="metadata"
          :item="item"
        />
      </template>
    </template>
  </Card>
</template>
