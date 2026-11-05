import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { requireClientVehicleRecordBinding } from './record-binding-policy.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const CLIENT_VEHICLE_BOUND_FIELDS = [
    { value: 'vin', binding: 'vinBinding' },
    { value: 'licensePlate', binding: 'licensePlateBinding' },
    { value: 'internalNumber', binding: 'internalNumberBinding' },
    { value: 'imageUrl', binding: 'imageUrlBinding' },
] as const

export type ClientVehicleBindingField = typeof CLIENT_VEHICLE_BOUND_FIELDS[number]
export type ClientVehicleValueColumn = ClientVehicleBindingField['value']
export type ClientVehicleBindingColumn = ClientVehicleBindingField['binding']

export type ClientVehicleBindingRecord = {
    id?: string
    userId?: string
} & Partial<Record<ClientVehicleValueColumn | ClientVehicleBindingColumn, string | null>>

export function clientVehicleRecordContext(record: Pick<ClientVehicleBindingRecord, 'userId'>) {
    if (!record.userId || !UUID.test(record.userId)) throw new Error('Encrypted client vehicle owner scope is invalid.')
    return JSON.stringify([record.userId.toLowerCase()])
}

export function sealClientVehicleFields(record: ClientVehicleBindingRecord) {
    if (!CLIENT_VEHICLE_BOUND_FIELDS.some(({ value }) => record[value] !== undefined)) return
    if (typeof record.id !== 'string') throw new Error('Encrypted client vehicle record scope is invalid.')
    const context = clientVehicleRecordContext(record)
    for (const { value, binding } of CLIENT_VEHICLE_BOUND_FIELDS) {
        const plaintext = record[value]
        if (plaintext === undefined) continue
        if (plaintext === null && value === 'imageUrl') throw new Error('Encrypted client_vehicles.imageUrl is invalid.')
        record[binding] = plaintext === null ? null
            : createPlaintextRecordBinding('client_vehicles', value, plaintext, record.id, context)
    }
}

export function openClientVehicleFields(record: ClientVehicleBindingRecord) {
    if (!CLIENT_VEHICLE_BOUND_FIELDS.some(({ value }) => record[value] !== undefined)) return
    if (typeof record.id !== 'string') throw new Error('Encrypted client vehicle record scope is invalid.')
    const context = clientVehicleRecordContext(record)
    const allowLegacy = !requireClientVehicleRecordBinding()
    for (const { value, binding } of CLIENT_VEHICLE_BOUND_FIELDS) {
        const plaintext = record[value]
        if (plaintext === undefined) continue
        if (plaintext === null) {
            if (value === 'imageUrl') throw new Error('Encrypted client_vehicles.imageUrl is invalid.')
            if (record[binding] !== null && record[binding] !== undefined) {
                throw new Error(`Encrypted client_vehicles.${value} record binding is invalid.`)
            }
            continue
        }
        verifyPlaintextRecordBinding('client_vehicles', value, plaintext, record.id,
            record[binding], { allowLegacy, context })
    }
}
