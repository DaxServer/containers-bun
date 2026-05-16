<script setup lang="ts">
defineProps<{ property: string }>()

const { getPropertyLabel } = useWikidata()
</script>

<template>
  <ExternalLink
    :href="`https://www.wikidata.org/wiki/Property:${property}`"
    :show-icon="false"
  >
    {{ getPropertyLabel(property) }} ({{ property }})
  </ExternalLink>
</template>
