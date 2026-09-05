import { In, type EntityManager } from 'typeorm'

import { AppDataSource } from '../../database/data-source.js'
import {
    AutoCareTrustEvidenceEntity,
    AutomotiveProviderEntity,
    AutomotiveReviewEntity,
    AutomotiveReviewStatus,
    AutomotiveServiceLocationEntity,
} from '../../entities/index.js'
import type { UserEntity } from '../../entities/user/user.entity.js'
import type { OwnerAutoCareEvidenceResponse } from './autocare.types.js'
import { isAdminRole } from '../../shared/auth/roles.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import {
    canDecideAutoCareModerationEvidence,
    isAutoCareModerationEvidenceKind,
    normalizeAutoCareModerationEvidenceDecision,
    normalizeAutoCareModerationEvidenceStatus,
    normalizeAutoCareModerationEvidenceUuid,
    type AutoCareModerationDecision,
} from './moderation-evidence-policy.js'
import { reassessAutoCareProviderTrust } from './trust-score.service.js'
import { logError } from '../../shared/observability/logger.js'
import {
    removeAutoCareProviderMedia,
    getAutoCareProviderMediaStorageTarget,
    type AutoCareProviderMediaKind,
} from './autocare-provider-media-storage.js'
import { normalizeAutoCareProviderPublicMediaReference, normalizeAutoCareReviewPhotoUrls, selectAutoCareProviderModerationMedia } from './autocare-public-media-policy.js'
import { normalizeAutoCarePrivateDocuments, normalizePrivateReference } from './private-reference-policy.js'

type ModerationEvidenceResponse = {
    id: string
    providerId: string
    kind: string
    label: string
    status: string
    reference: string | null
    notes: string | null
    expiresAt: string | null
    createdAt: string
    verifiedAt: string | null
    provider: {
        id: string
        name: string
        address: string | null
    }
    review: {
        id: string
        authorName: string
        vehicleLabel: string
        rating: number
        text: string
        photoUrls: string[]
        createdAt: string
        status: AutomotiveReviewStatus
    } | null
}

function toResponse(
    item: AutoCareTrustEvidenceEntity,
    provider: Pick<AutomotiveProviderEntity, 'id' | 'name'> | undefined,
    address: string | null,
    review: AutomotiveReviewEntity | undefined,
): ModerationEvidenceResponse {
    const reference = item.kind === 'provider_document' || item.kind === 'registration_document'
        ? normalizePrivateReference(item.reference)
        : item.kind === 'provider_cover'
            ? normalizeAutoCareProviderPublicMediaReference(item.reference, 'cover')
            : item.kind === 'provider_gallery'
                ? normalizeAutoCareProviderPublicMediaReference(item.reference, 'gallery')
                : item.reference
    return {
        id: item.id,
        providerId: item.providerId,
        kind: item.kind,
        label: item.label,
        status: item.status,
        reference,
        notes: item.notes,
        expiresAt: item.expiresAt?.toISOString() ?? null,
        createdAt: item.createdAt.toISOString(),
        verifiedAt: item.verifiedAt?.toISOString() ?? null,
        provider: {
            id: item.providerId,
            name: provider?.name ?? 'Unknown provider',
            address,
        },
        review: review ? {
            id: review.id,
            authorName: review.authorName,
            vehicleLabel: review.vehicleLabel,
            rating: review.rating,
            text: review.text,
            photoUrls: normalizeAutoCareReviewPhotoUrls(review.photoUrls),
            createdAt: review.createdAt.toISOString(),
            status: review.status,
        } : null,
    }
}

function assertAdmin(user: UserEntity) {
    if (!isAdminRole(user.role)) {
        throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'Only admins can moderate evidence.' })
    }
}

export async function queueProviderMediaModerationEvidence(
    manager: EntityManager,
    provider: Pick<AutomotiveProviderEntity, 'id' | 'coverImageUrl' | 'galleryImageUrls'>,
) {
    const entries = selectAutoCareProviderModerationMedia(provider)
    if (entries.length === 0) return []

    const repository = manager.getRepository(AutoCareTrustEvidenceEntity)
    return repository.save(entries.map((entry) => repository.create({
        providerId: provider.id,
        kind: entry.kind,
        label: entry.label,
        reference: entry.reference,
        status: 'pending',
        notes: 'Ожидает проверки публичного медиа.',
    })))
}

export async function queueReviewModerationEvidence(manager: EntityManager, review: Pick<AutomotiveReviewEntity, 'id' | 'providerId'>) {
    const repository = manager.getRepository(AutoCareTrustEvidenceEntity)
    return repository.save(repository.create({
        providerId: review.providerId,
        kind: 'review',
        label: 'Отзыв о подтверждённом визите',
        reference: review.id,
        status: 'pending',
        notes: 'Ожидает модерации текста и приложенных материалов.',
    }))
}

