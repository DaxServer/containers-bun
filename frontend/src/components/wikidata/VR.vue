<script lang="ts" setup>
defineProps<{ snak: Snak }>()
</script>

<template>
  <div>
    <template v-if="snak.snaktype === SnakType.VALUE && snak.datavalue">
      <ValueRenderer :value="snak.datavalue" />
    </template>
    <template v-else-if="snak.snaktype === SnakType.NOVALUE">
      <Tag
        severity="warn"
        class="text-xs"
      >
        no value
      </Tag>
    </template>
    <template v-else-if="snak.snaktype === SnakType.SOMEVALUE">
      <Tag
        severity="info"
        class="text-xs"
      >
        some value
      </Tag>
    </template>
  </div>
</template>
