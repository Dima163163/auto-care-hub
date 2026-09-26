import { describe, expect, it } from 'vitest'

import { AutomotiveReviewStatus } from '../../entities/index.js'
import { ServiceRequestStatus } from '../../entities/automotive/service-request.entity.js'
import { aggregatePublicAutoCareReviewSummaries } from './autocare-review-summary.js'

describe('public AutoCare review summaries', () => {
    it('counts only verified reviews of completed, mutually confirmed visits in public locations', () => {
        const confirmedAt = new Date('2026-09-20T10:00:00.000Z')
        const reviews = [
            { id: 'valid', providerId: 'provider-1', rating: 5, serviceRequestId: 'closed-valid', verifiedVisit: true, status: AutomotiveReviewStatus.Approved },
            { id: 'unverified', providerId: 'provider-1', rating: 1, serviceRequestId: 'closed-unverified', verifiedVisit: false, status: AutomotiveReviewStatus.Approved },
            { id: 'open', providerId: 'provider-1', rating: 2, serviceRequestId: 'open', verifiedVisit: true, status: AutomotiveReviewStatus.Approved },
            { id: 'unconfirmed', providerId: 'provider-1', rating: 3, serviceRequestId: 'unconfirmed', verifiedVisit: true, status: AutomotiveReviewStatus.Approved },
            { id: 'mismatched-provider', providerId: 'provider-1', rating: 1, serviceRequestId: 'other-provider', verifiedVisit: true, status: AutomotiveReviewStatus.Approved },
            { id: 'wrong-location', providerId: 'provider-1', rating: 1, serviceRequestId: 'other-location', verifiedVisit: true, status: AutomotiveReviewStatus.Approved },
            { id: 'pending', providerId: 'provider-1', rating: 1, serviceRequestId: 'closed-valid', verifiedVisit: true, status: AutomotiveReviewStatus.Pending },
            { id: 'other-provider', providerId: 'provider-2', rating: 1, serviceRequestId: 'other-provider-closed', verifiedVisit: true, status: AutomotiveReviewStatus.Approved },
            { id: 'unlinked', providerId: 'provider-1', rating: 1, serviceRequestId: null, verifiedVisit: true, status: AutomotiveReviewStatus.Approved },
        ]
        const requests = [
            { id: 'closed-valid', providerId: 'provider-1', locationId: 'location-1', status: ServiceRequestStatus.Closed, clientConfirmedAt: confirmedAt, providerConfirmedAt: confirmedAt },
            { id: 'closed-unverified', providerId: 'provider-1', locationId: 'location-1', status: ServiceRequestStatus.Closed, clientConfirmedAt: confirmedAt, providerConfirmedAt: confirmedAt },
            { id: 'open', providerId: 'provider-1', locationId: 'location-1', status: ServiceRequestStatus.Open, clientConfirmedAt: confirmedAt, providerConfirmedAt: confirmedAt },
            { id: 'unconfirmed', providerId: 'provider-1', locationId: 'location-1', status: ServiceRequestStatus.Closed, clientConfirmedAt: confirmedAt, providerConfirmedAt: null },
            { id: 'other-provider', providerId: 'provider-2', locationId: 'location-1', status: ServiceRequestStatus.Closed, clientConfirmedAt: confirmedAt, providerConfirmedAt: confirmedAt },
            { id: 'other-location', providerId: 'provider-1', locationId: 'location-2', status: ServiceRequestStatus.Closed, clientConfirmedAt: confirmedAt, providerConfirmedAt: confirmedAt },
            { id: 'other-provider-closed', providerId: 'provider-2', locationId: 'location-1', status: ServiceRequestStatus.Closed, clientConfirmedAt: confirmedAt, providerConfirmedAt: confirmedAt },
        ]

        const summaries = aggregatePublicAutoCareReviewSummaries(
            ['provider-1'],
            [{ id: 'location-1' }],
            reviews,
            requests,
        )

        expect(summaries.get('provider-1')).toEqual({ rating: 5, reviewCount: 1 })
    })

    it('returns zero for providers without eligible public reviews', () => {
        expect(aggregatePublicAutoCareReviewSummaries(['provider-1'], [{ id: 'location-1' }], [], []).get('provider-1'))
            .toEqual({ rating: 0, reviewCount: 0 })
        expect(aggregatePublicAutoCareReviewSummaries([], [], [], [])).toEqual(new Map())
    })
})
