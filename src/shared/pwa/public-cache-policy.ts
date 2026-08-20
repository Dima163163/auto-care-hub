type PublicCacheRequest = {
    method: string
    pathname: string
    hasAuthorization: boolean
}

export const PUBLIC_DISCOVERY_CACHE_NAME = 'autocare-hub-public-discovery'

const PUBLIC_AUTOCARE_STATIC_PATHS = new Set([
    '/api/v1/markets',
    '/api/v1/service-definitions',
    '/api/v1/reviews/featured',
    '/api/v1/platform-reviews',
])
const PUBLIC_AUTOCARE_PROVIDER_DETAIL_PATH = /^\/api\/v1\/providers\/[^/]+$/i
const PUBLIC_AUTOCARE_LOCATION_ZONES_PATH = /^\/api\/v1\/markets\/[^/]+\/zones$/i

export function isPublicDiscoveryRequest({
    method,
    pathname,
    hasAuthorization,
}: PublicCacheRequest) {
    if (method.toUpperCase() !== 'GET' || hasAuthorization) {
        return false
    }

    return PUBLIC_AUTOCARE_STATIC_PATHS.has(pathname)
        || pathname === '/api/v1/discovery/providers'
        || PUBLIC_AUTOCARE_PROVIDER_DETAIL_PATH.test(pathname)
        || PUBLIC_AUTOCARE_LOCATION_ZONES_PATH.test(pathname)
}
