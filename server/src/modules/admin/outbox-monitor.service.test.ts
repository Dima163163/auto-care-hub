import { describe, expect, it, vi } from 'vitest'

import { UserRole, type UserEntity } from '../../entities/user/user.entity.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'

const repository = { findOneBy: vi.fn() }

vi.mock('../../database/data-source.js', () => ({
    AppDataSource: {
        getRepository: vi.fn(() => repository),
    },
}))

const { deadLetterOutboxEvent, retryOutboxEvent } = await import('./outbox-monitor.service.js')

describe('outbox monitor service boundary', () => {
    it('rejects malformed direct event identifiers before repository lookup', async () => {
        const admin = { role: UserRole.Admin } as UserEntity
        await expect(retryOutboxEvent(admin, 'event-1')).rejects.toMatchObject({ statusCode: 422, code: ERROR_CODES.ValidationError })
        await expect(deadLetterOutboxEvent(admin, null)).rejects.toMatchObject({ statusCode: 422, code: ERROR_CODES.ValidationError })
        expect(repository.findOneBy).not.toHaveBeenCalled()
    })

    it('refuses to requeue a dead-letter email after its one-time token was redacted', async () => {
        const admin = { role: UserRole.Admin } as UserEntity
        repository.findOneBy.mockResolvedValueOnce({
            status: 'dead_letter',
            type: 'email.send',
            payload: { template: 'password_reset' },
        })
        await expect(retryOutboxEvent(admin, '123e4567-e89b-42d3-a456-426614174000'))
            .rejects.toMatchObject({ statusCode: 409, code: ERROR_CODES.Conflict })
    })
})
