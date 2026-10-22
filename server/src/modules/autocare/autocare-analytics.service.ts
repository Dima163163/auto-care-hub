import { AppDataSource } from '../../database/data-source.js'
import {
    AutoCareBonusAccountEntity,
    AutoCareProviderDailyMetricEntity,
    AutoCareServiceQuoteEntity,
    AutomotiveProviderEntity,
    AutomotiveProviderMembershipEntity,
    AutomotiveProviderMembershipStatus,
    AutomotiveReviewEntity,
    AutomotiveReviewStatus,
    ServiceRequestEntity,
    ServiceRequestStatus,
} from '../../entities/index.js'
import type { UserEntity } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { logError } from '../../shared/observability/logger.js'
import { getManagedProviderPermissionScopes } from './provider-access.service.js'
import { isVerifiedCompletedVisit } from './completed-visit-policy.js'
import { normalizeProviderMembershipUuid } from './provider-membership-policy.js'
import type { AutoCareProviderAnalyticsResponse } from './autocare.types.js'
import { env } from '../../config/env.js'
import { readFirstProviderResponseMinutes } from './first-provider-response-reader.js'

function forbidden(message: string): never {
    throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message })
}

function notFound(message: string): never {
    throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message })
}

function invalid(message: string): never {
    throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message })
}

function percent(value: number, total: number) {
    return total === 0 ? 0 : Number(((value / total) * 100).toFixed(1))
}

const OWNER_ANALYTICS_PAGE_SIZE = 500

async function* ownerRequestPages(providerId: string, locationIds: string[] | null, generatedAt: Date) {
    if (locationIds?.length === 0) return
    let cursor: { createdAt: Date; id: string } | null = null
    while (true) {
        const query = AppDataSource.getRepository(ServiceRequestEntity).createQueryBuilder('request')
            .select([
                'request.id', 'request.providerId', 'request.locationId', 'request.clientId',
                'request.status', 'request.completedAt', 'request.clientConfirmedAt',
                'request.providerConfirmedAt', 'request.acceptedQuoteAt',
                'request.estimateSnapshot', 'request.createdAt',
            ])
            .where('request.providerId = :providerId', { providerId })
            .andWhere('request.createdAt <= :generatedAt', { generatedAt })
        if (locationIds !== null) query.andWhere('request.locationId IN (:...locationIds)', { locationIds })
        if (cursor) query.andWhere('(request.createdAt < :cursorCreatedAt OR (request.createdAt = :cursorCreatedAt AND request.id < :cursorId))', {
            cursorCreatedAt: cursor.createdAt, cursorId: cursor.id,
        })
        const rows = await query.orderBy('request.createdAt', 'DESC').addOrderBy('request.id', 'DESC')
            .take(OWNER_ANALYTICS_PAGE_SIZE + 1).getMany()
        const page = rows.slice(0, OWNER_ANALYTICS_PAGE_SIZE)
        if (page.length === 0) return
        yield page
        if (rows.length <= OWNER_ANALYTICS_PAGE_SIZE) return
        const last = page.at(-1)!
        cursor = { createdAt: last.createdAt, id: last.id }
    }
}

/**
 * Provider-safe operational metrics. The query is deliberately derived from
 * requests, quotes, messages, reviews and bonus accounts rather than exposing
 * client identity or private message content.
 */
