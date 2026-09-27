import { randomUUID } from 'node:crypto'
import type { FastifyRequest } from 'fastify'
import { In } from 'typeorm'

import { ENABLED_AUTOCARE_COUNTRY_CODES } from '../../config/enabled-market-countries.js'
import { AppDataSource } from '../../database/data-source.js'
import { AutomotiveMarketCountryEntity, AutomotiveMarketEntity, AutomotiveProviderEntity, AutomotiveProviderStatus, AutomotiveReviewEntity, AutomotiveReviewStatus, AutomotiveServiceLocationEntity } from '../../entities/automotive/automotive.entity.js'
import { AutoCareReviewHelpfulVoteEntity } from '../../entities/automotive/review-helpful-vote.entity.js'
import { ServiceRequestEntity, ServiceRequestStatus } from '../../entities/automotive/service-request.entity.js'
import { UserConsentAction, UserConsentSource, UserConsentType } from '../../entities/user-consent/user-consent.entity.js'
import { UserEntity, UserRole, UserStatus } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { getConsentEvidence, recordConsentWithManager } from '../users/user-consent.service.js'
import { getAutoCareCommunityBadges, normalizeAutoCareCommunityDisplayName, type AutoCareCommunityBadgeCode } from './autocare-community-policy.js'

const PROFILE_CONSENT_VERSION = 'community-profile-v1'
const countries = [...ENABLED_AUTOCARE_COUNTRY_CODES]

export type AutoCareCommunityMetrics = { confirmedVisits: number; publishedReviews: number; helpfulVoters: number }
export type PrivateAutoCareCommunityProfile = {
    enabled: boolean
    displayName: string | null
    publicProfileId: string | null
    profileUrl: string | null
    badgeCodes: AutoCareCommunityBadgeCode[]
    metrics: AutoCareCommunityMetrics
}
export type PublicAutoCareCommunityProfile = {
    profileId: string
    displayName: string
    avatarUrl: string | null
    badgeCodes: AutoCareCommunityBadgeCode[]
    metrics: AutoCareCommunityMetrics
}
type CountRow = { count: string | number }

function fail(statusCode: number, code: typeof ERROR_CODES[keyof typeof ERROR_CODES], message: string): never {
    throw new AppError({ statusCode, code, message })
}

function assertClient(user: UserEntity, verified = false) {
    if (user.role !== UserRole.Client || user.status !== UserStatus.Active) fail(403, ERROR_CODES.Forbidden, 'Only active client accounts can use community features.')
    if (verified && !user.emailVerifiedAt) fail(403, ERROR_CODES.EmailVerificationRequired, 'Email verification is required for community actions.')
}

function count(value: string | number | null | undefined) {
    const parsed = Number(value ?? 0)
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0
}

function confirmedVisitsQuery() {
    return AppDataSource.getRepository(ServiceRequestEntity)
        .createQueryBuilder('request')
        .innerJoin(AutomotiveProviderEntity, 'provider', 'provider.id = request.providerId AND provider.status = :providerStatus', { providerStatus: AutomotiveProviderStatus.Active })
        .innerJoin(AutomotiveServiceLocationEntity, 'location', 'location.id = request.locationId')
        .innerJoin(AutomotiveMarketEntity, 'market', 'market.id = location.marketId AND market.launchReady = true AND market.countryCode = ANY(:countries)', { countries })
        .innerJoin(AutomotiveMarketCountryEntity, 'country', 'country.id = market.countryId AND country.active = true')
        .where('request.status = :requestStatus', { requestStatus: ServiceRequestStatus.Closed })
        .andWhere('request.clientConfirmedAt IS NOT NULL')
        .andWhere('request.providerConfirmedAt IS NOT NULL')
}

