import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setDataEncryptionKeyProviderForTests } from './field-encryption.js'
import { openFleetAccountFields, sealFleetAccountFields, type FleetAccountRecord } from './fleet-account-record-binding.js'

const id = '00000000-0000-4000-8000-000000000001'
const ownerId = '00000000-0000-4000-8000-000000000002'

beforeEach(() => setDataEncryptionKeyProviderForTests({
    activeKeyId: 'fleet-account-binding-test',
    getIndexKey: () => Buffer.alloc(32, 85),
    getKey: () => ({ kek: Buffer.alloc(32, 86) }),
}))
afterEach(() => setDataEncryptionKeyProviderForTests(null))

function record(): FleetAccountRecord {
    return { id, ownerId, name: 'Private fleet', notes: 'Private notes', nameBinding: null, notesBinding: null }
}

describe('fleet account record binding', () => {
    it('rejects transferred or modified fields and changed owner', () => {
        const fleet = record()
        sealFleetAccountFields(fleet)
        expect(() => openFleetAccountFields(fleet)).not.toThrow()
        expect(() => openFleetAccountFields({ ...fleet, id: ownerId })).toThrow('authentication failed')
        expect(() => openFleetAccountFields({ ...fleet, ownerId: id })).toThrow('authentication failed')
        expect(() => openFleetAccountFields({ ...fleet, name: 'Different' })).toThrow('authentication failed')
        expect(() => openFleetAccountFields({ ...fleet, notes: 'Different' })).toThrow('authentication failed')
    })

    it('clears the optional notes binding with its value', () => {
        const fleet = record()
        sealFleetAccountFields(fleet)
        fleet.notes = null
        sealFleetAccountFields(fleet)
        expect(fleet.notesBinding).toBeNull()
        expect(() => openFleetAccountFields(fleet)).not.toThrow()
    })
})
