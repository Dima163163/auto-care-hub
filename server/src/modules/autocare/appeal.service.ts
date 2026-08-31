import { In } from 'typeorm'

import { AppDataSource } from '../../database/data-source.js'
import {
    AutoCareAppealEntity,
    AutoCareAppealStatus,
    AutoCareAppealSubject,
    AutoCareTrustEvidenceEntity,
    AutomotiveProviderEntity,
    AutomotiveProviderStatus,
    AutomotiveReviewEntity,
    ServiceRequestEntity,
} from '../../entities/index.js'
import { isAdminRole } from '../../shared/auth/roles.js'
import { UserRole, type UserEntity as User } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { hasProviderWorkspacePermission } from './provider-access.service.js'
import { canTransitionAppeal, isPostgresUniqueViolation, validateAppealInput } from './appeal-policy.js'
import { enqueueNotificationSafely } from '../outbox/notification-outbox.service.js'
import { NotificationCategory } from '../../entities/notification/notification.entity.js'
import type { AutoCareAppealResponse } from './autocare.types.js'
import { reassessAutoCareProviderTrust } from './trust-score.service.js'
import { logError } from '../../shared/observability/logger.js'

function error(statusCode: number, message: string): never {
    throw new AppError({ statusCode, code: statusCode === 403 ? ERROR_CODES.Forbidden : ERROR_CODES.NotFound, message })
}

function toResponse(appeal: AutoCareAppealEntity): AutoCareAppealResponse {
    return {
        id: appeal.id,
        subject: appeal.subject,
        subjectId: appeal.subjectId,
        submittedById: appeal.submittedById,
        providerId: appeal.providerId,
        reason: appeal.reason,
        evidenceIds: appeal.evidenceIds,
        status: appeal.status,
        decidedById: appeal.decidedById,
        decisionReason: appeal.decisionReason,
        createdAt: appeal.createdAt.toISOString(),
        decidedAt: appeal.decidedAt?.toISOString() ?? null,
    }
}

async function assertSubjectAccess(user: User, subject: AutoCareAppealSubject, subjectId: string, providerId: string | null) {
    if (subject === AutoCareAppealSubject.Review) {
        const review = await AppDataSource.getRepository(AutomotiveReviewEntity).findOneBy({ id: subjectId })
        if (!review) error(404, 'Review not found.')
        const request = review.serviceRequestId
            ? await AppDataSource.getRepository(ServiceRequestEntity).findOneBy({ id: review.serviceRequestId, providerId: review.providerId })
            : null
        const canManage = user.role === UserRole.Owner && await hasProviderWorkspacePermission(user.id, review.providerId, 'reviews', request?.locationId ?? null)
        if (review.clientId !== user.id && !canManage) error(403, 'You cannot appeal this review.')
        return review.providerId
    }
    if (![AutoCareAppealSubject.Provider, AutoCareAppealSubject.Suspension, AutoCareAppealSubject.Catalog].includes(subject)) {
        error(422, 'Unsupported appeal subject.')
    }
    const resolvedProviderId = providerId ?? subjectId
    const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: resolvedProviderId })
    if (!provider) error(404, 'Automotive service not found.')
    if (user.role !== UserRole.Owner || !(await hasProviderWorkspacePermission(user.id, resolvedProviderId, 'profile', null))) error(403, 'Only the service owner can submit this appeal.')
    return resolvedProviderId
}

async function assertEvidenceAccess(providerId: string, evidenceIds: readonly string[]) {
    if (evidenceIds.length === 0) return
    const evidence = await AppDataSource.getRepository(AutoCareTrustEvidenceEntity).find({
        where: { id: In([...new Set(evidenceIds)]) },
        select: { id: true, providerId: true, status: true },
    })
    const allowed = new Set(evidence
        .filter((item) => item.providerId === providerId && item.status !== 'rejected')
        .map((item) => item.id))
    if (allowed.size !== new Set(evidenceIds).size) {
        throw new AppError({
            statusCode: 422,
            code: ERROR_CODES.ValidationError,
            message: 'Every appeal evidence item must belong to the service and remain reviewable.',
        })
    }
}

export async function createAutoCareAppeal(user: User, input: { subject: AutoCareAppealSubject; subjectId: string; providerId?: string | null; reason: string; evidenceIds?: string[] }) {
    const parsed = validateAppealInput(input)
    if (!parsed.ok) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: parsed.reason })
    const providerId = await assertSubjectAccess(user, input.subject, input.subjectId, input.providerId ?? null)
    await assertEvidenceAccess(providerId, parsed.value.evidenceIds)
    const repository = AppDataSource.getRepository(AutoCareAppealEntity)
    const duplicate = await repository.findOne({ where: { submittedById: user.id, subject: input.subject, subjectId: input.subjectId, status: AutoCareAppealStatus.Pending } })
    if (duplicate) return toResponse(duplicate)
    try {
        const saved = await repository.save(repository.create({
            subject: input.subject,
            subjectId: input.subjectId,
            submittedById: user.id,
            providerId,
            reason: parsed.value.reason,
            evidenceIds: parsed.value.evidenceIds,
            status: AutoCareAppealStatus.Pending,
        }))
        return toResponse(saved)
    } catch (saveError) {
        // Two requests can pass the read-before-write check concurrently.
        // The partial unique index is the authority; reconcile its conflict
        // with the row that won the race instead of surfacing a 500.
        if (!isPostgresUniqueViolation(saveError)) throw saveError
        const concurrent = await repository.findOne({ where: { submittedById: user.id, subject: input.subject, subjectId: input.subjectId, status: AutoCareAppealStatus.Pending } })
        if (concurrent) return toResponse(concurrent)
        throw saveError
    }
}

