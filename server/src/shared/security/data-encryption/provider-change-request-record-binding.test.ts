import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setDataEncryptionKeyProviderForTests } from './field-encryption.js'
import { openProviderChangeRequestFields, sealProviderChangeRequestFields, type ProviderChangeRequestRecord } from './provider-change-request-record-binding.js'

const id = '00000000-0000-4000-8000-000000000001'
const providerId = '00000000-0000-4000-8000-000000000002'
const requestedById = '00000000-0000-4000-8000-000000000003'

beforeEach(() => setDataEncryptionKeyProviderForTests({
    activeKeyId: 'provider-change-binding-test',
    getIndexKey: () => Buffer.alloc(32, 59),
    getKey: () => ({ kek: Buffer.alloc(32, 60) }),
}))
afterEach(() => setDataEncryptionKeyProviderForTests(null))

describe('provider change request record binding', () => {
    it('rejects payload or reason moved to another request or provider', () => {
        const original = { id, providerId, requestedById, kind: 'profile_update',
            payload: { phones: ['+123'] }, reviewReason: 'Approved',
            payloadBinding: null, reviewReasonBinding: null }
        sealProviderChangeRequestFields(original)
        expect(() => openProviderChangeRequestFields(original)).not.toThrow()
        expect(() => openProviderChangeRequestFields({ ...original, id: requestedById })).toThrow('authentication failed')
        expect(() => openProviderChangeRequestFields({ ...original, providerId: id })).toThrow('authentication failed')
        expect(() => openProviderChangeRequestFields({ ...original, payload: { phones: ['+456'] } })).toThrow('authentication failed')
        expect(() => openProviderChangeRequestFields({ ...original, reviewReason: 'Rejected' })).toThrow('authentication failed')
    })

    it('clears the reason binding when review reason is removed', () => {
        const record: ProviderChangeRequestRecord = { id, providerId, requestedById, kind: 'verification',
            payload: {}, reviewReason: 'Check', payloadBinding: null, reviewReasonBinding: null }
        sealProviderChangeRequestFields(record)
        record.reviewReason = null
        sealProviderChangeRequestFields(record)
        expect(record.reviewReasonBinding).toBeNull()
        expect(() => openProviderChangeRequestFields(record)).not.toThrow()
    })
})
