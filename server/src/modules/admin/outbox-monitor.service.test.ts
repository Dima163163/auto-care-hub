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
})
