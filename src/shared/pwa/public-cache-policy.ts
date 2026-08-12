type PublicCacheRequest = {
    method: string
    pathname: string
    hasAuthorization: boolean
}

const PUBLIC_CABINET_DETAIL_PATH = /^\/api\/cabinets\/(?:cabinet-[^/]+|[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i

export function isPublicCatalogRequest({
    method,
    pathname,
    hasAuthorization,
}: PublicCacheRequest) {
    if (method.toUpperCase() !== 'GET' || hasAuthorization) {
        return false
    }

    return pathname === '/api/cabinets'
        || PUBLIC_CABINET_DETAIL_PATH.test(pathname)
}