/**
 * Adds uploaded registration/licensing material to the same moderation queue
 * as public provider media. References are opaque private-storage keys; this
 * function intentionally never exposes their bytes or creates public URLs.
 */
export async function queueProviderDocumentModerationEvidence(
    manager: EntityManager,
    providerId: string,
    documents: readonly unknown[] | null | undefined,
) {
    const entries = normalizeAutoCarePrivateDocuments(documents)
    if (!entries) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Provider documents are invalid.' })
    if (entries.length === 0) return []

    const repository = manager.getRepository(AutoCareTrustEvidenceEntity)
    const existing = await repository.find({
        where: {
            providerId,
            kind: 'provider_document',
            reference: In(entries.map((document) => document.reference)),
        },
        select: { reference: true },
    })
    const existingReferences = new Set(existing.map((item) => item.reference))
    const newEntries = entries.filter((document) => !existingReferences.has(document.reference))
    if (newEntries.length === 0) return []
    return repository.save(newEntries.map((document) => repository.create({
        providerId,
        kind: 'provider_document',
        label: document.label,
        reference: document.reference,
        expiresAt: document.expiresAt ?? null,
        status: 'pending',
        notes: 'Ожидает проверки регистрационных данных сервиса.',
    })))
}

export async function listAdminAutoCareModerationEvidence(user: UserEntity, status?: string) {
    assertAdmin(user)
    const normalizedStatus = status === undefined ? undefined : normalizeAutoCareModerationEvidenceStatus(status)
    if (status !== undefined && !normalizedStatus) {
        throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Moderation evidence status is invalid.' })
    }
    const evidence = await AppDataSource.getRepository(AutoCareTrustEvidenceEntity).find({
        where: { ...(normalizedStatus ? { status: normalizedStatus } : {}) },
        order: { createdAt: 'ASC' },
        take: 100,
    })
    const moderationEvidence = evidence.filter((item) => isAutoCareModerationEvidenceKind(item.kind))
    if (moderationEvidence.length === 0) return []

    const providerIds = [...new Set(moderationEvidence.map((item) => item.providerId))]
    const reviewIds = moderationEvidence
        .filter((item) => item.kind === 'review' && item.reference)
        .flatMap((item) => item.reference ? [item.reference] : [])
    const [providers, locations, reviews] = await Promise.all([
        AppDataSource.getRepository(AutomotiveProviderEntity).find({
            where: { id: In(providerIds) },
            select: { id: true, name: true },
        }),
        AppDataSource.getRepository(AutomotiveServiceLocationEntity).find({
            where: { providerId: In(providerIds) },
            select: { providerId: true, address: true },
            order: { id: 'ASC' },
        }),
        reviewIds.length === 0
            ? Promise.resolve([])
            : AppDataSource.getRepository(AutomotiveReviewEntity).find({
                where: { id: In(reviewIds) },
            }),
    ])
    const providerById = new Map(providers.map((provider) => [provider.id, provider]))
    const addressByProviderId = new Map<string, string>()
    for (const location of locations) {
        if (!addressByProviderId.has(location.providerId)) {
            addressByProviderId.set(location.providerId, location.address)
        }
    }
    const reviewById = new Map(reviews.map((review) => [review.id, review]))

    return moderationEvidence.map((item) => toResponse(
        item,
        providerById.get(item.providerId),
        addressByProviderId.get(item.providerId) ?? null,
        item.kind === 'review' && item.reference ? reviewById.get(item.reference) : undefined,
    ))
}

/**
 * Owners can review the moderation state of evidence they submitted without
 * receiving any other provider's rows. References are opaque private keys;
 * they are never turned into public URLs by this endpoint.
 */
export async function listOwnerAutoCareEvidence(user: UserEntity, providerId: string): Promise<OwnerAutoCareEvidenceResponse[]> {
    const normalizedProviderId = normalizeAutoCareModerationEvidenceUuid(providerId)
    if (!normalizedProviderId) {
        throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Provider id must be a valid UUID.' })
    }
    const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: normalizedProviderId, ownerId: user.id })
    if (!provider) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive service provider not found.' })
    const evidence = await AppDataSource.getRepository(AutoCareTrustEvidenceEntity).find({
        where: { providerId: normalizedProviderId },
        order: { createdAt: 'DESC' },
        take: 100,
    })
    return evidence
        .filter((item) => isAutoCareModerationEvidenceKind(item.kind))
        .map((item) => ({
            id: item.id,
            providerId: item.providerId,
            kind: item.kind,
            label: item.label,
            status: item.status,
            reference: item.reference,
            notes: item.notes,
            expiresAt: item.expiresAt?.toISOString() ?? null,
            createdAt: item.createdAt.toISOString(),
            verifiedAt: item.verifiedAt?.toISOString() ?? null,
        }))
}

