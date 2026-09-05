import { describe, expect, it } from 'vitest'

import { UserRole } from '../../entities/user/user.entity.js'
import { updateAdminCabinetStatus } from './admin.service.js'

describe('Admin cabinet service input boundaries', () => {
    it('rejects malformed cabinet mutations before database access', async () => {
        const admin = { role: UserRole.Admin } as never

        await expect(updateAdminCabinetStatus(admin, 'cabinet-1', 'active')).rejects.toMatchObject({ statusCode: 422 })
        await expect(updateAdminCabinetStatus(admin, '550e8400-e29b-41d4-a716-446655440000', 'pending')).rejects.toMatchObject({ statusCode: 422 })
    })
})
