import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setDataEncryptionKeyProviderForTests } from './field-encryption.js'
import { openCatalogGapFields, sealCatalogGapFields, type CatalogGapRecord } from './catalog-gap-record-binding.js'

const id = '00000000-0000-4000-8000-000000000001'
const requestedById = '00000000-0000-4000-8000-000000000002'
const providerId = '00000000-0000-4000-8000-000000000003'

beforeEach(() => setDataEncryptionKeyProviderForTests({
    activeKeyId: 'catalog-gap-binding-test',
    getIndexKey: () => Buffer.alloc(32, 67),
    getKey: () => ({ kek: Buffer.alloc(32, 68) }),
}))
afterEach(() => setDataEncryptionKeyProviderForTests(null))

function record(): CatalogGapRecord {
    return { id, requestedById, providerId, proposedSlug: 'brakes', categorySlug: 'repair', priceType: 'fixed',
        labels: { en: 'Brakes' }, comparisonAttributes: ['duration'], rationale: 'Customer need', reviewReason: 'Approved',
        labelsBinding: null, comparisonAttributesBinding: null, rationaleBinding: null, reviewReasonBinding: null }
}

describe('catalog gap record binding', () => {
    it('rejects transferred or modified fields and changed owner scope', () => {
        const original = record()
        sealCatalogGapFields(original)
        expect(() => openCatalogGapFields(original)).not.toThrow()
        expect(() => openCatalogGapFields({ ...original, id: requestedById })).toThrow('authentication failed')
        expect(() => openCatalogGapFields({ ...original, providerId: id })).toThrow('authentication failed')
        expect(() => openCatalogGapFields({ ...original, labels: { en: 'Tyres' } })).toThrow('authentication failed')
        expect(() => openCatalogGapFields({ ...original, comparisonAttributes: ['price'] })).toThrow('authentication failed')
        expect(() => openCatalogGapFields({ ...original, rationale: 'Different' })).toThrow('authentication failed')
        expect(() => openCatalogGapFields({ ...original, reviewReason: 'Rejected' })).toThrow('authentication failed')
    })

    it('clears the optional review binding with its reason', () => {
        const request = record()
        sealCatalogGapFields(request)
        request.reviewReason = null
        sealCatalogGapFields(request)
        expect(request.reviewReasonBinding).toBeNull()
        expect(() => openCatalogGapFields(request)).not.toThrow()
    })
})
