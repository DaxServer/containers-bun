const EARTH_RADIUS_METERS = 6_378_137

export const haversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export const decimalToDMS = (deg: number, type: 'lat' | 'lon'): string => {
  const absolute = Math.abs(deg)
  const degrees = Math.floor(absolute)
  const minutesNotTruncated = (absolute - degrees) * 60
  const minutes = Math.floor(minutesNotTruncated)
  const seconds = (minutesNotTruncated - minutes) * 60

  let direction = ''
  if (type === 'lat') {
    direction = deg >= 0 ? 'N' : 'S'
  } else {
    direction = deg >= 0 ? 'E' : 'W'
  }

  const minutesStr = minutes.toString().padStart(2, '0')
  const secondsStr = seconds.toFixed(3).padStart(6, '0')

  return `${degrees}° ${minutesStr}′ ${secondsStr}″ ${direction}`
}
