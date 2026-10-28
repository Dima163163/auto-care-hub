import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setDataEncryptionKeyProviderForTests } from './field-encryption.js'
import { openFleetVehicleFields, sealFleetVehicleFields, type FleetVehicleRecord } from './fleet-vehicle-record-binding.js'

const id = '00000000-0000-4000-8000-000000000001'
const fleetId = '00000000-0000-4000-8000-000000000002'

beforeEach(() => setDataEncryptionKeyProviderForTests({
    activeKeyId: 'fleet-vehicle-binding-test',
    getIndexKey: () => Buffer.alloc(32, 87),
    getKey: () => ({ kek: Buffer.alloc(32, 88) }),
}))
afterEach(() => setDataEncryptionKeyProviderForTests(null))

function record(): FleetVehicleRecord {
    return { id, fleetId, label: 'Private car', vehicleSnapshot: { make: 'Toyota' },
        labelBinding: null, vehicleSnapshotBinding: null }
}

describe('fleet vehicle record binding', () => {
    it('rejects transferred or modified fields and changed fleet', () => {
        const vehicle = record()
        sealFleetVehicleFields(vehicle)
        expect(() => openFleetVehicleFields(vehicle)).not.toThrow()
        expect(() => openFleetVehicleFields({ ...vehicle, id: fleetId })).toThrow('authentication failed')
        expect(() => openFleetVehicleFields({ ...vehicle, fleetId: id })).toThrow('authentication failed')
        expect(() => openFleetVehicleFields({ ...vehicle, label: 'Different' })).toThrow('authentication failed')
        expect(() => openFleetVehicleFields({ ...vehicle, vehicleSnapshot: { make: 'BMW' } })).toThrow('authentication failed')
    })
})
