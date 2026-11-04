import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setDataEncryptionKeyProviderForTests } from './field-encryption.js'
import { openRepairEventFields, sealRepairEventFields, type RepairEventRecord } from './repair-event-record-binding.js'

const id = '00000000-0000-4000-8000-000000000001'
const requestId = '00000000-0000-4000-8000-000000000002'

beforeEach(() => setDataEncryptionKeyProviderForTests({
    activeKeyId: 'repair-event-binding-test',
    getIndexKey: () => Buffer.alloc(32, 71),
    getKey: () => ({ kek: Buffer.alloc(32, 72) }),
}))
afterEach(() => setDataEncryptionKeyProviderForTests(null))

function record(): RepairEventRecord {
    return { id, requestId, eventType: 'completed', title: 'Repair complete', notes: 'Replaced brakes',
        metadata: { part: 'brake' }, titleBinding: null, notesBinding: null, metadataBinding: null }
}

describe('repair event record binding', () => {
    it('rejects transferred or modified fields and changed request scope', () => {
        const original = record()
        sealRepairEventFields(original)
        expect(() => openRepairEventFields(original)).not.toThrow()
        expect(() => openRepairEventFields({ ...original, id: requestId })).toThrow('authentication failed')
        expect(() => openRepairEventFields({ ...original, requestId: id })).toThrow('authentication failed')
        expect(() => openRepairEventFields({ ...original, eventType: 'cancelled' })).toThrow('authentication failed')
        expect(() => openRepairEventFields({ ...original, title: 'Different' })).toThrow('authentication failed')
        expect(() => openRepairEventFields({ ...original, notes: 'Different' })).toThrow('authentication failed')
        expect(() => openRepairEventFields({ ...original, metadata: { part: 'engine' } })).toThrow('authentication failed')
    })

    it('clears the optional notes binding with its value', () => {
        const event = record()
        sealRepairEventFields(event)
        event.notes = null
        sealRepairEventFields(event)
        expect(event.notesBinding).toBeNull()
        expect(() => openRepairEventFields(event)).not.toThrow()
    })
})