export async function getOwnerAutoCareProviderAnalytics(owner: UserEntity, providerId: string): Promise<AutoCareProviderAnalyticsResponse> {
    const normalizedProviderId = normalizeProviderMembershipUuid(providerId)
    if (!normalizedProviderId) invalid('Provider id must be a valid UUID.')
    const scope = (await getManagedProviderPermissionScopes(owner.id, 'analytics')).find((item) => item.providerId === normalizedProviderId)
    if (!scope) forbidden('You do not manage this automotive service.')

    const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: normalizedProviderId })
    if (!provider) notFound('Automotive service not found.')

    const scopedLocationIds = scope.locationIds
    const isProviderWide = scopedLocationIds === null
    const generatedAt = new Date()
    const [metrics, memberships, bonusAggregate, providerReviewAggregate] = await Promise.all([
        isProviderWide
            ? AppDataSource.getRepository(AutoCareProviderDailyMetricEntity).createQueryBuilder('metric')
                .select('COALESCE(SUM(metric.impressions), 0)', 'impressions')
                .addSelect('COALESCE(SUM(metric.profileOpens), 0)', 'profileOpens')
                .where('metric.providerId = :providerId', { providerId: normalizedProviderId })
                .getRawOne<{ impressions: string; profileOpens: string }>()
            : Promise.resolve(null),
        AppDataSource.getRepository(AutomotiveProviderMembershipEntity).find({
            where: { providerId: normalizedProviderId, status: AutomotiveProviderMembershipStatus.Active },
            select: { providerId: true, userId: true, locationId: true, status: true },
        }),
        isProviderWide
            ? AppDataSource.getRepository(AutoCareBonusAccountEntity).createQueryBuilder('account')
                .select('COALESCE(SUM(account.balancePoints), 0)', 'points')
                .where('account.providerId = :providerId', { providerId: normalizedProviderId })
                .getRawOne<{ points: string }>()
            : Promise.resolve(null),
        isProviderWide
            ? AppDataSource.getRepository(AutomotiveReviewEntity).createQueryBuilder('review')
                .select('COUNT(review.id)', 'count')
                .addSelect('COALESCE(SUM(review.rating), 0)', 'ratingSum')
                .where('review.providerId = :providerId', { providerId: normalizedProviderId })
                .andWhere('review.status = :status', { status: AutomotiveReviewStatus.Approved })
                .getRawOne<{ count: string; ratingSum: string }>()
            : Promise.resolve(null),
    ])
    let inquiries = 0
    let openRequests = 0
    let confirmedBookings = 0
    let completedVisits = 0
    let cancelledRequests = 0
    let noShowRequests = 0
    let quoteAccepted = 0
    let eligibleQuoteRequests = 0
    let responseSamples = 0
    let responseMinutesSum = 0
    let reviewCount = Number(providerReviewAggregate?.count ?? 0)
    let ratingSum = Number(providerReviewAggregate?.ratingSum ?? 0)
    const clientCounts = new Map<string, number>()
    for await (const requests of ownerRequestPages(normalizedProviderId, scopedLocationIds, generatedAt)) {
        const requestIds = requests.map((request) => request.id)
        const [quotes, responseMinutes, branchReviews] = await Promise.all([
            AppDataSource.getRepository(AutoCareServiceQuoteEntity).createQueryBuilder('quote')
                .select('DISTINCT quote.requestId', 'requestId')
                .where('quote.requestId IN (:...requestIds)', { requestIds })
                .getRawMany<{ requestId: string }>(),
            readFirstProviderResponseMinutes({ providers: [provider], memberships, requests }),
            isProviderWide
                ? Promise.resolve(null)
                : AppDataSource.getRepository(AutomotiveReviewEntity).createQueryBuilder('review')
                    .select('COUNT(review.id)', 'count')
                    .addSelect('COALESCE(SUM(review.rating), 0)', 'ratingSum')
                    .where('review.providerId = :providerId', { providerId: normalizedProviderId })
                    .andWhere('review.status = :status', { status: AutomotiveReviewStatus.Approved })
                    .andWhere('review.serviceRequestId IN (:...requestIds)', { requestIds })
                    .getRawOne<{ count: string; ratingSum: string }>(),
        ])
        reviewCount += Number(branchReviews?.count ?? 0)
        ratingSum += Number(branchReviews?.ratingSum ?? 0)
        const quotedIds = new Set(quotes.map((quote) => quote.requestId))
        for (const minutes of responseMinutes.values()) {
            responseSamples += 1
            responseMinutesSum += minutes
        }
        for (const request of requests) {
            if (request.status !== ServiceRequestStatus.Draft) inquiries += 1
            if ([ServiceRequestStatus.Open, ServiceRequestStatus.AwaitingReply, ServiceRequestStatus.EstimateShared].includes(request.status)) openRequests += 1
            if (request.clientConfirmedAt && request.providerConfirmedAt) confirmedBookings += 1
            if (isVerifiedCompletedVisit(request)) completedVisits += 1
            if (request.status === ServiceRequestStatus.Cancelled) cancelledRequests += 1
            if (request.status === ServiceRequestStatus.NoShow) noShowRequests += 1
            if (request.acceptedQuoteAt !== null) quoteAccepted += 1
            if (quotedIds.has(request.id) || request.estimateSnapshot || request.acceptedQuoteAt) eligibleQuoteRequests += 1
            clientCounts.set(request.clientId, (clientCounts.get(request.clientId) ?? 0) + 1)
        }
    }
    const repeatCustomers = [...clientCounts.values()].filter((count) => count > 1).length

    return {
        providerId: normalizedProviderId,
        generatedAt: generatedAt.toISOString(),
        inquiries,
        openRequests,
        confirmedBookings,
        completedVisits,
        cancelledRequests,
        noShowRequests,
        completionRate: percent(completedVisits, confirmedBookings),
        quoteConversionRate: percent(quoteAccepted, eligibleQuoteRequests),
        averageResponseMinutes: responseSamples === 0 ? null : Number((responseMinutesSum / responseSamples).toFixed(1)),
        repeatCustomers,
        reviewCount,
        averageRating: reviewCount === 0 ? 0 : Number((ratingSum / reviewCount).toFixed(1)),
        bonusLiabilityPoints: Number(bonusAggregate?.points ?? 0),
        tracking: {
            impressions: Number(metrics?.impressions ?? 0),
            profileOpens: Number(metrics?.profileOpens ?? 0),
            available: isProviderWide,
        },
        privacy: {
            // These counters are daily, provider-level aggregates and do not
            // store an account, device identifier or event-level history.
            consentRequired: false,
            retentionDays: env.autoCareAnalyticsRetentionDays,
        },
    }
}

