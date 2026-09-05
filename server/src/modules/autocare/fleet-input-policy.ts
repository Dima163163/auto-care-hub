export type NormalizedAutoCareFleetInput = {
    name: string
    notes: string | null
}

export type NormalizedAutoCareFleetVehicleInput = {
    label: string
    vehicleSnapshot: Record<string, string | number | null>
    approvalPolicy: string | null
}

const fleetKeys = new Set(['name', 'notes'])
const fleetVehicleKeys = new Set(['label', 'vehicleSnapshot', 'approvalPolicy'])
const snapshotKeyPattern = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/

function normalizeText(value: unknown, minLength: number, maxLength: number): string | null {
    if (typeof value !== 'string') return null
    const normalized = value.normalize('NFKC').trim()
    return normalized.length >= minLength && normalized.length <= maxLength ? normalized : null
}

function normalizeNullableText(value: unknown, maxLength: number): string | null | undefined {
    if (value === undefined || value === null) return value === null ? null : undefined
    if (typeof value !== 'string') return undefined
    const normalized = value.normalize('NFKC').trim()
    return normalized.length <= maxLength ? normalized || null : undefined
}

function normalizeFleetVehicleSnapshot(value: unknown): Record<string, string | number | null> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const raw = value as Record<string, unknown>
    const keys = Object.keys(raw)
    if (keys.length > 24 || keys.some((key) => !snapshotKeyPattern.test(key))) return null
    const result: Record<string, string | number | null> = {}
    for (const key of keys) {
        const entry = raw[key]
        if (entry === null) {
            result[key] = null
        } else if (typeof entry === 'string') {
            const normalized = entry.normalize('NFKC').trim()
            if (normalized.length > 256) return null
            result[key] = normalized
        } else if (typeof entry === 'number' && Number.isFinite(entry) && Number.isSafeInteger(entry)) {
            result[key] = entry
        } else {
            return null
        }
    }
    return result
}

export function normalizeAutoCareFleetInput(input: unknown): NormalizedAutoCareFleetInput | null {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null
    const value = input as Record<string, unknown>
    if (Object.keys(value).some((key) => !fleetKeys.has(key))) return null
    const name = normalizeText(value.name, 2, 160)
    if (!name) return null
    const notes = normalizeNullableText(value.notes, 4_000)
    if (value.notes !== undefined && notes === undefined) return null
    return { name, notes: notes ?? null }
}

export function normalizeAutoCareFleetVehicleInput(input: unknown): NormalizedAutoCareFleetVehicleInput | null {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null
    const value = input as Record<string, unknown>
    if (Object.keys(value).some((key) => !fleetVehicleKeys.has(key))) return null
    const label = normalizeText(value.label, 1, 120)
    const vehicleSnapshot = normalizeFleetVehicleSnapshot(value.vehicleSnapshot)
    if (!label || !vehicleSnapshot) return null
    const approvalPolicy = normalizeNullableText(value.approvalPolicy, 160)
    if (value.approvalPolicy !== undefined && approvalPolicy === undefined) return null
    return { label, vehicleSnapshot, approvalPolicy: approvalPolicy ?? null }
}
