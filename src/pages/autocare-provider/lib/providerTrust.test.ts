import { describe, expect, it } from 'vitest'

import { getPublicTrustEvidence } from './providerTrust'

describe('provider public trust evidence', () => {
    it('hides pending, rejected and expired evidence', () => {
        const now = Date.parse('2026-08-26T12:00:00Z')
        const result = getPublicTrustEvidence({ evidence: [
            { id: 'approved', providerId: 'provider', kind: 'profile', label: 'Profile', status: 'verified', expiresAt: '2026-09-01T00:00:00Z', verifiedAt: '2026-08-01T00:00:00Z' },
            { id: 'pending', providerId: 'provider', kind: 'gallery', label: 'Gallery', status: 'pending', expiresAt: null, verifiedAt: null },
            { id: 'rejected', providerId: 'provider', kind: 'review', label: 'Review', status: 'rejected', expiresAt: null, verifiedAt: null },
            { id: 'expired', providerId: 'provider', kind: 'documents', label: 'Documents', status: 'approved', expiresAt: '2026-08-25T00:00:00Z', verifiedAt: '2026-08-01T00:00:00Z' },
        ] }, now)

        expect(result.map((item) => item.id)).toEqual(['approved'])
    })
})
