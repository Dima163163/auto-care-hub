import type { EntityManager } from 'typeorm'

import { AppDataSource } from '../../database/data-source.js'
import {
    AutoCareGuaranteeClaimEntity,
    AutoCareTrustEvidenceEntity,
    AutoCareTrustSnapshotEntity,
    AutomotiveProviderEntity,
    AutomotiveProviderStatus,
    AutomotiveReviewEntity,
    AutomotiveReviewStatus,
    AutomotiveServiceLocationEntity,
    ServiceRequestEntity,
    ServiceRequestStatus,
} from '../../entities/index.js'
import { calculateAutoCareTrustScore, type AutoCareTrustScore } from './trust-score.js'

const TRUST_POLICY_VERSION = 'autocare-trust-v1'
const TRUST_SNAPSHOT_TTL_MS = 24 * 60 * 60 * 1000

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

    const [evidence, reviews, claims, interactions] = await Promise.all([
        manager.getRepository(AutoCareTrustEvidenceEntity).find({ where: { providerId } }),
        manager.getRepository(AutomotiveReviewEntity).find({ where: { providerId, status: AutomotiveReviewStatus.Approved, verifiedVisit: true } }),
        manager.getRepository(AutoCareGuaranteeClaimEntity).find({ where: { providerId } }),
        manager.getRepository(ServiceRequestEntity).find({ where: { providerId }, select: { status: true, clientConfirmedAt: true, providerConfirmedAt: true } }),
    ])
    const nowMs = Date.now()
    const verifiedEvidenceCount = evidence.filter((item) =>
        item.status === 'verified' && (item.expiresAt === null || item.expiresAt.getTime() > nowMs),
    ).length
    const reviewCount = reviews.length
    const rating = reviewCount > 0
        ? reviews.reduce((total, review) => total + review.rating, 0) / reviewCount
        : Number(provider.rating)
    const activeGuaranteeClaims = claims.filter((claim) => !['resolved', 'rejected', 'closed'].includes(claim.status)).length
    const completedInteractionCount = interactions.filter((request) =>
        request.status === ServiceRequestStatus.Closed && Boolean(request.clientConfirmedAt && request.providerConfirmedAt),
    ).length
    const cancelledInteractionCount = interactions.filter((request) => request.status === ServiceRequestStatus.Cancelled).length
    const noShowInteractionCount = interactions.filter((request) => request.status === ServiceRequestStatus.NoShow).length
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
    }
    const reasonCodes = [
        !provider.verified ? 'provider_not_verified' : null,
        reviewCount < 10 ? 'small_review_sample' : null,
        verifiedEvidenceCount === 0 ? 'no_verified_evidence' : null,
        activeGuaranteeClaims > 0 ? 'open_guarantee_claims' : null,
        completedInteractionCount === 0 ? 'no_completed_interactions' : null,
        (cancelledInteractionCount + noShowInteractionCount) > completedInteractionCount && completedInteractionCount > 0 ? 'reliability_below_threshold' : null,
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
        if (sameInputs && previous.policyVersion === TRUST_POLICY_VERSION && previous.score === trust.score && previous.badge === trust.badge && stillValid) continue
        snapshots.push(await manager.getRepository(AutoCareTrustSnapshotEntity).save(manager.getRepository(AutoCareTrustSnapshotEntity).create({
            providerId,
            locationId: location.id,
            policyVersion: TRUST_POLICY_VERSION,
            score: trust.score,
            badge: trust.badge,
            computedAt: now,
            validUntil: new Date(now.getTime() + TRUST_SNAPSHOT_TTL_MS),
            inputCounters,
            reasonCodes,
        })))
    }
    const changed = Number(provider.trustScore) !== trust.score || provider.trustBadge !== trust.badge
    if (changed || provider.trustReassessedAt === null || snapshots.length > 0) {
        provider.trustScore = trust.score
        provider.trustBadge = trust.badge
        provider.trustReassessedAt = now
        await providerRepository.save(provider)
    }
    return { provider, trust, changed, snapshots }
}

/**
 * Bounded worker pass. Sequential updates avoid a burst of row locks while
 * still ensuring a large provider catalog converges over several cycles.
 */
export async function reassessAutoCareTrustScores(limit = 100) {
    const providers = await AppDataSource.getRepository(AutomotiveProviderEntity).find({
        where: { status: AutomotiveProviderStatus.Active },
        select: { id: true },
        order: { trustReassessedAt: 'ASC', createdAt: 'ASC' },
        take: Math.max(1, Math.min(limit, 500)),
    })
    let changed = 0
    for (const provider of providers) {
        const result = await reassessAutoCareProviderTrust(provider.id)
        if (result?.changed) changed += 1
    }
    return { scanned: providers.length, changed }
}
