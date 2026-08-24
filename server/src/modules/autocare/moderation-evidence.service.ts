import type { EntityManager } from 'typeorm'

import { AppDataSource } from '../../database/data-source.js'
import {
    AutoCareTrustEvidenceEntity,
    AutomotiveProviderEntity,
    AutomotiveReviewEntity,
    AutomotiveReviewStatus,
} from '../../entities/index.js'
import type { UserEntity } from '../../entities/user/user.entity.js'
import { isAdminRole } from '../../shared/auth/roles.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import {
    canDecideAutoCareModerationEvidence,
    isAutoCareModerationEvidenceKind,
    type AutoCareModerationDecision,
} from './moderation-evidence-policy.js'

type ModerationEvidenceResponse = {
    id: string
    providerId: string
    kind: string
    label: string
    status: string
    reference: string | null
    notes: string | null
    createdAt: string
    verifiedAt: string | null
}

function toResponse(item: AutoCareTrustEvidenceEntity): ModerationEvidenceResponse {
    return {
        id: item.id,
        providerId: item.providerId,
        kind: item.kind,
        label: item.label,
        status: item.status,
        reference: item.reference,
        notes: item.notes,
        createdAt: item.createdAt.toISOString(),
        verifiedAt: item.verifiedAt?.toISOString() ?? null,
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
    const entries = [
        ...(provider.coverImageUrl ? [{ kind: 'provider_cover', label: 'Главное фото сервиса', reference: provider.coverImageUrl }] : []),
        ...provider.galleryImageUrls.map((reference, index) => ({ kind: 'provider_gallery', label: `Фото сервиса ${index + 1}`, reference })),
    ]
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

export async function listAdminAutoCareModerationEvidence(user: UserEntity, status?: string) {
    assertAdmin(user)
    const evidence = await AppDataSource.getRepository(AutoCareTrustEvidenceEntity).find({
        where: { ...(status ? { status } : {}) },
        order: { createdAt: 'ASC' },
        take: 100,
    })
    return evidence.filter((item) => isAutoCareModerationEvidenceKind(item.kind)).map(toResponse)
}

export async function decideAdminAutoCareModerationEvidence(
    user: UserEntity,
    evidenceId: string,
    input: { status: AutoCareModerationDecision; reason: string },
) {
    assertAdmin(user)
    return AppDataSource.transaction(async (manager) => {
        const evidenceRepository = manager.getRepository(AutoCareTrustEvidenceEntity)
        const evidence = await evidenceRepository.findOne({ where: { id: evidenceId }, lock: { mode: 'pessimistic_write' } })
        if (!evidence || !isAutoCareModerationEvidenceKind(evidence.kind)) {
            throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Moderation evidence not found.' })
        }
        if (!canDecideAutoCareModerationEvidence(evidence.status, input.status)) {
            throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message: 'Moderation evidence has already been decided.' })
        }

        evidence.status = input.status
        evidence.notes = input.reason.trim()
        evidence.verifiedById = user.id
        evidence.verifiedAt = new Date()
        await evidenceRepository.save(evidence)

        if (evidence.kind === 'review' && evidence.reference) {
            const reviewRepository = manager.getRepository(AutomotiveReviewEntity)
            const review = await reviewRepository.findOneBy({ id: evidence.reference, providerId: evidence.providerId })
            if (review) {
                review.status = input.status === 'approved'
                    ? AutomotiveReviewStatus.Approved
                    : AutomotiveReviewStatus.Rejected
                await reviewRepository.save(review)
            }
        }

        if (input.status === 'rejected' && evidence.reference) {
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

        return toResponse(evidence)
    })
}
