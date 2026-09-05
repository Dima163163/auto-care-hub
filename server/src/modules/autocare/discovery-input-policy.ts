import type { AutoCareDiscoveryQuery } from './autocare.types.js'
import { normalizeAutoCareRequestUuid } from './request-input-policy.js'

const sortModes = new Set<AutoCareDiscoveryQuery['sort']>(['recommended', 'price_asc', 'rating_desc', 'distance_asc'])
const priceTypes = new Set<NonNullable<AutoCareDiscoveryQuery['priceType']>>(['fixed', 'from', 'range', 'quote_required'])
const discoveryKeys = new Set([
    'serviceId', 'providerName', 'marketId', 'zoneId', 'radiusKm', 'sort', 'cursor', 'limit',
    'minPrice', 'maxPrice', 'minRating', 'priceType', 'availableToday', 'verifiedOnly',
    'warrantyOnly', 'hasBonus', 'inclusion', 'brandId',
])

function optionalText(value: unknown, maxLength: number, allowEmpty = false): string | undefined | null {
    if (value === undefined) return undefined
    if (typeof value !== 'string') return null
    const normalized = value.normalize('NFKC').trim()
    if (!allowEmpty && normalized.length < 1) return null
    return normalized.length <= maxLength ? normalized : null
}

function optionalFiniteNumber(value: unknown, min: number, max: number): number | undefined | null {
    if (value === undefined) return undefined
    return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : null
}

function optionalBoolean(value: unknown): boolean | undefined | null {
    if (value === undefined) return undefined
    return typeof value === 'boolean' ? value : null
}

/**
 * The HTTP route already validates discovery parameters, but this service is
 * also called by cache warmers and tests. Keep the same bounds and enums at
 * the service boundary so malformed input cannot reach SQL or cache keys.
 */
export function normalizeAutoCareDiscoveryQuery(input: unknown): AutoCareDiscoveryQuery | null {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null
    const value = input as Record<string, unknown>
    if (Object.keys(value).some((key) => !discoveryKeys.has(key))) return null

    const serviceId = optionalText(value.serviceId, 120)
    const providerName = optionalText(value.providerName, 160)
    const marketId = optionalText(value.marketId, 120)
    const zoneId = value.zoneId === undefined ? undefined : normalizeAutoCareRequestUuid(value.zoneId)
    const radiusKm = value.radiusKm === undefined ? 25 : optionalFiniteNumber(value.radiusKm, Number.MIN_VALUE, 500)
    const sort = value.sort === undefined ? 'recommended' : value.sort
    const cursor = optionalText(value.cursor, 2_048, true)
    const limit = value.limit === undefined ? 20 : optionalFiniteNumber(value.limit, 1, 50)
    const minPrice = optionalFiniteNumber(value.minPrice, 0, 1_000_000)
    const maxPrice = optionalFiniteNumber(value.maxPrice, 0, 1_000_000)
    const minRating = optionalFiniteNumber(value.minRating, 0, 5)
    const inclusion = optionalText(value.inclusion, 80)
    const brandId = optionalText(value.brandId, 80)
    const availableToday = optionalBoolean(value.availableToday)
    const verifiedOnly = optionalBoolean(value.verifiedOnly)
    const warrantyOnly = optionalBoolean(value.warrantyOnly)
    const hasBonus = optionalBoolean(value.hasBonus)

    if (serviceId === null || providerName === null || marketId === null) return null
    if (zoneId === null || (value.zoneId !== undefined && !zoneId)) return null
    if (radiusKm === undefined || radiusKm === null || sortModes.has(sort as AutoCareDiscoveryQuery['sort']) === false) return null
    if (cursor === null || limit === undefined || limit === null || !Number.isSafeInteger(limit)) return null
    if (minPrice === null || maxPrice === null || minRating === null) return null
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) return null
    if (value.priceType !== undefined && (typeof value.priceType !== 'string' || !priceTypes.has(value.priceType as NonNullable<AutoCareDiscoveryQuery['priceType']>))) return null
    if (inclusion === null || brandId === null) return null
    if (availableToday === null || verifiedOnly === null || warrantyOnly === null || hasBonus === null) return null

    return {
        radiusKm,
        sort: sort as AutoCareDiscoveryQuery['sort'],
        limit,
        ...(serviceId !== undefined ? { serviceId } : {}),
        ...(providerName !== undefined ? { providerName } : {}),
        ...(marketId !== undefined ? { marketId } : {}),
        ...(zoneId !== undefined ? { zoneId } : {}),
        ...(cursor !== undefined ? { cursor } : {}),
        ...(minPrice !== undefined ? { minPrice } : {}),
        ...(maxPrice !== undefined ? { maxPrice } : {}),
        ...(minRating !== undefined ? { minRating } : {}),
        ...(value.priceType !== undefined ? { priceType: value.priceType as NonNullable<AutoCareDiscoveryQuery['priceType']> } : {}),
        ...(availableToday !== undefined ? { availableToday } : {}),
        ...(verifiedOnly !== undefined ? { verifiedOnly } : {}),
        ...(warrantyOnly !== undefined ? { warrantyOnly } : {}),
        ...(hasBonus !== undefined ? { hasBonus } : {}),
        ...(inclusion !== undefined ? { inclusion } : {}),
        ...(brandId !== undefined ? { brandId } : {}),
    }
}
