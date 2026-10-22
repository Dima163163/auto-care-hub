import { In } from 'typeorm'
import type { EntityManager } from 'typeorm'

import { AppDataSource } from '../../database/data-source.js'
import {
    AutoCareGuaranteeClaimEntity,
    AutoCareTrustEvidenceEntity,
    AutoCareTrustSnapshotEntity,
    AutomotiveProviderEntity,
    AutomotiveProviderMembershipEntity,
    AutomotiveProviderMembershipStatus,
    AutomotiveProviderStatus,
    AutomotiveReviewEntity,
    AutomotiveReviewStatus,
    AutomotiveServiceLocationEntity,
    ServiceMessageEntity,
    ServiceRequestEntity,
    ServiceRequestStatus,
} from '../../entities/index.js'
import { calculateAutoCareTrustScore, type AutoCareTrustScore } from './trust-score.js'
import { isVerifiedCompletedVisit } from './completed-visit-policy.js'
import { isApprovedAutoCareEvidenceStatus } from './moderation-evidence-policy.js'
import { getAutoCareTrustPolicy } from '../admin/super-admin-trust-policy.service.js'
import { countActiveGuaranteeCases } from './guarantee-claim-policy.js'
import { logError } from '../../shared/observability/logger.js'
import { metrics } from '../../shared/observability/metrics.js'
import { getFirstProviderResponseMinutes } from './first-provider-response-policy.js'

const FAILED_REASSESSMENT_RETRY_MS = 15 * 60_000

function getProfileFieldCount(provider: AutomotiveProviderEntity) {
    return [
        provider.description,
        provider.phone,
        provider.email,
        provider.websiteUrl,
        provider.warrantyText,
    ].filter((value) => Boolean(value?.trim())).length
}

/**
 * Recalculates the persisted public trust signal from current evidence.
 * The value is derived only from approved reviews and non-expired evidence;
 * storing it keeps discovery sorting cheap and makes the badge auditable.
 */