type DailyMetricField = 'impressions' | 'profileOpens'

function currentMetricDay() {
    return new Date().toISOString().slice(0, 10)
}

async function incrementDailyMetric(providerId: string, field: DailyMetricField, amount: number) {
    if (amount <= 0) return
    const day = currentMetricDay()
    await AppDataSource.query(`INSERT INTO "autocare_provider_daily_metrics" ("id", "providerId", "day", "${field}")
        VALUES (uuid_generate_v4(), $1, $2, $3)
        ON CONFLICT ("providerId", "day") DO UPDATE
        SET "${field}" = "autocare_provider_daily_metrics"."${field}" + EXCLUDED."${field}",
            "updatedAt" = now()`, [providerId, day, amount])
}

/** Best-effort public activity counters. They never affect discovery/profile availability. */
export async function recordAutoCareProviderDiscoveryImpressions(providerIds: readonly string[]) {
    if (!Array.isArray(providerIds) || providerIds.length > 100) return
    const counts = new Map<string, number>()
    for (const providerId of providerIds) {
        const normalizedProviderId = normalizeProviderMembershipUuid(providerId)
        if (normalizedProviderId) counts.set(normalizedProviderId, (counts.get(normalizedProviderId) ?? 0) + 1)
    }
    if (counts.size === 0) return
    try {
        await Promise.all([...counts].map(([providerId, amount]) => incrementDailyMetric(providerId, 'impressions', amount)))
    } catch (error) {
        logError('Could not record AutoCare discovery impressions', error, { providerCount: counts.size })
    }
}

export async function recordAutoCareProviderProfileOpen(providerId: string) {
    const normalizedProviderId = normalizeProviderMembershipUuid(providerId)
    if (!normalizedProviderId) return
    try {
        await incrementDailyMetric(normalizedProviderId, 'profileOpens', 1)
    } catch (error) {
        logError('Could not record AutoCare profile open', error, { providerId: normalizedProviderId })
    }
}
