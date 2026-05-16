<script setup lang="ts">
type DotState = 'idle' | 'selected' | 'skipped'

const props = defineProps<{ running: boolean }>()

const TIME_ITEMS = DEMO_ITEMS.slice(0, 7)
const TIME_MIN_MS = 10_000
const TIME_RESULT = selectByMinInterval(TIME_ITEMS, TIME_MIN_MS)
const TIME_MAX_MS = TIME_ITEMS.reduce((max, item) => Math.max(max, item.capturedAt.getTime()), 0)

const states = ref<DotState[]>(Array(TIME_ITEMS.length).fill('idle'))
const status = ref('')
const selectedCount = ref(0)
let gen = 0
const timer = ref<ReturnType<typeof setTimeout> | null>(null)

const dotData = computed(() =>
  TIME_ITEMS.map((item, i) => {
    const ms = item.capturedAt.getTime()
    return {
      state: states.value[i] ?? ('idle' as DotState),
      num: i + 1,
      label: `${ms / 1000}s`,
      x: 3 + (TIME_MAX_MS > 0 ? (ms / TIME_MAX_MS) * 94 : 0),
      isTop: i % 2 === 0,
    }
  }),
)

const clearTimer = () => {
  if (timer.value !== null) {
    clearTimeout(timer.value)
    timer.value = null
  }
}

const startAnim = () => {
  clearTimer()
  const g = ++gen
  states.value = Array(TIME_ITEMS.length).fill('idle')
  status.value = 'Scanning timeline…'
  selectedCount.value = 0
  let lastSelectedMs = -Infinity
  let i = 0

  const step = () => {
    if (g !== gen) return
    const item = TIME_ITEMS[i]
    if (item === undefined) {
      status.value = `Done — ${selectedCount.value} of ${TIME_ITEMS.length} images selected`
      timer.value = setTimeout(startAnim, 2200)
      return
    }
    const selected = TIME_RESULT[i] ?? false
    states.value[i] = selected ? 'selected' : 'skipped'
    const ms = item.capturedAt.getTime()
    if (selected) {
      const gap = i === 0 ? 0 : ms - lastSelectedMs
      selectedCount.value++
      status.value =
        i === 0 ? 'Image 1 — selected ✓' : `Image ${i + 1} — ${gap / 1000}s gap, selected ✓`
      lastSelectedMs = ms
    } else {
      status.value = `Image ${i + 1} — only ${(ms - lastSelectedMs) / 1000}s gap, skipped`
    }
    i++
    timer.value = setTimeout(step, 500)
  }
  timer.value = setTimeout(step, 500)
}

watch(
  () => props.running,
  (running) => {
    if (running) startAnim()
    else clearTimer()
  },
  { immediate: true },
)

onUnmounted(clearTimer)

const dotClass = (state: DotState): string => {
  if (state === 'selected')
    return 'bg-green-500 text-white scale-110 shadow-[0_0_8px_var(--p-green-500)]'
  if (state === 'skipped') return 'bg-red-100 text-red-600'
  return 'bg-surface-200 text-surface-500'
}
</script>

<template>
  <p class="text-base text-surface-600 mb-2">
    Select images at least {{ TIME_MIN_MS / 1000 }} seconds apart.
  </p>
  <p class="text-sm text-surface-500 mb-5">Only the first image within each time window is kept.</p>

  <div class="bg-green-50 rounded-lg p-5 mb-4">
    <p class="text-sm text-surface-500 text-center mb-5">
      Min interval = {{ TIME_MIN_MS / 1000 }}s &nbsp;→&nbsp; skip images within
      {{ TIME_MIN_MS / 1000 }}s of previously selected image
    </p>

    <div class="relative mx-2 h-32">
      <div class="absolute top-9 left-0 right-0 h-px bg-surface-300" />
      <div
        v-for="dot in dotData"
        :key="dot.num"
        class="absolute flex flex-col items-center gap-1"
        :style="{ left: `${dot.x}%`, transform: 'translateX(-50%)' }"
      >
        <template v-if="dot.isTop">
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300"
            :class="dotClass(dot.state)"
          >
            {{ dot.num }}
          </div>
          <div class="w-px h-4 bg-surface-300" />
          <div class="text-sm text-surface-500">{{ dot.label }}</div>
        </template>
        <template v-else>
          <div class="text-sm text-surface-500 mt-9">{{ dot.label }}</div>
          <div class="w-px h-4 bg-surface-300" />
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300"
            :class="dotClass(dot.state)"
          >
            {{ dot.num }}
          </div>
        </template>
      </div>
    </div>

    <p class="text-sm text-surface-500 text-center mt-4">{{ status }}</p>
  </div>

  <div class="flex gap-4">
    <div class="flex-1 bg-surface-100 rounded p-4 text-center">
      <div class="text-green-500 text-3xl font-bold">{{ selectedCount }}</div>
      <div class="text-sm text-surface-500 mt-2">selected</div>
    </div>
    <div class="flex-1 bg-surface-100 rounded p-4 text-center">
      <div class="text-surface-600 text-3xl font-bold">{{ TIME_ITEMS.length }}</div>
      <div class="text-sm text-surface-500 mt-2">total images</div>
    </div>
  </div>
</template>