export async function decideAdminAutoCareModerationEvidence(
    user: UserEntity,
    evidenceId: string,
    input: { status: AutoCareModerationDecision; reason: string },
) {
    assertAdmin(user)
    const normalizedEvidenceId = normalizeAutoCareModerationEvidenceUuid(evidenceId)
    if (!normalizedEvidenceId) {
        throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Evidence id must be a valid UUID.' })
    }
    const normalizedInput = normalizeAutoCareModerationEvidenceDecision(input)
    if (!normalizedInput) {
        throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Moderation evidence decision is invalid.' })
    }
    const result = await AppDataSource.transaction(async (manager) => {
        const evidenceRepository = manager.getRepository(AutoCareTrustEvidenceEntity)
        const evidence = await evidenceRepository.findOne({ where: { id: normalizedEvidenceId }, lock: { mode: 'pessimistic_write' } })
        if (!evidence || !isAutoCareModerationEvidenceKind(evidence.kind)) {
            throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Moderation evidence not found.' })
        }
        if (!canDecideAutoCareModerationEvidence(evidence.status, normalizedInput.status)) {
            throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message: 'Moderation evidence has already been decided.' })
        }

        evidence.status = normalizedInput.status
        evidence.notes = normalizedInput.reason
        evidence.verifiedById = user.id
        evidence.verifiedAt = new Date()
        await evidenceRepository.save(evidence)

        if (evidence.kind === 'review' && evidence.reference) {
            const reviewRepository = manager.getRepository(AutomotiveReviewEntity)
            const review = await reviewRepository.findOneBy({ id: evidence.reference, providerId: evidence.providerId })
            if (review) {
                review.status = normalizedInput.status === 'approved'
                    ? AutomotiveReviewStatus.Approved
                    : AutomotiveReviewStatus.Rejected
                await reviewRepository.save(review)
            }
        }

        if (normalizedInput.status === 'rejected' && evidence.reference) {
            const providerRepository = manager.getRepository(AutomotiveProviderEntity)
            const provider = await providerRepository.findOneBy({ id: evidence.providerId })
            if (provider) {
                if (evidence.kind === 'provider_cover' && provider.coverImageUrl === evidence.reference) {
                    provider.coverImageUrl = null
                }
                if (evidence.kind === 'provider_gallery') {
                    provider.galleryImageUrls = provider.galleryImageUrls.filter((url) => url !== evidence.reference)
                }
                await providerRepository.save(provider)
            }
        }

        const provider = await manager.getRepository(AutomotiveProviderEntity).findOne({
            where: { id: evidence.providerId },
            select: { id: true, name: true },
        })
        const location = await manager.getRepository(AutomotiveServiceLocationEntity).findOne({
            where: { providerId: evidence.providerId },
            select: { providerId: true, address: true },
            order: { id: 'ASC' },
        })
        const review = evidence.kind === 'review' && evidence.reference
            ? await manager.getRepository(AutomotiveReviewEntity).findOneBy({ id: evidence.reference })
            : undefined

        return toResponse(evidence, provider ?? undefined, location?.address ?? null, review ?? undefined)
    })
    if (normalizedInput.status === 'rejected' && (result.kind === 'provider_cover' || result.kind === 'provider_gallery') && result.reference) {
        const kind: AutoCareProviderMediaKind = result.kind === 'provider_cover' ? 'cover' : 'gallery'
        const target = getAutoCareProviderMediaStorageTarget(result.reference, kind)
        if (target) {
            try {
                await removeAutoCareProviderMedia(target.kind, target.fileName)
            } catch (error) {
                // The provider reference is already removed transactionally;
                // orphan cleanup will retry storage deletion without exposing
                // a failed moderation decision to the moderator.
                logError('Could not remove rejected provider media', error, {
                    providerId: result.providerId,
                    evidenceId,
                    kind: target.kind,
                })
            }
        }
    }
    // Moderation is a durable trust input. Refresh after commit so public
    // snapshots reflect an approval/rejection promptly without allowing a
    // transient worker failure to roll back the moderator's decision.
    try {
        await reassessAutoCareProviderTrust(result.providerId)
    } catch (error) {
        logError('Could not refresh AutoCare trust after evidence decision', error, {
            providerId: result.providerId,
            evidenceId,
        })
    }
    return result
}
