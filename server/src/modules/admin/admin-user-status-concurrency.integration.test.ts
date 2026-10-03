import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it } from 'vitest'
import { AppDataSource } from '../../database/data-source.js'
import { UserSessionEntity } from '../../entities/user-session/user-session.entity.js'
import { UserEntity, UserRole, UserStatus } from '../../entities/user/user.entity.js'
import { updateAdminUserRole, updateAdminUserStatus } from './admin.service.js'

const isDisposableCiDatabase = process.env.GITHUB_ACTIONS === 'true'
    && process.env.NODE_ENV === 'test'
    && new URL(process.env.TEST_DATABASE_URL || 'postgresql://invalid/invalid').hostname === '127.0.0.1'
    && process.env.DATABASE_NAME === 'autocarehub_test'
    && AppDataSource.options.database === 'autocarehub_test'

describe('admin active super-admin invariant PostgreSQL concurrency', () => {
    const fixtureIds: string[] = []
    const suspendedIds: string[] = []
    afterAll(async () => {
        if (!AppDataSource.isInitialized || !isDisposableCiDatabase) return
        const users = AppDataSource.getRepository(UserEntity)
        for (const id of fixtureIds) {
            await AppDataSource.getRepository(UserSessionEntity).delete({ userId: id })
            await users.delete({ id })
        }
        for (const id of suspendedIds) await users.update(id, { status: UserStatus.Active })
    })
    it('uses its own two-admin fixture and restores other synthetic admins after the race', async ({ skip }) => {
        if (!isDisposableCiDatabase) { skip(); return }
        const users = AppDataSource.getRepository(UserEntity)
        // Other serial integration tests may have created extra administrators.
        // Suspend them only in this explicit disposable CI database and restore
        // their original active status even when this test fails.
        const existing = await users.findBy({ role: UserRole.SuperAdmin, status: UserStatus.Active })
        for (const user of existing) {
            suspendedIds.push(user.id)
            await users.update(user.id, { status: UserStatus.Blocked })
        }
        for (let index = 0; index < 2; index += 1) {
            const fixture = await users.save(users.create({ name: 'Synthetic concurrency fixture', email: `concurrency-${randomUUID()}@example.test`, passwordHash: null, role: UserRole.SuperAdmin, status: UserStatus.Active, emailVerifiedAt: new Date() }))
            fixtureIds.push(fixture.id)
        }
        const first = fixtureIds[0]
        const second = fixtureIds[1]
        if (!first || !second) throw new Error('Concurrency fixture was not initialized.')
        const actor = users.create({ id: randomUUID(), role: UserRole.SuperAdmin })
        const results = await Promise.allSettled([
            updateAdminUserStatus(actor, first, UserStatus.Blocked),
            updateAdminUserRole(actor, second, UserRole.Admin),
        ])
        expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
        const rejected = results.filter((result) => result.status === 'rejected')
        expect(rejected).toHaveLength(1)
        expect(rejected[0]?.reason).toMatchObject({ statusCode: 400 })
        expect(await users.countBy({ role: UserRole.SuperAdmin, status: UserStatus.Active })).toBe(1)
    })
})
