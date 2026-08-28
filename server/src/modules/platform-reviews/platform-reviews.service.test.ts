import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PlatformReviewStatus } from '../../entities/platform-review/platform-review.entity.js'
import { UserRole, type UserEntity } from '../../entities/user/user.entity.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'

const repository = {
    findOneBy: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
}

vi.mock('../../database/data-source.js', () => ({
    AppDataSource: {
        getRepository: () => repository,
    },
}))

const { createPlatformReview } = await import('./platform-reviews.service.js')

const client = {
    id: 'client-1',
    name: 'Алексей С.',
    avatarUrl: null,
    role: UserRole.Client,
} as UserEntity

function savedReview(overrides: Record<string, unknown> = {}) {
    return {
        id: 'review-1',
        clientId: client.id,
        idempotencyKey: 'review_123',
        authorName: client.name,
        avatarUrl: null,
        authorRole: 'AutoCare Hub клиент',
        rating: 5,
        text: 'Отличный сервис, всё понятно и удобно.',
        status: PlatformReviewStatus.Pending,
        organizationResponse: null,
        respondedById: null,
        organizationRespondedAt: null,
        createdAt: new Date('2026-08-28T10:00:00.000Z'),
        updatedAt: new Date('2026-08-28T10:00:00.000Z'),
        ...overrides,
    }
}

describe('platform review idempotency', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        repository.findOneBy.mockResolvedValue(null)
        repository.create.mockImplementation((value) => value)
        repository.save.mockImplementation(async (value) => savedReview(value))
    })

    it('returns the persisted review for an identical retry', async () => {
        const input = { rating: 5, text: 'Отличный сервис, всё понятно и удобно.', idempotencyKey: 'review_123' }
        const first = await createPlatformReview(client, input)
        repository.findOneBy.mockResolvedValue(savedReview())
        const retry = await createPlatformReview(client, input)

        expect(retry.id).toBe(first.id)
        expect(repository.save).toHaveBeenCalledTimes(1)
    })

    it('rejects reusing a key for a different review payload', async () => {
        repository.findOneBy.mockResolvedValue(savedReview())

        await expect(createPlatformReview(client, {
            rating: 1,
            text: 'Совсем другой текст отзыва.',
            idempotencyKey: 'review_123',
        })).rejects.toMatchObject({ statusCode: 409, code: ERROR_CODES.Conflict })
    })

    it('recovers from a concurrent unique-key race when payload matches', async () => {
        const duplicate = savedReview()
        repository.save.mockRejectedValueOnce({
            driverError: { code: '23505', constraint: 'IDX_platform_reviews_client_idempotency_key' },
        })
        repository.findOneBy
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(duplicate)

        const result = await createPlatformReview(client, {
            rating: duplicate.rating,
            text: duplicate.text,
            idempotencyKey: duplicate.idempotencyKey!,
        })

        expect(result.id).toBe(duplicate.id)
    })

    it('does not expose a platform review to non-clients', async () => {
        await expect(createPlatformReview({ ...client, role: UserRole.Owner }, {
            rating: 5,
            text: 'Недопустимый отзыв владельца.',
        })).rejects.toMatchObject({ statusCode: 403, code: ERROR_CODES.Forbidden })
        expect(repository.save).not.toHaveBeenCalled()
    })
})
