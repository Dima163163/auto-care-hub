import { describe, expect, it } from 'vitest'

import { UserRole, type UserEntity } from '../../entities/user/user.entity.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { getAdminOperationsOverview } from './operations-overview.service.js'

describe('admin operations overview boundary', () => {
    it('rejects non-admin actors before collecting the operational snapshot', async () => {
        const actor = { role: UserRole.Client } as UserEntity

        await expect(getAdminOperationsOverview(actor)).rejects.toMatchObject({
            statusCode: 403,
            code: ERROR_CODES.Forbidden,
        })
    })
})
