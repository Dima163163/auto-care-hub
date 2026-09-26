import { beforeEach, describe, expect, it, vi } from 'vitest'

const bootstrapMocks = vi.hoisted(() => ({
    transaction: vi.fn(),
    createPasswordSetupTokenForUser: vi.fn(),
}))

vi.mock('../../database/data-source.js', () => ({
    AppDataSource: {
        transaction: bootstrapMocks.transaction,
    },
}))

vi.mock('../auth/auth.service.js', () => ({
    createPasswordSetupTokenForUser: bootstrapMocks.createPasswordSetupTokenForUser,
}))

import { UserRole, UserStatus } from '../../entities/user/user.entity.js'
import { bootstrapSuperAdmin } from './bootstrap-super-admin.js'

function setupTransaction(existingUser: Record<string, unknown> | null) {
    const userRepository = {
        findOne: vi.fn().mockResolvedValue(existingUser),
        create: vi.fn((input: Record<string, unknown>) => ({ id: 'created-user', ...input })),
        save: vi.fn(async (user: Record<string, unknown>) => user),
    }
    const manager = {
        query: vi.fn().mockResolvedValue(undefined),
        getRepository: vi.fn(() => userRepository),
    }

    bootstrapMocks.transaction.mockImplementation(async (callback) => callback(manager))

    return { manager, userRepository }
}

describe('bootstrapSuperAdmin', () => {
    beforeEach(() => {
        bootstrapMocks.transaction.mockReset()
        bootstrapMocks.createPasswordSetupTokenForUser.mockReset()
        bootstrapMocks.createPasswordSetupTokenForUser.mockResolvedValue({
            token: 'one-time-setup-token',
            expiresAt: new Date('2026-09-23T12:00:00.000Z'),
        })
    })

    it('serializes first-time provisioning and creates its setup token in the same transaction', async () => {
        const { manager, userRepository } = setupTransaction(null)

        const result = await bootstrapSuperAdmin({
            email: '  ROOT@EXAMPLE.COM ',
            name: 'Root Operator',
        })

        expect(manager.query).toHaveBeenCalledWith(
            'SELECT pg_advisory_xact_lock(hashtext($1))',
            ['bootstrap-super-admin:root@example.com'],
        )
        expect(manager.query.mock.invocationCallOrder[0]).toBeLessThan(
            userRepository.findOne.mock.invocationCallOrder[0]!,
        )
        expect(userRepository.create).toHaveBeenCalledWith(expect.objectContaining({
            email: 'root@example.com',
            role: UserRole.SuperAdmin,
            status: UserStatus.Active,
            emailVerifiedAt: null,
        }))
        expect(bootstrapMocks.createPasswordSetupTokenForUser).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'created-user' }),
            manager,
        )
        expect(result).toMatchObject({
            action: 'created',
            email: 'root@example.com',
            passwordSetupToken: { token: 'one-time-setup-token' },
        })
    })

    it('returns one created result when concurrent replicas bootstrap the same address', async () => {
        let committedUser: Record<string, unknown> | null = null
        let transactionQueue = Promise.resolve()
        const userRepository = {
            findOne: vi.fn(async () => committedUser),
            create: vi.fn((input: Record<string, unknown>) => ({ id: 'created-user', ...input })),
            save: vi.fn(async (user: Record<string, unknown>) => {
                committedUser = user
                return user
            }),
        }
        const manager = {
            query: vi.fn().mockResolvedValue(undefined),
            getRepository: vi.fn(() => userRepository),
        }

        bootstrapMocks.transaction.mockImplementation(async (callback) => {
            const previousTransaction = transactionQueue
            let releaseTransaction = () => undefined
            transactionQueue = new Promise<void>((resolve) => {
                releaseTransaction = resolve
            })
            await previousTransaction

            try {
                return await callback(manager)
            } finally {
                releaseTransaction()
            }
        })

        const results = await Promise.all([
            bootstrapSuperAdmin({ email: 'root@example.com', name: 'Root Operator' }),
            bootstrapSuperAdmin({ email: 'root@example.com', name: 'Root Operator' }),
        ])

        expect(results.map((result) => result.action).sort()).toEqual(['created', 'skipped'])
        expect(manager.query).toHaveBeenCalledTimes(2)
        expect(userRepository.save).toHaveBeenCalledOnce()
        expect(bootstrapMocks.createPasswordSetupTokenForUser).toHaveBeenCalledOnce()
    })

    it.each([
        ['unverified', { emailVerifiedAt: null, status: UserStatus.Active }],
        ['blocked', { emailVerifiedAt: new Date(), status: UserStatus.Blocked }],
    ])('does not promote or unblock an existing %s account', async (_label, state) => {
        const existingUser = {
            id: 'existing-user',
            email: 'root@example.com',
            role: UserRole.Client,
            passwordHash: 'existing-password-hash',
            ...state,
        }
        const { userRepository } = setupTransaction(existingUser)

        const result = await bootstrapSuperAdmin({
            email: 'root@example.com',
            name: 'Ignored Name',
        })

        expect(result).toEqual({ action: 'skipped' })
        expect(userRepository.save).not.toHaveBeenCalled()
        expect(existingUser).toMatchObject({
            role: UserRole.Client,
            status: state.status,
        })
        expect(bootstrapMocks.createPasswordSetupTokenForUser).not.toHaveBeenCalled()
    })

    it('promotes only an active verified existing account and keeps its status', async () => {
        const existingUser = {
            id: 'existing-user',
            email: 'root@example.com',
            role: UserRole.Client,
            passwordHash: null,
            status: UserStatus.Active,
            emailVerifiedAt: new Date(),
        }
        const { manager, userRepository } = setupTransaction(existingUser)

        const result = await bootstrapSuperAdmin({
            email: 'root@example.com',
            name: 'Ignored Name',
        })

        expect(result).toMatchObject({ action: 'promoted', email: 'root@example.com' })
        expect(userRepository.save).toHaveBeenCalledWith(expect.objectContaining({
            role: UserRole.SuperAdmin,
            status: UserStatus.Active,
        }))
        expect(bootstrapMocks.createPasswordSetupTokenForUser).toHaveBeenCalledWith(
            existingUser,
            manager,
        )
    })

    it('rolls back provisioning when setup-token persistence fails', async () => {
        const { userRepository } = setupTransaction(null)
        bootstrapMocks.createPasswordSetupTokenForUser.mockRejectedValueOnce(
            new Error('token storage unavailable'),
        )

        await expect(bootstrapSuperAdmin({
            email: 'root@example.com',
            name: 'Root Operator',
        })).rejects.toThrow('token storage unavailable')

        // TypeORM owns commit/rollback around the callback; this assertion
        // ensures the failure is not swallowed and can abort that transaction.
        expect(userRepository.save).toHaveBeenCalledOnce()
    })
})
