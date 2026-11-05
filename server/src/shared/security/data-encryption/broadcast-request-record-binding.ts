import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { requireBroadcastRequestRecordBinding } from './record-binding-policy.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TABLE = 'autocare_broadcast_requests'
export const BROADCAST_REQUEST_FIELDS = [
    { value: 'issueDescription', binding: 'issueDescriptionBinding' },
    { value: 'vehicleSnapshot', binding: 'vehicleSnapshotBinding' },
] as const
export type BroadcastRequestValue = typeof BROADCAST_REQUEST_FIELDS[number]['value']
export type BroadcastRequestBinding = typeof BROADCAST_REQUEST_FIELDS[number]['binding']
export type BroadcastRequestRecord = {
    id?: string
    clientId?: string
    serviceDefinitionId?: string
} & Partial<Record<BroadcastRequestValue | BroadcastRequestBinding, unknown>>

export function broadcastRequestContext(record: BroadcastRequestRecord) {
    if (!record.clientId || !UUID.test(record.clientId)
        || !record.serviceDefinitionId || !UUID.test(record.serviceDefinitionId)) {
        throw new Error('Encrypted broadcast request scope is invalid.')
    }
    return JSON.stringify([record.clientId.toLowerCase(), record.serviceDefinitionId.toLowerCase()])
}

export function serializeBroadcastRequestField(field: BroadcastRequestValue, value: unknown): string {
    if (field === 'vehicleSnapshot') {
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Encrypted broadcast vehicle snapshot is invalid.')
        return JSON.stringify(value)
    }
    if (typeof value !== 'string') throw new Error('Encrypted broadcast issue description is invalid.')
    return value
}

export function sealBroadcastRequestFields(record: BroadcastRequestRecord) {
    if (!BROADCAST_REQUEST_FIELDS.some(({ value }) => record[value] !== undefined)) return
    if (!record.id || !UUID.test(record.id)) throw new Error('Encrypted broadcast request record ID is missing.')
    const context = broadcastRequestContext(record)
    for (const { value, binding } of BROADCAST_REQUEST_FIELDS) {
        const plaintext = record[value]
        if (plaintext === undefined) continue
        record[binding] = plaintext === null ? null
            : createPlaintextRecordBinding(TABLE, value, serializeBroadcastRequestField(value, plaintext), record.id, context)
    }
}

export function openBroadcastRequestFields(record: BroadcastRequestRecord) {
    if (!BROADCAST_REQUEST_FIELDS.some(({ value }) => record[value] !== undefined)) return
    if (!record.id || !UUID.test(record.id)) throw new Error('Encrypted broadcast request record ID is missing.')
    const context = broadcastRequestContext(record)
    const allowLegacy = !requireBroadcastRequestRecordBinding()
    for (const { value, binding } of BROADCAST_REQUEST_FIELDS) {
        const plaintext = record[value]
        if (plaintext === undefined) continue
        if (plaintext === null) {
            if (value !== 'vehicleSnapshot' || (record[binding] !== null && record[binding] !== undefined)) {
                throw new Error(`Encrypted broadcast request ${value} binding is invalid.`)
            }
            continue
        }
        verifyPlaintextRecordBinding(TABLE, value, serializeBroadcastRequestField(value, plaintext), record.id,
            record[binding] as string | null | undefined, { allowLegacy, context })
    }
}
