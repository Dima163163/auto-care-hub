import { AutoCareCapacityResourceType } from '../../entities/automotive/capacity-resource.entity.js'
import { normalizeProviderMembershipUuid } from './provider-membership-policy.js'

const allowedCreateKeys = ['locationId', 'type', 'name', 'capacity', 'active', 'metadata'] as const
const allowedPatchKeys = ['type', 'name', 'capacity', 'active', 'metadata'] as const
const allowedReservationKeys = ['locationId', 'from', 'to'] as const
const reservationDatePattern = /(?:Z|[+-]\d{2}:\d{2})$/

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]) {
    const allowedKeys = new Set(allowed)
    return Object.keys(value).every((key) => allowedKeys.has(key))
}

function normalizeName(value: unknown) {
    if (typeof value !== 'string') return null
    const name = value.normalize('NFKC').trim()
    return name.length >= 1 && name.length <= 120 ? name : null
}

function normalizeMetadata(value: unknown) {
    if (value === undefined) return {}
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const metadata = value as Record<string, unknown>
    if (Object.keys(metadata).length > 32) return null
    try {
        if (JSON.stringify(metadata).length > 8_192) return null
    } catch {
        return null
    }
    return metadata
}

function normalizeCapacity(value: unknown) {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1 && value <= 100 ? value : null
}

export function normalizeAutoCareCapacityProviderUuid(value: unknown) {
    return normalizeProviderMembershipUuid(value)
}

export function normalizeAutoCareCapacityResourceInput(input: unknown) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null
    const value = input as Record<string, unknown>
    if (!hasOnlyKeys(value, allowedCreateKeys)) return null
    const locationId = normalizeAutoCareCapacityProviderUuid(value.locationId)
    const name = normalizeName(value.name)
    const capacity = value.capacity === undefined ? 1 : normalizeCapacity(value.capacity)
    const active = value.active === undefined ? true : value.active
    const metadata = normalizeMetadata(value.metadata)
    if (!locationId || !name || capacity === null || typeof active !== 'boolean' || metadata === null) return null
    if (typeof value.type !== 'string' || !Object.values(AutoCareCapacityResourceType).includes(value.type as AutoCareCapacityResourceType)) return null
    return {
        locationId,
        type: value.type as AutoCareCapacityResourceType,
        name,
        capacity,
        active,
        metadata,
    }
}

export function normalizeAutoCareCapacityResourcePatch(input: unknown) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null
    const value = input as Record<string, unknown>
    if (!hasOnlyKeys(value, allowedPatchKeys)) return null
    const result: {
        type?: AutoCareCapacityResourceType
        name?: string
        capacity?: number
        active?: boolean
        metadata?: Record<string, unknown>
    } = {}
    if (value.type !== undefined) {
        if (typeof value.type !== 'string' || !Object.values(AutoCareCapacityResourceType).includes(value.type as AutoCareCapacityResourceType)) return null
        result.type = value.type as AutoCareCapacityResourceType
    }
    if (value.name !== undefined) {
        const name = normalizeName(value.name)
        if (!name) return null
        result.name = name
    }
    if (value.capacity !== undefined) {
        const capacity = normalizeCapacity(value.capacity)
        if (capacity === null) return null
        result.capacity = capacity
    }
    if (value.active !== undefined) {
        if (typeof value.active !== 'boolean') return null
        result.active = value.active
    }
    if (value.metadata !== undefined) {
        const metadata = normalizeMetadata(value.metadata)
        if (metadata === null) return null
        result.metadata = metadata
    }
    return result
}

export function normalizeAutoCareCapacityReservationQuery(input: unknown) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null
    const value = input as Record<string, unknown>
    if (!hasOnlyKeys(value, allowedReservationKeys)) return null
    const locationId = value.locationId === undefined ? undefined : normalizeAutoCareCapacityProviderUuid(value.locationId)
    if (value.locationId !== undefined && !locationId) return null
    const from = value.from === undefined ? undefined : typeof value.from === 'string' ? value.from.normalize('NFKC').trim() : null
    const to = value.to === undefined ? undefined : typeof value.to === 'string' ? value.to.normalize('NFKC').trim() : null
    if (from === null || to === null) return null
    if (from !== undefined && (!reservationDatePattern.test(from) || Number.isNaN(Date.parse(from)))) return null
    if (to !== undefined && (!reservationDatePattern.test(to) || Number.isNaN(Date.parse(to)))) return null
    return { locationId: locationId ?? undefined, from, to }
}