export async function reassessAutoCareProviderTrust(
    providerId: string,
    manager: EntityManager = AppDataSource.manager,
): Promise<{ provider: AutomotiveProviderEntity; trust: AutoCareTrustScore; changed: boolean; snapshots: AutoCareTrustSnapshotEntity[] } | null> {
    const providerRepository = manager.getRepository(AutomotiveProviderEntity)
    const provider = await providerRepository.findOneBy({ id: providerId })
    if (!provider) return null

    const [evidence, reviews, claims, interactions, policy, memberships] = await Promise.all([
        manager.getRepository(AutoCareTrustEvidenceEntity).find({ where: { providerId } }),
        manager.getRepository(AutomotiveReviewEntity).find({ where: { providerId, status: AutomotiveReviewStatus.Approved, verifiedVisit: true } }),
        manager.getRepository(AutoCareGuaranteeClaimEntity).find({ where: { providerId } }),
        manager.getRepository(ServiceRequestEntity).find({ where: { providerId } }),
        getAutoCareTrustPolicy(),
        manager.getRepository(AutomotiveProviderMembershipEntity).find({
            where: { providerId, status: AutomotiveProviderMembershipStatus.Active },
            select: { providerId: true, userId: true, locationId: true, status: true },
        }),
    ])
    const nowMs = Date.now()
    const approvedReviewById = new Map(reviews.map((review) => [review.id, review]))
    const verifiedEvidenceCount = evidence.filter((item) =>
        isApprovedAutoCareEvidenceStatus(item.status)
        && (item.expiresAt === null || item.expiresAt.getTime() > nowMs)
        && (item.kind !== 'review' || Boolean(
            item.reference
            && approvedReviewById.get(item.reference)?.contentRevision === (item.reviewRevision ?? 1),
        )),
    ).length
    const reviewCount = reviews.length
    const rating = reviewCount > 0
        ? reviews.reduce((total, review) => total + review.rating, 0) / reviewCount
        : Number(provider.rating)
    const activeGuaranteeClaims = countActiveGuaranteeCases(claims)
    const completedInteractionCount = interactions.filter(isVerifiedCompletedVisit).length
    const cancelledInteractionCount = interactions.filter((request) => request.status === ServiceRequestStatus.Cancelled).length
    const noShowInteractionCount = interactions.filter((request) => request.status === ServiceRequestStatus.NoShow).length
    const requestIds = interactions.map((request) => request.id)
    const messages = requestIds.length === 0
        ? []
        : await manager.getRepository(ServiceMessageEntity).find({
            where: { requestId: In(requestIds) },
            order: { createdAt: 'ASC' },
        })
    const firstResponseMinutes = [...getFirstProviderResponseMinutes({
        providers: [provider],
        memberships,
        requests: interactions,
        messages,
    }).values()]
    const responseTimeMinutes = firstResponseMinutes.length > 0
        ? firstResponseMinutes.reduce((sum, value) => sum + value, 0) / firstResponseMinutes.length
        : undefined
    const complaintRate = completedInteractionCount > 0 ? activeGuaranteeClaims / completedInteractionCount : 0
    // Claim type is an allegation, not an adjudicated moderation finding.
    // No confirmed-violation state is persisted yet, so the proven count is 0.
    const criticalViolationCount = 0
    const orderedReviews = [...reviews].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    const recentReviews = orderedReviews.slice(-5)
    const priorReviews = orderedReviews.slice(0, -5)
    const average = (items: AutomotiveReviewEntity[]) => items.length === 0
        ? null
        : items.reduce((sum, review) => sum + review.rating, 0) / items.length
    const recentAverage = average(recentReviews)
    const priorAverage = average(priorReviews)
    const recentRatingTrend = recentAverage === null || priorAverage === null ? undefined : recentAverage - priorAverage
    const profileFields = getProfileFieldCount(provider)
    const trust = calculateAutoCareTrustScore({
        verified: provider.verified,
        rating,
        reviewCount,
        yearsActive: provider.yearsActive,
        profileFields,
        verifiedEvidenceCount,
        activeGuaranteeClaims,
        completedInteractionCount,
        cancelledInteractionCount,
        noShowInteractionCount,
        recentRatingTrend,
        complaintRate,
        responseTimeMinutes,
        moderationViolationCount: criticalViolationCount,
        policy,
    })
    const now = new Date()
    const inputCounters = {
        profileFields,
        reviewCount,
        verifiedEvidenceCount,
        activeGuaranteeClaims,
        completedInteractionCount,
        cancelledInteractionCount,
        noShowInteractionCount,
        rating: Math.round(rating * 100) / 100,
        complaintRate: Math.round(complaintRate * 1000) / 1000,
        responseTimeMinutes: responseTimeMinutes === undefined ? -1 : Math.round(responseTimeMinutes * 10) / 10,
        recentRatingTrend: recentRatingTrend === undefined ? 0 : Math.round(recentRatingTrend * 100) / 100,
        moderationViolationCount: criticalViolationCount,
    }
    const reasonCodes = [
        !provider.verified ? 'provider_not_verified' : null,
        reviewCount < 5 ? 'small_review_sample' : null,
        verifiedEvidenceCount === 0 ? 'no_verified_evidence' : null,
        activeGuaranteeClaims > 0 ? 'open_guarantee_claims' : null,
        completedInteractionCount === 0 ? 'no_completed_interactions' : null,
        (cancelledInteractionCount + noShowInteractionCount) > completedInteractionCount && completedInteractionCount > 0 ? 'reliability_below_threshold' : null,
        responseTimeMinutes === undefined ? 'response_time_signal_unavailable' : null,
        criticalViolationCount > 0 ? 'critical_moderation_violation' : null,
    ].filter((code): code is string => code !== null)
    const locations = await manager.getRepository(AutomotiveServiceLocationEntity).find({ where: { providerId } })
    const previousSnapshots = await manager.getRepository(AutoCareTrustSnapshotEntity).find({
        where: { providerId },
        order: { computedAt: 'DESC' },
    })
    const latestByLocation = new Map<string, AutoCareTrustSnapshotEntity>()
    for (const snapshot of previousSnapshots) {
        if (!latestByLocation.has(snapshot.locationId)) latestByLocation.set(snapshot.locationId, snapshot)
    }
    const snapshots: AutoCareTrustSnapshotEntity[] = []
    for (const location of locations) {
        const previous = latestByLocation.get(location.id)
        const sameInputs = previous !== undefined && JSON.stringify(previous.inputCounters) === JSON.stringify(inputCounters)
        const stillValid = previous !== undefined && previous.validUntil.getTime() > now.getTime()
        if (sameInputs && previous.policyVersion === policy.policyVersion && previous.score === trust.score && previous.badge === trust.badge && stillValid) continue
        snapshots.push(await manager.getRepository(AutoCareTrustSnapshotEntity).save(manager.getRepository(AutoCareTrustSnapshotEntity).create({
            providerId,
            locationId: location.id,
            policyVersion: policy.policyVersion,
            score: trust.score,
            badge: trust.badge,
            computedAt: now,
            validUntil: new Date(now.getTime() + policy.reassessmentIntervalHours * 60 * 60 * 1_000),
            inputCounters,
            reasonCodes,
        })))
    }
    const changed = Number(provider.trustScore) !== trust.score || provider.trustBadge !== trust.badge
    // Advance the scheduling watermark even when the score did not change.
    // A narrow update avoids restoring an older provider profile from the read above.
    await providerRepository.update({ id: providerId }, {
        trustScore: trust.score,
        trustBadge: trust.badge,
        trustReassessedAt: now,
        trustReassessmentAttemptedAt: now,
    })
    provider.trustScore = trust.score
    provider.trustBadge = trust.badge
    provider.trustReassessedAt = now
    provider.trustReassessmentAttemptedAt = now
    return { provider, trust, changed, snapshots }
}

