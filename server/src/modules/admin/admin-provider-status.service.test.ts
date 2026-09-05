import { describe, expect, it, vi } from 'vitest'

import { UserRole, type UserEntity } from '../../entities/user/user.entity.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'

const repository = { findOneBy: vi.fn(), save: vi.fn() }

vi.mock('../../database/data-source.js', () => ({
    AppDataSource: {
        getRepository: vi.fn(() => repository),
    },
}))

const { updateAdminAutoCareProviderStatus } = await import('./admin.service.js')

describe('admin provider status service boundary', () => {
    it('rejects malformed direct mutations before provider lookup', async () => {
        const admin = { id: 'admin-1', role: UserRole.Admin } as UserEntity
        await expect(updateAdminAutoCareProviderStatus(admin, 'provider-1', 'archived')).rejects.toMatchObject({
            statusCode: 422,
            code: ERROR_CODES.ValidationError,
        })
        expect(repository.findOneBy).not.toHaveBeenCalled()
    })
})
