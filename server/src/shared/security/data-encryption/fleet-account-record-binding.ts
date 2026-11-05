import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { requireFleetAccountRecordBinding } from './record-binding-policy.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TABLE = 'autocare_fleet_accounts'
export const FLEET_ACCOUNT_FIELDS = [
    { value: 'name', binding: 'nameBinding' },
    { value: 'notes', binding: 'notesBinding' },
] as const
export type FleetAccountValue = typeof FLEET_ACCOUNT_FIELDS[number]['value']
export type FleetAccountBinding = typeof FLEET_ACCOUNT_FIELDS[number]['binding']
export type FleetAccountRecord = {
    id?: string
    ownerId?: string
} & Partial<Record<FleetAccountValue | FleetAccountBinding, unknown>>

export function fleetAccountContext(record: FleetAccountRecord) {
    if (!record.ownerId || !UUID.test(record.ownerId)) throw new Error('Encrypted fleet account owner is invalid.')
    return record.ownerId.toLowerCase()
}

export function sealFleetAccountFields(record: FleetAccountRecord) {
    if (!FLEET_ACCOUNT_FIELDS.some(({ value }) => record[value] !== undefined)) return
    if (!record.id || !UUID.test(record.id)) throw new Error('Encrypted fleet account record ID is missing.')
    const context = fleetAccountContext(record)
    for (const { value, binding } of FLEET_ACCOUNT_FIELDS) {
        const plaintext = record[value]
        if (plaintext === undefined) continue
        if (plaintext !== null && typeof plaintext !== 'string') throw new Error(`Encrypted fleet account ${value} is invalid.`)
        record[binding] = plaintext === null ? null
            : createPlaintextRecordBinding(TABLE, value, plaintext as string, record.id, context)
    }
}

export function openFleetAccountFields(record: FleetAccountRecord) {
    if (!FLEET_ACCOUNT_FIELDS.some(({ value }) => record[value] !== undefined)) return
    if (!record.id || !UUID.test(record.id)) throw new Error('Encrypted fleet account record ID is missing.')
    const context = fleetAccountContext(record)
    const allowLegacy = !requireFleetAccountRecordBinding()
    for (const { value, binding } of FLEET_ACCOUNT_FIELDS) {
        const plaintext = record[value]
        if (plaintext === undefined) continue
        if (plaintext === null) {
            if (value !== 'notes' || (record[binding] !== null && record[binding] !== undefined)) {
                throw new Error(`Encrypted fleet account ${value} binding is invalid.`)
            }
            continue
        }
        if (typeof plaintext !== 'string') throw new Error(`Encrypted fleet account ${value} is invalid.`)
        verifyPlaintextRecordBinding(TABLE, value, plaintext, record.id, record[binding] as string | null | undefined,
            { allowLegacy, context })
    }
}
