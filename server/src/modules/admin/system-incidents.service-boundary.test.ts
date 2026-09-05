import { describe, expect, it } from 'vitest'

import { UserRole, type UserEntity } from '../../entities/user/user.entity.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { recordSystemIncidentSafely, updateSystemIncidentStatus } from './system-incidents.service.js'

describe('system incident service boundary', () => {
    it('ignores malformed incident records without opening a transaction', async () => {
        await expect(recordSystemIncidentSafely({
            type: 'unknown',
            severity: 'critical',
            title: 'Invalid incident',
        } as never)).resolves.toBeNull()
    })

    it('rejects malformed status mutations before repository access', async () => {
        const actor = { role: UserRole.SuperAdmin } as UserEntity
        await expect(updateSystemIncidentStatus(actor, 'incident-1', 'resolved')).rejects.toMatchObject({
            statusCode: 422,
            code: ERROR_CODES.ValidationError,
        })
    })
})
