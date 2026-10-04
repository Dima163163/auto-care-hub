

export function getDistanceKm(latitude: number | null, longitude: number | null, marketLatitude = 55.7558, marketLongitude = 37.6173) {
    if (latitude === null || longitude === null) return Number.MAX_SAFE_INTEGER
    const latDistance = (latitude - marketLatitude) * 111
    const lngDistance = (longitude - marketLongitude) * 111 * Math.cos((marketLatitude * Math.PI) / 180)
    return Math.sqrt((latDistance ** 2) + (lngDistance ** 2))
}

export function getBoundingBox(centerLatitude: number, centerLongitude: number, radiusKm: number) {
    const latDelta = radiusKm / 111
    const longitudeScale = Math.max(0.01, Math.cos((centerLatitude * Math.PI) / 180))
    const longitudeDelta = radiusKm / (111 * longitudeScale)
    return {
        minLatitude: centerLatitude - latDelta,
        maxLatitude: centerLatitude + latDelta,
        minLongitude: centerLongitude - longitudeDelta,
        maxLongitude: centerLongitude + longitudeDelta,
    }
}
