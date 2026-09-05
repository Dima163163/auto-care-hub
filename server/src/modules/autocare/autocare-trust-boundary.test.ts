import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    getRepository: vi.fn(),
}))

vi.mock('../../database/data-source.js', () => ({ AppDataSource: mocks }))

import { AutomotiveProviderEntity } from '../../entities/index.js'
import { getAutoCareProviderTrust } from './autocare-marketplace.service.js'

const providerId = '11111111-1111-4111-8111-111111111111'

describe('public trust service input boundary', () => {
    beforeEach(() => mocks.getRepository.mockReset())

    it('rejects malformed provider ids before repository access', async () => {
        await expect(getAutoCareProviderTrust('provider-1')).rejects.toMatchObject({ statusCode: 422 })
        expect(mocks.getRepository).not.toHaveBeenCalled()
    })

    it('uses canonical provider UUID for the active-provider lookup', async () => {
        const providerRepository = { findOneBy: vi.fn().mockResolvedValue(null) }
        mocks.getRepository.mockImplementation((entity: unknown) => entity === AutomotiveProviderEntity ? providerRepository : undefined)

        await expect(getAutoCareProviderTrust(` ${providerId.toUpperCase()} `)).rejects.toMatchObject({ statusCode: 404 })
        expect(providerRepository.findOneBy).toHaveBeenCalledWith({ id: providerId })
    })
})
