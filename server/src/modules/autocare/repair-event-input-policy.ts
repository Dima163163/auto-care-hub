import { normalizeAutoCareRequestUuid } from './request-input-policy.js'

export type NormalizedAutoCareRepairEventInput = {
    requestId: string
    actorId: string | null
    eventType: string
    title: string
    notes: string | null
    metadata: Record<string, string | number | boolean | null | Array<string | number | boolean | null>>
}

const allowedKeys = new Set(['requestId', 'actorId', 'eventType', 'title', 'notes', 'metadata'])
const eventTypePattern = /^[a-z][a-z0-9_-]{0,63}$/
const metadataKeyPattern = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/

function normalizeText(value: unknown, minLength: number, maxLength: number) {
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

type RepairEventMetadataValue = string | number | boolean | null | Array<string | number | boolean | null>

function normalizeMetadata(value: unknown): Record<string, RepairEventMetadataValue> | null {
    if (value === undefined || value === null) return {}
    if (typeof value !== 'object' || Array.isArray(value)) return null
    const raw = value as Record<string, unknown>
    const keys = Object.keys(raw)
    if (keys.length > 32 || keys.some((key) => !metadataKeyPattern.test(key))) return null
    const result: Record<string, RepairEventMetadataValue> = {}
    for (const key of keys) {
        const entry = raw[key]
        if (entry === null || typeof entry === 'boolean') {
            result[key] = entry
            continue
        }
        if (typeof entry === 'string') {
            const normalized = entry.normalize('NFKC').trim()
            if (normalized.length > 512) return null
            result[key] = normalized
            continue
        }
        if (typeof entry === 'number' && Number.isFinite(entry) && Number.isSafeInteger(entry)) {
            result[key] = entry
            continue
        }
        if (Array.isArray(entry) && entry.length <= 32) {
            const normalized = entry.map((item) => {
                if (item === null || typeof item === 'boolean') return item
                if (typeof item === 'string') return item.normalize('NFKC').trim()
                return typeof item === 'number' && Number.isFinite(item) && Number.isSafeInteger(item) ? item : undefined
            })
            if (normalized.some((item) => item === undefined || (typeof item === 'string' && item.length > 256))) return null
            result[key] = normalized as Array<string | number | boolean | null>
            continue
        }
        return null
    }
    return JSON.stringify(result).length <= 8_192 ? result : null
}

/**
 * Repair events are written from both transaction transitions and internal
 * jobs. Keep their audit payload bounded and canonical before JSONB writes.
 */
export function normalizeAutoCareRepairEventInput(input: unknown): NormalizedAutoCareRepairEventInput | null {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null
    const value = input as Record<string, unknown>
    if (Object.keys(value).some((key) => !allowedKeys.has(key))) return null

    const requestId = normalizeAutoCareRequestUuid(value.requestId)
    const actorId = value.actorId === undefined || value.actorId === null ? null : normalizeAutoCareRequestUuid(value.actorId)
    if (!requestId || (value.actorId !== undefined && value.actorId !== null && !actorId)) return null

    const eventType = normalizeText(value.eventType, 1, 64)?.toLowerCase() ?? null
    const title = normalizeText(value.title, 1, 200)
    const notes = normalizeNullableText(value.notes, 4_000)
    const metadata = normalizeMetadata(value.metadata)
    if (!eventType || !eventTypePattern.test(eventType) || !title || (value.notes !== undefined && notes === undefined) || !metadata) return null

    return { requestId, actorId, eventType, title, notes: notes ?? null, metadata }
}
