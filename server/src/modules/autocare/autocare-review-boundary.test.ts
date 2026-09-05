import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    getRepository: vi.fn(),
    transaction: vi.fn(),
}))

vi.mock('../../database/data-source.js', () => ({ AppDataSource: mocks }))

import {
    createAutoCareReview,
    createOwnerAutoCareReviewPromo,
    getOwnerAutoCareProviderReviews,
    getOwnerAutoCareReviews,
    redeemAutoCareReviewPromo,
    updateClientAutoCareReview,
} from './autocare.service.js'

describe('review service input boundaries', () => {
    beforeEach(() => {
        mocks.getRepository.mockReset()
        mocks.transaction.mockReset()
    })

    it('rejects malformed owner provider/review identifiers before repository access', async () => {
        await expect(getOwnerAutoCareProviderReviews({ id: 'owner-1' } as never, 'provider-1')).rejects.toMatchObject({ statusCode: 422 })
        await expect(getOwnerAutoCareReviews({ id: 'owner-1' } as never, 'provider-1')).rejects.toMatchObject({ statusCode: 422 })
        await expect(createOwnerAutoCareReviewPromo({ id: 'owner-1', role: 'owner' } as never, 'provider-1', 'review-1', { discountPercent: 10 })).rejects.toMatchObject({ statusCode: 422 })
        expect(mocks.getRepository).not.toHaveBeenCalled()
    })

    it('rejects malformed client review identifiers and promo codes before opening a transaction', async () => {
        await expect(createAutoCareReview({ id: 'client-1', role: 'client' } as never, { requestId: 'request-1', rating: 5, text: 'A sufficiently long review' })).rejects.toMatchObject({ statusCode: 422 })
        await expect(updateClientAutoCareReview({ id: 'client-1', role: 'client' } as never, 'review-1', { rating: 5, text: 'A sufficiently long review' })).rejects.toMatchObject({ statusCode: 422 })
        await expect(redeemAutoCareReviewPromo({ id: 'client-1', role: 'client' } as never, { code: 'not-a-promo' })).rejects.toMatchObject({ statusCode: 422 })
        expect(mocks.transaction).not.toHaveBeenCalled()
        expect(mocks.getRepository).not.toHaveBeenCalled()
    })
})
