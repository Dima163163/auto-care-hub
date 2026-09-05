import { describe, expect, it } from 'vitest'

import {
    normalizeSuperAdminTrustPolicyInput,
    normalizeSuperAdminTrustPolicyUuid,
} from './super-admin-trust-policy-input-policy.js'

const marketId = '00000000-0000-4000-8000-000000000001'
const validPolicy = {
    policyVersion: ' autocare-trust-v2 ',
    trustedMinimumRating: 4.2,
    trustedMinimumReviews: 5,
    trustedMinimumCompletedVisits: 10,
    trustedMaxNoShowRate: 0.1,
    trustedMaxComplaintRate: 0.1,
    trustedMaxResponseTimeMinutes: 120,
    reassessmentIntervalHours: 24,
    rollout: { enabled: true, marketIds: [marketId], percentage: 25 },
}

describe('super-admin trust policy input policy', () => {
    it('normalizes policy version and rollout UUIDs', () => {
        const result = normalizeSuperAdminTrustPolicyInput({
            ...validPolicy,
            rollout: { ...validPolicy.rollout, marketIds: [`  ${marketId.toUpperCase()}  `] },
        })

        expect(result).toMatchObject({ policyVersion: 'autocare-trust-v2', rollout: { marketIds: [marketId] } })
    })

    it('rejects unknown top-level and nested rollout fields', () => {
        expect(normalizeSuperAdminTrustPolicyInput({ ...validPolicy, unsafe: true })).toBeNull()
        expect(normalizeSuperAdminTrustPolicyInput({ ...validPolicy, rollout: { ...validPolicy.rollout, reason: 'unsafe' } })).toBeNull()
    })

    it('rejects invalid ranges, non-finite values and duplicate market ids', () => {
        expect(normalizeSuperAdminTrustPolicyInput({ ...validPolicy, trustedMinimumRating: 6 })).toBeNull()
        expect(normalizeSuperAdminTrustPolicyInput({ ...validPolicy, trustedMaxNoShowRate: Number.NaN })).toBeNull()
        expect(normalizeSuperAdminTrustPolicyInput({ ...validPolicy, rollout: { ...validPolicy.rollout, marketIds: [marketId, marketId] } })).toBeNull()
    })

    it('rejects malformed rollout market ids', () => {
        expect(normalizeSuperAdminTrustPolicyInput({ ...validPolicy, rollout: { ...validPolicy.rollout, marketIds: ['missing-market'] } })).toBeNull()
        expect(normalizeSuperAdminTrustPolicyUuid('missing-market')).toBeNull()
    })
})
