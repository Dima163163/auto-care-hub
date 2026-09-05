import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    getRepository: vi.fn(),
    transaction: vi.fn(),
}))

vi.mock('../../database/data-source.js', () => ({ AppDataSource: mocks }))

import { AutomotiveMarketEntity } from '../../entities/index.js'
import { createOwnerAutoCareProvider } from './autocare.service.js'

const marketId = '11111111-1111-4111-8111-111111111111'

const providerInput = {
    name: 'Demo Service',
    marketId,
    zoneId: null,
    address: 'Moscow, Test street 1',
    hours: '09:00–18:00',
    yearsActive: 2,
    staffCount: 1,
    isMultibrand: true,
    brandSpecializations: [],
    amenityIds: [],
}

describe('owner provider location boundary', () => {
    beforeEach(() => {
        mocks.getRepository.mockReset()
        mocks.transaction.mockReset()
    })

    it('rejects malformed market/zone ids before repository access', async () => {
        await expect(createOwnerAutoCareProvider({ id: 'owner-1', role: 'owner' } as never, { ...providerInput, marketId: 'market-1' } as never)).rejects.toMatchObject({ statusCode: 422 })
        await expect(createOwnerAutoCareProvider({ id: 'owner-1', role: 'owner' } as never, { ...providerInput, zoneId: 'zone-1' } as never)).rejects.toMatchObject({ statusCode: 422 })
        expect(mocks.getRepository).not.toHaveBeenCalled()
        expect(mocks.transaction).not.toHaveBeenCalled()
    })

    it('rejects malformed profile fields before market lookup or transaction', async () => {
        await expect(createOwnerAutoCareProvider({ id: 'owner-1', role: 'owner' } as never, { ...providerInput, name: 'x' } as never)).rejects.toMatchObject({ statusCode: 422 })
        await expect(createOwnerAutoCareProvider({ id: 'owner-1', role: 'owner' } as never, { ...providerInput, phone: 42 } as never)).rejects.toMatchObject({ statusCode: 422 })
        await expect(createOwnerAutoCareProvider({ id: 'owner-1', role: 'owner' } as never, { ...providerInput, weeklySchedule: { mon: { open: '09:00', close: '09:00', closed: false } } } as never)).rejects.toMatchObject({ statusCode: 422 })
        expect(mocks.getRepository).not.toHaveBeenCalled()
        expect(mocks.transaction).not.toHaveBeenCalled()
    })

    it('uses canonical market UUID for the first owner-scoped lookup', async () => {
        const marketRepository = { findOneBy: vi.fn().mockResolvedValue(null) }
        mocks.getRepository.mockImplementation((entity: unknown) => entity === AutomotiveMarketEntity ? marketRepository : undefined)

        await expect(createOwnerAutoCareProvider({ id: 'owner-1', role: 'owner' } as never, { ...providerInput, marketId: ` ${marketId.toUpperCase()} ` })).rejects.toMatchObject({ statusCode: 404 })
        expect(marketRepository.findOneBy).toHaveBeenCalledWith({ id: marketId })
    })
})
