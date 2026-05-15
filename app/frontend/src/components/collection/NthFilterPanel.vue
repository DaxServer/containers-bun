<script setup lang="ts">
type DotState = 'idle' | 'selected' | 'skipped'

const props = defineProps<{ running: boolean }>()

const NTH_N = 3
const NTH_RESULT = selectEveryNth(DEMO_ITEMS, NTH_N)

const states = ref<DotState[]>(Array(DEMO_ITEMS.length).fill('idle'))
const status = ref('')
const selectedCount = ref(0)
let gen = 0
const timer = ref<ReturnType<typeof setTimeout> | null>(null)

const dotData = computed(() => states.value.map((state, i) => ({ state, num: i + 1 })))

const clearTimer = () => {
  if (timer.value !== null) {
    clearTimeout(timer.value)
    timer.value = null
  }
}

const startAnim = () => {
  clearTimer()
  const g = ++gen
  states.value = Array(DEMO_ITEMS.length).fill('idle')
  status.value = 'Scanning sequence…'
  selectedCount.value = 0
  let i = 0

  const step = () => {
    if (g !== gen) return
    if (i >= DEMO_ITEMS.length) {
      status.value = `Done — ${selectedCount.value} of ${DEMO_ITEMS.length} images selected`
      timer.value = setTimeout(startAnim, 2200)
      return
    }
    const selected = NTH_RESULT[i] ?? false
    states.value[i] = selected ? 'selected' : 'skipped'
    status.value = selected ? `Image ${i + 1} — selected ✓` : `Image ${i + 1} — skipped`
    if (selected) selectedCount.value++
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
    Select every {{ NTH_N }}rd image from your sequence.
  </p>
  <p class="text-sm text-surface-500 mb-5">
    Useful when you want an evenly-spaced sample regardless of timing or location.
  </p>

  <div class="bg-green-50 rounded-lg p-5 mb-4">
    <p class="text-sm text-surface-500 text-center mb-4">
      N = {{ NTH_N }} &nbsp;→&nbsp; selecting every {{ NTH_N }}rd image
    </p>
    <div class="flex gap-3 justify-center flex-wrap">
      <div
        v-for="dot in dotData"
        :key="dot.num"
        class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300"
        :class="dotClass(dot.state)"
      >
        {{ dot.num }}
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
      <div class="text-surface-600 text-3xl font-bold">{{ DEMO_ITEMS.length }}</div>
      <div class="text-sm text-surface-500 mt-2">total images</div>
    </div>
  </div>
</template>
