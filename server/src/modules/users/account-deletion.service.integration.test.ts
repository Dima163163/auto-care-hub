import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppDataSource } from '../../database/data-source.js'
import { AuditAction, AuditLogEntity } from '../../entities/audit-log/audit-log.entity.js'
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
import { updateAdminDeletionRequestStatus } from '../admin/account-deletion-admin.service.js'

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

describe('account deletion terminal interleavings integration', () => {
    let superAdmin: UserEntity
    const fixtureIds: Array<{ userId: string; requestId: string }> = []

    beforeAll(async () => {
        superAdmin = await AppDataSource.getRepository(UserEntity).save(
            AppDataSource.getRepository(UserEntity).create({
                name: 'Deletion Race Super Admin',
                email: `deletion-race-admin-${Date.now()}@example.com`,
                role: UserRole.SuperAdmin,
                status: UserStatus.Active,
                passwordHash: 'hash',
                emailVerifiedAt: new Date(),
            }),
        )
    })

    afterAll(async () => {
        if (!AppDataSource.isInitialized) return

        for (const { requestId, userId } of fixtureIds) {
            await AppDataSource.transaction(async (manager) => {
                // Audit rows are immutable in normal operation; retention cleanup
                // is the explicit, bounded test teardown path.
                await manager.query("SELECT set_config('app.audit_retention_cleanup', 'on', true)")
                await manager.getRepository(AuditLogEntity).delete({ actorId: userId })
                await manager.getRepository(AccountDeletionRequestEntity).delete({ id: requestId })
                await manager.getRepository(UserEntity).delete({ id: userId })
            })
        }
        await AppDataSource.getRepository(UserEntity).delete({ id: superAdmin?.id })
    })

    async function createFixture(label: string) {
        const user = await AppDataSource.getRepository(UserEntity).save(
            AppDataSource.getRepository(UserEntity).create({
                name: `Deletion Race ${label}`,
                email: `deletion-race-${label}-${Date.now()}@example.com`,
                role: UserRole.Client,
                status: UserStatus.Active,
                passwordHash: 'hash',
                emailVerifiedAt: new Date(),
            }),
        )
        const deletionRequest = await AppDataSource.getRepository(AccountDeletionRequestEntity).save(
            AppDataSource.getRepository(AccountDeletionRequestEntity).create({
                userId: user.id,
                status: AccountDeletionRequestStatus.Pending,
                reason: `race reason ${label}`,
                cancelledAt: null,
                completedAt: null,
                // Make the fixture eligible for the production retention guard.
                requestedAt: new Date(Date.now() - 31 * 86_400_000),
            }),
        )
        fixtureIds.push({ userId: user.id, requestId: deletionRequest.id })
        return { user, deletionRequest }
    }

    it('keeps completion terminal when cancel arrives after completion', async () => {
        const { user, deletionRequest } = await createFixture('completion-first')

        const completed = await updateAdminDeletionRequestStatus(
            superAdmin,
            deletionRequest.id,
            AccountDeletionRequestStatus.Completed,
        )
        const cancelled = await cancelAccountDeletion(user)
        const persisted = await AppDataSource.getRepository(AccountDeletionRequestEntity).findOneByOrFail({ id: deletionRequest.id })

        expect(completed.status).toBe(AccountDeletionRequestStatus.Completed)
        expect(cancelled).toBeNull()
        expect(persisted).toMatchObject({
            status: AccountDeletionRequestStatus.Completed,
            reason: null,
            cancelledAt: null,
        })
        expect(persisted.completedAt).toBeInstanceOf(Date)
    })

    it('keeps cancellation terminal when completion arrives after cancel', async () => {
        const { user, deletionRequest } = await createFixture('cancel-first')

        const cancelled = await cancelAccountDeletion(user)
        await expect(updateAdminDeletionRequestStatus(
            superAdmin,
            deletionRequest.id,
            AccountDeletionRequestStatus.Completed,
        )).rejects.toMatchObject({ statusCode: 409 })
        const persisted = await AppDataSource.getRepository(AccountDeletionRequestEntity).findOneByOrFail({ id: deletionRequest.id })

        expect(cancelled).toMatchObject({
            id: deletionRequest.id,
            status: AccountDeletionRequestStatus.Cancelled,
        })
        expect(persisted).toMatchObject({
            status: AccountDeletionRequestStatus.Cancelled,
            reason: 'race reason cancel-first',
            completedAt: null,
        })
        expect(persisted.cancelledAt).toBeInstanceOf(Date)
    })

    it('serializes concurrent terminal transitions and records only the winning audit action', async () => {
        const { user, deletionRequest } = await createFixture('concurrent')

        const [completionResult, cancellationResult] = await Promise.allSettled([
            updateAdminDeletionRequestStatus(
                superAdmin,
                deletionRequest.id,
                AccountDeletionRequestStatus.Completed,
            ),
            cancelAccountDeletion(user),
        ])
        const persisted = await AppDataSource.getRepository(AccountDeletionRequestEntity).findOneByOrFail({ id: deletionRequest.id })
        const auditRows = await AppDataSource.getRepository(AuditLogEntity).find({
            where: { actorId: user.id },
        })

        expect(persisted.status).toMatch(/^(completed|cancelled)$/)
        expect(
            completionResult.status === 'fulfilled'
                ? completionResult.value.status
                : completionResult.reason?.statusCode,
        ).toBeDefined()
        expect(
            cancellationResult.status === 'fulfilled'
                ? cancellationResult.value?.status ?? null
                : cancellationResult.reason?.statusCode,
        ).toBeDefined()
        expect(auditRows.filter(({ action }) => action === AuditAction.AccountDeletionCancelled)).toHaveLength(
            persisted.status === AccountDeletionRequestStatus.Cancelled ? 1 : 0,
        )
        expect(auditRows.filter(({ action }) => action === AuditAction.AccountDeletionCompleted)).toHaveLength(0)
    })
})
