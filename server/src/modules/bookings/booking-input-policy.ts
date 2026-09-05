import { normalizeTextWhitespace } from '../../shared/security/string-normalization.js'
import { BookingStatus } from '../../entities/booking/booking.entity.js'

export const MAX_BOOKING_CANCELLATION_REASON_LENGTH = 500
export const MAX_BOOKING_COMMENT_LENGTH = 500
export const MAX_BOOKING_OWNER_NOTE_LENGTH = 1_000
export const MAX_BOOKING_IDEMPOTENCY_KEY_LENGTH = 128

const bookingUuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function normalizeBookingUuid(value: unknown) {
    if (typeof value !== 'string') return null
    const normalized = value.normalize('NFKC').trim().toLowerCase()
    return bookingUuidPattern.test(normalized) ? normalized : null
}

export type NormalizedBookingListQuery = {
    cursor?: string
    limit?: number
    status?: BookingStatus
    fromDate?: string
    toDate?: string
}

export type NormalizedBookingCreationInput = {
    cabinetId: string
    serviceId: string
    date: string
    startTime: string
    endTime: string
    comment?: string | null
    idempotencyKey?: string
    experiment?: 'book_again'
    sourceBookingId?: string
}

export type NormalizedOwnerBookingCreationInput = NormalizedBookingCreationInput & {
    clientId: string
}

export type NormalizedBookingRescheduleInput = {
    date: string
    startTime: string
    endTime: string
}

export type NormalizedBookingRescheduleResolutionInput = {
    decision: 'accepted' | 'rejected'
    reason?: string | null
}

const bookingListQueryKeys = new Set(['cursor', 'limit', 'status', 'fromDate', 'toDate'])
const bookingStatuses = new Set<BookingStatus>(Object.values(BookingStatus))
const bookingCreationKeys = new Set(['cabinetId', 'serviceId', 'date', 'startTime', 'endTime', 'comment', 'idempotencyKey', 'experiment', 'sourceBookingId'])
const ownerBookingCreationKeys = new Set([...bookingCreationKeys, 'clientId'])
const bookingTimePattern = /^([01]\d|2[0-3]):[0-5]\d$/
const bookingRescheduleKeys = new Set(['date', 'startTime', 'endTime'])
const bookingRescheduleResolutionKeys = new Set(['decision', 'reason'])

function isIsoBookingDate(value: unknown): value is string {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
    if (!match) return false
    const year = Number(match[1] ?? '')
    const month = Number(match[2] ?? '')
    const day = Number(match[3] ?? '')
    const date = new Date(Date.UTC(year, month - 1, day))
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export function normalizeBookingDate(value: unknown) {
    if (typeof value !== 'string') return null
    const normalized = value.normalize('NFKC').trim()
    return isIsoBookingDate(normalized) ? normalized : null
}

export function normalizeBookingTime(value: unknown) {
    if (typeof value !== 'string') return null
    const normalized = value.normalize('NFKC').trim()
    return bookingTimePattern.test(normalized) ? normalized : null
}

export function normalizeBookingStatus(value: unknown) {
    if (typeof value !== 'string' || !bookingStatuses.has(value as BookingStatus)) return null
    return value as BookingStatus
}

export function normalizeBookingRescheduleInput(value: unknown): NormalizedBookingRescheduleInput | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const input = value as Record<string, unknown>
    if (Object.keys(input).some((key) => !bookingRescheduleKeys.has(key))) return null
    const date = normalizeBookingDate(input.date)
    const startTime = normalizeBookingTime(input.startTime)
    const endTime = normalizeBookingTime(input.endTime)
    return date && startTime && endTime ? { date, startTime, endTime } : null
}

export function normalizeBookingRescheduleResolutionInput(value: unknown): NormalizedBookingRescheduleResolutionInput | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const input = value as Record<string, unknown>
    if (Object.keys(input).some((key) => !bookingRescheduleResolutionKeys.has(key))) return null
    if (input.decision !== 'accepted' && input.decision !== 'rejected') return null
    if (input.reason !== undefined && input.reason !== null && typeof input.reason !== 'string') return null
    let reason: string | null | undefined
    if (input.reason !== undefined) {
        try {
            reason = normalizeBookingComment(input.reason as string | null)
        } catch {
            return null
        }
    }
    return {
        decision: input.decision,
        ...(reason === undefined ? {} : { reason }),
    }
}

