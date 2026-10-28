import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { requireBookingRescheduleReasonRecordBinding } from './record-binding-policy.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const STATUSES = new Set(['pending', 'accepted', 'rejected'])

export type BookingRescheduleReasonRecord = {
    id?: string
    bookingId?: string
    requestedById?: string
    resolvedById?: string | null
    status?: string
    resolutionReason?: string | null
    resolutionReasonBinding?: string | null
}

export function bookingRescheduleReasonContext(record: BookingRescheduleReasonRecord) {
    if (!record.bookingId || !UUID.test(record.bookingId)
        || !record.requestedById || !UUID.test(record.requestedById)
        || (record.resolvedById !== null && record.resolvedById !== undefined && !UUID.test(record.resolvedById))
        || !record.status || !STATUSES.has(record.status)) {
        throw new Error('Encrypted booking reschedule reason scope is invalid.')
    }
    return JSON.stringify([record.bookingId.toLowerCase(), record.requestedById.toLowerCase(),
        record.resolvedById?.toLowerCase() ?? null, record.status])
}

export function sealBookingRescheduleReason(record: BookingRescheduleReasonRecord) {
    if (record.resolutionReason === undefined) return
    if (record.resolutionReason === null) {
        record.resolutionReasonBinding = null
        return
    }
    if (typeof record.id !== 'string' || !UUID.test(record.id)) {
        throw new Error('Encrypted booking reschedule reason record ID is missing.')
    }
    record.resolutionReasonBinding = createPlaintextRecordBinding('booking_reschedule_requests', 'resolutionReason',
        record.resolutionReason, record.id, bookingRescheduleReasonContext(record))
}

export function openBookingRescheduleReason(record: BookingRescheduleReasonRecord) {
    if (record.resolutionReason === undefined) return
    if (record.resolutionReason === null) {
        if (record.resolutionReasonBinding !== null && record.resolutionReasonBinding !== undefined) {
            throw new Error('Encrypted booking_reschedule_requests.resolutionReason record binding is invalid.')
        }
        return
    }
    if (typeof record.id !== 'string' || !UUID.test(record.id)) {
        throw new Error('Encrypted booking reschedule reason record ID is missing.')
    }
    verifyPlaintextRecordBinding('booking_reschedule_requests', 'resolutionReason', record.resolutionReason,
        record.id, record.resolutionReasonBinding,
        { allowLegacy: !requireBookingRescheduleReasonRecordBinding(), context: bookingRescheduleReasonContext(record) })
}