function approvedReviewsQuery() {
    return AppDataSource.getRepository(AutomotiveReviewEntity)
        .createQueryBuilder('review')
        .innerJoin(ServiceRequestEntity, 'request', 'request.id = review.serviceRequestId AND request.providerId = review.providerId')
        .innerJoin(AutomotiveProviderEntity, 'provider', 'provider.id = review.providerId AND provider.status = :providerStatus', { providerStatus: AutomotiveProviderStatus.Active })
        .innerJoin(AutomotiveServiceLocationEntity, 'location', 'location.id = request.locationId')
        .innerJoin(AutomotiveMarketEntity, 'market', 'market.id = location.marketId AND market.launchReady = true AND market.countryCode = ANY(:countries)', { countries })
        .innerJoin(AutomotiveMarketCountryEntity, 'country', 'country.id = market.countryId AND country.active = true')
        .where('review.status = :reviewStatus', { reviewStatus: AutomotiveReviewStatus.Approved })
        .andWhere('review.verifiedVisit = true')
        .andWhere('request.status = :requestStatus', { requestStatus: ServiceRequestStatus.Closed })
        .andWhere('request.clientConfirmedAt IS NOT NULL')
        .andWhere('request.providerConfirmedAt IS NOT NULL')
}

async function getMetricsForUsers(userIds: string[]): Promise<Map<string, AutoCareCommunityMetrics>> {
    const ids = [...new Set(userIds)]
    const metrics = new Map(ids.map((userId) => [userId, { confirmedVisits: 0, publishedReviews: 0, helpfulVoters: 0 }]))
    if (!ids.length) return metrics

    const [visits, reviews, helpfulVotes] = await Promise.all([
        confirmedVisitsQuery().andWhere('request.clientId IN (:...userIds)', { userIds: ids })
            .select('request.clientId', 'userId').addSelect('COUNT(DISTINCT request.id)', 'count')
            .groupBy('request.clientId').getRawMany<{ userId: string; count: string | number }>(),
        approvedReviewsQuery().andWhere('review.clientId IN (:...userIds)', { userIds: ids })
            .select('review.clientId', 'userId').addSelect('COUNT(DISTINCT review.id)', 'count')
            .groupBy('review.clientId').getRawMany<{ userId: string; count: string | number }>(),
        AppDataSource.getRepository(AutoCareReviewHelpfulVoteEntity)
            .createQueryBuilder('vote')
            .innerJoin(AutomotiveReviewEntity, 'review', 'review.id = vote.reviewId')
            .innerJoin(ServiceRequestEntity, 'request', 'request.id = review.serviceRequestId AND request.providerId = review.providerId AND request.status = :requestStatus AND request.clientConfirmedAt IS NOT NULL AND request.providerConfirmedAt IS NOT NULL', { requestStatus: ServiceRequestStatus.Closed })
            .innerJoin(AutomotiveProviderEntity, 'provider', 'provider.id = review.providerId AND provider.status = :providerStatus', { providerStatus: AutomotiveProviderStatus.Active })
            .innerJoin(AutomotiveServiceLocationEntity, 'location', 'location.id = request.locationId')
            .innerJoin(AutomotiveMarketEntity, 'market', 'market.id = location.marketId AND market.launchReady = true AND market.countryCode = ANY(:countries)', { countries })
            .innerJoin(AutomotiveMarketCountryEntity, 'country', 'country.id = market.countryId AND country.active = true')
            .innerJoin(UserEntity, 'voter', 'voter.id = vote.voterUserId AND voter.role = :role AND voter.status = :status AND voter.emailVerifiedAt IS NOT NULL', { role: UserRole.Client, status: UserStatus.Active })
            .where('review.clientId IN (:...userIds)', { userIds: ids })
            .andWhere('review.status = :reviewStatus', { reviewStatus: AutomotiveReviewStatus.Approved })
            .andWhere('review.verifiedVisit = true')
            .select('review.clientId', 'userId').addSelect('vote.voterUserId', 'voterId')
            .distinct(true).getRawMany<{ userId: string; voterId: string }>(),
    ])

    for (const row of visits) metrics.get(row.userId)!.confirmedVisits = count(row.count)
    for (const row of reviews) metrics.get(row.userId)!.publishedReviews = count(row.count)
    const votersByUser = new Map<string, Set<string>>()
    for (const row of helpfulVotes) {
        const voters = votersByUser.get(row.userId) ?? new Set<string>()
        voters.add(row.voterId)
        votersByUser.set(row.userId, voters)
    }
    for (const [userId, voters] of votersByUser) metrics.get(userId)!.helpfulVoters = voters.size
    return metrics
}

