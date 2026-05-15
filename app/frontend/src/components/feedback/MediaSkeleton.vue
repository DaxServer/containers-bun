<script setup lang="ts">
defineProps<{
  layout: 'grid' | 'list'
}>()
</script>

<template>
  <template v-if="layout === 'grid'">
    <Skeleton
      width="100%"
      height="200px"
    />
    <div class="flex flex-col gap-2 mt-4">
      <Skeleton
        width="80%"
        height="1rem"
      />
      <Skeleton
        width="60%"
        height="1rem"
      />
      <Skeleton
        width="40%"
        height="1rem"
      />
    </div>
  </template>
  <template v-else>
    <div class="flex flex-col gap-2 w-full">
      <Skeleton
        width="30%"
        height="1.5rem"
      />
      <Skeleton
        width="20%"
        height="1rem"
      />
      <Skeleton
        width="40%"
        height="1rem"
      />
    </div>
    <Skeleton
      width="200px"
      height="150px"
    />
  </template>
</template>