export async function getMyAutoCareAppeals(user: User) {
    const appeals = await AppDataSource.getRepository(AutoCareAppealEntity).find({ where: { submittedById: user.id }, order: { createdAt: 'DESC' }, take: 100 })
    return appeals.map(toResponse)
}

/** A submitter can withdraw only an unresolved appeal; moderator decisions remain immutable. */
export async function withdrawAutoCareAppeal(user: User, appealId: string) {
    return AppDataSource.transaction(async (manager) => {
        const repository = manager.getRepository(AutoCareAppealEntity)
        const appeal = await repository.findOne({ where: { id: appealId }, lock: { mode: 'pessimistic_write' } })
        if (!appeal || appeal.submittedById !== user.id) error(404, 'Appeal not found.')
        if (!canTransitionAppeal(appeal.status, AutoCareAppealStatus.Withdrawn)) {
            throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message: 'Only a pending appeal can be withdrawn.' })
        }
        appeal.status = AutoCareAppealStatus.Withdrawn
        return toResponse(await repository.save(appeal))
    })
}

export async function listAdminAutoCareAppeals(user: User, input: { status?: AutoCareAppealStatus; subject?: AutoCareAppealSubject; limit?: number }) {
    if (!isAdminRole(user.role)) error(403, 'Only admins can view appeals.')
    const appeals = await AppDataSource.getRepository(AutoCareAppealEntity).find({ where: { ...(input.status ? { status: input.status } : {}), ...(input.subject ? { subject: input.subject } : {}) }, order: { createdAt: 'DESC' }, take: input.limit ?? 50 })
    return appeals.map(toResponse)
}

export async function decideAdminAutoCareAppeal(user: User, appealId: string, input: { status: AutoCareAppealStatus.Accepted | AutoCareAppealStatus.Rejected; reason: string }) {
    if (!isAdminRole(user.role)) error(403, 'Only admins can decide appeals.')
    const result = await AppDataSource.transaction(async (manager) => {
        const repository = manager.getRepository(AutoCareAppealEntity)
        const appeal = await repository.findOne({ where: { id: appealId }, lock: { mode: 'pessimistic_write' } })
        if (!appeal) error(404, 'Appeal not found.')
        if (!canTransitionAppeal(appeal.status, input.status)) throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message: 'Appeal has already been decided.' })
        appeal.status = input.status
        appeal.decisionReason = input.reason.trim()
        appeal.decidedById = user.id
        appeal.decidedAt = new Date()
        const saved = await repository.save(appeal)

        // An accepted suspension/provider appeal is the explicit moderation
        // decision that restores publication. The trust score itself is still
        // recalculated from evidence and completed visits, never from the
        // appeal alone.
        if (input.status === AutoCareAppealStatus.Accepted
            && saved.providerId
            && [AutoCareAppealSubject.Provider, AutoCareAppealSubject.Suspension].includes(saved.subject)) {
            const providerRepository = manager.getRepository(AutomotiveProviderEntity)
            const provider = await providerRepository.findOne({
                where: { id: saved.providerId },
                lock: { mode: 'pessimistic_write' },
            })
            if (provider && saved.subject === AutoCareAppealSubject.Suspension && provider.status === AutomotiveProviderStatus.Suspended) {
                provider.status = AutomotiveProviderStatus.Active
                await providerRepository.save(provider)
            }
        }
        await enqueueNotificationSafely({
            userId: saved.submittedById,
            category: NotificationCategory.Moderation,
            template: {
                key: 'moderation.appeal_decided',
                params: {
                    subject: saved.subject,
                    status: saved.status,
                },
            },
            metadata: {
                appealId: saved.id,
                subject: saved.subject,
                subjectId: saved.subjectId,
                status: saved.status,
                decisionReason: saved.decisionReason,
            },
        }, `notification:autocare-appeal:${saved.id}:${saved.status}`, manager)
        return toResponse(saved)
    })
    if (result.status === AutoCareAppealStatus.Accepted && result.providerId) {
        try {
            await reassessAutoCareProviderTrust(result.providerId)
        } catch (reassessmentError) {
            // The appeal decision is durable even if a background trust refresh
            // is temporarily unavailable; the worker will converge later.
            logError('Could not refresh AutoCare trust after accepted appeal', reassessmentError, { providerId: result.providerId })
        }
    }
    return result
}

export async function getPendingAutoCareAppealCount(user: User) {
    if (!isAdminRole(user.role)) error(403, 'Only admins can view appeal metrics.')
    return AppDataSource.getRepository(AutoCareAppealEntity).countBy({ status: AutoCareAppealStatus.Pending })
}
