import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    getRepository: vi.fn(),
}))

vi.mock('../../database/data-source.js', () => ({ AppDataSource: mocks }))

import {
    getAutoCareProviderOffers,
    getAutoCareProviderProfile,
    getAutoCareProviderReviews,
    getFeaturedAutoCareReviews,
} from './autocare.service.js'

describe('public provider service input boundaries', () => {
    beforeEach(() => mocks.getRepository.mockReset())

    it('rejects malformed provider IDs before public profile/review repository reads', async () => {
        await expect(getAutoCareProviderProfile('provider-1')).rejects.toMatchObject({ statusCode: 422 })
        await expect(getAutoCareProviderReviews('provider-1')).rejects.toMatchObject({ statusCode: 422 })
        await expect(getAutoCareProviderOffers('provider-1')).rejects.toMatchObject({ statusCode: 422 })
        expect(mocks.getRepository).not.toHaveBeenCalled()
    })

    it('rejects malformed public review limits before querying approved reviews', async () => {
        await expect(getFeaturedAutoCareReviews(0)).rejects.toMatchObject({ statusCode: 422 })
        await expect(getAutoCareProviderReviews('11111111-1111-4111-8111-111111111111', 51)).rejects.toMatchObject({ statusCode: 422 })
        expect(mocks.getRepository).not.toHaveBeenCalled()
    })
})
