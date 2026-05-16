<script setup lang="ts">
type DotState = 'idle' | 'selected' | 'skipped'

const props = defineProps<{ running: boolean }>()

const DIST_MIN_METERS = 100
const TRAVERSAL_RESULT = selectByTraversalDistance(DEMO_ITEMS, DIST_MIN_METERS)
const STRAIGHT_RESULT = selectByStraightLineDistance(DEMO_ITEMS, DIST_MIN_METERS)

const SEGMENT_DISTS = DEMO_ITEMS.slice(1).map((item, i) => {
  const prev = DEMO_ITEMS[i]!
  return Math.round(haversineDistance(prev.latitude, prev.longitude, item.latitude, item.longitude))
})

const SVG_DOTS: Array<{ x: number; y: number }> = [
  { x: 15, y: 60 },
  { x: 55, y: 44 },
  { x: 95, y: 24 },
  { x: 135, y: 13 },
  { x: 168, y: 18 },
  { x: 200, y: 36 },
  { x: 230, y: 52 },
  { x: 268, y: 36 },
  { x: 315, y: 14 },
]

const SVG_PATH = 'M 15 60 C 50 60 80 13 135 13 C 192 13 185 52 230 52 C 262 52 278 14 315 14'

const LABEL_OFFSETS: Array<{ dx: number; dy: number; anchor: string }> = [
  { dx: 0, dy: 20, anchor: 'middle' }, // 0: (15,  60) — below
  { dx: 0, dy: 22, anchor: 'middle' }, // 1: (55,  44) — below
  { dx: 0, dy: 26, anchor: 'middle' }, // 2: (95,  24) — below (path runs above here)
  { dx: 0, dy: 20, anchor: 'middle' }, // 3: (135, 13) — below (path peak)
  { dx: 0, dy: 22, anchor: 'middle' }, // 4: (168, 18) — below
  { dx: 14, dy: -15, anchor: 'start' }, // 5: (200, 36) — upper-right
  { dx: 0, dy: 22, anchor: 'middle' }, // 6: (230, 52) — below
  { dx: 0, dy: 22, anchor: 'middle' }, // 7: (268, 36) — below (path runs above here)
  { dx: 0, dy: 20, anchor: 'middle' }, // 8: (315, 14) — below
]

// ── Traversal state ────────────────────────────────────────────────────────
const traversalStates = ref<DotState[]>(Array(DEMO_ITEMS.length).fill('idle'))
const traversalStatus = ref('')
const traversalSelectedCount = ref(0)
const traversalSegmentCount = ref(0)
const traversalDotLabels = ref<string[]>(Array(DEMO_ITEMS.length).fill(''))
const traversalSkipLabels = ref<string[]>(Array(DEMO_ITEMS.length).fill(''))
let travGen = 0
const traversalTimer = ref<ReturnType<typeof setTimeout> | null>(null)

const traversalDotData = computed(() =>
  SVG_DOTS.map((pos, i) => ({ ...pos, state: traversalStates.value[i] ?? ('idle' as DotState) })),
)

// ── Straight-line state ────────────────────────────────────────────────────
const straightStates = ref<DotState[]>(Array(DEMO_ITEMS.length).fill('idle'))
const straightStatus = ref('')
const straightSelectedCount = ref(0)
const straightDotLabels = ref<string[]>(Array(DEMO_ITEMS.length).fill(''))
const straightSkipLabels = ref<string[]>(Array(DEMO_ITEMS.length).fill(''))
const straightProbe = ref<{ x1: number; y1: number; x2: number; y2: number } | null>(null)
let straightGen = 0
const straightTimer = ref<ReturnType<typeof setTimeout> | null>(null)

const straightDotData = computed(() =>
  SVG_DOTS.map((pos, i) => ({ ...pos, state: straightStates.value[i] ?? ('idle' as DotState) })),
)

