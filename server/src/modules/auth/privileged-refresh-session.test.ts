import { beforeEach, describe, expect, it, vi } from 'vitest'

import { UserRole, UserStatus } from '../../entities/user/user.entity.js'
import { AppDataSource } from '../../database/data-source.js'
import { refreshAuth } from './auth.service.js'

vi.mock('../../database/data-source.js', () => ({
    AppDataSource: { getRepository: vi.fn() },
}))

const userId = '00000000-0000-4000-8000-000000000001'

beforeEach(() => {
    vi.mocked(AppDataSource.getRepository).mockReset()
})

describe('privileged refresh sessions', () => {
    it.each([UserRole.Admin, UserRole.SuperAdmin])('rejects a sessionless refresh for %s', async (role) => {
        const findOne = vi.fn().mockResolvedValue({
            id: userId,
            role,
            status: UserStatus.Active,
            tokenVersion: 1,
        })
        vi.mocked(AppDataSource.getRepository).mockReturnValue({ findOne } as ReturnType<typeof AppDataSource.getRepository>)

        await expect(refreshAuth(userId, 1)).rejects.toMatchObject({
            statusCode: 401,
            code: 'UNAUTHORIZED',
        })
    })
})
