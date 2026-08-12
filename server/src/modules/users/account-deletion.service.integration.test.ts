import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppDataSource } from '../../database/data-source.js'
import { AuditLogEntity } from '../../entities/audit-log/audit-log.entity.js'
import {
    AccountDeletionRequestEntity,
    AccountDeletionRequestStatus,
} from '../../entities/account-deletion-request/account-deletion-request.entity.js'
import { OutboxEventEntity } from '../../entities/outbox/outbox-event.entity.js'
import { UserEntity, UserRole, UserStatus } from '../../entities/user/user.entity.js'
import {
    cancelAccountDeletion,
    requestAccountDeletion,
} from './account-deletion.service.js'

describe('account deletion request integration', () => {
    let userId: string

    beforeAll(async () => {
        const user = await AppDataSource.getRepository(UserEntity).save(
            AppDataSource.getRepository(UserEntity).create({
                name: 'Deletion Integration User',
                email: `deletion-integration-${Date.now()}@example.com`,
                role: UserRole.Client,
                status: UserStatus.Active,
                passwordHash: 'hash',
                emailVerifiedAt: new Date(),
            }),
        )
        userId = user.id
    })

    afterAll(async () => {
        if (!AppDataSource.isInitialized) return

        const deletionRequest = await AppDataSource.getRepository(AccountDeletionRequestEntity)
            .findOneBy({ userId })
        if (deletionRequest) {
            await AppDataSource.getRepository(OutboxEventEntity).delete({
                idempotencyKey: `notification:security:account_deletion_requested:${userId}:${deletionRequest.id}`,
            })
        }
        await AppDataSource.transaction(async (manager) => {
            await manager.query("SELECT set_config('app.audit_retention_cleanup', 'on', true)")
            await manager.getRepository(AuditLogEntity).delete({ actorId: userId })
        })
        await AppDataSource.getRepository(AccountDeletionRequestEntity).delete({ userId })
        await AppDataSource.getRepository(UserEntity).delete({ id: userId })
    })

    it('keeps one pending request across concurrent deletion calls', async () => {
        const [first, second] = await Promise.all([
            requestAccountDeletion({ id: userId } as UserEntity, 'privacy request'),
            requestAccountDeletion({ id: userId } as UserEntity, 'privacy request'),
        ])

        expect(first.id).toBe(second.id)
        expect(first.status).toBe('pending')
        expect(await AppDataSource.getRepository(AccountDeletionRequestEntity).countBy({ userId })).toBe(1)
        expect(await AppDataSource.getRepository(OutboxEventEntity).countBy({
            idempotencyKey: `notification:security:account_deletion_requested:${userId}:${first.id}`,
        })).toBe(1)
    })

    it('keeps cancellation status stable across concurrent cancel calls', async () => {
        const [first, second] = await Promise.all([
            cancelAccountDeletion({ id: userId } as UserEntity),
            cancelAccountDeletion({ id: userId } as UserEntity),
        ])

        expect(first?.id).toBe(second?.id)
        expect(first?.status).toBe('cancelled')
        expect(second?.status).toBe('cancelled')
        expect(await AppDataSource.getRepository(AccountDeletionRequestEntity).countBy({
            userId,
            status: AccountDeletionRequestStatus.Pending,
        })).toBe(0)
        expect(await AppDataSource.getRepository(AccountDeletionRequestEntity).countBy({
            userId,
            status: AccountDeletionRequestStatus.Cancelled,
        })).toBe(1)
    })
})