const straightLineConnections = computed(() => {
  const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
  let lastPos: { x: number; y: number } | null = null
  SVG_DOTS.forEach((pos, i) => {
    if ((straightStates.value[i] ?? 'idle') === 'selected') {
      if (lastPos !== null) lines.push({ x1: lastPos.x, y1: lastPos.y, x2: pos.x, y2: pos.y })
      lastPos = pos
    }
  })
  return lines
})

// ── Animation ──────────────────────────────────────────────────────────────
const clearTimers = () => {
  if (traversalTimer.value !== null) {
    clearTimeout(traversalTimer.value)
    traversalTimer.value = null
  }
  if (straightTimer.value !== null) {
    clearTimeout(straightTimer.value)
    straightTimer.value = null
  }
}

const clearBothDemos = () => {
  traversalStates.value = Array(DEMO_ITEMS.length).fill('idle')
  traversalDotLabels.value = Array(DEMO_ITEMS.length).fill('')
  traversalSkipLabels.value = Array(DEMO_ITEMS.length).fill('')
  traversalStatus.value = ''
  traversalSelectedCount.value = 0
  traversalSegmentCount.value = 0
  straightStates.value = Array(DEMO_ITEMS.length).fill('idle')
  straightDotLabels.value = Array(DEMO_ITEMS.length).fill('')
  straightSkipLabels.value = Array(DEMO_ITEMS.length).fill('')
  straightStatus.value = ''
  straightSelectedCount.value = 0
  straightProbe.value = null
}

const startTraversalAnim = (onComplete?: () => void) => {
  if (traversalTimer.value !== null) {
    clearTimeout(traversalTimer.value)
    traversalTimer.value = null
  }
  const g = ++travGen
  traversalStates.value = Array(DEMO_ITEMS.length).fill('idle')
  traversalStatus.value = 'Walking the path…'
  traversalSelectedCount.value = 0
  traversalSegmentCount.value = 0
  traversalDotLabels.value = Array(DEMO_ITEMS.length).fill('')
  traversalSkipLabels.value = Array(DEMO_ITEMS.length).fill('')
  let i = 0
  let accumulated = 0
  let lastSelectedIdx = -1

  const step = () => {
    if (g !== travGen) return
    if (i >= DEMO_ITEMS.length) {
      traversalStatus.value = `Done — ${traversalSelectedCount.value} of ${DEMO_ITEMS.length} selected`
      traversalTimer.value = setTimeout(onComplete ?? (() => startTraversalAnim(onComplete)), 400)
      return
    }
    const trav = TRAVERSAL_RESULT[i] ?? false
    traversalStates.value[i] = trav ? 'selected' : 'skipped'
    if (i > 0) {
      traversalSegmentCount.value = i
      accumulated += SEGMENT_DISTS[i - 1] ?? 0
    }
    if (trav) {
      traversalSelectedCount.value++
      traversalStatus.value =
        lastSelectedIdx < 0
          ? 'Image 1 — first image, selected ✓'
          : `Image ${i + 1} — ${accumulated}m along path, selected ✓`
      if (lastSelectedIdx >= 0) traversalDotLabels.value[i] = `${accumulated}m ✓`
      accumulated = 0
      lastSelectedIdx = i
    } else {
      traversalStatus.value = `Image ${i + 1} — only ${accumulated}m so far, skipped`
      traversalSkipLabels.value[i] = `${accumulated}m ✗`
    }
    i++
    traversalTimer.value = setTimeout(step, 500)
  }
  traversalTimer.value = setTimeout(step, 500)
}

