import { describe, expect, it } from 'vitest'

import { UserRole, type UserEntity } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { assertSuperAdminAccess } from './account-deletion-admin.service.js'

describe('account deletion admin access', () => {
    it('allows only super-admin users', () => {
        expect(() => assertSuperAdminAccess({ role: UserRole.SuperAdmin } as UserEntity)).not.toThrow()
        expect(() => assertSuperAdminAccess({ role: UserRole.Admin } as UserEntity)).toThrow(AppError)
        expect(() => assertSuperAdminAccess({ role: UserRole.Client } as UserEntity)).toThrow(AppError)
    })
})
