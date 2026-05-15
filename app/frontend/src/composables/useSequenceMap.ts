import { useCollectionsStore } from '@/stores/collections.store'
import type { FeatureCollection, LineString, Point } from 'geojson'
import { computed } from 'vue'

export function useSequenceMap() {
  const store = useCollectionsStore()

  const validItems = computed(() =>
    store.itemsArray.filter((item) => !item.isSkeleton).sort((a, b) => a.index - b.index),
  )

  const geoJSON = computed<
    FeatureCollection<
      Point,
      { selected: boolean; number: number; label: string; compass_angle?: number }
    >
  >(() => {
    const items = validItems.value
    const n = items.length
    return {
      type: 'FeatureCollection',
      features: items.map((item, i) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [item.image.location.longitude, item.image.location.latitude],
        },
        properties: {
          selected: item.meta.selected,
          number: item.index,
          label: n >= 2 && i === 0 ? 'Start' : n >= 2 && i === n - 1 ? 'End' : '',
          ...(item.image.location.compass_angle != null
            ? { compass_angle: item.image.location.compass_angle }
            : {}),
        },
      })),
    }
  })

  const pathGeoJSON = computed<FeatureCollection<LineString>>(() => {
    const coords = validItems.value.map((item) => [
      item.image.location.longitude,
      item.image.location.latitude,
    ])
    return {
      type: 'FeatureCollection',
      features:
        coords.length >= 2
          ? [
              {
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: coords },
                properties: {},
              },
            ]
          : [],
    }
  })

  return { geoJSON, pathGeoJSON }
}
