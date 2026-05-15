import { haversineDistance } from '@/utils/geo'

export interface FilterItem {
  capturedAt: Date
  latitude: number
  longitude: number
}

export function selectEveryNth(items: FilterItem[], n: number): boolean[] {
  return items.map((_, i) => (i + 1) % n === 0)
}

export function selectByMinInterval(items: FilterItem[], minMs: number): boolean[] {
  const result: boolean[] = []
  let lastSelectedMs: number | null = null
  for (const item of items) {
    const ms = item.capturedAt.getTime()
    if (lastSelectedMs === null || ms - lastSelectedMs >= minMs) {
      result.push(true)
      lastSelectedMs = ms
    } else {
      result.push(false)
    }
  }
  return result
}

export function selectByTraversalDistance(items: FilterItem[], minMeters: number): boolean[] {
  const result: boolean[] = []
  let accumulated = 0
  let prevLat: number | null = null
  let prevLon: number | null = null
  for (const item of items) {
    if (prevLat === null || prevLon === null) {
      result.push(true)
    } else {
      accumulated += haversineDistance(prevLat, prevLon, item.latitude, item.longitude)
      if (accumulated >= minMeters) {
        result.push(true)
        accumulated = 0
      } else {
        result.push(false)
      }
    }
    prevLat = item.latitude
    prevLon = item.longitude
  }
  return result
}

export function selectByStraightLineDistance(items: FilterItem[], minMeters: number): boolean[] {
  const result: boolean[] = []
  let lastSelectedLat: number | null = null
  let lastSelectedLon: number | null = null
  for (const item of items) {
    if (lastSelectedLat === null || lastSelectedLon === null) {
      result.push(true)
      lastSelectedLat = item.latitude
      lastSelectedLon = item.longitude
    } else {
      const dist = haversineDistance(
        lastSelectedLat,
        lastSelectedLon,
        item.latitude,
        item.longitude,
      )
      if (dist >= minMeters) {
        result.push(true)
        lastSelectedLat = item.latitude
        lastSelectedLon = item.longitude
      } else {
        result.push(false)
      }
    }
  }
  return result
}

// Demo items for FiltersHelpDialog animations — 9 points along a winding S-curve road.
// All consecutive segments ~60m. With minMeters=100:
//   Traversal selects {0,2,4,6,8} — accumulated ~120m each time
//   Straight-line selects {0,2,5,8} — P3 only 58m direct from P2, P4 95m; P5 is 114m
export const DEMO_ITEMS: FilterItem[] = [
  { capturedAt: new Date(0), latitude: 48.8566, longitude: 2.3522 },
  { capturedAt: new Date(5_000), latitude: 48.85675, longitude: 2.35299 },
  { capturedAt: new Date(10_000), latitude: 48.85722, longitude: 2.35338 },
  { capturedAt: new Date(15_000), latitude: 48.85769, longitude: 2.35373 },
  { capturedAt: new Date(20_000), latitude: 48.85759, longitude: 2.35455 },
  { capturedAt: new Date(25_000), latitude: 48.85712, longitude: 2.35493 },
  { capturedAt: new Date(30_000), latitude: 48.85662, longitude: 2.35526 },
  { capturedAt: new Date(35_000), latitude: 48.85707, longitude: 2.35568 },
  { capturedAt: new Date(40_000), latitude: 48.85727, longitude: 2.35643 },
]
