import { describe, expect, it } from 'vitest'

import { ServiceRequestStatus } from '../../entities/automotive/service-request.entity.js'
import { buildRankingCalibrationReport } from './ranking-calibration.js'

describe('ranking calibration report', () => {
    it('uses only the newest snapshot per provider and confirmed visits', () => {
        const now = new Date('2026-08-24T12:00:00.000Z')
        const report = buildRankingCalibrationReport({
            snapshots: [
                { providerId: 'provider-a', score: 40, computedAt: new Date('2026-08-20T12:00:00.000Z') },
                { providerId: 'provider-a', score: 82, computedAt: now },
                { providerId: 'provider-b', score: 60, computedAt: now },
            ],
            requests: [
                { providerId: 'provider-a', status: ServiceRequestStatus.Closed, clientConfirmedAt: now, providerConfirmedAt: now },
                { providerId: 'provider-a', status: ServiceRequestStatus.NoShow, clientConfirmedAt: null, providerConfirmedAt: null },
                { providerId: 'provider-b', status: ServiceRequestStatus.Closed, clientConfirmedAt: now, providerConfirmedAt: null },
            ],
            reviews: [
                { providerId: 'provider-a', rating: 5, verifiedVisit: true },
                { providerId: 'provider-b', rating: 1, verifiedVisit: false },
            ],
            minimumRecommendedSample: 1,
        })

        expect(report).toMatchObject({ scoredProviders: 2, confirmedVisits: 1, readyForCalibration: true })
        expect(report.buckets).toContainEqual({ label: '80-100', providerCount: 1, confirmedVisits: 1, noShowRatePercent: 50, verifiedReviewAverage: 5 })
        expect(report.buckets).toContainEqual({ label: '50-64', providerCount: 1, confirmedVisits: 0, noShowRatePercent: 0, verifiedReviewAverage: null })
        expect(report.buckets).toContainEqual({ label: '0-49', providerCount: 0, confirmedVisits: 0, noShowRatePercent: 0, verifiedReviewAverage: null })
    })
})
