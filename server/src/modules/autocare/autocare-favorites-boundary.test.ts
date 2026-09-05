import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    getRepository: vi.fn(),
}))

vi.mock('../../database/data-source.js', () => ({ AppDataSource: mocks }))

import { AutomotiveProviderEntity } from '../../entities/index.js'
import { addAutoCareFavorite, removeAutoCareFavorite, syncAutoCareFavorites } from './autocare-favorites.service.js'

const providerId = '11111111-1111-4111-8111-111111111111'
const locationId = '22222222-2222-4222-8222-222222222222'
const client = { id: 'client-1', role: 'client' } as never

describe('AutoCare favorites service input boundary', () => {
    beforeEach(() => mocks.getRepository.mockReset())

    it('rejects malformed provider/location ids before repository access', async () => {
        await expect(addAutoCareFavorite(client, 'provider-1')).rejects.toMatchObject({ statusCode: 422 })
        await expect(addAutoCareFavorite(client, providerId, 'location-1')).rejects.toMatchObject({ statusCode: 422 })
        await expect(removeAutoCareFavorite(client, 'provider-1')).rejects.toMatchObject({ statusCode: 422 })
        await expect(syncAutoCareFavorites(client, [providerId, 'provider-1'])).rejects.toMatchObject({ statusCode: 422 })
        expect(mocks.getRepository).not.toHaveBeenCalled()
    })

    it('uses canonical provider UUID for add lookup', async () => {
        const providerRepository = { findOneBy: vi.fn().mockResolvedValue(null) }
        mocks.getRepository.mockImplementation((entity: unknown) => entity === AutomotiveProviderEntity ? providerRepository : undefined)

        await expect(addAutoCareFavorite(client, ` ${providerId.toUpperCase()} `, ` ${locationId.toUpperCase()} `)).rejects.toMatchObject({ statusCode: 404 })
        expect(providerRepository.findOneBy).toHaveBeenCalledWith({ id: providerId, status: 'active' })
    })
})
