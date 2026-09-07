import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { AutoCareQualityMonitoring } from '@/entities/automotive-service'

import { AdminDataQualityPanel } from './AdminDataQualityPanel'

const data = {
    generatedAt: '2026-09-08T10:00:00.000Z',
    providers: { total: 20, active: 18, verified: 16, trusted: 12, suspended: 0 },
    users: { clients: 100, owners: 20, admins: 2, superAdmins: 1 },
    reviews: { approved: 80, pending: 1234, rejected: 2, anomalyCandidates: 0 },
    requests: { total: 300, completed: 200, cancelled: 4, noShows: 1 },
    ranking: { trustSnapshots: 20, reassessedProviders: 10, evidenceCoveragePercent: 92 },
    catalog: { activeDefinitions: 10, activeOffers: 25, providersWithOffers: 18, offerCoveragePercent: 88, offersWithDescription: 20, offersWithPrice: 22, priceCoveragePercent: 90 },
    supply: { activeMarkets: 1, averageLocationsPerProvider: 1.2, markets: [] },
    reliability: { responseSamples: 10, averageResponseMinutes: 5, p95ResponseMinutes: 10, confirmedBookings: 20, confirmationSamples: 20, confirmationReliabilityPercent: 95, bookingConflicts: 0 },
    appeals: { available: true, pending: 0 },
} as AutoCareQualityMonitoring

vi.mock('@/entities/automotive-service', () => ({
    useGetAdminAutoCareQualityMonitoringQuery: () => ({ data, isLoading: false, error: null, refetch: vi.fn() }),
}))

vi.mock('@/shared/lib/useTranslation', () => ({
    useTranslation: () => ({
        locale: 'en',
        t: (key: string) => ({
            'adminDataQuality.title': 'Data quality and work queues',
            'adminDataQuality.description': 'Quality summary.',
            'adminDataQuality.pendingReviews': 'Reviews awaiting moderation',
            'adminDataQuality.reviewAnomalies': 'Review quality signals',
            'adminDataQuality.pendingAppeals': 'Appeals awaiting decision',
            'adminDataQuality.bookingConflicts': 'Booking conflicts',
            'adminDataQuality.evidenceCoverage': 'Current trust signals',
            'adminDataQuality.priceCoverage': 'Service offers with prices',
            'adminDataQuality.catalogCoverage': 'Providers with published offers',
            'adminDataQuality.suspendedProviders': 'Suspended providers',
            'adminDataQuality.allClear': 'Queues are clear — no critical deviations found.',
            'adminDataQuality.failed': 'Could not load quality metrics.',
            'adminDataQuality.generated': 'Generated',
            'adminDataQuality.needsAttention': 'Needs attention',
            'adminDataQuality.healthy': 'Healthy',
            'adminDataQuality.openQueue': 'Open queue',
            'common.loading': 'Loading',
            'common.retry': 'Retry',
        }[key] ?? key),
    }),
}))

describe('AdminDataQualityPanel', () => {
    it('renders localized labels and locale-formatted quality metrics', () => {
        render(<AdminDataQualityPanel />)

        expect(screen.getByRole('heading', { name: 'Data quality and work queues' })).toBeVisible()
        expect(screen.getByText('1,234')).toBeVisible()
        expect(screen.getByText('92%')).toBeVisible()
        expect(screen.getAllByText('Healthy').length).toBeGreaterThan(0)
    })
})
