import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { requireAutoCareRescheduleTextRecordBinding } from './record-binding-policy.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const STATUSES = new Set(['pending', 'accepted', 'rejected'])

export const AUTOCARE_RESCHEDULE_TEXT_FIELDS = [
    { value: 'reason', binding: 'reasonBinding' },
    { value: 'resolutionReason', binding: 'resolutionReasonBinding' },
] as const
export type AutoCareRescheduleTextValue = typeof AUTOCARE_RESCHEDULE_TEXT_FIELDS[number]['value']
export type AutoCareRescheduleTextBinding = typeof AUTOCARE_RESCHEDULE_TEXT_FIELDS[number]['binding']
export type AutoCareRescheduleTextRecord = {
    id?: string
    requestId?: string
    requestedById?: string
    resolvedById?: string | null
    status?: string
} & Partial<Record<AutoCareRescheduleTextValue | AutoCareRescheduleTextBinding, string | null>>

export function autoCareRescheduleTextContext(record: Pick<AutoCareRescheduleTextRecord, 'requestId' | 'requestedById' | 'resolvedById' | 'status'>, field: AutoCareRescheduleTextValue) {
    if (!record.requestId || !UUID.test(record.requestId) || !record.requestedById || !UUID.test(record.requestedById)) {
        throw new Error('Encrypted AutoCare reschedule owner scope is invalid.')
    }
    if (field === 'reason') return JSON.stringify([record.requestId.toLowerCase(), record.requestedById.toLowerCase()])
    if (!record.status || !STATUSES.has(record.status)
        || (record.resolvedById !== null && record.resolvedById !== undefined && !UUID.test(record.resolvedById))) {
        throw new Error('Encrypted AutoCare reschedule decision scope is invalid.')
    }
    return JSON.stringify([record.requestId.toLowerCase(), record.requestedById.toLowerCase(),
        record.resolvedById?.toLowerCase() ?? null, record.status])
}

export function sealAutoCareRescheduleTextFields(record: AutoCareRescheduleTextRecord) {
    if (!AUTOCARE_RESCHEDULE_TEXT_FIELDS.some(({ value }) => record[value] !== undefined)) return
    if (typeof record.id !== 'string' || !UUID.test(record.id)) throw new Error('Encrypted AutoCare reschedule record ID is missing.')
    for (const { value, binding } of AUTOCARE_RESCHEDULE_TEXT_FIELDS) {
        const plaintext = record[value]
        if (plaintext === undefined) continue
        record[binding] = plaintext === null ? null
            : createPlaintextRecordBinding('autocare_reschedule_requests', value, plaintext,
                record.id, autoCareRescheduleTextContext(record, value))
    }
}

export function openAutoCareRescheduleTextFields(record: AutoCareRescheduleTextRecord) {
    if (!AUTOCARE_RESCHEDULE_TEXT_FIELDS.some(({ value }) => record[value] !== undefined)) return
    if (typeof record.id !== 'string' || !UUID.test(record.id)) throw new Error('Encrypted AutoCare reschedule record ID is missing.')
    const allowLegacy = !requireAutoCareRescheduleTextRecordBinding()
    for (const { value, binding } of AUTOCARE_RESCHEDULE_TEXT_FIELDS) {
        const plaintext = record[value]
        if (plaintext === undefined) continue
        if (plaintext === null) {
            if (record[binding] !== null && record[binding] !== undefined) {
                throw new Error(`Encrypted autocare_reschedule_requests.${value} record binding is invalid.`)
            }
            continue
        }
        verifyPlaintextRecordBinding('autocare_reschedule_requests', value, plaintext, record.id,
            record[binding], { allowLegacy, context: autoCareRescheduleTextContext(record, value) })
    }
}
