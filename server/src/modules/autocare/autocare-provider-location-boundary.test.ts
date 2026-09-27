import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    getRepository: vi.fn(),
    transaction: vi.fn(),
}))

vi.mock('../../database/data-source.js', () => ({ AppDataSource: mocks }))

import {
    AutoCareCapacityResourceEntity,
    AutomotiveMarketCountryEntity,
    AutomotiveMarketEntity,
    AutomotiveProviderEntity,
    AutomotiveProviderMembershipEntity,
    AutomotiveServiceLocationEntity,
} from '../../entities/index.js'
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

    it('creates a draft provider in a new market without publishing that market', async () => {
        const ownerMarketId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
        const ownerProviderId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
        const ownerLocationId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
        const queryBuilder = {
            where: vi.fn().mockReturnThis(),
            andWhere: vi.fn().mockReturnThis(),
            getOne: vi.fn().mockResolvedValue(null),
        }
        const country = { id: 'country-de', code: 'DE', names: { en: 'Germany' } }
        const marketRepository = {
            createQueryBuilder: vi.fn().mockReturnValue(queryBuilder),
            create: vi.fn((value: Record<string, unknown>) => value),
            save: vi.fn(async (value: Record<string, unknown>) => ({ ...value, id: ownerMarketId })),
        }
        const providerRepository = {
            create: vi.fn((value: Record<string, unknown>) => value),
            save: vi.fn(async (value: Record<string, unknown>) => ({ ...value, id: ownerProviderId })),
        }
        const locationRepository = {
            create: vi.fn((value: Record<string, unknown>) => value),
            save: vi.fn(async (value: Record<string, unknown>) => ({ ...value, id: ownerLocationId })),
        }
        const countryRepository = {
            findOneBy: vi.fn().mockResolvedValue(country),
        }
        const membershipRepository = {
            create: vi.fn((value: Record<string, unknown>) => value),
            save: vi.fn(async (value: Record<string, unknown>) => value),
        }
        const resourceRepository = {
            find: vi.fn().mockResolvedValue([]),
            create: vi.fn((value: Record<string, unknown>) => value),
            save: vi.fn(async (value: Record<string, unknown> | Record<string, unknown>[]) => value),
        }
        const repositories = new Map<unknown, unknown>([
            [AutomotiveMarketCountryEntity, countryRepository],
            [AutomotiveMarketEntity, marketRepository],
            [AutomotiveProviderEntity, providerRepository],
            [AutomotiveServiceLocationEntity, locationRepository],
            [AutomotiveProviderMembershipEntity, membershipRepository],
            [AutoCareCapacityResourceEntity, resourceRepository],
        ])
        const manager = { getRepository: vi.fn((entity: unknown) => repositories.get(entity)) }
        mocks.transaction.mockImplementation(async (callback: (manager: typeof manager) => unknown) => callback(manager))

        const created = await createOwnerAutoCareProvider({ id: 'owner-1', role: 'owner' } as never, {
            ...providerInput,
            marketId: undefined,
            zoneId: null,
            countryCode: 'DE',
            countryName: 'Germany',
            cityName: 'Berlin',
            currencyCode: 'EUR',
            timezone: 'Europe/Berlin',
        } as never)

        expect(marketRepository.save).toHaveBeenCalledWith(expect.objectContaining({ launchReady: false, cityName: 'Berlin' }))
        expect(created).toMatchObject({ id: ownerProviderId, status: 'draft', location: { marketId: ownerMarketId } })
    })
})
