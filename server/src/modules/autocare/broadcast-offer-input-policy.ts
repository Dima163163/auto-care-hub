import { normalizeAutoCareRequestUuid } from './request-input-policy.js'

export type NormalizedAutoCareBroadcastOfferInput = {
    locationId: string
    amountMinor: number
    currencyCode: string
    note: string | null
    durationMinutes: number | undefined
    validUntil: string | null
}

const allowedKeys = new Set(['locationId', 'amountMinor', 'currencyCode', 'note', 'durationMinutes', 'validUntil'])
const MAX_AMOUNT_MINOR = 1_000_000_000
const MAX_NOTE_LENGTH = 4_000
const MAX_DURATION_MINUTES = 2_880
const datetimeWithOffsetPattern = /(?:Z|[+-]\d{2}:\d{2})$/

function normalizeOptionalNote(value: unknown): string | null | undefined {
    if (value === undefined || value === null) return null
    if (typeof value !== 'string') return undefined
    const normalized = value.normalize('NFKC').trim()
    return normalized.length <= MAX_NOTE_LENGTH ? normalized || null : undefined
}

function normalizeOptionalDateTime(value: unknown): string | null | undefined {
    if (value === undefined || value === null) return null
    if (typeof value !== 'string') return undefined
    const normalized = value.normalize('NFKC').trim()
    return datetimeWithOffsetPattern.test(normalized) && Number.isFinite(Date.parse(normalized)) ? normalized : undefined
}

/**
 * Broadcast-offer routes validate with Zod, but providers can also reach this
 * service through jobs and replay handlers. Keep the snapshot bounded and
 * canonical before any transaction or provider-visible persistence.
 */
export function normalizeAutoCareBroadcastOfferInput(input: unknown): NormalizedAutoCareBroadcastOfferInput | null {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null
    const value = input as Record<string, unknown>
    if (Object.keys(value).some((key) => !allowedKeys.has(key))) return null

    const locationId = normalizeAutoCareRequestUuid(value.locationId)
    const amountMinor = value.amountMinor
    const currencyCode = typeof value.currencyCode === 'string'
        ? value.currencyCode.normalize('NFKC').trim().toUpperCase()
        : null
    const note = normalizeOptionalNote(value.note)
    const durationMinutes = value.durationMinutes === undefined
        ? undefined
        : typeof value.durationMinutes === 'number' && Number.isSafeInteger(value.durationMinutes) && value.durationMinutes > 0 && value.durationMinutes <= MAX_DURATION_MINUTES
            ? value.durationMinutes
            : null
    const validUntil = normalizeOptionalDateTime(value.validUntil)

    if (!locationId || typeof amountMinor !== 'number' || !Number.isSafeInteger(amountMinor) || amountMinor <= 0 || amountMinor > MAX_AMOUNT_MINOR) return null
    if (!currencyCode || !/^[A-Z]{3}$/.test(currencyCode)) return null
    if (note === undefined || durationMinutes === null || validUntil === undefined) return null

    return { locationId, amountMinor, currencyCode, note, durationMinutes, validUntil }
}
