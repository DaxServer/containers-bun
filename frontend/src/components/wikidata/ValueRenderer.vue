<script setup lang="ts">
defineProps<{ value: DataValue }>()

const { getEntityLabel } = useWikidata()
</script>

<template>
  <template v-if="value.type === DataValueType.WIKIBASE_ENTITYID">
    <ExternalLink
      :href="`https://www.wikidata.org/wiki/Q${value.value['numeric-id']}`"
      :show-icon="false"
    >
      {{ getEntityLabel(`Q${value.value['numeric-id']}`) }} (Q{{ value.value['numeric-id'] }})
    </ExternalLink>
  </template>
  <!-- <template v-else-if="value.type === 'monolingualtext'">
    <span>{{ value.value.language }}: {{ value.value.text }}</span>
  </template> -->
  <template v-else-if="value.type === DataValueType.QUANTITY">
    <span>{{ value.value.amount }} {{ getEntityLabel(value.value.unit.split('/').at(-1)!) }}</span>
  </template>
  <template v-else-if="value.type === DataValueType.TIME">
    <span>{{ value.value.time.replace(/^\+0+/, '').split('T')[0] }}</span>
  </template>
  <template v-else-if="value.type === DataValueType.GLOBECOORDINATE">
    <span>
      {{ decimalToDMS(value.value.latitude, 'lat') }},
      {{ decimalToDMS(value.value.longitude, 'lon') }}
    </span>
  </template>
  <!-- <template v-else-if="value.type === 'url'">
    <ExternalLink
      :href="value.value"
      class="text-blue text-decoration-none"
    >
      {{ value.value }}
    </ExternalLink>
  </template> -->
  <template v-else-if="value.type === DataValueType.STRING">
    <span>{{ value.value }}</span>
  </template>
  <template v-else>
    <Chip class="text-xs">Unsupported value</Chip>
  </template>
</template>