async function getMetrics(userId: string): Promise<AutoCareCommunityMetrics> {
    return (await getMetricsForUsers([userId])).get(userId) ?? { confirmedVisits: 0, publishedReviews: 0, helpfulVoters: 0 }
}

export async function getMyAutoCareCommunityProfile(user: UserEntity): Promise<PrivateAutoCareCommunityProfile> {
    assertClient(user)
    const metrics = await getMetrics(user.id)
    const publicProfileId = user.communityProfileEnabled ? user.communityProfileId : null
    return {
        enabled: user.communityProfileEnabled,
        displayName: user.communityDisplayName,
        publicProfileId,
        profileUrl: publicProfileId ? `/community/clients/${publicProfileId}` : null,
        badgeCodes: getAutoCareCommunityBadges(metrics),
        metrics,
    }
}

export async function updateMyAutoCareCommunityProfile(user: UserEntity, input: { enabled?: boolean; displayName?: string | null }, request?: Pick<FastifyRequest, 'ip' | 'headers'>) {
    assertClient(user)
    if (input.enabled === undefined && input.displayName === undefined) fail(422, ERROR_CODES.ValidationError, 'At least one community profile setting must be provided.')
    const displayName = input.displayName === undefined ? undefined : normalizeAutoCareCommunityDisplayName(input.displayName)
    if (displayName === undefined && input.displayName !== undefined) fail(422, ERROR_CODES.ValidationError, 'Display name must contain 2 to 40 visible characters.')

    await AppDataSource.transaction(async (manager) => {
        const repository = manager.getRepository(UserEntity)
        const current = await repository.findOne({ where: { id: user.id }, lock: { mode: 'pessimistic_write' } })
        if (!current || current.role !== UserRole.Client || current.status !== UserStatus.Active) fail(403, ERROR_CODES.Forbidden, 'Only active client accounts can use community features.')
        const wasEnabled = current.communityProfileEnabled
        if (input.enabled === true && !wasEnabled && !((displayName ?? current.communityDisplayName)?.trim())) fail(422, ERROR_CODES.ValidationError, 'Choose a public display name before enabling the community profile.')
        if (displayName !== undefined) current.communityDisplayName = displayName
        if (input.enabled !== undefined) current.communityProfileEnabled = input.enabled
        if (input.enabled === true && !wasEnabled) current.communityProfileId = randomUUID()
        if (current.communityProfileEnabled && !current.communityDisplayName?.trim()) fail(422, ERROR_CODES.ValidationError, 'Choose a public display name before enabling the community profile.')
        await repository.save(current)
        if (input.enabled !== undefined && input.enabled !== wasEnabled) {
            await recordConsentWithManager(manager, {
                userId: current.id,
                consentType: UserConsentType.CommunityProfile,
                action: input.enabled ? UserConsentAction.Granted : UserConsentAction.Revoked,
                documentVersion: PROFILE_CONSENT_VERSION,
                source: UserConsentSource.Profile,
                resourceId: null,
                ...getConsentEvidence(request),
            })
        }
    })
    const updated = await AppDataSource.getRepository(UserEntity).findOneBy({ id: user.id })
    if (!updated) fail(404, ERROR_CODES.NotFound, 'User not found.')
    return getMyAutoCareCommunityProfile(updated)
}

export async function getPublicAutoCareCommunityProfile(profileId: string): Promise<PublicAutoCareCommunityProfile> {
    const user = await AppDataSource.getRepository(UserEntity).findOne({
        where: { communityProfileId: profileId, communityProfileEnabled: true, role: UserRole.Client, status: UserStatus.Active },
        select: { id: true, communityProfileId: true, communityProfileEnabled: true, communityDisplayName: true, avatarUrl: true },
    })
    if (!user?.communityDisplayName) fail(404, ERROR_CODES.NotFound, 'Public client profile not found.')
    const metrics = await getMetrics(user.id)
    return { profileId: user.communityProfileId, displayName: user.communityDisplayName, avatarUrl: user.avatarUrl, badgeCodes: getAutoCareCommunityBadges(metrics), metrics }
}

