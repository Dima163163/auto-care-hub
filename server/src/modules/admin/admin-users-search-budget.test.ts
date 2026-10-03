import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ getRepository: vi.fn() }))
vi.mock('../../database/data-source.js', () => ({ AppDataSource: { getRepository: mocks.getRepository } }))
import { UserEntity, UserRole, UserStatus } from '../../entities/user/user.entity.js'
import { getAdminUsers } from './admin.service.js'
import { emailBlindIndexTransformer } from '../../shared/security/data-encryption/field-encryption.js'

describe('admin encrypted user search budget', () => {
    const admin = new UserEntity()
    admin.role = UserRole.Admin
    function fixture(index: number) {
        const user = new UserEntity()
        Object.assign(user, { id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`, name: 'Synthetic user', email: 'synthetic@example.test', role: UserRole.Client, status: UserStatus.Active, createdAt: new Date('2026-10-01') })
        return user
    }
    function query(rows: UserEntity[]) {
        const chain = { andWhere: vi.fn(), orderBy: vi.fn(), addOrderBy: vi.fn(), clone: vi.fn(), take: vi.fn(), getMany: vi.fn().mockResolvedValue(rows) }
        for (const method of [chain.andWhere, chain.orderBy, chain.addOrderBy, chain.clone, chain.take]) method.mockReturnValue(chain)
        mocks.getRepository.mockReturnValue({ createQueryBuilder: () => chain })
        return chain
    }
    beforeEach(() => mocks.getRepository.mockReset())
    it('uses the email blind index before the SQL limit for a full email', async () => {
        const chain = query([fixture(1)])
        await getAdminUsers(admin, { search: 'SYNTHETIC@example.test', limit: 20, role: 'client' })
        expect(chain.andWhere).toHaveBeenCalledWith('user.email = :emailIndex', { emailIndex: emailBlindIndexTransformer.to('synthetic@example.test') })
        expect(chain.getMany).toHaveBeenCalledOnce()
        expect(chain.clone).not.toHaveBeenCalled()
    })
    it('rejects an incomplete broad scan after at most 1000 decrypted rows', async () => {
        const chain = query(Array.from({ length: 200 }, (_, index) => fixture(index)))
        await expect(getAdminUsers(admin, { search: 'no-match', limit: 20 })).rejects.toMatchObject({ statusCode: 422, code: 'ADMIN_SEARCH_TOO_BROAD' })
        expect(chain.getMany).toHaveBeenCalledTimes(5)
        expect(chain.take.mock.calls.every(([size]) => size <= 200)).toBe(true)
    })
    it('returns a complete empty result after the database is exhausted within budget', async () => {
        const chain = query([fixture(1)])
        await expect(getAdminUsers(admin, { search: 'no-match', limit: 20 })).resolves.toMatchObject({ items: [], nextCursor: null })
        expect(chain.getMany).toHaveBeenCalledOnce()
    })
    it('stops on page plus one matches, retaining normal cursor pagination', async () => {
        const chain = query(Array.from({ length: 200 }, (_, index) => fixture(index)))
        const result = await getAdminUsers(admin, { search: 'synthetic', limit: 2 })
        expect(result).toMatchObject({ items: [expect.anything(), expect.anything()], nextCursor: expect.any(String) })
        expect(chain.getMany).toHaveBeenCalledOnce()
    })
})
