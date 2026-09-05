import { AutoCareCapacityResourceType } from '../../entities/automotive/capacity-resource.entity.js'
import { normalizeProviderMembershipUuid } from './provider-membership-policy.js'

const allowedKeys = new Set(['description', 'priceFromMinor', 'bookingMode', 'requiredResourceTypes', 'requiredResourceIds'])
const maxPriceFromMinor = 10_000_000_000
const resourceTypes = new Set<AutoCareCapacityResourceType>(Object.values(AutoCareCapacityResourceType))

export type NormalizedOwnerAutoCareOfferInput = {
    description: string | null
    priceFromMinor: number
    bookingMode?: 'request' | 'instant'
    requiredResourceTypes?: AutoCareCapacityResourceType[]
    requiredResourceIds?: string[]
}

function normalizeDescription(value: unknown) {
    if (value === null) return null
    if (typeof value !== 'string') return undefined
    const description = value.normalize('NFKC').trim()
    return description.length <= 2_000 ? description || null : undefined
}

function normalizeResourceTypes(value: unknown) {
    if (value === undefined) return undefined
    if (!Array.isArray(value) || value.length > 4) return null
    const result: AutoCareCapacityResourceType[] = []
    for (const item of value) {
        if (typeof item !== 'string' || !resourceTypes.has(item as AutoCareCapacityResourceType)) return null
        if (!result.includes(item as AutoCareCapacityResourceType)) result.push(item as AutoCareCapacityResourceType)
    }
    return result
}

function normalizeResourceIds(value: unknown) {
    if (value === undefined) return undefined
    if (!Array.isArray(value) || value.length > 8) return null
    const result: string[] = []
    for (const item of value) {
        const id = normalizeProviderMembershipUuid(item)
        if (!id) return null
        if (!result.includes(id)) result.push(id)
    }
    return result
}

export function normalizeAutoCareOfferProviderUuid(value: unknown) {
    return normalizeProviderMembershipUuid(value)
}

export function normalizeAutoCareOfferUuid(value: unknown) {
    return normalizeProviderMembershipUuid(value)
}

/**
 * Route validation is not enough because offer updates are also reachable from
 * direct service/replay calls. Keep all persisted offer fields canonical and
 * reject unknown keys before the provider/offer lookup.
 */
export function normalizeOwnerAutoCareOfferInput(input: unknown): NormalizedOwnerAutoCareOfferInput | null {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null
    const value = input as Record<string, unknown>
    if (Object.keys(value).some((key) => !allowedKeys.has(key))) return null
    const description = normalizeDescription(value.description)
    if (description === undefined) return null
    if (typeof value.priceFromMinor !== 'number' || !Number.isSafeInteger(value.priceFromMinor) || value.priceFromMinor < 0 || value.priceFromMinor > maxPriceFromMinor) return null
    if (value.bookingMode !== undefined && value.bookingMode !== 'request' && value.bookingMode !== 'instant') return null
    const requiredResourceTypes = normalizeResourceTypes(value.requiredResourceTypes)
    const requiredResourceIds = normalizeResourceIds(value.requiredResourceIds)
    if (requiredResourceTypes === null || requiredResourceIds === null) return null
    return {
        description,
        priceFromMinor: value.priceFromMinor,
        ...(value.bookingMode === undefined ? {} : { bookingMode: value.bookingMode }),
        ...(requiredResourceTypes === undefined ? {} : { requiredResourceTypes }),
        ...(requiredResourceIds === undefined ? {} : { requiredResourceIds }),
    }
}

export function areAutoCareOfferResourcesCompatible(
    resources: readonly { type: AutoCareCapacityResourceType }[],
    requiredResourceTypes: readonly AutoCareCapacityResourceType[] | undefined,
) {
    if (requiredResourceTypes === undefined) return true
    const allowedTypes = new Set(requiredResourceTypes)
    return resources.every((resource) => allowedTypes.has(resource.type))
}