const startStraightAnim = (onComplete?: () => void) => {
  if (straightTimer.value !== null) {
    clearTimeout(straightTimer.value)
    straightTimer.value = null
  }
  const g = ++straightGen
  straightStates.value = Array(DEMO_ITEMS.length).fill('idle')
  straightStatus.value = 'Measuring direct distance…'
  straightSelectedCount.value = 0
  straightDotLabels.value = Array(DEMO_ITEMS.length).fill('')
  straightSkipLabels.value = Array(DEMO_ITEMS.length).fill('')
  straightProbe.value = null
  let i = 0
  let lastSelectedLat: number | null = null
  let lastSelectedLon: number | null = null
  let lastSelectedSvgPos: { x: number; y: number } | null = null

  const step = () => {
    if (g !== straightGen) return
    if (i >= DEMO_ITEMS.length) {
      straightStatus.value = `Done — ${straightSelectedCount.value} of ${DEMO_ITEMS.length} selected`
      straightProbe.value = null
      straightTimer.value = setTimeout(() => {
        clearBothDemos()
        straightTimer.value = setTimeout(onComplete ?? (() => startStraightAnim(onComplete)), 600)
      }, 1200)
      return
    }
    const item = DEMO_ITEMS[i]!
    const svgPos = SVG_DOTS[i]!
    const straight = STRAIGHT_RESULT[i] ?? false
    straightStates.value[i] = straight ? 'selected' : 'skipped'
    if (lastSelectedLat !== null && lastSelectedSvgPos !== null) {
      const dist = Math.round(
        haversineDistance(lastSelectedLat, lastSelectedLon!, item.latitude, item.longitude),
      )
      straightProbe.value = {
        x1: lastSelectedSvgPos.x,
        y1: lastSelectedSvgPos.y,
        x2: svgPos.x,
        y2: svgPos.y,
      }
      if (straight) {
        straightSelectedCount.value++
        straightStatus.value = `Image ${i + 1} — ${dist}m direct, selected ✓`
        straightDotLabels.value[i] = `${dist}m ✓`
        lastSelectedLat = item.latitude
        lastSelectedLon = item.longitude
        lastSelectedSvgPos = svgPos
      } else {
        straightStatus.value = `Image ${i + 1} — only ${dist}m direct, skipped`
        straightSkipLabels.value[i] = `${dist}m ✗`
      }
    } else {
      straightStatus.value = 'Image 1 — first image, selected ✓'
      straightSelectedCount.value++
      lastSelectedLat = item.latitude
      lastSelectedLon = item.longitude
      lastSelectedSvgPos = svgPos
    }
    i++
    straightTimer.value = setTimeout(step, 500)
  }
  straightTimer.value = setTimeout(step, 500)
}

const startAnim = () => {
  clearTimers()
  const cycle = () => startTraversalAnim(() => startStraightAnim(cycle))
  cycle()
}

watch(
  () => props.running,
  (running) => {
    if (running) startAnim()
    else clearTimers()
  },
  { immediate: true },
)

onUnmounted(clearTimers)

const svgFill = (state: DotState): string => {
  if (state === 'selected') return 'var(--p-green-500)'
  if (state === 'skipped') return 'var(--p-red-200)'
  return 'var(--p-surface-200)'
}

const svgStroke = (state: DotState): string => {
  if (state === 'selected') return 'var(--p-green-600)'
  if (state === 'skipped') return 'var(--p-red-300)'
  return 'var(--p-surface-300)'
}
</script>

