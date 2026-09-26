import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DataSource } from 'typeorm'

const repositoryMocks = vi.hoisted(() => ({
    appGetRepository: vi.fn(),
    transaction: vi.fn(),
}))

vi.mock('../../database/data-source.js', () => ({
    AppDataSource: {
        getRepository: repositoryMocks.appGetRepository,
        transaction: repositoryMocks.transaction,
    },
}))

import { SecurityTokenEntity, SecurityTokenPurpose } from '../../entities/security-token/security-token.entity.js'
import { UserEntity } from '../../entities/user/user.entity.js'
import { consumeUsableSecurityToken, createSecurityToken } from './security-token.service.js'

function createRepository() {
    const queryBuilder = {
        update: vi.fn(),
        set: vi.fn(),
        where: vi.fn(),
        andWhere: vi.fn(),
        execute: vi.fn().mockResolvedValue({ affected: 0 }),
    }
    queryBuilder.update.mockReturnValue(queryBuilder)
    queryBuilder.set.mockReturnValue(queryBuilder)
    queryBuilder.where.mockReturnValue(queryBuilder)
    queryBuilder.andWhere.mockReturnValue(queryBuilder)

    return {
        createQueryBuilder: vi.fn(() => queryBuilder),
        create: vi.fn((input: Record<string, unknown>) => input),
        save: vi.fn(async (input: Record<string, unknown>) => input),
        queryBuilder,
    }
}

describe('security token transaction manager', () => {
    beforeEach(() => {
        repositoryMocks.appGetRepository.mockReset()
        repositoryMocks.transaction.mockReset()
    })

    it('uses the supplied manager for invalidation and persistence', async () => {
        const repository = createRepository()
        const manager = {
            getRepository: vi.fn(() => repository),
        }

        const created = await createSecurityToken({
            user: { id: 'user-id' } as never,
            purpose: SecurityTokenPurpose.PasswordSetup,
        }, manager as never)

        expect(created.token).toMatch(/^[A-Za-z0-9_-]{43}$/)
        expect(created.expiresAt.getTime()).toBeGreaterThan(Date.now())
        expect(manager.getRepository).toHaveBeenCalledWith(SecurityTokenEntity)
        expect(repository.queryBuilder.execute).toHaveBeenCalledOnce()
        expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'user-id',
            purpose: SecurityTokenPurpose.PasswordSetup,
            tokenHash: expect.not.stringContaining(created.token),
            usedAt: null,
        }))
        expect(repositoryMocks.appGetRepository).not.toHaveBeenCalled()
    })

    it('keeps the default AppDataSource repository path for existing callers', async () => {
        const repository = createRepository()
        repositoryMocks.appGetRepository.mockReturnValue(repository)

        await createSecurityToken({
            user: { id: 'user-id' } as never,
            purpose: SecurityTokenPurpose.PasswordReset,
        })

        expect(repositoryMocks.appGetRepository).toHaveBeenCalledWith(SecurityTokenEntity)
        expect(repository.save).toHaveBeenCalledOnce()
    })

    it('uses an inner join and explicit non-null aliases for PostgreSQL row locking', async () => {
        const queryBuilder = {
            innerJoinAndSelect: vi.fn(),
            leftJoinAndSelect: vi.fn(),
            where: vi.fn(),
            andWhere: vi.fn(),
            setLock: vi.fn(),
            getOne: vi.fn().mockResolvedValue({
                id: 'token-id',
                expiresAt: new Date(Date.now() + 60_000),
                user: { id: 'user-id' },
            }),
        }
        queryBuilder.innerJoinAndSelect.mockReturnValue(queryBuilder)
        queryBuilder.where.mockReturnValue(queryBuilder)
        queryBuilder.andWhere.mockReturnValue(queryBuilder)
        queryBuilder.setLock.mockReturnValue(queryBuilder)

        const repository = {
            createQueryBuilder: vi.fn(() => queryBuilder),
            update: vi.fn().mockResolvedValue({ affected: 1 }),
        }
        const manager = {
            getRepository: vi.fn(() => repository),
        }
        repositoryMocks.transaction.mockImplementation(async (callback) => callback(manager))

        const callback = vi.fn(async () => 'consumed')
        const result = await consumeUsableSecurityToken(
            'one-time-token-value-with-enough-entropy',
            SecurityTokenPurpose.PasswordSetup,
            callback,
        )

        expect(result).toBe('consumed')
        expect(queryBuilder.innerJoinAndSelect).toHaveBeenCalledWith(
            'securityToken.user',
            'user',
        )
        expect(queryBuilder.leftJoinAndSelect).not.toHaveBeenCalled()
        expect(queryBuilder.setLock).toHaveBeenCalledWith('pessimistic_write')
        expect(repository.update).toHaveBeenCalledOnce()
        expect(repositoryMocks.appGetRepository).not.toHaveBeenCalled()
    })

    it('generates PostgreSQL inner-join SQL with a valid FOR UPDATE clause without opening a connection', async () => {
        const source = new DataSource({
            type: 'postgres',
            host: '127.0.0.1',
            port: 5432,
            username: 'sql-generation-only',
            password: 'not-used',
            database: 'sql-generation-only',
            entities: [SecurityTokenEntity, UserEntity],
        })
        const buildMetadatas = (source as unknown as {
            buildMetadatas: () => Promise<void>
        }).buildMetadatas
        await buildMetadatas.call(source)

        const sql = source.createQueryBuilder()
            .select('securityToken')
            .from(SecurityTokenEntity, 'securityToken')
            .innerJoinAndSelect('securityToken.user', 'user')
            .where('securityToken.tokenHash = :tokenHash', { tokenHash: 'hash' })
            .setLock('pessimistic_write')
            .getQuery()

        expect(sql).toMatch(/\bINNER JOIN\b/)
        expect(sql).not.toMatch(/\bLEFT JOIN\b/)
        expect(sql).toMatch(/\bFOR UPDATE$/)
    })
})