/**
 * Bounded worker pass. Sequential updates avoid a burst of row locks while
 * still ensuring a large provider catalog converges over several cycles.
 */
export async function reassessAutoCareTrustScores(limit = 100) {
    const now = new Date()
    const policy = await getAutoCareTrustPolicy()
    const dueBefore = new Date(now.getTime() - policy.reassessmentIntervalHours * 60 * 60_000)
    const retryBefore = new Date(now.getTime() - FAILED_REASSESSMENT_RETRY_MS)
    const providers = await AppDataSource.getRepository(AutomotiveProviderEntity)
        .createQueryBuilder('provider')
        .select('provider.id', 'id')
        .where('provider.status = :status', { status: AutomotiveProviderStatus.Active })
        .andWhere('(provider.trustReassessedAt IS NULL OR provider.trustReassessedAt <= :dueBefore)', { dueBefore })
        .andWhere('(provider.trustReassessmentAttemptedAt IS NULL OR provider.trustReassessmentAttemptedAt <= :retryBefore)', { retryBefore })
        .orderBy('provider.trustReassessmentAttemptedAt', 'ASC', 'NULLS FIRST')
        .addOrderBy('provider.createdAt', 'ASC')
        .addOrderBy('provider.id', 'ASC')
        .limit(Math.max(1, Math.min(limit, 500)))
        .getRawMany<{ id: string }>()
    let changed = 0
    let failed = 0
    for (const provider of providers) {
        try {
            const result = await reassessAutoCareProviderTrust(provider.id)
            if (result?.changed) changed += 1
        } catch (error) {
            failed += 1
            logError('AutoCare trust reassessment failed for provider', error, { providerId: provider.id })
            metrics.increment('autocare_trust_reassessment_failed_total')
            // Keep trustReassessedAt unchanged so the failed provider stays due.
            // Retry it after the backoff, without blocking other providers.
            await AppDataSource.getRepository(AutomotiveProviderEntity).update(
                { id: provider.id },
                { trustReassessmentAttemptedAt: new Date() },
            )
        }
    }
    return { scanned: providers.length, changed, failed }
}