<template>
  <p class="text-base text-surface-600 mb-2">
    Select images at least {{ DIST_MIN_METERS }} meters apart.
  </p>
  <p class="text-sm text-surface-500 mb-5">
    The two sub-modes differ in
    <em>how</em>
    distance is measured between images.
  </p>

  <div class="grid grid-cols-2 gap-4">
    <!-- ── Traversal card ──────────────────────────────────────────── -->
    <div class="border border-surface-200 rounded-xl overflow-hidden">
      <div class="bg-surface-0 px-4 py-3 border-b border-surface-200 text-center">
        <p class="font-semibold text-surface-700">Traversal Distance</p>
        <p class="text-xs text-surface-400 mt-0.5">
          Sums
          <em>straight-line distances</em>
          between consecutive images
        </p>
      </div>

      <div class="bg-green-50 border-b border-green-100 px-4 py-3">
        <p class="text-xs font-semibold text-surface-400 uppercase tracking-wide text-center mb-2">
          How it works
        </p>
        <svg
          width="100%"
          viewBox="0 0 200 72"
          class="overflow-visible"
        >
          <line
            x1="27"
            y1="50"
            x2="100"
            y2="20"
            stroke="var(--p-amber-400)"
            stroke-width="2"
          />
          <line
            x1="100"
            y1="20"
            x2="173"
            y2="50"
            stroke="var(--p-amber-400)"
            stroke-width="2"
          />
          <text
            x="58"
            y="28"
            font-size="9"
            fill="var(--p-amber-600)"
            text-anchor="middle"
          >
            70m
          </text>
          <text
            x="142"
            y="28"
            font-size="9"
            fill="var(--p-amber-600)"
            text-anchor="middle"
          >
            80m
          </text>
          <text
            x="100"
            y="72"
            font-size="9"
            fill="var(--p-amber-700)"
            text-anchor="middle"
            font-weight="600"
          >
            70 + 80 = 150m ✓
          </text>
          <circle
            cx="27"
            cy="50"
            r="9"
            fill="var(--p-green-500)"
            stroke="var(--p-green-600)"
            stroke-width="1.5"
          />
          <text
            x="27"
            y="54"
            text-anchor="middle"
            font-size="8"
            fill="white"
            font-weight="bold"
          >
            A
          </text>
          <circle
            cx="100"
            cy="20"
            r="9"
            fill="var(--p-red-200)"
            stroke="var(--p-red-300)"
            stroke-width="1.5"
          />
          <text
            x="100"
            y="24"
            text-anchor="middle"
            font-size="8"
            fill="var(--p-red-600)"
            font-weight="bold"
          >
            B
          </text>
          <circle
            cx="173"
            cy="50"
            r="9"
            fill="var(--p-green-500)"
            stroke="var(--p-green-600)"
            stroke-width="1.5"
          />
          <text
            x="173"
            y="54"
            text-anchor="middle"
            font-size="8"
            fill="white"
            font-weight="bold"
          >
            C
          </text>
        </svg>
        <p class="text-xs text-surface-500 text-center mt-1">
          A→B only 70m — B skipped; A→B→C =
          <strong class="text-amber-700">150m total</strong>
          , C selected
        </p>
      </div>

      <div class="px-4 py-3">
        <p class="text-xs font-semibold text-surface-400 uppercase tracking-wide text-center mb-2">
          Live demo
        </p>
        <svg
          width="100%"
          viewBox="0 -18 330 104"
          class="overflow-visible"
        >
          <path
            :d="SVG_PATH"
            :style="{ stroke: 'var(--p-surface-300)' }"
            stroke-width="3"
            fill="none"
            stroke-linecap="round"
          />
          <line
            v-for="n in traversalSegmentCount"
            :key="`seg-${n}`"
            :x1="SVG_DOTS[n - 1]!.x"
            :y1="SVG_DOTS[n - 1]!.y"
            :x2="SVG_DOTS[n]!.x"
            :y2="SVG_DOTS[n]!.y"
            stroke="var(--p-green-500)"
            stroke-width="2"
            stroke-dasharray="5 3"
            opacity="0.85"
          />
          <template
            v-for="(label, i) in traversalSkipLabels"
            :key="`skip-${i}`"
          >
            <text
              v-if="label"
              :x="SVG_DOTS[i]!.x + LABEL_OFFSETS[i]!.dx"
              :y="SVG_DOTS[i]!.y + LABEL_OFFSETS[i]!.dy"
              :text-anchor="LABEL_OFFSETS[i]!.anchor"
              font-size="7.5"
              fill="var(--p-red-400)"
            >
              {{ label }}
            </text>
          </template>
          <template
            v-for="(label, i) in traversalDotLabels"
            :key="`label-${i}`"
          >
            <text
              v-if="label"
              :x="SVG_DOTS[i]!.x + LABEL_OFFSETS[i]!.dx"
              :y="SVG_DOTS[i]!.y + LABEL_OFFSETS[i]!.dy"
              :text-anchor="LABEL_OFFSETS[i]!.anchor"
              font-size="9"
              fill="var(--p-green-700)"
              font-weight="600"
            >
              {{ label }}
            </text>
          </template>
          <circle
            v-for="dot in traversalDotData"
            :key="`${dot.x}-${dot.y}`"
            :cx="dot.x"
            :cy="dot.y"
            :r="dot.state === 'selected' ? 10 : 8"
            :style="{ fill: svgFill(dot.state), stroke: svgStroke(dot.state) }"
            stroke-width="1.5"
            class="transition-all duration-300"
          />
        </svg>
        <p class="text-xs text-surface-400 text-center mt-2 h-4">{{ traversalStatus }}</p>
        <div class="flex gap-3 mt-3">
          <div class="flex-1 bg-surface-100 rounded p-3 text-center">
            <div class="text-green-500 text-2xl font-bold">{{ traversalSelectedCount }}</div>
            <div class="text-xs text-surface-400 mt-1">selected</div>
          </div>
          <div class="flex-1 bg-surface-100 rounded p-3 text-center">
            <div class="text-surface-600 text-2xl font-bold">{{ DEMO_ITEMS.length }}</div>
            <div class="text-xs text-surface-400 mt-1">total</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Straight-line card ──────────────────────────────────────── -->
    <div class="border border-surface-200 rounded-xl overflow-hidden">
      <div class="bg-surface-0 px-4 py-3 border-b border-surface-200 text-center">
        <p class="font-semibold text-surface-700">Straight-line Distance</p>
        <p class="text-xs text-surface-400 mt-0.5">
          Measures
          <em>direct distance</em>
          from last selected image
        </p>
      </div>

      <div class="bg-green-50 border-b border-green-100 px-4 py-3">
        <p class="text-xs font-semibold text-surface-400 uppercase tracking-wide text-center mb-2">
          How it works
        </p>
        <svg
          width="100%"
          viewBox="0 0 200 72"
          class="overflow-visible"
        >
          <path
            d="M 15 50 C 15 8 85 8 95 32 C 105 56 165 56 185 22"
            stroke="var(--p-surface-300)"
            stroke-width="2"
            fill="none"
            stroke-linecap="round"
          />
          <line
            x1="15"
            y1="50"
            x2="72"
            y2="12"
            stroke="var(--p-amber-400)"
            stroke-width="1.5"
            stroke-dasharray="4 3"
          />
          <line
            x1="15"
            y1="50"
            x2="128"
            y2="52"
            stroke="var(--p-amber-400)"
            stroke-width="1.5"
            stroke-dasharray="4 3"
          />
          <line
            x1="15"
            y1="50"
            x2="185"
            y2="22"
            stroke="var(--p-green-500)"
            stroke-width="2"
            stroke-dasharray="5 3"
          />
          <circle
            cx="15"
            cy="50"
            r="9"
            fill="var(--p-green-500)"
            stroke="var(--p-green-600)"
            stroke-width="1.5"
          />
          <text
            x="15"
            y="54"
            text-anchor="middle"
            font-size="8"
            fill="white"
            font-weight="bold"
          >
            A
          </text>
          <circle
            cx="72"
            cy="12"
            r="9"
            fill="var(--p-red-200)"
            stroke="var(--p-red-300)"
            stroke-width="1.5"
          />
          <text
            x="72"
            y="16"
            text-anchor="middle"
            font-size="8"
            fill="var(--p-red-600)"
            font-weight="bold"
          >
            B
          </text>
          <text
            x="84"
            y="8"
            font-size="8"
            fill="var(--p-red-500)"
            text-anchor="start"
          >
            70m ✗
          </text>
          <circle
            cx="128"
            cy="52"
            r="9"
            fill="var(--p-red-200)"
            stroke="var(--p-red-300)"
            stroke-width="1.5"
          />
          <text
            x="128"
            y="56"
            text-anchor="middle"
            font-size="8"
            fill="var(--p-red-600)"
            font-weight="bold"
          >
            C
          </text>
          <text
            x="128"
            y="68"
            font-size="8"
            fill="var(--p-red-500)"
            text-anchor="middle"
          >
            90m ✗
          </text>
          <circle
            cx="185"
            cy="22"
            r="9"
            fill="var(--p-green-500)"
            stroke="var(--p-green-600)"
            stroke-width="1.5"
          />
          <text
            x="185"
            y="26"
            text-anchor="middle"
            font-size="8"
            fill="white"
            font-weight="bold"
          >
            D
          </text>
          <text
            x="185"
            y="39"
            font-size="8"
            fill="var(--p-green-600)"
            text-anchor="middle"
          >
            120m ✓
          </text>
        </svg>
        <p class="text-xs text-surface-500 text-center mt-1">
          B: 70m, C: 90m from A — skipped;
          <strong class="text-green-600">D: 120m from A — selected ✓</strong>
        </p>
      </div>

      <div class="px-4 py-3">
        <p class="text-xs font-semibold text-surface-400 uppercase tracking-wide text-center mb-2">
          Live demo
        </p>
        <svg
          width="100%"
          viewBox="0 -18 330 104"
          class="overflow-visible"
        >
          <path
            :d="SVG_PATH"
            :style="{ stroke: 'var(--p-surface-300)' }"
            stroke-width="3"
            fill="none"
            stroke-linecap="round"
          />
          <line
            v-for="(conn, i) in straightLineConnections"
            :key="i"
            :x1="conn.x1"
            :y1="conn.y1"
            :x2="conn.x2"
            :y2="conn.y2"
            :style="{ stroke: 'var(--p-green-500)' }"
            stroke-width="1.5"
            stroke-dasharray="4 3"
            opacity="0.7"
          />
          <line
            v-if="straightProbe"
            :x1="straightProbe.x1"
            :y1="straightProbe.y1"
            :x2="straightProbe.x2"
            :y2="straightProbe.y2"
            stroke="var(--p-amber-400)"
            stroke-width="1.5"
            stroke-dasharray="3 2"
            opacity="0.9"
          />
          <template
            v-for="(label, i) in straightSkipLabels"
            :key="`skip-${i}`"
          >
            <text
              v-if="label"
              :x="SVG_DOTS[i]!.x + LABEL_OFFSETS[i]!.dx"
              :y="SVG_DOTS[i]!.y + LABEL_OFFSETS[i]!.dy"
              :text-anchor="LABEL_OFFSETS[i]!.anchor"
              font-size="7.5"
              fill="var(--p-red-400)"
            >
              {{ label }}
            </text>
          </template>
          <template
            v-for="(label, i) in straightDotLabels"
            :key="`label-${i}`"
          >
            <text
              v-if="label"
              :x="SVG_DOTS[i]!.x + LABEL_OFFSETS[i]!.dx"
              :y="SVG_DOTS[i]!.y + LABEL_OFFSETS[i]!.dy"
              :text-anchor="LABEL_OFFSETS[i]!.anchor"
              font-size="9"
              fill="var(--p-green-700)"
              font-weight="600"
            >
              {{ label }}
            </text>
          </template>
          <circle
            v-for="dot in straightDotData"
            :key="`${dot.x}-${dot.y}`"
            :cx="dot.x"
            :cy="dot.y"
            :r="dot.state === 'selected' ? 10 : 8"
            :style="{ fill: svgFill(dot.state), stroke: svgStroke(dot.state) }"
            stroke-width="1.5"
            class="transition-all duration-300"
          />
        </svg>
        <p class="text-xs text-surface-400 text-center mt-2 h-4">{{ straightStatus }}</p>
        <div class="flex gap-3 mt-3">
          <div class="flex-1 bg-surface-100 rounded p-3 text-center">
            <div class="text-green-500 text-2xl font-bold">{{ straightSelectedCount }}</div>
            <div class="text-xs text-surface-400 mt-1">selected</div>
          </div>
          <div class="flex-1 bg-surface-100 rounded p-3 text-center">
            <div class="text-surface-600 text-2xl font-bold">{{ DEMO_ITEMS.length }}</div>
            <div class="text-xs text-surface-400 mt-1">total</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
