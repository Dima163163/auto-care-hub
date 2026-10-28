import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { requireRepairEventRecordBinding } from './record-binding-policy.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TABLE = 'autocare_repair_events'
export const REPAIR_EVENT_FIELDS = [
    { value: 'title', binding: 'titleBinding' },
    { value: 'notes', binding: 'notesBinding' },
    { value: 'metadata', binding: 'metadataBinding' },
] as const
export type RepairEventValue = typeof REPAIR_EVENT_FIELDS[number]['value']
export type RepairEventBinding = typeof REPAIR_EVENT_FIELDS[number]['binding']
export type RepairEventRecord = {
    id?: string
    requestId?: string
    eventType?: string
} & Partial<Record<RepairEventValue | RepairEventBinding, unknown>>

export function repairEventContext(record: RepairEventRecord) {
    if (!record.requestId || !UUID.test(record.requestId)
        || !record.eventType || record.eventType.length > 128) {
        throw new Error('Encrypted repair event request scope is invalid.')
    }
    return JSON.stringify([record.requestId.toLowerCase(), record.eventType])
}

export function serializeRepairEventField(field: RepairEventValue, value: unknown): string {
    if (field === 'metadata') {
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Encrypted repair event metadata is invalid.')
        return JSON.stringify(value)
    }
    if (typeof value !== 'string') throw new Error(`Encrypted repair event ${field} is invalid.`)
    return value
}

export function sealRepairEventFields(record: RepairEventRecord) {
    if (!REPAIR_EVENT_FIELDS.some(({ value }) => record[value] !== undefined)) return
    if (!record.id || !UUID.test(record.id)) throw new Error('Encrypted repair event record ID is missing.')
    const context = repairEventContext(record)
    for (const { value, binding } of REPAIR_EVENT_FIELDS) {
        const plaintext = record[value]
        if (plaintext === undefined) continue
        record[binding] = plaintext === null ? null
            : createPlaintextRecordBinding(TABLE, value, serializeRepairEventField(value, plaintext), record.id, context)
    }
}

export function openRepairEventFields(record: RepairEventRecord) {
    if (!REPAIR_EVENT_FIELDS.some(({ value }) => record[value] !== undefined)) return
    if (!record.id || !UUID.test(record.id)) throw new Error('Encrypted repair event record ID is missing.')
    const context = repairEventContext(record)
    const allowLegacy = !requireRepairEventRecordBinding()
    for (const { value, binding } of REPAIR_EVENT_FIELDS) {
        const plaintext = record[value]
        if (plaintext === undefined) continue
        if (plaintext === null) {
            if (value !== 'notes' || (record[binding] !== null && record[binding] !== undefined)) {
                throw new Error(`Encrypted repair event ${value} binding is invalid.`)
            }
            continue
        }
        verifyPlaintextRecordBinding(TABLE, value, serializeRepairEventField(value, plaintext), record.id,
            record[binding] as string | null | undefined, { allowLegacy, context })
    }
}