function normalizeBookingCreationInput(value: unknown, includeClientId: boolean): NormalizedBookingCreationInput | NormalizedOwnerBookingCreationInput | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const input = value as Record<string, unknown>
    const allowedKeys = includeClientId ? ownerBookingCreationKeys : bookingCreationKeys
    if (Object.keys(input).some((key) => !allowedKeys.has(key))) return null

    const cabinetId = normalizeBookingUuid(input.cabinetId)
    const serviceId = normalizeBookingUuid(input.serviceId)
    const date = normalizeBookingDate(input.date)
    const startTime = normalizeBookingTime(input.startTime)
    const endTime = normalizeBookingTime(input.endTime)
    if (!cabinetId || !serviceId || !date || !startTime || !endTime) return null

    let idempotencyKey: string | undefined
    if (input.idempotencyKey !== undefined) {
        if (typeof input.idempotencyKey !== 'string') return null
        try {
            idempotencyKey = normalizeBookingIdempotencyKey(input.idempotencyKey)
        } catch {
            return null
        }
    }

    let comment: string | null | undefined
    if (input.comment !== undefined) {
        if (input.comment !== null && typeof input.comment !== 'string') return null
        try {
            comment = normalizeBookingComment(input.comment as string | null)
        } catch {
            return null
        }
    }

    const result: NormalizedBookingCreationInput = {
        cabinetId,
        serviceId,
        date,
        startTime,
        endTime,
        ...(comment === undefined ? {} : { comment }),
        ...(idempotencyKey === undefined ? {} : { idempotencyKey }),
        ...(input.experiment === undefined ? {} : input.experiment === 'book_again' ? { experiment: input.experiment } : {}),
        ...(input.sourceBookingId === undefined ? {} : (() => {
            const sourceBookingId = normalizeBookingUuid(input.sourceBookingId)
            return sourceBookingId ? { sourceBookingId } : null
        })() ?? {}),
    }
    if (input.experiment !== undefined && input.experiment !== 'book_again') return null
    if (input.sourceBookingId !== undefined && !result.sourceBookingId) return null
    if (includeClientId) {
        const clientId = normalizeBookingUuid(input.clientId)
        if (!clientId) return null
        return { ...result, clientId }
    }
    return result
}

export function normalizeClientBookingCreationInput(value: unknown) {
    return normalizeBookingCreationInput(value, false) as NormalizedBookingCreationInput | null
}

export function normalizeOwnerBookingCreationInput(value: unknown) {
    return normalizeBookingCreationInput(value, true) as NormalizedOwnerBookingCreationInput | null
}

/** Re-check booking list filters before query-builder access. */
export function normalizeBookingListQuery(value: unknown): NormalizedBookingListQuery | null {
    if (value === undefined || value === null) return {}
    if (typeof value !== 'object' || Array.isArray(value)) return null
    const input = value as Record<string, unknown>
    if (Object.keys(input).some((key) => !bookingListQueryKeys.has(key))) return null
    if (input.cursor !== undefined && (typeof input.cursor !== 'string' || input.cursor.trim().length > 512)) return null
    if (input.limit !== undefined && (typeof input.limit !== 'number' || !Number.isSafeInteger(input.limit) || input.limit < 1 || input.limit > 100)) return null
    if (input.status !== undefined && (typeof input.status !== 'string' || !bookingStatuses.has(input.status as BookingStatus))) return null
    if (input.fromDate !== undefined && !isIsoBookingDate(input.fromDate)) return null
    if (input.toDate !== undefined && !isIsoBookingDate(input.toDate)) return null
    if (typeof input.fromDate === 'string' && typeof input.toDate === 'string' && input.fromDate > input.toDate) return null
    return {
        ...(input.cursor !== undefined ? { cursor: input.cursor.trim() } : {}),
        ...(input.limit !== undefined ? { limit: input.limit } : {}),
        ...(input.status !== undefined ? { status: input.status as BookingStatus } : {}),
        ...(input.fromDate !== undefined ? { fromDate: input.fromDate } : {}),
        ...(input.toDate !== undefined ? { toDate: input.toDate } : {}),
    }
}

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
