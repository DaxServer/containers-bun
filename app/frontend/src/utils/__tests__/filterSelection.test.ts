import type { FilterItem } from '@/utils/filterSelection'
import {
  selectByMinInterval,
  selectByStraightLineDistance,
  selectByTraversalDistance,
  selectEveryNth,
} from '@/utils/filterSelection'
import { describe, expect, it } from 'bun:test'

// 0.001 deg lat ≈ 111m — items spaced ~55m apart along a straight line
const makeItem = (lat: number, lon: number, capturedAtMs: number): FilterItem => ({
  capturedAt: new Date(capturedAtMs),
  latitude: lat,
  longitude: lon,
})

// Straight path, each step ≈55m (0.0005 deg lat)
const STRAIGHT_PATH: FilterItem[] = [
  makeItem(0, 0, 0),
  makeItem(0.0005, 0, 3_000),
  makeItem(0.001, 0, 10_000),
  makeItem(0.0015, 0, 13_000),
  makeItem(0.002, 0, 25_000),
]

describe('selectEveryNth', () => {
  it('selects every Nth item (1-based)', () => {
    const items = Array.from({ length: 6 }, (_, i) => makeItem(0, 0, i))
    expect(selectEveryNth(items, 3)).toEqual([false, false, true, false, false, true])
  })

  it('selects every item when n=1', () => {
    const items = Array.from({ length: 3 }, (_, i) => makeItem(0, 0, i))
    expect(selectEveryNth(items, 1)).toEqual([true, true, true])
  })

  it('selects only last item when n equals length', () => {
    const items = Array.from({ length: 4 }, (_, i) => makeItem(0, 0, i))
    expect(selectEveryNth(items, 4)).toEqual([false, false, false, true])
  })

  it('returns empty array for empty input', () => {
    expect(selectEveryNth([], 3)).toEqual([])
  })
})

describe('selectByMinInterval', () => {
  it('always selects first item', () => {
    const result = selectByMinInterval(STRAIGHT_PATH, 60_000)
    expect(result[0]).toBe(true)
  })

  it('selects items at least minMs apart', () => {
    // timestamps: 0, 3000, 10000, 13000, 25000 — minMs=10000
    // 0 → selected; 3000 (3s gap) → skip; 10000 (10s gap) → select;
    // 13000 (3s gap) → skip; 25000 (15s gap) → select
    expect(selectByMinInterval(STRAIGHT_PATH, 10_000)).toEqual([true, false, true, false, true])
  })

  it('selects all items when all gaps exceed minMs', () => {
    expect(selectByMinInterval(STRAIGHT_PATH, 1_000)).toEqual([true, true, true, true, true])
  })

  it('selects only first item when minMs exceeds all gaps', () => {
    expect(selectByMinInterval(STRAIGHT_PATH, 100_000)).toEqual([true, false, false, false, false])
  })

  it('returns empty array for empty input', () => {
    expect(selectByMinInterval([], 10_000)).toEqual([])
  })
})

describe('selectByTraversalDistance', () => {
  it('always selects first item', () => {
    const result = selectByTraversalDistance(STRAIGHT_PATH, 500)
    expect(result[0]).toBe(true)
  })

  it('accumulates distance between consecutive items and selects when threshold met', () => {
    // each step ≈55m, minMeters=100 → select at steps where accumulated ≥ 100m
    // step 0: selected. step 1: +55m acc=55. step 2: +55m acc=110 ≥ 100 → select, reset
    // step 3: +55m acc=55. step 4: +55m acc=110 ≥ 100 → select, reset
    const result = selectByTraversalDistance(STRAIGHT_PATH, 100)
    expect(result).toEqual([true, false, true, false, true])
  })

  it('selects all items when minMeters is 0', () => {
    const result = selectByTraversalDistance(STRAIGHT_PATH, 0)
    expect(result).toEqual([true, true, true, true, true])
  })

  it('selects only first item when minMeters exceeds total path length', () => {
    const result = selectByTraversalDistance(STRAIGHT_PATH, 100_000)
    expect(result).toEqual([true, false, false, false, false])
  })

  it('returns empty array for empty input', () => {
    expect(selectByTraversalDistance([], 100)).toEqual([])
  })
})

describe('selectByStraightLineDistance', () => {
  it('always selects first item', () => {
    const result = selectByStraightLineDistance(STRAIGHT_PATH, 500)
    expect(result[0]).toBe(true)
  })

  it('measures straight-line distance from last selected item', () => {
    // item 0 at (0,0): selected
    // item 1 at (0.0005,0): ~55m from (0,0) → skip
    // item 2 at (0.001,0): ~111m from (0,0) → select
    // item 3 at (0.0015,0): ~55m from (0.001,0) → skip
    // item 4 at (0.002,0): ~111m from (0.001,0) → select
    const result = selectByStraightLineDistance(STRAIGHT_PATH, 100)
    expect(result).toEqual([true, false, true, false, true])
  })

  it('selects all items when minMeters is 0', () => {
    const result = selectByStraightLineDistance(STRAIGHT_PATH, 0)
    expect(result).toEqual([true, true, true, true, true])
  })

  it('selects only first item when minMeters exceeds all distances', () => {
    const result = selectByStraightLineDistance(STRAIGHT_PATH, 100_000)
    expect(result).toEqual([true, false, false, false, false])
  })

  it('returns empty array for empty input', () => {
    expect(selectByStraightLineDistance([], 100)).toEqual([])
  })

  it('differs from traversal on a zigzag path', () => {
    // zigzag: each step moves 55m north then 55m east alternating
    // traversal accumulates path length; straight-line jumps back to last selected
    const zigzag: FilterItem[] = [
      makeItem(0, 0, 0),
      makeItem(0.0005, 0, 1000), // 55m N
      makeItem(0.0005, 0.0005, 2000), // 55m E — now 78m straight from origin
      makeItem(0.001, 0.0005, 3000), // 55m N
      makeItem(0.001, 0.001, 4000), // 55m E — now 157m straight from origin
    ]
    const traversal = selectByTraversalDistance(zigzag, 100)
    const straightLine = selectByStraightLineDistance(zigzag, 100)
    // They can differ — just verify they both return a valid boolean[]
    expect(traversal).toHaveLength(5)
    expect(straightLine).toHaveLength(5)
    // traversal: acc 55→110 at step 2, selects step 2. acc 55→110 at step 4, selects step 4
    expect(traversal).toEqual([true, false, true, false, true])
    // straight-line: step 0 selected. step 1: 55m from (0,0) → skip.
    // step 2: ~78m from (0,0) → skip. step 3: ~124m from (0,0) → select.
    // step 4: 55m from item 3 → skip
    expect(straightLine).toEqual([true, false, false, true, false])
  })
})
