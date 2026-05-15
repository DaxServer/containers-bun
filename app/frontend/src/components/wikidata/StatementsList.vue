<script setup lang="ts">
const props = defineProps<{
  id: string
  image: Image
  license?: string
}>()

const { buildSDC } = useCommons()

const statements = shallowRef<Statement[]>([])

onMounted(() => {
  statements.value = buildSDC(props.id, props.image, props.license)
})
</script>

<template>
  <DataTable
    v-if="statements.length > 0"
    :value="statements"
    data-key="id"
    size="small"
    striped-rows
  >
    <Column
      field="property"
      header="Property"
    >
      <template #body="{ data }">
        <div class="items-baseline text-start">
          <PropertyLabel :property="data.mainsnak.property" />
        </div>
      </template>
    </Column>
    <Column
      field="value"
      header="Value"
    >
      <template #body="{ data }">
        <StatementItem
          :snak="data.mainsnak"
          :qualifiers="data.qualifiers || {}"
        />
      </template>
    </Column>
  </DataTable>
  <Skeleton
    height="calc(var(--spacing) * 10)"
    v-else
  ></Skeleton>
</template>
