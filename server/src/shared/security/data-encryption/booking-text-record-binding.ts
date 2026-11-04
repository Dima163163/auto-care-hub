import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { requireBookingTextRecordBinding } from './record-binding-policy.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const BOOKING_TEXT_FIELDS = [
    { value: 'comment', binding: 'commentBinding' },
    { value: 'cancellationReason', binding: 'cancellationReasonBinding' },
    { value: 'ownerNote', binding: 'ownerNoteBinding' },
] as const

export type BookingTextValue = typeof BOOKING_TEXT_FIELDS[number]['value']
export type BookingTextBinding = typeof BOOKING_TEXT_FIELDS[number]['binding']
export type BookingTextRecord = {
    id?: string
    clientId?: string
    cabinetId?: string
    serviceId?: string
} & Partial<Record<BookingTextValue | BookingTextBinding, string | null>>

export function bookingTextContext(record: Pick<BookingTextRecord, 'clientId' | 'cabinetId' | 'serviceId'>) {
    const ids = [record.clientId, record.cabinetId, record.serviceId]
    if (ids.some((id) => typeof id !== 'string' || !UUID.test(id))) {
        throw new Error('Encrypted booking text owner scope is invalid.')
    }
    return JSON.stringify(ids.map((id) => id!.toLowerCase()))
}

export function sealBookingTextFields(record: BookingTextRecord) {
    if (!BOOKING_TEXT_FIELDS.some(({ value }) => record[value] !== undefined)) return
    if (typeof record.id !== 'string' || !UUID.test(record.id)) throw new Error('Encrypted booking text record ID is missing.')
    const context = bookingTextContext(record)
    for (const { value, binding } of BOOKING_TEXT_FIELDS) {
        const plaintext = record[value]
        if (plaintext === undefined) continue
        record[binding] = plaintext === null ? null
            : createPlaintextRecordBinding('bookings', value, plaintext, record.id, context)
    }
}

export function openBookingTextFields(record: BookingTextRecord) {
    if (!BOOKING_TEXT_FIELDS.some(({ value }) => record[value] !== undefined)) return
    if (typeof record.id !== 'string' || !UUID.test(record.id)) throw new Error('Encrypted booking text record ID is missing.')
    const context = bookingTextContext(record)
    const allowLegacy = !requireBookingTextRecordBinding()
    for (const { value, binding } of BOOKING_TEXT_FIELDS) {
        const plaintext = record[value]
        if (plaintext === undefined) continue
        if (plaintext === null) {
            if (record[binding] !== null && record[binding] !== undefined) {
                throw new Error(`Encrypted bookings.${value} record binding is invalid.`)
            }
            continue
        }
        verifyPlaintextRecordBinding('bookings', value, plaintext, record.id,
            record[binding], { allowLegacy, context })
    }
}
