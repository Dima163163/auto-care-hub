import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setDataEncryptionKeyProviderForTests } from './field-encryption.js'
import { openAppealFields, sealAppealFields, type AppealRecord } from './appeal-record-binding.js'

const id = '00000000-0000-4000-8000-000000000001'
const subjectId = '00000000-0000-4000-8000-000000000002'
const submittedById = '00000000-0000-4000-8000-000000000003'
const providerId = '00000000-0000-4000-8000-000000000004'

beforeEach(() => setDataEncryptionKeyProviderForTests({
    activeKeyId: 'appeal-binding-test',
    getIndexKey: () => Buffer.alloc(32, 63),
    getKey: () => ({ kek: Buffer.alloc(32, 64) }),
}))
afterEach(() => setDataEncryptionKeyProviderForTests(null))

describe('appeal record binding', () => {
    it('rejects reason or decision moved to another appeal, subject or provider', () => {
        const original: AppealRecord = { id, subject: 'provider', subjectId, submittedById, providerId,
            reason: 'Please review', decisionReason: 'Approved', reasonBinding: null, decisionReasonBinding: null }
        sealAppealFields(original)
        expect(() => openAppealFields(original)).not.toThrow()
        expect(() => openAppealFields({ ...original, id: subjectId })).toThrow('authentication failed')
        expect(() => openAppealFields({ ...original, providerId: id })).toThrow('authentication failed')
        expect(() => openAppealFields({ ...original, subject: 'review' })).toThrow('authentication failed')
        expect(() => openAppealFields({ ...original, reason: 'Changed' })).toThrow('authentication failed')
        expect(() => openAppealFields({ ...original, decisionReason: 'Rejected' })).toThrow('authentication failed')
    })

    it('clears the decision binding when the optional reason is removed', () => {
        const record: AppealRecord = { id, subject: 'review', subjectId, submittedById, providerId: null,
            reason: 'Check this', decisionReason: 'Check', reasonBinding: null, decisionReasonBinding: null }
        sealAppealFields(record)
        record.decisionReason = null
        sealAppealFields(record)
        expect(record.decisionReasonBinding).toBeNull()
        expect(() => openAppealFields(record)).not.toThrow()
    })
})
