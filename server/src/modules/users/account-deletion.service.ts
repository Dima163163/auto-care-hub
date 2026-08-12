import type { FastifyRequest } from 'fastify'

import { AppDataSource } from '../../database/data-source.js'
import {
    AccountDeletionRequestEntity,
    AccountDeletionRequestStatus,
} from '../../entities/account-deletion-request/account-deletion-request.entity.js'
import { UserEntity } from '../../entities/user/user.entity.js'
import { AuditAction } from '../../entities/audit-log/audit-log.entity.js'
import { recordAuditLog } from '../admin/audit-log.service.js'
import { normalizeAccountDeletionReason } from './account-deletion-reason-policy.js'
import { metrics } from '../../shared/observability/metrics.js'
import { enqueueSecurityNotificationSafely } from '../outbox/security-notification-outbox.js'

export function isPendingDeletionUniqueViolation(error: unknown) {
    if (!error || typeof error !== 'object') return false

    const candidate = error as {
        code?: unknown
        constraint?: unknown
        driverError?: { code?: unknown; constraint?: unknown }
    }
    const code = candidate.code ?? candidate.driverError?.code
    const constraint = candidate.constraint ?? candidate.driverError?.constraint

    return code === '23505'
        && (constraint === undefined || constraint === 'UQ_account_deletion_requests_pending_user')
}

function mapDeletionRequest(request: AccountDeletionRequestEntity) {
    return {
        id: request.id,
        status: request.status,
        requestedAt: request.requestedAt.toISOString(),
        cancelledAt: request.cancelledAt?.toISOString() ?? null,
        completedAt: request.completedAt?.toISOString() ?? null,
    }
}

export async function requestAccountDeletion(
    user: UserEntity,
    reason: string | undefined,
    request?: FastifyRequest,
) {
    const normalizedReason = normalizeAccountDeletionReason(reason)
    let deletionRequest: AccountDeletionRequestEntity
    let outcome: 'created' | 'reused' = 'created'

    try {
        deletionRequest = await AppDataSource.transaction(async (manager) => {
            const repository = manager.getRepository(AccountDeletionRequestEntity)
            const existing = await repository.findOne({
                where: {
                    userId: user.id,
                    status: AccountDeletionRequestStatus.Pending,
                },
            })

            if (existing) {
                outcome = 'reused'
                return existing
            }

            const created = await repository.save(repository.create({
                userId: user.id,
                status: AccountDeletionRequestStatus.Pending,
                reason: normalizedReason,
                cancelledAt: null,
                completedAt: null,
            }))

            await recordAuditLog({
                manager,
                actorId: user.id,
                action: AuditAction.AccountDeletionRequested,
                targetId: user.id,
                targetType: 'user',
                metadata: { hasReason: Boolean(normalizedReason) },
                request,
            })

            return created
        })
    } catch (error: unknown) {
        if (!isPendingDeletionUniqueViolation(error)) throw error

        const existing = await AppDataSource.getRepository(AccountDeletionRequestEntity).findOne({
            where: {
                userId: user.id,
                status: AccountDeletionRequestStatus.Pending,
            },
        })

        if (!existing) throw error
        outcome = 'reused'
        deletionRequest = existing
    }

    metrics.increment('account_deletion_requests_total', 1, { outcome })
    await enqueueSecurityNotificationSafely({
        type: 'account_deletion_requested',
        userId: user.id,
        requestId: deletionRequest.id,
    })

    return mapDeletionRequest(deletionRequest)
}

export async function getAccountDeletionRequest(user: UserEntity) {
    const request = await AppDataSource.getRepository(AccountDeletionRequestEntity).findOne({
        where: {
            userId: user.id,
            status: AccountDeletionRequestStatus.Pending,
        },
    })

    return request ? mapDeletionRequest(request) : null
}

export async function cancelAccountDeletion(
    user: UserEntity,
    request?: FastifyRequest,
) {
    let outcome: 'cancelled' | 'noop' = 'noop'
    const cancelled = await AppDataSource.transaction(async (manager) => {
        const repository = manager.getRepository(AccountDeletionRequestEntity)
        const deletionRequest = await repository.findOne({
            where: {
                userId: user.id,
                status: AccountDeletionRequestStatus.Pending,
            },
        })

        if (!deletionRequest) return null

        deletionRequest.status = AccountDeletionRequestStatus.Cancelled
        deletionRequest.cancelledAt = new Date()
        const saved = await repository.save(deletionRequest)
        outcome = 'cancelled'

        await recordAuditLog({
            manager,
            actorId: user.id,
            action: AuditAction.AccountDeletionCancelled,
            targetId: user.id,
            targetType: 'user',
            metadata: {},
            request,
        })

        return saved
    })

    metrics.increment('account_deletion_cancellations_total', 1, { outcome })

    return cancelled ? mapDeletionRequest(cancelled) : null
}
