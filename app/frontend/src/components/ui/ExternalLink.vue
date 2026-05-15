<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    href: string
    newTab?: boolean
    as?: 'link' | 'button'
    showIcon?: boolean
    icon?: string
    iconSize?: number | string
  }>(),
  {
    newTab: true,
    as: 'link',
    showIcon: true,
    iconSize: 12,
  },
)

defineOptions({
  inheritAttrs: false,
})

const target = computed(() => (props.newTab ? '_blank' : undefined))
const rel = computed(() => (props.newTab ? 'noopener noreferrer' : undefined))
const iconToUse = computed(() => props.icon ?? 'pi pi-external-link') // Placeholder for PrimeVue icon

const iconSizePx = computed(() => {
  if (typeof props.iconSize === 'number') {
    return `${props.iconSize}px`
  }
  return props.iconSize
})
</script>

<template>
  <a
    v-if="(as ?? 'link') === 'link'"
    v-bind="$attrs"
    class="inline-flex items-center"
    :href="href"
    :target="target"
    :rel="rel"
  >
    <slot />
    <i
      v-if="showIcon"
      :class="iconToUse"
      :style="{ fontSize: iconSizePx, lineHeight: iconSizePx }"
      class="ml-1"
    />
  </a>
  <Button
    v-else
    v-bind="$attrs"
    :pt="{
      root: { class: 'p-0' },
    }"
    link
    :href="href"
    :target="target"
    :rel="rel"
  >
    <div class="flex items-center text-decoration-none text-lowercase text-grey">
      <slot />
      <i
        v-if="showIcon"
        :class="iconToUse"
        :style="{ fontSize: iconSizePx, lineHeight: iconSizePx }"
        class="ml-1"
      />
    </div>
  </Button>
</template>
