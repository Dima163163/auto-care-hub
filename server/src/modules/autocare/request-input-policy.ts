import type { AutoCareRequestSnapshot } from './autocare.types.js'

export type NormalizedAutoCareServiceRequestInput = {
    providerId: string
    locationId: string
    offeringId: string
    preferredAt: string
    vehicleId: string | null
    vehicleSnapshot: AutoCareRequestSnapshot | null
    contactSnapshot: AutoCareRequestSnapshot
    note: string | null
    idempotencyKey?: string
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const datetimeWithOffsetPattern = /(?:Z|[+-]\d{2}:\d{2})$/
const contactKeys = new Set(['name', 'email', 'phone'])
const vehicleKeys = new Set(['make', 'model', 'year', 'mileage', 'fuelType', 'engineDisplacement', 'horsepower', 'color', 'licensePlate', 'internalNumber', 'vin'])

function normalizeUuid(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const normalized = value.trim().toLowerCase()
    return uuidPattern.test(normalized) ? normalized : null
}

export function normalizeAutoCareRequestUuid(value: unknown) {
    return normalizeUuid(value)
}

function normalizeString(value: unknown, minLength: number, maxLength: number): string | null {
    if (typeof value !== 'string') return null
    const normalized = value.normalize('NFKC').trim()
    return normalized.length >= minLength && normalized.length <= maxLength ? normalized : null
}

function normalizeOptionalString(value: unknown, maxLength: number): string | null | undefined {
    if (value === undefined) return undefined
    if (value === null) return null
    if (typeof value !== 'string') return undefined
    const normalized = value.normalize('NFKC').trim()
    return normalized.length <= maxLength ? normalized || null : undefined
}

function normalizeContactSnapshot(value: unknown): AutoCareRequestSnapshot | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const raw = value as Record<string, unknown>
    if (Object.keys(raw).some((key) => !contactKeys.has(key))) return null
    const result: AutoCareRequestSnapshot = {}
    if ('name' in raw) {
        const name = normalizeString(raw.name, 2, 120)
        if (!name) return null
        result.name = name
    }
    if ('email' in raw) {
        const email = normalizeString(raw.email, 3, 320)?.toLowerCase() ?? null
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
        result.email = email
    }
    if ('phone' in raw) {
        const phone = normalizeString(raw.phone, 5, 32)
        if (!phone) return null
        result.phone = phone
    }
    return result
}

export function normalizeAutoCareVehicleSnapshot(value: unknown): AutoCareRequestSnapshot | null {
    if (value === undefined || value === null) return null
    if (typeof value !== 'object' || Array.isArray(value)) return null
    const raw = value as Record<string, unknown>
    if (Object.keys(raw).some((key) => !vehicleKeys.has(key))) return null
    const make = normalizeString(raw.make, 1, 80)
    const model = normalizeString(raw.model, 1, 80)
    if (!make || !model || typeof raw.year !== 'number' || !Number.isSafeInteger(raw.year) || raw.year < 1_886 || raw.year > new Date().getFullYear() + 1) return null
    const result: AutoCareRequestSnapshot = { make, model, year: raw.year }
    if ('mileage' in raw) {
        if (typeof raw.mileage !== 'number' || !Number.isSafeInteger(raw.mileage) || raw.mileage < 0 || raw.mileage > 2_000_000) return null
        result.mileage = raw.mileage
    }
    const fuelType = normalizeOptionalString(raw.fuelType, 40)
    if ('fuelType' in raw && fuelType === undefined) return null
    if (fuelType !== undefined) result.fuelType = fuelType
    if ('engineDisplacement' in raw) {
        if (raw.engineDisplacement !== null && (typeof raw.engineDisplacement !== 'number' || !Number.isFinite(raw.engineDisplacement) || raw.engineDisplacement < 0 || raw.engineDisplacement > 20)) return null
        result.engineDisplacement = raw.engineDisplacement
    }
    if ('horsepower' in raw) {
        if (raw.horsepower !== null && (typeof raw.horsepower !== 'number' || !Number.isSafeInteger(raw.horsepower) || raw.horsepower < 0 || raw.horsepower > 3_000)) return null
        result.horsepower = raw.horsepower
    }
    const color = normalizeOptionalString(raw.color, 40)
    if ('color' in raw && color === undefined) return null
    if (color !== undefined) result.color = color
    for (const key of ['licensePlate', 'internalNumber'] as const) {
        if (!(key in raw)) continue
        const normalized = normalizeOptionalString(raw[key], key === 'licensePlate' ? 24 : 64)
        if (normalized === undefined) return null
        result[key] = normalized
    }
    if ('vin' in raw) {
        const vin = normalizeOptionalString(raw.vin, 17)
        if (vin === undefined) return null
        result.vin = vin?.toUpperCase() ?? null
    }
    return result
}

function normalizePreferredAt(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const normalized = value.normalize('NFKC').trim()
    if (!datetimeWithOffsetPattern.test(normalized)) return null
    const timestamp = Date.parse(normalized)
    return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null
}

/**
 * The HTTP route validates this payload with Zod, but request creation is also
 * used directly by jobs and tests. Keep identifiers, PII snapshots and dates
 * canonical before any provider lookup or JSONB write.
 */
export function normalizeAutoCareServiceRequestInput(input: unknown): NormalizedAutoCareServiceRequestInput | null {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null
    const value = input as Record<string, unknown>
    const providerId = normalizeUuid(value.providerId)
    const locationId = normalizeUuid(value.locationId)
    const offeringId = normalizeUuid(value.offeringId)
    const preferredAt = normalizePreferredAt(value.preferredAt)
    const vehicleId = value.vehicleId === undefined || value.vehicleId === null ? null : normalizeUuid(value.vehicleId)
    if (!providerId || !locationId || !offeringId || !preferredAt || (value.vehicleId !== undefined && value.vehicleId !== null && !vehicleId)) return null
    const vehicleSnapshot = normalizeAutoCareVehicleSnapshot(value.vehicleSnapshot)
    if (value.vehicleSnapshot !== undefined && value.vehicleSnapshot !== null && !vehicleSnapshot) return null
    const contactSnapshot = normalizeContactSnapshot(value.contactSnapshot)
    if (!contactSnapshot) return null
    const note = normalizeOptionalString(value.note, 4_000)
    if (value.note !== undefined && note === undefined) return null
    if (value.idempotencyKey !== undefined && typeof value.idempotencyKey !== 'string') return null
    const idempotencyKey = typeof value.idempotencyKey === 'string' ? value.idempotencyKey.trim() : undefined
    return { providerId, locationId, offeringId, preferredAt, vehicleId, vehicleSnapshot, contactSnapshot, note: note ?? null, ...(typeof idempotencyKey === 'string' ? { idempotencyKey } : {}) }
}
