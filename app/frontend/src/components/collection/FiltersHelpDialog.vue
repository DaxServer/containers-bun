<script setup lang="ts">
const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const activeTab = ref('0')
const dialogWidth = computed(() =>
  activeTab.value === '2' ? 'var(--container-7xl)' : 'var(--container-3xl)',
)
</script>

<template>
  <Dialog
    :visible="modelValue"
    modal
    dismissable-mask
    header="How filters work"
    :style="{ width: dialogWidth }"
    @update:visible="emit('update:modelValue', $event)"
  >
    <Tabs v-model:value="activeTab">
      <TabList>
        <Tab value="0">Every Nth</Tab>
        <Tab value="1">Time Interval</Tab>
        <Tab value="2">Distance</Tab>
      </TabList>

      <TabPanels>
        <TabPanel value="0">
          <NthFilterPanel :running="modelValue && activeTab === '0'" />
        </TabPanel>
        <TabPanel value="1">
          <TimeFilterPanel :running="modelValue && activeTab === '1'" />
        </TabPanel>
        <TabPanel value="2">
          <DistanceFilterPanel :running="modelValue && activeTab === '2'" />
        </TabPanel>
      </TabPanels>
    </Tabs>
  </Dialog>
</template>
