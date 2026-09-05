import { describe, expect, it } from 'vitest'

import { UserRole } from '../../entities/user/user.entity.js'
import {
    getAdminUsers,
    updateAdminUserRole,
    updateAdminUserStatus,
} from './admin.service.js'

describe('Admin users service input boundaries', () => {
    it('rejects malformed list and status mutation input before database access', async () => {
        const admin = { role: UserRole.Admin } as never

        await expect(getAdminUsers(admin, { status: 'pending' })).rejects.toMatchObject({ statusCode: 422 })
        await expect(updateAdminUserStatus(admin, 'user-1', 'blocked')).rejects.toMatchObject({ statusCode: 422 })
    })

    it('keeps role mutations super-admin scoped before validating identifiers', async () => {
        const admin = { role: UserRole.Admin } as never
        const superAdmin = { role: UserRole.SuperAdmin } as never

        await expect(updateAdminUserRole(admin, 'user-1', 'owner')).rejects.toMatchObject({ statusCode: 403 })
        await expect(updateAdminUserRole(superAdmin, 'user-1', 'owner')).rejects.toMatchObject({ statusCode: 422 })
    })
})
