import type { EntityManager } from 'typeorm'

import { AppDataSource } from '../../database/data-source.js'
import {
    AutoCareGuaranteeClaimEntity,
    AutoCareTrustEvidenceEntity,
    AutomotiveProviderEntity,
    AutomotiveProviderStatus,
    AutomotiveReviewEntity,
    AutomotiveReviewStatus,
} from '../../entities/index.js'
import { calculateAutoCareTrustScore, type AutoCareTrustScore } from './trust-score.js'

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
): Promise<{ provider: AutomotiveProviderEntity; trust: AutoCareTrustScore; changed: boolean } | null> {
    const providerRepository = manager.getRepository(AutomotiveProviderEntity)
    const provider = await providerRepository.findOneBy({ id: providerId })
    if (!provider) return null

    const [evidence, reviews, claims] = await Promise.all([
        manager.getRepository(AutoCareTrustEvidenceEntity).find({ where: { providerId } }),
        manager.getRepository(AutomotiveReviewEntity).find({ where: { providerId, status: AutomotiveReviewStatus.Approved } }),
        manager.getRepository(AutoCareGuaranteeClaimEntity).find({ where: { providerId } }),
    ])
    const now = Date.now()
    const verifiedEvidenceCount = evidence.filter((item) =>
        item.status === 'verified' && (item.expiresAt === null || item.expiresAt.getTime() > now),
    ).length
    const reviewCount = reviews.length
    const rating = reviewCount > 0
        ? reviews.reduce((total, review) => total + review.rating, 0) / reviewCount
        : Number(provider.rating)
    const activeGuaranteeClaims = claims.filter((claim) => !['resolved', 'rejected', 'closed'].includes(claim.status)).length
    const trust = calculateAutoCareTrustScore({
        verified: provider.verified,
        rating,
        reviewCount,
        yearsActive: provider.yearsActive,
        profileFields: getProfileFieldCount(provider),
        verifiedEvidenceCount,
        activeGuaranteeClaims,
    })
    const changed = Number(provider.trustScore) !== trust.score || provider.trustBadge !== trust.badge
    if (changed || provider.trustReassessedAt === null) {
        provider.trustScore = trust.score
        provider.trustBadge = trust.badge
        provider.trustReassessedAt = new Date()
        await providerRepository.save(provider)
    }
    return { provider, trust, changed }
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
