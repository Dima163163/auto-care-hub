import { describe, expect, it } from 'vitest'

import { ServiceRequestStatus as Status } from '../../entities/automotive/service-request.entity.js'
import { countActiveGuaranteeCases, isEligibleGuaranteeClaimRequest } from './guarantee-claim-policy.js'

describe('guarantee claim policy', () => {
    it('requires a real booking or completed visit before a claim', () => {
        expect(isEligibleGuaranteeClaimRequest(Status.AwaitingReply, 'safety')).toBe(false)
        expect(isEligibleGuaranteeClaimRequest(Status.Open, 'quality')).toBe(false)
        expect(isEligibleGuaranteeClaimRequest(Status.Accepted, 'safety')).toBe(true)
        expect(isEligibleGuaranteeClaimRequest(Status.Closed, 'warranty')).toBe(true)
        expect(isEligibleGuaranteeClaimRequest(Status.NoShow, 'no_show')).toBe(true)
        expect(isEligibleGuaranteeClaimRequest(Status.Accepted, 'no_show')).toBe(false)
    })

    it('counts one unresolved case per request and removes resolved or rejected cases', () => {
        expect(countActiveGuaranteeCases([
            { requestId: 'a', caseKey: 'a', status: 'submitted' },
            { requestId: 'a', caseKey: null, status: 'submitted' },
            { requestId: 'b', caseKey: 'b', status: 'under_review' },
            { requestId: 'c', caseKey: 'c', status: 'resolved' },
            { requestId: 'c', caseKey: null, status: 'submitted' },
            { requestId: 'd', status: 'rejected' },
        ])).toBe(2)
    })
})
