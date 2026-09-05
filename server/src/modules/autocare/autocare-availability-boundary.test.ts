import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    getRepository: vi.fn(),
}))

vi.mock('../../database/data-source.js', () => ({ AppDataSource: mocks }))

import { getAutoCareAvailability } from './autocare-request.service.js'

const providerId = '11111111-1111-4111-8111-111111111111'
const locationId = '22222222-2222-4222-8222-222222222222'
const offeringId = '33333333-3333-4333-8333-333333333333'

describe('availability service input boundary', () => {
    beforeEach(() => mocks.getRepository.mockReset())

    it('rejects malformed availability references before repository access', async () => {
        await expect(getAutoCareAvailability('provider-1', locationId, offeringId, '2026-09-04')).rejects.toMatchObject({ statusCode: 422 })
        await expect(getAutoCareAvailability(providerId, 'location-1', offeringId, '2026-09-04')).rejects.toMatchObject({ statusCode: 422 })
        await expect(getAutoCareAvailability(providerId, locationId, 'offering-1', '2026-09-04')).rejects.toMatchObject({ statusCode: 422 })
        await expect(getAutoCareAvailability(providerId, locationId, offeringId, '2026-02-29')).rejects.toMatchObject({ statusCode: 422 })
        expect(mocks.getRepository).not.toHaveBeenCalled()
    })

    it('uses canonical provider UUID for the first active-provider lookup', async () => {
        const providerRepository = { findOneBy: vi.fn().mockResolvedValue(null) }
        mocks.getRepository.mockReturnValue(providerRepository)

        await expect(getAutoCareAvailability(` ${providerId.toUpperCase()} `, ` ${locationId.toUpperCase()} `, ` ${offeringId.toUpperCase()} `, ' 2026-09-04 ')).rejects.toMatchObject({ statusCode: 404 })
        expect(providerRepository.findOneBy).toHaveBeenCalledWith({ id: providerId, status: 'active' })
    })
})
