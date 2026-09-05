import { describe, expect, it } from 'vitest'

import { normalizeAutoCareGuaranteeClaimInput } from './guarantee-claim-input-policy.js'

const requestId = '11111111-1111-4111-8111-111111111111'
const base = {
    requestId: `  ${requestId}  `,
    claimType: ' QUALITY ',
    summary: '  Сервис не устранил повторную неисправность после визита.  ',
    evidenceUrls: [' private://autocare/claims/request-1/evidence.jpg '],
}

describe('AutoCare guarantee claim input policy', () => {
    it('canonicalizes request, claim type, summary and evidence references', () => {
        expect(normalizeAutoCareGuaranteeClaimInput(base)).toEqual({
            requestId,
            claimType: 'quality',
            summary: 'Сервис не устранил повторную неисправность после визита.',
            evidenceUrls: ['private://autocare/claims/request-1/evidence.jpg'],
        })
    })

    it('defaults omitted and null evidence collections to an empty list', () => {
        expect(normalizeAutoCareGuaranteeClaimInput({ requestId, claimType: 'price', summary: 'Итоговая цена отличается от согласованной.' })).toMatchObject({ evidenceUrls: [] })
        expect(normalizeAutoCareGuaranteeClaimInput({ requestId, claimType: 'price', summary: 'Итоговая цена отличается от согласованной.', evidenceUrls: null })).toMatchObject({ evidenceUrls: [] })
    })

    it('accepts only the supported claim types and bounded summaries', () => {
        expect(normalizeAutoCareGuaranteeClaimInput({ ...base, claimType: 'unknown' })).toBeNull()
        expect(normalizeAutoCareGuaranteeClaimInput({ ...base, summary: 'short' })).toBeNull()
        expect(normalizeAutoCareGuaranteeClaimInput({ ...base, summary: 'x'.repeat(4_001) })).toBeNull()
    })

    it('rejects malformed request identifiers and public evidence URLs', () => {
        expect(normalizeAutoCareGuaranteeClaimInput({ ...base, requestId: 'request-1' })).toBeNull()
        expect(normalizeAutoCareGuaranteeClaimInput({ ...base, evidenceUrls: ['https://evil.example/evidence.jpg'] })).toBeNull()
        expect(normalizeAutoCareGuaranteeClaimInput({ ...base, evidenceUrls: ['private://autocare/claims/../evidence.jpg'] })).toBeNull()
        expect(normalizeAutoCareGuaranteeClaimInput({ ...base, evidenceUrls: Array.from({ length: 21 }, (_, index) => `private://autocare/claims/request-1/evidence-${index}.jpg`) })).toBeNull()
    })

    it('rejects unknown fields and non-object payloads', () => {
        expect(normalizeAutoCareGuaranteeClaimInput({ ...base, unknown: true })).toBeNull()
        expect(normalizeAutoCareGuaranteeClaimInput(null)).toBeNull()
        expect(normalizeAutoCareGuaranteeClaimInput([])).toBeNull()
    })
})
