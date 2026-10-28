import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { requireBookingStatusReasonRecordBinding } from './record-binding-policy.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const STATUSES = new Set(['pending', 'confirmed', 'cancelled', 'completed'])

export type BookingStatusReasonRecord = {
    id?: string
    bookingId?: string
    status?: string
    reason?: string | null
    reasonBinding?: string | null
}

export function bookingStatusReasonContext(record: BookingStatusReasonRecord) {
    if (!record.bookingId || !UUID.test(record.bookingId) || !record.status || !STATUSES.has(record.status)) {
        throw new Error('Encrypted booking status history scope is invalid.')
    }
    return JSON.stringify([record.bookingId.toLowerCase(), record.status])
}

export function sealBookingStatusReason(record: BookingStatusReasonRecord) {
    if (record.reason === undefined) return
    if (record.reason === null) {
        record.reasonBinding = null
        return
    }
    if (typeof record.id !== 'string') throw new Error('Encrypted booking status history record ID is missing.')
    record.reasonBinding = createPlaintextRecordBinding('booking_status_history', 'reason', record.reason,
        record.id, bookingStatusReasonContext(record))
}

export function openBookingStatusReason(record: BookingStatusReasonRecord) {
    if (record.reason === undefined) return
    if (record.reason === null) {
        if (record.reasonBinding !== null && record.reasonBinding !== undefined) {
            throw new Error('Encrypted booking_status_history.reason record binding is invalid.')
        }
        return
    }
    if (typeof record.id !== 'string') throw new Error('Encrypted booking status history record ID is missing.')
    verifyPlaintextRecordBinding('booking_status_history', 'reason', record.reason, record.id,
        record.reasonBinding, { allowLegacy: !requireBookingStatusReasonRecordBinding(), context: bookingStatusReasonContext(record) })
}
