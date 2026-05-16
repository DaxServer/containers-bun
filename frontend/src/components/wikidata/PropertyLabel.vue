<script setup lang="ts">
import { useWikidata } from '@frontend/components/wikidata/useWikidata'

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
