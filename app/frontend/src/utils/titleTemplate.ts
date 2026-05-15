import type { GeoLocation } from '@/types/asyncapi'
import type { Image } from '@/types/image'
import Handlebars from 'handlebars'

interface FieldDefinition {
  path: string
  name: string
  description: string
}

// Helper to pad numbers
const pad = (num: number, size = 2) => String(num).padStart(size, '0')

export const AVAILABLE_IMAGE_FIELDS = {
  image: {
    id: {
      path: 'mapillary.photo.id',
      name: 'Mapillary image ID',
      description: 'Mapillary image ID',
    },
    sequence: {
      path: 'mapillary.photo.sequence',
      name: 'Mapillary sequence ID',
      description: 'Mapillary sequence ID',
    },
    width: { path: 'image.width', name: 'Width', description: 'Image width in pixels' },
    height: { path: 'image.height', name: 'Height', description: 'Image height in pixels' },
  },
  captured: {
    date: { path: 'captured.date', name: 'Date', description: 'UTC date in YYYY-MM-DD format' },
    time: {
      path: 'captured.time',
      name: 'Time',
      description: 'UTC time in HHHMMMSSS format (Example: 02H05M30S)',
    },
    time_ms: {
      path: 'captured.time_ms',
      name: 'Time in milliseconds',
      description: 'UTC time with milliseconds in HHHMMMSSSsss format (Example: 02H05M30S030)',
    },
    year: { path: 'captured.year', name: 'Year', description: 'UTC year when the photo was taken' },
    month: {
      path: 'captured.month',
      name: 'Month',
      description: 'UTC month when the photo was taken (01-12)',
    },
    day_of_month: {
      path: 'captured.day_of_month',
      name: 'Day of the month',
      description: 'UTC day of the month (01-31)',
    },
    hours: { path: 'captured.hours', name: 'Hours', description: 'UTC hours (00-23)' },
    minutes: { path: 'captured.minutes', name: 'Minutes', description: 'UTC minutes (00-59)' },
    seconds: { path: 'captured.seconds', name: 'Seconds', description: 'UTC seconds (00-59)' },
    milliseconds: {
      path: 'captured.milliseconds',
      name: 'Milliseconds',
      description: 'UTC milliseconds (000-999)',
    },
    raw: {
      path: 'captured.raw',
      name: 'ISO format',
      description:
        'Longer version in YYYY-MM-DDTHHHMMMSSSsssZ format (Example: 2023-08-15T02H05M30S030Z)',
    },
  },
  camera: {
    make: { path: 'camera.make', name: 'Manufacturer', description: 'Camera manufacturer' },
    model: { path: 'camera.model', name: 'Model', description: 'Camera model' },
  },
  creator: {
    id: {
      path: 'mapillary.user.id',
      name: 'Mapillary user ID',
      description: 'Mapillary user ID of the uploader',
    },
    username: {
      path: 'mapillary.user.username',
      name: 'Mapillary username',
      description: 'Mapillary username of the uploader',
    },
  },
  location: {
    latitude: { path: 'location.latitude', name: 'Latitude', description: 'Latitude coordinate' },
    longitude: {
      path: 'location.longitude',
      name: 'Longitude',
      description: 'Longitude coordinate',
    },
    compass_angle: {
      path: 'location.compass_angle',
      name: 'Compass angle',
      description: 'Compass angle / heading',
    },
    city: { path: 'location.city', name: 'City', description: 'City name' },
    country: { path: 'location.country', name: 'Country', description: 'Country name' },
    country_code: {
      path: 'location.country_code',
      name: 'Country code',
      description: 'ISO country code',
    },
    county: { path: 'location.county', name: 'County', description: 'County name' },
    state: { path: 'location.state', name: 'State', description: 'State or province name' },
    postcode: { path: 'location.postcode', name: 'Postcode', description: 'Postal code' },
  },
} satisfies Record<string, Record<string, FieldDefinition>>

export type FieldGroup = keyof typeof AVAILABLE_IMAGE_FIELDS

export const CAMERA_FIELD_PATHS = ['camera.make', 'camera.model'] as const

export const OPTIONAL_LOCATION_FIELD_PATHS = [
  'location.compass_angle',
  'location.city',
  'location.country',
  'location.country_code',
  'location.county',
  'location.state',
  'location.postcode',
] as const

export const OPTIONAL_FIELD_PATHS = [
  ...CAMERA_FIELD_PATHS,
  ...OPTIONAL_LOCATION_FIELD_PATHS,
] as const

export const validPaths = Object.values(AVAILABLE_IMAGE_FIELDS).flatMap((group) =>
  Object.values(group).map((field) => field.path),
)

export const FIELD_PATH_TO_NAME: Record<string, string> = Object.fromEntries(
  Object.values(AVAILABLE_IMAGE_FIELDS).flatMap((group) =>
    Object.values(group).map((field) => [field.path, field.name]),
  ),
)

