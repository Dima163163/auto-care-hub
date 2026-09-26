import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it } from 'vitest'

import { AppDataSource } from '../../database/data-source.js'
import { UserSessionEntity } from '../../entities/user-session/user-session.entity.js'
import { UserEntity, UserRole, UserStatus } from '../../entities/user/user.entity.js'
import { DEMO_USERS } from '../../scripts/demo-fixtures.js'
import { IsNull } from 'typeorm'
import { updateAdminUserRole, updateAdminUserStatus } from './admin.service.js'

const isDisposableCiDatabase =
    process.env.GITHUB_ACTIONS === 'true'
    && process.env.NODE_ENV === 'test'
    && process.env.DATABASE_HOST === '127.0.0.1'
    && process.env.DATABASE_PORT === '5432'
    && process.env.DATABASE_NAME === 'autocarehub_test'
    && AppDataSource.options.database === 'autocarehub_test'

describe('admin active super-admin invariant PostgreSQL concurrency', () => {
    let fixtureUserId: string | undefined
    let demoSuperAdminId: string | undefined
    let originalDemoRole: UserRole | undefined
    let originalDemoStatus: UserStatus | undefined

    afterAll(async () => {
        if (!AppDataSource.isInitialized) return

        if (fixtureUserId) {
            await AppDataSource.getRepository(UserSessionEntity).delete({ userId: fixtureUserId })
            await AppDataSource.getRepository(UserEntity).delete({ id: fixtureUserId })
        }

        if (demoSuperAdminId && originalDemoRole && originalDemoStatus) {
            const users = AppDataSource.getRepository(UserEntity)
            const demoSuperAdmin = await users.findOneBy({ id: demoSuperAdminId })
            if (demoSuperAdmin) {
                // Keep tokenVersion monotonic while restoring this synthetic CI fixture.
                await users.update(demoSuperAdminId, {
                    role: originalDemoRole,
                    status: originalDemoStatus,
                    tokenVersion: demoSuperAdmin.tokenVersion + 1,
                })
            }
        }
    })

    it('serializes competing block and role-demotion actions so one active super-admin remains', async ({ skip }) => {
        if (!isDisposableCiDatabase) skip()

        const users = AppDataSource.getRepository(UserEntity)
        const demoSuperAdmin = await users.findOneBy({ email: DEMO_USERS.superAdmin.email })
        const activeSuperAdminCount = await users.count({
            where: { role: UserRole.SuperAdmin, status: UserStatus.Active },
        })

        if (!demoSuperAdmin) {
            skip()
            return
        }

        // The seeded demo user gives this fixture exactly one existing active
        // super-admin. Skip without writes if the CI database is not pristine.
        if (
            demoSuperAdmin.role !== UserRole.SuperAdmin
            || demoSuperAdmin.status !== UserStatus.Active
            || activeSuperAdminCount !== 1
        ) {
            skip()
            return
        }

        const activeDemoSessions = await AppDataSource.getRepository(UserSessionEntity).countBy({
            userId: demoSuperAdmin.id,
            revokedAt: IsNull(),
        })
        if (activeDemoSessions > 0) {
            skip()
            return
        }

        const fixtureUser = await users.save(users.create({
            name: `Admin concurrency fixture ${randomUUID()}`,
            email: `admin-concurrency-${randomUUID()}@example.test`,
            passwordHash: 'integration-test-hash',
            role: UserRole.SuperAdmin,
            status: UserStatus.Active,
            emailVerifiedAt: new Date(),
        }))
        fixtureUserId = fixtureUser.id
        demoSuperAdminId = demoSuperAdmin.id
        originalDemoRole = demoSuperAdmin.role
        originalDemoStatus = demoSuperAdmin.status

        const actor = { id: randomUUID(), role: UserRole.SuperAdmin } as UserEntity
        const results = await Promise.allSettled([
            updateAdminUserStatus(actor, fixtureUser.id, UserStatus.Blocked),
            updateAdminUserRole(actor, demoSuperAdmin.id, UserRole.Admin),
        ])

        expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
        expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1)
        const rejected = results.find((result) => result.status === 'rejected')
        expect(rejected?.status).toBe('rejected')
        if (rejected?.status === 'rejected') {
            expect(rejected.reason).toMatchObject({ statusCode: 400 })
        }
        expect(await users.count({
            where: { role: UserRole.SuperAdmin, status: UserStatus.Active },
        })).toBe(1)
    })
})
