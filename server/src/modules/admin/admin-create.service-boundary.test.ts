import { describe, expect, it } from 'vitest'

import { UserRole } from '../../entities/user/user.entity.js'
import { createAdmin } from './admin.service.js'

describe('Admin creation service input boundaries', () => {
    it('rejects malformed payloads before database access', async () => {
        const superAdmin = { role: UserRole.SuperAdmin } as never

        await expect(createAdmin(superAdmin, {
            name: 'Admin',
            email: 'admin@example.com',
            unexpected: true,
        }, 'https://app.example.com')).rejects.toMatchObject({ statusCode: 422 })
    })

    it('keeps authorization ahead of input validation', async () => {
        const admin = { role: UserRole.Admin } as never

        await expect(createAdmin(admin, null, 'javascript:alert(1)')).rejects.toMatchObject({ statusCode: 403 })
    })
})
