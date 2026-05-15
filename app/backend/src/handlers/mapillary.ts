import { config } from '@backend/config'
import { reverseGeocodeBatch } from '@backend/core/geocoding'
import type { ExistingPage, MediaImage } from '@backend/types/ws'

const MAPILLARY_FIELDS =
  'captured_at,compass_angle,creator,geometry,height,is_pano,make,model,thumb_256_url,thumb_1024_url,thumb_original_url,width'

interface MapillaryImage {
  id: string
  geometry: { type: string; coordinates: [number, number] }
  creator: { id: string; username: string }
  captured_at: number
  compass_angle?: number
  thumb_original_url?: string
  thumb_1024_url?: string
  thumb_256_url?: string
  width?: number
  height?: number
  is_pano?: boolean
  make?: string
  model?: string
}

function fromMapillary(image: MapillaryImage): MediaImage | null {
  const { geometry, creator: owner, captured_at } = image

  if (!geometry) return null
  const coords = geometry.coordinates
  if (!coords || coords.length < 2) return null
  if (!owner) return null
  if (captured_at == null) return null

  const rawAngle = Number(image.compass_angle ?? 0)
  const compass_angle = rawAngle > 0 && rawAngle < 360 ? rawAngle : null

  const dt = new Date(Math.floor(captured_at / 1000) * 1000)
  const date = dt.toISOString().slice(0, 10)

  const make = image.make === 'none' ? null : (image.make ?? null)
  const model = image.model === 'none' ? null : (image.model ?? null)

  return {
    id: String(image.id),
    title: `Photo from Mapillary ${date} (${String(image.id)}).jpg`,
    dates: { taken: dt.toISOString() },
    creator: {
      id: String(owner.id),
      username: String(owner.username ?? 'Unknown'),
      profile_url: `https://www.mapillary.com/app/user/${owner.username ?? 'unknown'}`,
    },
    location: {
      latitude: coords[1],
      longitude: coords[0],
      compass_angle,
    },
    urls: {
      url: `https://www.mapillary.com/app/?pKey=${image.id}&focus=photo`,
      original: String(image.thumb_original_url ?? ''),
      preview: String(image.thumb_1024_url ?? ''),
      thumbnail: String(image.thumb_256_url ?? ''),
    },
    dimensions: {
      width: Number(image.width ?? 0),
      height: Number(image.height ?? 0),
    },
    camera: {
      make,
      model,
      is_pano: Boolean(image.is_pano),
    },
    existing: [],
  }
}

async function fetchSequenceData(sequenceId: string): Promise<Record<string, MapillaryImage>> {
  const url = new URL('https://graph.mapillary.com/images')
  url.searchParams.set('sequence_ids', sequenceId)
  url.searchParams.set('fields', MAPILLARY_FIELDS)

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${config.mapillaryApiToken}` },
    signal: AbortSignal.timeout(60_000),
  })
  if (!res.ok) throw new Error(`Mapillary API error: ${res.status}`)

  const data = (await res.json()) as { data: MapillaryImage[] }
  const images = data.data
  images.sort((a, b) => a.captured_at - b.captured_at)
  return Object.fromEntries(images.map((i) => [String(i.id), i]))
}

async function getSequenceIds(sequenceId: string): Promise<string[]> {
  const url = new URL('https://graph.mapillary.com/images')
  url.searchParams.set('sequence_ids', sequenceId)

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${config.mapillaryApiToken}` },
    signal: AbortSignal.timeout(60_000),
  })
  if (!res.ok) throw new Error(`Mapillary API error: ${res.status}`)

  const data = (await res.json()) as { data: { id: string }[] }
  return data.data.map((i) => String(i.id))
}

async function fetchImagesByIds(imageIds: string[]): Promise<Record<string, MapillaryImage>> {
  if (imageIds.length === 0) return {}

  const url = new URL('https://graph.mapillary.com')
  url.searchParams.set('ids', imageIds.join(','))
  url.searchParams.set('fields', MAPILLARY_FIELDS)

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${config.mapillaryApiToken}` },
    signal: AbortSignal.timeout(60_000),
  })
  if (!res.ok) throw new Error(`Mapillary API error: ${res.status}`)

  const data = (await res.json()) as Record<string, MapillaryImage>
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [String(k), v]))
}

async function resolveSequenceIdFromImage(imageId: string): Promise<string | null> {
  const res = await fetch(`https://graph.mapillary.com/${imageId}?fields=sequence`, {
    headers: { Authorization: `Bearer ${config.mapillaryApiToken}` },
    signal: AbortSignal.timeout(60_000),
  })
  if (!res.ok) throw new Error(`Mapillary API error: ${res.status}`)

  const data = (await res.json()) as { sequence?: string }
  return data.sequence ?? null
}

async function fetchExistingPages(imageIds: string[]): Promise<Record<string, ExistingPage[]>> {
  const values = imageIds.map((id) => `"${id.replace(/"/g, '')}"`).join(' ')
  const query = `SELECT ?file ?id WHERE {
  VALUES ?id { ${values} }
  ?file wdt:P7418 ?id.
}`

  const res = await fetch('https://commons-query.wikimedia.org/sparql', {
    method: 'POST',
    headers: {
      Accept: 'application/sparql-results+json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': config.userAgent,
      Cookie: `wcqsOauth=${config.wcqsOauthToken}`,
    },
    body: `query=${encodeURIComponent(query)}`,
    redirect: 'follow',
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`WCQS SPARQL error: ${res.status}`)

  const data = (await res.json()) as {
    results: { bindings: { file: { value: string }; id: { value: string } }[] }
  }

  const existing: Record<string, ExistingPage[]> = {}
  for (const binding of data.results.bindings) {
    const imageId = binding.id.value
    const fileUrl = binding.file.value
    if (!existing[imageId]) existing[imageId] = []
    existing[imageId].push({ url: fileUrl })
  }
  return existing
}

export class MapillaryHandler {
  readonly name = 'mapillary'

  async fetchCollection(
    input: string,
  ): Promise<{ images: Record<string, MediaImage>; sequenceId: string }> {
    let sequenceId = input

    if (input.startsWith('https://www.mapillary.com/app/') && input.includes('?')) {
      const params = new URLSearchParams(input.split('?')[1])
      const pKey = params.get('pKey')
      if (pKey) {
        const resolved = await resolveSequenceIdFromImage(pKey)
        if (resolved) sequenceId = resolved
      }
    }

    const collection = await fetchSequenceData(sequenceId)
    const images: Record<string, MediaImage> = Object.fromEntries(
      Object.entries(collection)
        .map(([k, v]) => [k, fromMapillary(v)] as const)
        .filter((entry): entry is [string, MediaImage] => entry[1] !== null),
    )

    await reverseGeocodeBatch(Object.values(images))

    const existingPages = await fetchExistingPages(Object.keys(images))
    for (const [id, pages] of Object.entries(existingPages)) {
      if (images[id]) images[id].existing = pages
    }

    return { images, sequenceId }
  }

  async fetchCollectionIds(input: string): Promise<string[]> {
    return getSequenceIds(input)
  }

  async fetchImagesBatch(imageIds: string[], _input: string): Promise<Record<string, MediaImage>> {
    const data = await fetchImagesByIds(imageIds)
    return Object.fromEntries(
      Object.entries(data)
        .map(([k, v]) => [k, fromMapillary(v)] as const)
        .filter((entry): entry is [string, MediaImage] => entry[1] !== null),
    )
  }
}