export type AutoCarePublicReviewCommunityData = {
    authorName: string
    avatarUrl: string | null
    communityProfile: { profileId: string; badgeCodes: AutoCareCommunityBadgeCode[] } | null
    helpfulCount: number
}

export async function getPublicReviewCommunityData(reviews: AutomotiveReviewEntity[]) {
    const data = new Map<string, AutoCarePublicReviewCommunityData>()
    for (const review of reviews) data.set(review.id, { authorName: '', avatarUrl: null, communityProfile: null, helpfulCount: 0 })
    if (!reviews.length) return data
    const ids = [...new Set(reviews.map(({ clientId }) => clientId).filter((id): id is string => Boolean(id)))]
    const [users, voteRows] = await Promise.all([
        ids.length ? AppDataSource.getRepository(UserEntity).find({
            where: { id: In(ids), communityProfileEnabled: true, role: UserRole.Client, status: UserStatus.Active },
            select: { id: true, communityProfileId: true, communityProfileEnabled: true, communityDisplayName: true, avatarUrl: true },
        }) : Promise.resolve([]),
        AppDataSource.getRepository(AutoCareReviewHelpfulVoteEntity)
            .createQueryBuilder('vote')
            .innerJoin(UserEntity, 'voter', 'voter.id = vote.voterUserId AND voter.role = :role AND voter.status = :status AND voter.emailVerifiedAt IS NOT NULL', { role: UserRole.Client, status: UserStatus.Active })
            .select('vote.reviewId', 'reviewId').addSelect('COUNT(DISTINCT vote.voterUserId)', 'count')
            .where('vote.reviewId IN (:...reviewIds)', { reviewIds: reviews.map(({ id }) => id) })
            .groupBy('vote.reviewId').getRawMany<{ reviewId: string; count: string | number }>(),
    ])
    const usersById = new Map(users.map((value) => [value.id, value]))
    const metricsByUser = await getMetricsForUsers(users.map(({ id }) => id))
    const votesByReview = new Map(voteRows.map((row) => [row.reviewId, count(row.count)]))
    for (const review of reviews) {
        const matchedAuthor = review.clientId ? usersById.get(review.clientId) : undefined
        const author = matchedAuthor?.communityDisplayName?.trim() ? matchedAuthor : undefined
        const metrics = author ? metricsByUser.get(author.id) : undefined
        data.set(review.id, {
            authorName: author?.communityDisplayName ?? '',
            avatarUrl: author?.avatarUrl ?? null,
            communityProfile: author && metrics ? { profileId: author.communityProfileId, badgeCodes: getAutoCareCommunityBadges(metrics) } : null,
            helpfulCount: votesByReview.get(review.id) ?? 0,
        })
    }
    return data
}

function eligibleReviewQuery(reviewId: string) {
    return AppDataSource.getRepository(AutomotiveReviewEntity)
        .createQueryBuilder('review')
        .innerJoin(ServiceRequestEntity, 'request', 'request.id = review.serviceRequestId AND request.providerId = review.providerId')
        .innerJoin(AutomotiveProviderEntity, 'provider', 'provider.id = review.providerId AND provider.status = :providerStatus', { providerStatus: AutomotiveProviderStatus.Active })
        .innerJoin(AutomotiveServiceLocationEntity, 'location', 'location.id = request.locationId')
        .innerJoin(AutomotiveMarketEntity, 'market', 'market.id = location.marketId AND market.launchReady = true AND market.countryCode = ANY(:countries)', { countries })
        .innerJoin(AutomotiveMarketCountryEntity, 'country', 'country.id = market.countryId AND country.active = true')
        .where('review.id = :reviewId', { reviewId })
        .andWhere('review.status = :reviewStatus', { reviewStatus: AutomotiveReviewStatus.Approved })
        .andWhere('review.verifiedVisit = true')
        .andWhere('request.status = :requestStatus', { requestStatus: ServiceRequestStatus.Closed })
        .andWhere('request.clientConfirmedAt IS NOT NULL')
        .andWhere('request.providerConfirmedAt IS NOT NULL')
}

