import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setDataEncryptionKeyProviderForTests } from './field-encryption.js'
import { openGuaranteeClaimFields, sealGuaranteeClaimFields, type GuaranteeClaimRecord } from './guarantee-claim-record-binding.js'

const id = '00000000-0000-4000-8000-000000000001'
const requestId = '00000000-0000-4000-8000-000000000002'
const clientId = '00000000-0000-4000-8000-000000000003'
const providerId = '00000000-0000-4000-8000-000000000004'

beforeEach(() => setDataEncryptionKeyProviderForTests({
    activeKeyId: 'guarantee-claim-binding-test',
    getIndexKey: () => Buffer.alloc(32, 81),
    getKey: () => ({ kek: Buffer.alloc(32, 82) }),
}))
afterEach(() => setDataEncryptionKeyProviderForTests(null))

function record(): GuaranteeClaimRecord {
    return { id, requestId, clientId, providerId, claimType: 'quality', summary: 'Private issue',
        resolution: 'Refund agreed', summaryBinding: null, resolutionBinding: null }
}

describe('guarantee claim record binding', () => {
    it('rejects transferred or modified fields and changed owner scope', () => {
        const claim = record()
        sealGuaranteeClaimFields(claim)
        expect(() => openGuaranteeClaimFields(claim)).not.toThrow()
        expect(() => openGuaranteeClaimFields({ ...claim, id: requestId })).toThrow('authentication failed')
        expect(() => openGuaranteeClaimFields({ ...claim, requestId: id })).toThrow('authentication failed')
        expect(() => openGuaranteeClaimFields({ ...claim, clientId: id })).toThrow('authentication failed')
        expect(() => openGuaranteeClaimFields({ ...claim, providerId: id })).toThrow('authentication failed')
        expect(() => openGuaranteeClaimFields({ ...claim, claimType: 'no_show' })).toThrow('authentication failed')
        expect(() => openGuaranteeClaimFields({ ...claim, summary: 'Different' })).toThrow('authentication failed')
        expect(() => openGuaranteeClaimFields({ ...claim, resolution: 'Different' })).toThrow('authentication failed')
    })

    it('clears the optional resolution binding with its value', () => {
        const claim = record()
        sealGuaranteeClaimFields(claim)
        claim.resolution = null
        sealGuaranteeClaimFields(claim)
        expect(claim.resolutionBinding).toBeNull()
        expect(() => openGuaranteeClaimFields(claim)).not.toThrow()
    })
})
