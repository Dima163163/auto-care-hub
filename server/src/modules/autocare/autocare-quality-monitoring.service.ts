import { AppDataSource } from '../../database/data-source.js'
import {
    AutoCareTrustSnapshotEntity,
    AutoCareAppealEntity,
    AutoCareAppealStatus,
    AutomotiveProviderEntity,
    AutomotiveProviderMembershipEntity,
    AutomotiveProviderMembershipStatus,
    AutomotiveProviderStatus,
    AutomotiveReviewEntity,
    AutomotiveReviewStatus,
    AutomotiveServiceDefinitionEntity,
    AutomotiveServiceLocationEntity,
    AutomotiveServiceOfferingEntity,
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
import { getAutoCareTrustRollout } from '../admin/super-admin-trust-policy.service.js'
import { readFirstProviderResponseMinutes } from './first-provider-response-reader.js'

export type AutoCareQualityMonitoringResponse = {
    generatedAt: string
    providers: { total: number; active: number; verified: number; trusted: number; suspended: number }
    reviews: { approved: number; pending: number; rejected: number; anomalyCandidates: number; analysisWindow: { recentLimit: number; sampled: number; truncated: boolean } }
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

const REVIEW_ANALYSIS_LIMIT = 1_000
const RELIABILITY_PAGE_SIZE = 500

async function* qualityRequestPages(generatedAt: Date) {
    let cursor: { createdAt: Date; id: string } | null = null
    while (true) {
        const query = AppDataSource.getRepository(ServiceRequestEntity).createQueryBuilder('request')
            .select([
                'request.id', 'request.providerId', 'request.locationId', 'request.clientId',
                'request.status', 'request.completedAt', 'request.clientConfirmedAt',
                'request.providerConfirmedAt', 'request.createdAt',
            ])
            .where('request.createdAt <= :generatedAt', { generatedAt })
        if (cursor) query.andWhere('(request.createdAt < :cursorCreatedAt OR (request.createdAt = :cursorCreatedAt AND request.id < :cursorId))', {
            cursorCreatedAt: cursor.createdAt, cursorId: cursor.id,
        })
        const rows = await query.orderBy('request.createdAt', 'DESC').addOrderBy('request.id', 'DESC')
            .take(RELIABILITY_PAGE_SIZE + 1).getMany()
        const page = rows.slice(0, RELIABILITY_PAGE_SIZE)
        if (page.length === 0) return
        yield page
        if (rows.length <= RELIABILITY_PAGE_SIZE) return
        const last = page.at(-1)!
        cursor = { createdAt: last.createdAt, id: last.id }
    }
}

async function getFullReviewStatusCounts() {
    const rows = await AppDataSource.getRepository(AutomotiveReviewEntity)
        .createQueryBuilder('review')
        .select('review.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('review.status')
        .getRawMany<{ status: AutomotiveReviewStatus; count: string }>()

    const counts = { approved: 0, pending: 0, rejected: 0 }
    for (const row of rows) {
        if (row.status === AutomotiveReviewStatus.Approved) counts.approved = Number(row.count)
        if (row.status === AutomotiveReviewStatus.Pending) counts.pending = Number(row.count)
        if (row.status === AutomotiveReviewStatus.Rejected) counts.rejected = Number(row.count)
    }
    return counts
}

/** Aggregate-only telemetry; private review/chat content is never returned. */
export async function getAutoCareQualityMonitoring(user: UserEntity): Promise<AutoCareQualityMonitoringResponse> {
    assertAdmin(user)
    const generatedAt = new Date()
    const [providers, memberships, reviews, reviewCounts, trustSnapshots, definitions, locations, offers, pendingAppeals, rollout] = await Promise.all([
        AppDataSource.getRepository(AutomotiveProviderEntity).find({ select: { id: true, ownerId: true, status: true, verified: true, trustBadge: true, trustReassessedAt: true } }),
        AppDataSource.getRepository(AutomotiveProviderMembershipEntity).find({ where: { status: AutomotiveProviderMembershipStatus.Active }, select: { providerId: true, userId: true, locationId: true, status: true } }),
        AppDataSource.getRepository(AutomotiveReviewEntity).find({ select: { id: true, clientId: true, providerId: true, serviceRequestId: true, text: true, rating: true, status: true, verifiedVisit: true, createdAt: true }, order: { createdAt: 'DESC' }, take: REVIEW_ANALYSIS_LIMIT }),
        getFullReviewStatusCounts(),
        AppDataSource.getRepository(AutoCareTrustSnapshotEntity).find({ select: { providerId: true, score: true, computedAt: true } }),
        AppDataSource.getRepository(AutomotiveServiceDefinitionEntity).find({ select: { id: true, active: true } }),
        AppDataSource.getRepository(AutomotiveServiceLocationEntity).find({ select: { id: true, providerId: true, marketId: true } }),
        AppDataSource.getRepository(AutomotiveServiceOfferingEntity).find({ select: { locationId: true, definitionId: true, active: true, priceFromMinor: true, priceToMinor: true, currencyCode: true, description: true } }),
        AppDataSource.getRepository(AutoCareAppealEntity).countBy({ status: AutoCareAppealStatus.Pending }),
        getAutoCareTrustRollout(),
    ])
    let totalRequests = 0
    let completedRequests = 0
    let cancelledRequests = 0
    let noShowRequests = 0
    let confirmedBookings = 0
    let confirmationSamples = 0
    let bookingConflicts = 0
    const responseMinutes: number[] = []
    const calibrationByProvider = new Map<string, { providerId: string; confirmedVisits: number; noShows: number }>()
    for await (const requests of qualityRequestPages(generatedAt)) {
        responseMinutes.push(...(await readFirstProviderResponseMinutes({ providers, memberships, requests })).values())
        for (const request of requests) {
            totalRequests += 1
            const calibration = calibrationByProvider.get(request.providerId) ?? { providerId: request.providerId, confirmedVisits: 0, noShows: 0 }
            if (isVerifiedCompletedVisit(request)) {
                completedRequests += 1
                calibration.confirmedVisits += 1
            }
            if (request.status === ServiceRequestStatus.Cancelled) cancelledRequests += 1
            if (request.status === ServiceRequestStatus.NoShow) {
                noShowRequests += 1
                calibration.noShows += 1
            }
            calibrationByProvider.set(request.providerId, calibration)
            if (request.providerConfirmedAt || request.clientConfirmedAt) confirmationSamples += 1
            if (request.providerConfirmedAt && request.clientConfirmedAt) confirmedBookings += 1
            if (request.status === ServiceRequestStatus.Declined || request.status === ServiceRequestStatus.Cancelled) bookingConflicts += 1
        }
    }
    const sortedResponseMinutes = [...responseMinutes].sort((left, right) => left - right)
    const p95 = sortedResponseMinutes.length === 0 ? null : Number(sortedResponseMinutes[Math.ceil(0.95 * sortedResponseMinutes.length) - 1]!.toFixed(1))
    const quality = buildQualityMetrics({
        providers,
        providerMemberships: memberships,
        definitions,
        locations,
        offers,
        requests: [],
        messages: [],
        reliabilityOverride: {
            responseSamples: responseMinutes.length,
            averageResponseMinutes: responseMinutes.length === 0 ? null : Number((responseMinutes.reduce((sum, value) => sum + value, 0) / responseMinutes.length).toFixed(1)),
            p95ResponseMinutes: p95,
            confirmedBookings,
            confirmationSamples,
            confirmationReliabilityPercent: percent(confirmedBookings, confirmationSamples),
            bookingConflicts,
        },
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
        generatedAt: generatedAt.toISOString(),
        providers: {
            total: totalProviders,
            active: providers.filter((provider) => provider.status === AutomotiveProviderStatus.Active).length,
            verified: providers.filter((provider) => provider.verified).length,
            trusted: providers.filter((provider) => provider.trustBadge === 'trusted').length,
            suspended: providers.filter((provider) => provider.status === AutomotiveProviderStatus.Suspended).length,
        },
        reviews: {
            ...reviewCounts,
            anomalyCandidates,
            analysisWindow: {
                recentLimit: REVIEW_ANALYSIS_LIMIT,
                sampled: reviews.length,
                truncated: reviewCounts.approved + reviewCounts.pending + reviewCounts.rejected > reviews.length,
            },
        },
        requests: {
            total: totalRequests,
            completed: completedRequests,
            cancelled: cancelledRequests,
            noShows: noShowRequests,
        },
        ranking: {
            trustSnapshots: trustSnapshots.length,
            reassessedProviders,
            evidenceCoveragePercent: percent(reassessedProviders, totalProviders),
            calibration: buildRankingCalibrationReport({
                snapshots: trustSnapshots,
                requests: [],
                reviews,
                requestSummary: [...calibrationByProvider.values()],
            }),
            rollout,
        },
        ...quality,
        appeals: { available: true, pending: pendingAppeals },
    }
}
