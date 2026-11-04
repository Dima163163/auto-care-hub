import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setDataEncryptionKeyProviderForTests } from './field-encryption.js'
import { openBroadcastRequestFields, sealBroadcastRequestFields, type BroadcastRequestRecord } from './broadcast-request-record-binding.js'

const id = '00000000-0000-4000-8000-000000000001'
const clientId = '00000000-0000-4000-8000-000000000002'
const serviceDefinitionId = '00000000-0000-4000-8000-000000000003'
const marketId = '00000000-0000-4000-8000-000000000004'

beforeEach(() => setDataEncryptionKeyProviderForTests({
    activeKeyId: 'broadcast-request-binding-test',
    getIndexKey: () => Buffer.alloc(32, 75),
    getKey: () => ({ kek: Buffer.alloc(32, 76) }),
}))
afterEach(() => setDataEncryptionKeyProviderForTests(null))

function record(): BroadcastRequestRecord {
    return { id, clientId, serviceDefinitionId, marketId, issueDescription: 'Brakes squeak', vehicleSnapshot: { make: 'Toyota' },
        issueDescriptionBinding: null, vehicleSnapshotBinding: null }
}

describe('broadcast request record binding', () => {
    it('rejects transferred or modified fields and changed owner scope', () => {
        const original = record()
        sealBroadcastRequestFields(original)
        expect(() => openBroadcastRequestFields(original)).not.toThrow()
        expect(() => openBroadcastRequestFields({ ...original, id: clientId })).toThrow('authentication failed')
        expect(() => openBroadcastRequestFields({ ...original, clientId: id })).toThrow('authentication failed')
        expect(() => openBroadcastRequestFields({ ...original, serviceDefinitionId: id })).toThrow('authentication failed')
        expect(() => openBroadcastRequestFields({ ...original, marketId: null })).not.toThrow()
        expect(() => openBroadcastRequestFields({ ...original, issueDescription: 'Different' })).toThrow('authentication failed')
        expect(() => openBroadcastRequestFields({ ...original, vehicleSnapshot: { make: 'BMW' } })).toThrow('authentication failed')
    })

    it('clears the optional vehicle binding with its value', () => {
        const request = record()
        sealBroadcastRequestFields(request)
        request.vehicleSnapshot = null
        sealBroadcastRequestFields(request)
        expect(request.vehicleSnapshotBinding).toBeNull()
        expect(() => openBroadcastRequestFields(request)).not.toThrow()
    })
})
