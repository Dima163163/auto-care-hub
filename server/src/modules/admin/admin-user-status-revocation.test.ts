import { beforeEach, describe, expect, it, vi } from 'vitest'

const adminStatusMocks = vi.hoisted(() => ({
    transactionCalls: 0,
    transactionHandler: vi.fn(),
}))

vi.mock('../../database/data-source.js', () => ({
    AppDataSource: {
        transaction: (...args: unknown[]) => {
            adminStatusMocks.transactionCalls += 1
            return adminStatusMocks.transactionHandler(...args)
        },
    },
}))

import { UserSessionEntity } from '../../entities/user-session/user-session.entity.js'
import { UserEntity, UserRole, UserStatus } from '../../entities/user/user.entity.js'
import { assertCurrentSessionVersion } from '../auth/session-version.js'
const { updateAdminUserRole, updateAdminUserStatus } = await import('./admin.service.js')

const admin = {
    id: '00000000-0000-4000-8000-000000000010',
    role: UserRole.SuperAdmin,
} as never

const targetUserId = '00000000-0000-4000-8000-000000000020'
const secondSuperAdminUserId = '00000000-0000-4000-8000-000000000021'

function setupTransaction() {
    const user = {
        id: targetUserId,
        name: 'Setup Admin',
        email: 'setup-admin@example.com',
        phone: null,
        role: UserRole.Client,
        status: UserStatus.Active,
        avatarUrl: null,
        locale: 'en',
        provider: 'email',
        emailVerifiedAt: new Date(),
        createdAt: new Date(),
        // Represents the session/JWT version issued by password setup.
        tokenVersion: 2,
    }
    const userQueryBuilder = {
        where: vi.fn(),
        setLock: vi.fn(),
        getOne: vi.fn(async () => user),
    }
    userQueryBuilder.where.mockReturnValue(userQueryBuilder)
    userQueryBuilder.setLock.mockReturnValue(userQueryBuilder)

    const userRepository = {
        createQueryBuilder: vi.fn(() => userQueryBuilder),
        count: vi.fn().mockResolvedValue(2),
        save: vi.fn(async (savedUser: typeof user) => savedUser),
    }
    const sessionRepository = {
        update: vi.fn().mockResolvedValue({ affected: 1 }),
    }
    const manager = {
        query: vi.fn(async () => []),
        getRepository: vi.fn((entity: unknown) => entity === UserEntity
            ? userRepository
            : sessionRepository),
    }

    adminStatusMocks.transactionHandler.mockImplementation(async (...args) => {
        const callback = args.find((argument) => typeof argument === 'function')
        if (typeof callback !== 'function') {
            throw new Error('Expected an AppDataSource transaction callback.')
        }
        return callback(manager)
    })

    return { manager, sessionRepository, user, userQueryBuilder, userRepository }
}

function setupConcurrentSuperAdminStatusTransactions() {
    const makeSuperAdmin = (id: string) => ({
        id,
        name: 'Platform Administrator',
        email: `${id}@example.com`,
        phone: null,
        role: UserRole.SuperAdmin,
        status: UserStatus.Active,
        avatarUrl: null,
        locale: 'en',
        provider: 'email',
        emailVerifiedAt: new Date(),
        createdAt: new Date(),
        tokenVersion: 0,
    })
    const users = new Map([
        [targetUserId, makeSuperAdmin(targetUserId)],
        [secondSuperAdminUserId, makeSuperAdmin(secondSuperAdminUserId)],
    ])
    const events: string[] = []
    let lockTail = Promise.resolve()

    const userRepository = {
        createQueryBuilder: vi.fn(() => {
            let requestedUserId: string | undefined
            const queryBuilder = {
                where: vi.fn((_condition: string, parameters: { userId: string }) => {
                    requestedUserId = parameters.userId
                    return queryBuilder
                }),
                setLock: vi.fn(() => queryBuilder),
                getOne: vi.fn(async () => {
                    events.push('load')
                    const user = requestedUserId ? users.get(requestedUserId) : undefined
                    return user ? { ...user } : null
                }),
            }
            return queryBuilder
        }),
        count: vi.fn(async () => {
            events.push('count')
            return [...users.values()].filter((user) =>
                user.role === UserRole.SuperAdmin && user.status === UserStatus.Active,
            ).length
        }),
        save: vi.fn(async (user: (typeof users extends Map<string, infer U> ? U : never)) => {
            events.push('save')
            users.set(user.id, { ...user })
            return user
        }),
    }
    const sessionRepository = {
        update: vi.fn().mockResolvedValue({ affected: 1 }),
    }
    const lockQueries: string[] = []

    adminStatusMocks.transactionHandler.mockImplementation(async (...args) => {
        const callback = args.find((argument) => typeof argument === 'function')
        if (typeof callback !== 'function') {
            throw new Error('Expected an AppDataSource transaction callback.')
        }

        let releaseTransactionLock: (() => void) | undefined
        const manager = {
            query: vi.fn(async (query: string) => {
                lockQueries.push(query)
                const predecessor = lockTail
                let releaseLock!: () => void
                lockTail = new Promise<void>((resolve) => {
                    releaseLock = resolve
                })
                await predecessor
                events.push('lock')
                releaseTransactionLock = releaseLock
                return []
            }),
            getRepository: vi.fn((entity: unknown) => entity === UserEntity
                ? userRepository
                : sessionRepository),
        }

        try {
            return await callback(manager)
        } finally {
            releaseTransactionLock?.()
        }
    })

    return { events, lockQueries, users, userRepository }
}

