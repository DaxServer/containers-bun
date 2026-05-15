<script setup lang="ts">
defineProps<{ status: 'applying' | 'applied' | null }>()
</script>

<template>
  <span
    v-if="status"
    class="text-xs font-normal"
    :class="status === 'applied' ? 'text-green-600' : 'text-gray-400'"
  >
    {{ status === 'applied' ? '✓ Applied' : 'Applying...' }}
  </span>
</template>
