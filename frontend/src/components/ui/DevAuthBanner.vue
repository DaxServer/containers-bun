<script setup lang="ts">
import { useAuthStore } from '@frontend/stores/auth.store'

const auth = useAuthStore()
const dismissed = ref(false)
</script>

<template>
  <div
    v-if="!dismissed && auth.isMock"
    class="bg-amber-100 border-b border-amber-300 text-amber-900 px-4 py-2 flex items-center justify-between text-sm"
  >
    <span>
      <span class="font-semibold">Dev mode:</span>
      authenticated as
      <span class="font-mono font-semibold">{{ auth.user }}</span>
      (mock session — uploads disabled)
    </span>
    <button
      class="ml-4 text-amber-700 hover:text-amber-900 font-bold"
      aria-label="Dismiss"
      @click="dismissed = true"
    >
      ✕
    </button>
  </div>
</template>
