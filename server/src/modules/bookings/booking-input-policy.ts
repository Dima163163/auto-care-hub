import { normalizeTextWhitespace } from '../../shared/security/string-normalization.js'

export const MAX_BOOKING_CANCELLATION_REASON_LENGTH = 500
export const MAX_BOOKING_COMMENT_LENGTH = 500
export const MAX_BOOKING_OWNER_NOTE_LENGTH = 1_000
export const MAX_BOOKING_IDEMPOTENCY_KEY_LENGTH = 128

export function normalizeBookingIdempotencyKey(key: string | undefined) {
    if (key === undefined) return undefined
    const normalized = key.trim()
    if (!/^[a-zA-Z0-9_-]{8,128}$/.test(normalized) || normalized.length > MAX_BOOKING_IDEMPOTENCY_KEY_LENGTH) {
        throw new Error('Booking idempotency key is invalid.')
    }
    return normalized
}

function normalizeOptionalBookingText(value: string | null | undefined, maxLength: number, label: string) {
    if (value === null || value === undefined) return null

    const normalized = normalizeTextWhitespace(value).replace(/\s+/g, ' ').trim()
    if (normalized.length > maxLength) {
        throw new Error(`Booking ${label} is invalid.`)
    }

    return normalized || null
}

export function normalizeBookingComment(comment: string | null | undefined) {
    return normalizeOptionalBookingText(comment, MAX_BOOKING_COMMENT_LENGTH, 'comment')
}

export function normalizeBookingOwnerNote(note: string | null | undefined) {
    return normalizeOptionalBookingText(note, MAX_BOOKING_OWNER_NOTE_LENGTH, 'owner note')
}

export function normalizeBookingCancellationReason(reason: string) {
    const normalized = normalizeTextWhitespace(reason)
        .replace(/\s+/g, ' ')
        .trim()

    if (
        normalized.length < 1
        || normalized.length > MAX_BOOKING_CANCELLATION_REASON_LENGTH
    ) {
        throw new Error('Booking cancellation reason is invalid.')
    }

    return normalized
}

export function assertBookingDateRange(fromDate?: string, toDate?: string) {
    for (const [label, value] of [['from', fromDate], ['to', toDate] as const]) {
        if (!value) continue
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
        if (!match) throw new Error(`Booking ${label} date is invalid.`)
        const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
        if (
            date.getUTCFullYear() !== Number(match[1])
            || date.getUTCMonth() !== Number(match[2]) - 1
            || date.getUTCDate() !== Number(match[3])
        ) {
            throw new Error(`Booking ${label} date is invalid.`)
        }
    }
    if (fromDate && toDate && fromDate > toDate) {
        throw new Error('Booking date range is invalid.')
    }
}