describe('admin user blocking session revocation', () => {
    beforeEach(() => {
        adminStatusMocks.transactionCalls = 0
        adminStatusMocks.transactionHandler.mockReset()
    })

    it('locks the user and atomically increments tokenVersion while revoking its active sessions', async () => {
        const { manager, sessionRepository, user, userQueryBuilder, userRepository } = setupTransaction()

        const result = await updateAdminUserStatus(admin, targetUserId, 'blocked')

        expect(adminStatusMocks.transactionCalls).toBe(1)
        expect(manager.query).toHaveBeenCalledWith(
            'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
            ['autocare-admin:active-super-admin-invariant'],
        )
        expect(userQueryBuilder.setLock).toHaveBeenCalledWith('pessimistic_write')
        expect(manager.query.mock.invocationCallOrder[0]!)
            .toBeLessThan(userQueryBuilder.getOne.mock.invocationCallOrder[0]!)
        expect(userRepository.save).toHaveBeenCalledWith(expect.objectContaining({
            status: UserStatus.Blocked,
            tokenVersion: 3,
        }))
        expect(sessionRepository.update).toHaveBeenCalledWith(
            expect.objectContaining({ userId: targetUserId, revokedAt: expect.anything() }),
            expect.objectContaining({
                revokedAt: expect.any(Date),
                revocationReason: 'all_sessions',
            }),
        )
        expect(userRepository.save.mock.invocationCallOrder[0]!)
            .toBeLessThan(sessionRepository.update.mock.invocationCallOrder[0]!)
        expect(manager.getRepository).toHaveBeenCalledWith(UserSessionEntity)
        expect(result.newStatus).toBe(UserStatus.Blocked)
        expect(user.tokenVersion).toBe(3)
    })

    it('does not restore a setup-issued token version when the blocked account is later unblocked', async () => {
        const { sessionRepository, user, userRepository } = setupTransaction()

        await updateAdminUserStatus(admin, targetUserId, UserStatus.Blocked)
        expect(user.tokenVersion).toBe(3)
        expect(sessionRepository.update).toHaveBeenCalledOnce()

        await updateAdminUserStatus(admin, targetUserId, UserStatus.Active)

        expect(user.status).toBe(UserStatus.Active)
        expect(user.tokenVersion).toBe(4)
        expect(sessionRepository.update).toHaveBeenCalledOnce()
        expect(() => assertCurrentSessionVersion(user.tokenVersion, 2)).toThrow()
        expect(userRepository.save).toHaveBeenCalledTimes(2)
    })

    it('serializes concurrent block and role-demotion requests against the shared active-super-admin count', async () => {
        const { events, lockQueries, users } = setupConcurrentSuperAdminStatusTransactions()

        const results = await Promise.allSettled([
            updateAdminUserStatus(admin, targetUserId, UserStatus.Blocked),
            updateAdminUserRole(admin, secondSuperAdminUserId, UserRole.Admin),
        ])

        expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
        expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1)
        const rejected = results.find((result) => result.status === 'rejected')
        expect(rejected?.status).toBe('rejected')
        if (rejected?.status === 'rejected') {
            expect(rejected.reason).toMatchObject({ statusCode: 400 })
        }
        expect(
            [...users.values()].filter((user) =>
                user.role === UserRole.SuperAdmin && user.status === UserStatus.Active,
            ),
        ).toHaveLength(1)
        expect(lockQueries).toHaveLength(2)
        expect(lockQueries.every((query) => query.includes('pg_advisory_xact_lock'))).toBe(true)
        expect(events).toEqual(['lock', 'load', 'count', 'save', 'lock', 'load', 'count'])
    })
})
