import { In } from 'typeorm'

import { AppDataSource } from '../../database/data-source.js'
import { env } from '../../config/env.js'
import {
    AutoCareTrustSnapshotEntity,
    AutoCareAppealEntity,
    AutoCareAppealStatus,
    AutomotiveProviderEntity,
    AutomotiveProviderStatus,
    AutomotiveReviewEntity,
    AutomotiveReviewStatus,
    AutomotiveServiceDefinitionEntity,
    AutomotiveServiceLocationEntity,
    AutomotiveServiceOfferingEntity,
    ServiceMessageEntity,
    ServiceRequestEntity,
    ServiceRequestStatus,
} from '../../entities/index.js'
import { isAdminRole } from '../../shared/auth/roles.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { assessReviewIntegrity, type ReviewIntegritySample } from './review-integrity-policy.js'
import { buildQualityMetrics } from './quality-metrics.js'
import { buildRankingCalibrationReport, type RankingCalibrationReport } from './ranking-calibration.js'
import type { UserEntity } from '../../entities/user/user.entity.js'
import { isVerifiedCompletedVisit } from './completed-visit-policy.js'

export type AutoCareQualityMonitoringResponse = {
    generatedAt: string
    providers: { total: number; active: number; verified: number; trusted: number; suspended: number }
    reviews: { approved: number; pending: number; rejected: number; anomalyCandidates: number }
    requests: { total: number; completed: number; cancelled: number; noShows: number }
    ranking: {
        trustSnapshots: number
        reassessedProviders: number
        evidenceCoveragePercent: number
        calibration: RankingCalibrationReport
        rollout: { enabled: boolean; marketIds: string[]; percentage: number }
    }
    catalog: { activeDefinitions: number; activeOffers: number; providersWithOffers: number; offerCoveragePercent: number; offersWithDescription: number; offersWithPrice: number; priceCoveragePercent: number }
    supply: { activeMarkets: number; averageLocationsPerProvider: number; markets: Array<{ marketId: string; providers: number; locations: number; activeOffers: number }> }
    reliability: { responseSamples: number; averageResponseMinutes: number | null; p95ResponseMinutes: number | null; confirmedBookings: number; confirmationSamples: number; confirmationReliabilityPercent: number; bookingConflicts: number }
    appeals: { available: true; pending: number }
}

function assertAdmin(user: UserEntity) {
    if (!isAdminRole(user.role)) throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'Only admins can view quality monitoring.' })
}

function percent(value: number, total: number) {
    return total === 0 ? 0 : Number(((value / total) * 100).toFixed(1))
}

/** Aggregate-only telemetry; private review/chat content is never returned. */
export async function getAutoCareQualityMonitoring(user: UserEntity): Promise<AutoCareQualityMonitoringResponse> {
    assertAdmin(user)
    const [providers, reviews, requests, trustSnapshots, definitions, locations, offers, pendingAppeals] = await Promise.all([
        AppDataSource.getRepository(AutomotiveProviderEntity).find({ select: { id: true, status: true, verified: true, trustBadge: true, trustReassessedAt: true } }),
        AppDataSource.getRepository(AutomotiveReviewEntity).find({ select: { id: true, clientId: true, providerId: true, serviceRequestId: true, text: true, rating: true, status: true, verifiedVisit: true, createdAt: true }, order: { createdAt: 'DESC' }, take: 1_000 }),
        AppDataSource.getRepository(ServiceRequestEntity).find({ select: { id: true, providerId: true, status: true, completedAt: true, createdAt: true, clientConfirmedAt: true, providerConfirmedAt: true } }),
        AppDataSource.getRepository(AutoCareTrustSnapshotEntity).find({ select: { providerId: true, score: true, computedAt: true } }),
        AppDataSource.getRepository(AutomotiveServiceDefinitionEntity).find({ select: { id: true, active: true } }),
        AppDataSource.getRepository(AutomotiveServiceLocationEntity).find({ select: { id: true, providerId: true, marketId: true } }),
        AppDataSource.getRepository(AutomotiveServiceOfferingEntity).find({ select: { locationId: true, definitionId: true, active: true, priceFromMinor: true, priceToMinor: true, currencyCode: true, description: true } }),
        AppDataSource.getRepository(AutoCareAppealEntity).countBy({ status: AutoCareAppealStatus.Pending }),
    ])
    const requestIds = requests.map((request) => request.id)
    const messages = requestIds.length === 0
        ? []
        : await AppDataSource.getRepository(ServiceMessageEntity).find({ where: { requestId: In(requestIds) }, select: { requestId: true, senderId: true, createdAt: true }, order: { createdAt: 'ASC' } })
    const providerIds = new Set(providers.map((provider) => provider.id))
    const quality = buildQualityMetrics({
        providers,
        definitions,
        locations,
        offers,
        requests,
        messages: messages.filter((message) => providerIds.has(message.senderId)),
    })
    const recent = reviews.map((review): ReviewIntegritySample => ({
        clientId: review.clientId,
        providerId: review.providerId,
        serviceRequestId: review.serviceRequestId,
        text: review.text,
        rating: review.rating,
        createdAt: review.createdAt,
    }))
    const anomalyCandidates = recent.reduce((count, review, index) => count + (assessReviewIntegrity(review, recent.slice(index + 1)).needsModeration ? 1 : 0), 0)
    const reassessedProviders = providers.filter((provider) => provider.trustReassessedAt !== null).length
    const totalProviders = providers.length

    return {
        generatedAt: new Date().toISOString(),
        providers: {
            total: totalProviders,
            active: providers.filter((provider) => provider.status === AutomotiveProviderStatus.Active).length,
            verified: providers.filter((provider) => provider.verified).length,
            trusted: providers.filter((provider) => provider.trustBadge === 'trusted').length,
            suspended: providers.filter((provider) => provider.status === AutomotiveProviderStatus.Suspended).length,
        },
        reviews: {
            approved: reviews.filter((review) => review.status === AutomotiveReviewStatus.Approved).length,
            pending: reviews.filter((review) => review.status === AutomotiveReviewStatus.Pending).length,
            rejected: reviews.filter((review) => review.status === AutomotiveReviewStatus.Rejected).length,
            anomalyCandidates,
        },
        requests: {
            total: requests.length,
            completed: requests.filter(isVerifiedCompletedVisit).length,
            cancelled: requests.filter((request) => request.status === ServiceRequestStatus.Cancelled).length,
            noShows: requests.filter((request) => request.status === ServiceRequestStatus.NoShow).length,
        },
        ranking: {
            trustSnapshots: trustSnapshots.length,
            reassessedProviders,
            evidenceCoveragePercent: percent(reassessedProviders, totalProviders),
            calibration: buildRankingCalibrationReport({
                snapshots: trustSnapshots,
                requests,
                reviews,
            }),
            rollout: env.autoCareTrustRollout,
        },
        ...quality,
        appeals: { available: true, pending: pendingAppeals },
    }
}
