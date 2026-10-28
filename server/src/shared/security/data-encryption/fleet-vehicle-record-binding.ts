import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { requireFleetVehicleRecordBinding } from './record-binding-policy.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TABLE = 'autocare_fleet_vehicles'
export const FLEET_VEHICLE_FIELDS = [
    { value: 'label', binding: 'labelBinding' },
    { value: 'vehicleSnapshot', binding: 'vehicleSnapshotBinding' },
] as const
export type FleetVehicleValue = typeof FLEET_VEHICLE_FIELDS[number]['value']
export type FleetVehicleBinding = typeof FLEET_VEHICLE_FIELDS[number]['binding']
export type FleetVehicleRecord = {
    id?: string
    fleetId?: string
} & Partial<Record<FleetVehicleValue | FleetVehicleBinding, unknown>>

export function fleetVehicleContext(record: FleetVehicleRecord) {
    if (!record.fleetId || !UUID.test(record.fleetId)) throw new Error('Encrypted fleet vehicle scope is invalid.')
    return record.fleetId.toLowerCase()
}

export function serializeFleetVehicleField(field: FleetVehicleValue, value: unknown): string {
    if (field === 'vehicleSnapshot') {
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Encrypted fleet vehicle snapshot is invalid.')
        return JSON.stringify(value)
    }
    if (typeof value !== 'string') throw new Error('Encrypted fleet vehicle label is invalid.')
    return value
}

export function sealFleetVehicleFields(record: FleetVehicleRecord) {
    if (!FLEET_VEHICLE_FIELDS.some(({ value }) => record[value] !== undefined)) return
    if (!record.id || !UUID.test(record.id)) throw new Error('Encrypted fleet vehicle record ID is missing.')
    const context = fleetVehicleContext(record)
    for (const { value, binding } of FLEET_VEHICLE_FIELDS) {
        const plaintext = record[value]
        if (plaintext === undefined) continue
        record[binding] = createPlaintextRecordBinding(TABLE, value,
            serializeFleetVehicleField(value, plaintext), record.id, context)
    }
}

export function openFleetVehicleFields(record: FleetVehicleRecord) {
    if (!FLEET_VEHICLE_FIELDS.some(({ value }) => record[value] !== undefined)) return
    if (!record.id || !UUID.test(record.id)) throw new Error('Encrypted fleet vehicle record ID is missing.')
    const context = fleetVehicleContext(record)
    const allowLegacy = !requireFleetVehicleRecordBinding()
    for (const { value, binding } of FLEET_VEHICLE_FIELDS) {
        const plaintext = record[value]
        if (plaintext === undefined) continue
        verifyPlaintextRecordBinding(TABLE, value, serializeFleetVehicleField(value, plaintext), record.id,
            record[binding] as string | null | undefined, { allowLegacy, context })
    }
}