async function getVoteCount(reviewId: string) {
    const result = await AppDataSource.getRepository(AutoCareReviewHelpfulVoteEntity)
        .createQueryBuilder('vote')
        .innerJoin(UserEntity, 'voter', 'voter.id = vote.voterUserId AND voter.role = :role AND voter.status = :status AND voter.emailVerifiedAt IS NOT NULL', { role: UserRole.Client, status: UserStatus.Active })
        .where('vote.reviewId = :reviewId', { reviewId })
        .select('COUNT(DISTINCT vote.voterUserId)', 'count').getRawOne<CountRow>()
    return count(result?.count)
}

async function assertVoteTarget(reviewId: string, voterId: string) {
    const review = await eligibleReviewQuery(reviewId).select(['review.id', 'review.clientId', 'review.providerId']).getOne()
    if (!review) fail(404, ERROR_CODES.NotFound, 'Review not found.')
    if (review.clientId === voterId) fail(403, ERROR_CODES.Forbidden, 'You cannot vote for your own review.')
    return review
}

export async function markAutoCareReviewHelpful(user: UserEntity, reviewId: string) {
    assertClient(user, true)
    const review = await assertVoteTarget(reviewId, user.id)
    await AppDataSource.getRepository(AutoCareReviewHelpfulVoteEntity).createQueryBuilder().insert().values({ reviewId, voterUserId: user.id }).orIgnore().execute()
    return { reviewId, providerId: review.providerId, helpfulCount: await getVoteCount(reviewId), voted: true }
}

export async function removeAutoCareReviewHelpfulVote(user: UserEntity, reviewId: string) {
    assertClient(user, true)
    const review = await assertVoteTarget(reviewId, user.id)
    await AppDataSource.getRepository(AutoCareReviewHelpfulVoteEntity).delete({ reviewId, voterUserId: user.id })
    return { reviewId, providerId: review.providerId, helpfulCount: await getVoteCount(reviewId), voted: false }
}

export async function getMyAutoCareHelpfulReviewIds(user: UserEntity, providerId: string) {
    assertClient(user, true)
    const rows = await AppDataSource.getRepository(AutoCareReviewHelpfulVoteEntity)
        .createQueryBuilder('vote')
        .innerJoin(AutomotiveReviewEntity, 'review', 'review.id = vote.reviewId AND review.providerId = :providerId', { providerId })
        .innerJoin(ServiceRequestEntity, 'request', 'request.id = review.serviceRequestId AND request.providerId = review.providerId AND request.status = :requestStatus AND request."clientConfirmedAt" IS NOT NULL AND request."providerConfirmedAt" IS NOT NULL', { requestStatus: ServiceRequestStatus.Closed })
        .innerJoin(AutomotiveProviderEntity, 'provider', 'provider.id = review.providerId AND provider.status = :providerStatus', { providerStatus: AutomotiveProviderStatus.Active })
        .innerJoin(AutomotiveServiceLocationEntity, 'location', 'location.id = request.locationId')
        .innerJoin(AutomotiveMarketEntity, 'market', 'market.id = location.marketId AND market.launchReady = true AND market.countryCode = ANY(:countries)', { countries })
        .innerJoin(AutomotiveMarketCountryEntity, 'country', 'country.id = market.countryId AND country.active = true')
        .where('vote.voterUserId = :userId', { userId: user.id })
        .andWhere('review.status = :reviewStatus', { reviewStatus: AutomotiveReviewStatus.Approved })
        .andWhere('review.verifiedVisit = true')
        .select('vote.reviewId', 'reviewId').getRawMany<{ reviewId: string }>()
    const ownReviews = await AppDataSource.getRepository(AutomotiveReviewEntity).find({
        where: { providerId, clientId: user.id, status: AutomotiveReviewStatus.Approved },
        select: { id: true },
    })
    return { reviewIds: rows.map(({ reviewId }) => reviewId), ownReviewIds: ownReviews.map(({ id }) => id) }
}
