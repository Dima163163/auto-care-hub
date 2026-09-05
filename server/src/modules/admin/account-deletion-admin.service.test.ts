import { describe, expect, it } from 'vitest'

import { UserRole, type UserEntity } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { assertSuperAdminAccess } from './account-deletion-admin.service.js'
import {
    getAdminDeletionRequests,
    updateAdminDeletionRequestStatus,
} from './account-deletion-admin.service.js'

describe('account deletion admin access', () => {
    it('allows only super-admin users', () => {
        expect(() => assertSuperAdminAccess({ role: UserRole.SuperAdmin } as UserEntity)).not.toThrow()
        expect(() => assertSuperAdminAccess({ role: UserRole.Admin } as UserEntity)).toThrow(AppError)
        expect(() => assertSuperAdminAccess({ role: UserRole.Client } as UserEntity)).toThrow(AppError)
    })

    it('rejects malformed queue and status input before database access', async () => {
        const superAdmin = { role: UserRole.SuperAdmin } as never

        await expect(getAdminDeletionRequests(superAdmin, { extra: true })).rejects.toMatchObject({ statusCode: 422 })
        await expect(getAdminDeletionRequests(superAdmin, { status: 'unknown' })).rejects.toMatchObject({ statusCode: 422 })
        await expect(updateAdminDeletionRequestStatus(superAdmin, 'request-1', 'completed')).rejects.toMatchObject({ statusCode: 422 })
        await expect(updateAdminDeletionRequestStatus(superAdmin, '550e8400-e29b-41d4-a716-446655440000', 'pending')).rejects.toMatchObject({ statusCode: 422 })
    })
})