const prepareContext = (image: Image, sequence: string) => {
  const taken = image.dates.taken
  const dates = {
    year: taken.getUTCFullYear(),
    month: pad(taken.getUTCMonth() + 1),
    day_of_month: pad(taken.getUTCDate()),
    hours: pad(taken.getUTCHours()),
    minutes: pad(taken.getUTCMinutes()),
    seconds: pad(taken.getUTCSeconds()),
    milliseconds: pad(taken.getUTCMilliseconds(), 3),
  }

  const d = `${dates.year}-${dates.month}-${dates.day_of_month}`
  const time = `${dates.hours}H${dates.minutes}M${dates.seconds}S`
  const time_ms = `${time}${dates.milliseconds}`

  return {
    camera: {
      make: image.camera.make,
      model: image.camera.model,
    },
    captured: {
      date: d,
      time,
      time_ms,
      year: dates.year,
      month: dates.month,
      day_of_month: dates.day_of_month,
      hours: dates.hours,
      minutes: dates.minutes,
      seconds: dates.seconds,
      milliseconds: dates.milliseconds,
      raw: `${d}T${time_ms}Z`,
    },
    image: {
      width: image.dimensions.width,
      height: image.dimensions.height,
    },
    location: image.location,
    mapillary: {
      photo: {
        id: image.id,
        sequence: sequence,
      },
      user: {
        id: image.creator.id,
        username: image.creator.username,
      },
    },
  }
}

export const applyFieldTemplate = (template: string, image: Image, sequence: string): string => {
  if (!template) return template
  const context = prepareContext(image, sequence)
  return template.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (match, path: string) => {
    if (!validPaths.includes(path)) return match
    const keys = path.split('.')
    let value: Record<string, unknown> = context as Record<string, unknown>
    for (const key of keys) {
      if (value == null || typeof value !== 'object') return match
      value = value[key] as Record<string, unknown>
    }
    return value != null ? String(value) : match
  })
}

export const applyTitleTemplate = (templateStr: string, image: Image, sequence: string): string => {
  try {
    const template = Handlebars.compile(templateStr, { noEscape: true })
    const context = prepareContext(image, sequence)
    return template(context)
  } catch (_e) {
    return templateStr
  }
}

export const VALID_EXTENSIONS = [
  'gif',
  'jpeg',
  'jpg',
  'pdf',
  'png',
  'svg',
  'tif',
  'tiff',
  'webm',
  'webp',
]

export const isValidExtension = (filename: string): boolean => {
  const lower = filename.toLowerCase()
  return VALID_EXTENSIONS.some((ext) => lower.endsWith(`.${ext}`))
}

export const extractUsedCameraFields = (template: string): string[] => {
  const matches = template.match(/\{\{([^{}]+)\}\}/g) || []
  return matches
    .map((m) => m.slice(2, -2).trim())
    .filter((p): p is 'camera.make' | 'camera.model' =>
      (CAMERA_FIELD_PATHS as readonly string[]).includes(p),
    )
}

export const hasMissingCameraFields = (image: Image, usedFields: readonly string[]): boolean => {
  return usedFields.some((path) => {
    if (path === 'camera.make') return !image.camera.make
    if (path === 'camera.model') return !image.camera.model
    return false
  })
}

export const extractUsedOptionalFields = (template: string): string[] => {
  const matches = template.match(/\{\{([^{}]+)\}\}/g) || []
  return matches
    .map((m) => m.slice(2, -2).trim())
    .filter((p): p is (typeof OPTIONAL_FIELD_PATHS)[number] =>
      (OPTIONAL_FIELD_PATHS as readonly string[]).includes(p),
    )
}

export const hasMissingOptionalFields = (image: Image, usedFields: readonly string[]): boolean => {
  return usedFields.some((path) => {
    if (path === 'camera.make') return !image.camera.make
    if (path === 'camera.model') return !image.camera.model
    if (path.startsWith('location.')) {
      const locationKey = path.slice('location.'.length) as keyof GeoLocation
      const value = (image.location as GeoLocation)[locationKey]
      // compass_angle uses == null: 0 is a valid heading (North), only null/undefined is missing
      // String fields use falsy: empty string is treated the same as absent
      return typeof value === 'number' ? value == null : !value
    }
    return false
  })
}

export const validateTemplate = (t: string): { valid: boolean; error: string | null } => {
  if (!t) {
    return { valid: true, error: null }
  }

  // 1. Check syntax using Handlebars parser
  try {
    Handlebars.precompile(t)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)

    if (msg.includes("got 'EOF'") || msg.includes("got 'INVALID'")) {
      return {
        valid: false,
        error: 'Mismatched syntax: ensure all variables are correct and are enclosed within {{ }}',
      }
    }
    if (msg.includes("Expecting 'ID'")) {
      return { valid: false, error: 'Empty tag: {{}}' }
    }
    return { valid: false, error: `Template syntax error: ${msg}` }
  }

  // 2. Validate variables against allowlist
  // Handlebars allows more complex expressions, but we only support simple variable access
  const matches = t.match(/\{\{([\s\S]+?)\}\}/g) || []

  for (const match of matches) {
    const content = match.slice(2, -2).trim()

    if (!content) {
      return { valid: false, error: 'Empty tag: {{}}' }
    }

    if (!validPaths.includes(content)) {
      return {
        valid: false,
        error: `Unknown variable: ${match}. Please use one of the available variables.`,
      }
    }
  }

  // 3. Validate extension
  if (!isValidExtension(t)) {
    return {
      valid: false,
      error: `Invalid extension. Valid extensions are: ${VALID_EXTENSIONS.join(', ')}`,
    }
  }

  return { valid: true, error: null }
}
