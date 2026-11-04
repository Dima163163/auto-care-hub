import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setDataEncryptionKeyProviderForTests } from './field-encryption.js'
import { openExpertQuestionFields, sealExpertQuestionFields, type ExpertQuestionRecord } from './expert-question-record-binding.js'

const id = '00000000-0000-4000-8000-000000000001'
const clientId = '00000000-0000-4000-8000-000000000002'

beforeEach(() => setDataEncryptionKeyProviderForTests({
    activeKeyId: 'expert-question-binding-test',
    getIndexKey: () => Buffer.alloc(32, 83),
    getKey: () => ({ kek: Buffer.alloc(32, 84) }),
}))
afterEach(() => setDataEncryptionKeyProviderForTests(null))

function record(): ExpertQuestionRecord {
    return { id, clientId, vehicleSnapshot: { make: 'Toyota' }, symptoms: 'Private symptoms', answer: 'Private answer',
        vehicleSnapshotBinding: null, symptomsBinding: null, answerBinding: null }
}

describe('expert question record binding', () => {
    it('rejects transferred or modified fields and changed owner', () => {
        const question = record()
        sealExpertQuestionFields(question)
        expect(() => openExpertQuestionFields(question)).not.toThrow()
        expect(() => openExpertQuestionFields({ ...question, id: clientId })).toThrow('authentication failed')
        expect(() => openExpertQuestionFields({ ...question, clientId: id })).toThrow('authentication failed')
        expect(() => openExpertQuestionFields({ ...question, vehicleSnapshot: { make: 'BMW' } })).toThrow('authentication failed')
        expect(() => openExpertQuestionFields({ ...question, symptoms: 'Different' })).toThrow('authentication failed')
        expect(() => openExpertQuestionFields({ ...question, answer: 'Different' })).toThrow('authentication failed')
    })

    it('clears optional bindings with their values', () => {
        const question = record()
        sealExpertQuestionFields(question)
        question.vehicleSnapshot = null
        question.answer = null
        sealExpertQuestionFields(question)
        expect(question.vehicleSnapshotBinding).toBeNull()
        expect(question.answerBinding).toBeNull()
        expect(() => openExpertQuestionFields(question)).not.toThrow()
    })
})
