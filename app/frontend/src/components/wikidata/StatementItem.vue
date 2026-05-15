<script setup lang="ts">
defineProps<{ snak: Snak; qualifiers: Record<string, Snak[]> }>()
</script>

<template>
  <div class="flex flex-col gap-2 py-1">
    <VR :snak="snak" />

    <!-- Qualifiers -->
    <div
      v-if="qualifiers"
      class="ml-6 flex flex-col gap-1"
    >
      <div
        v-for="([pid, snaks], idx) in Object.entries(qualifiers)"
        :key="`qualifier-${pid}-${idx}`"
        class="flex items-center gap-2"
      >
        <PropertyLabel :property="pid" />
        <div>
          <template
            v-for="(s, i) in snaks"
            :key="`qualifier-${pid}-${idx}-${i}`"
          >
            <VR :snak="s" />
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
