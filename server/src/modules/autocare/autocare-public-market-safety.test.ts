import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getRepository: vi.fn() }))

vi.mock('../../database/data-source.js', () => ({ AppDataSource: mocks }))

import {
    AutoCarePriceBenchmarkEntity,
    AutomotiveMarketEntity,
    AutomotiveMarketCountryEntity,
    AutomotiveProviderEntity,
    AutomotiveReviewEntity,
    AutomotiveServiceDefinitionEntity,
    AutomotiveServiceLocationEntity,
    AutomotiveServiceOfferingEntity,
} from '../../entities/index.js'
import { getAutoCareFairPrice } from './autocare-marketplace.service.js'
import { getAutoCareDiscovery, getAutoCareMarkets, getFeaturedAutoCareReviews } from './autocare.service.js'

const readyMarket = {
    id: 'market-ready',
    countryId: 'country-1',
    countryCode: 'RU',
    countryName: 'Russia',
    cityCode: 'samara',
    cityName: 'Samara',
    currencyCode: 'RUB',
    defaultLocale: 'ru-RU',
    supportedLocales: ['ru-RU'],
    timezone: 'Europe/Samara',
    launchReady: true,
}

describe('public launch-ready market boundaries', () => {
    beforeEach(() => mocks.getRepository.mockReset())

    it('advertises only persisted markets that are launch ready', async () => {
        const hiddenMarket = { ...readyMarket, id: 'market-hidden', cityCode: 'hidden', launchReady: false }
        const marketRepository = { find: vi.fn().mockResolvedValue([hiddenMarket, readyMarket]) }
        mocks.getRepository.mockImplementation((entity: unknown) => {
            if (entity === AutomotiveMarketEntity) return marketRepository
            if (entity === AutomotiveMarketCountryEntity) return { find: vi.fn().mockResolvedValue([{ id: 'country-1' }]) }
            return undefined
        })

        const markets = await getAutoCareMarkets()

        expect(markets.map((market) => market.id)).toEqual([readyMarket.id])
    })

    it('does not advertise a launch-ready market while its country is inactive', async () => {
        const marketRepository = { find: vi.fn().mockResolvedValue([readyMarket]) }
        mocks.getRepository.mockImplementation((entity: unknown) => {
            if (entity === AutomotiveMarketEntity) return marketRepository
            if (entity === AutomotiveMarketCountryEntity) return { find: vi.fn().mockResolvedValue([]) }
            return undefined
        })

        await expect(getAutoCareMarkets()).resolves.toEqual([])
    })

    it('applies market and active-country eligibility before limiting featured reviews', async () => {
        const callOrder: string[] = []
        const review = {
            id: 'review-1',
            providerId: 'provider-1',
            authorName: 'Client',
            vehicleLabel: 'BMW X5',
            rating: 5,
            text: 'Great service.',
            avatarUrl: null,
            photoUrls: [],
            createdAt: new Date('2026-09-20T10:00:00.000Z'),
            serviceRequestId: 'request-1',
            serviceSlug: 'brakes',
        }
        const queryBuilder = {
            innerJoin: vi.fn().mockImplementation(() => { callOrder.push('join'); return queryBuilder }),
            where: vi.fn().mockImplementation(() => { callOrder.push('where'); return queryBuilder }),
            andWhere: vi.fn().mockImplementation(() => { callOrder.push('filter'); return queryBuilder }),
            orderBy: vi.fn().mockImplementation(() => { callOrder.push('order'); return queryBuilder }),
            addOrderBy: vi.fn().mockImplementation(() => { callOrder.push('tie-break'); return queryBuilder }),
            take: vi.fn().mockImplementation(() => { callOrder.push('limit'); return queryBuilder }),
            getMany: vi.fn().mockResolvedValue([review]),
        }
        const reviewRepository = { createQueryBuilder: vi.fn().mockReturnValue(queryBuilder) }
        const providerRepository = { find: vi.fn().mockResolvedValue([{ id: 'provider-1', name: 'Trusted Garage' }]) }
        mocks.getRepository.mockImplementation((entity: unknown) => entity === AutomotiveReviewEntity ? reviewRepository : providerRepository)

        const result = await getFeaturedAutoCareReviews(6)

        expect(result).toHaveLength(1)
        expect(queryBuilder.innerJoin).toHaveBeenCalledWith(
            AutomotiveMarketCountryEntity,
            'country',
            'country.id = market.countryId AND country.active = true',
        )
        expect(callOrder.indexOf('limit')).toBeGreaterThan(callOrder.lastIndexOf('join'))
        expect(queryBuilder.take).toHaveBeenCalledWith(6)
    })

    it('returns a safe empty discovery result for an unlaunched market without querying providers', async () => {
        const hiddenMarket = { ...readyMarket, launchReady: false }
        const marketRepository = {
            findOneBy: vi.fn().mockImplementation((where: Record<string, string>) => where.cityCode ? hiddenMarket : null),
            find: vi.fn().mockResolvedValue([]),
        }
        const locationRepository = { createQueryBuilder: vi.fn() }
        mocks.getRepository.mockImplementation((entity: unknown) => {
            if (entity === AutomotiveMarketEntity) return marketRepository
            if (entity === AutomotiveMarketCountryEntity) return { find: vi.fn().mockResolvedValue([{ id: 'country-1' }]) }
            if (entity === AutomotiveServiceLocationEntity) return locationRepository
            return { find: vi.fn().mockResolvedValue([]), findOneBy: vi.fn().mockResolvedValue(null) }
        })

        await expect(getAutoCareDiscovery({ marketId: 'samara' })).resolves.toEqual({ items: [], nextCursor: null })
        expect(locationRepository.createQueryBuilder).not.toHaveBeenCalled()
    })

    it('returns a safe empty discovery result for a missing market instead of substituting a ready one', async () => {
        const marketRepository = {
            findOneBy: vi.fn().mockResolvedValue(null),
            find: vi.fn().mockResolvedValue([readyMarket]),
        }
        const locationRepository = { createQueryBuilder: vi.fn() }
        mocks.getRepository.mockImplementation((entity: unknown) => {
            if (entity === AutomotiveMarketEntity) return marketRepository
            if (entity === AutomotiveMarketCountryEntity) return { find: vi.fn().mockResolvedValue([{ id: 'country-1' }]) }
            if (entity === AutomotiveServiceLocationEntity) return locationRepository
            return { find: vi.fn().mockResolvedValue([]), findOneBy: vi.fn().mockResolvedValue(null) }
        })

        await expect(getAutoCareDiscovery({ marketId: 'missing-city' })).resolves.toEqual({ items: [], nextCursor: null })
        expect(locationRepository.createQueryBuilder).not.toHaveBeenCalled()
    })

    it('scopes unfiltered discovery to the one ready market at query time', async () => {
        const hiddenMarket = { ...readyMarket, id: 'market-hidden', launchReady: false }
        const marketRepository = {
            findOneBy: vi.fn().mockResolvedValue(null),
            find: vi.fn().mockResolvedValue([readyMarket]),
        }
        const queryBuilder = {
            innerJoin: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            addSelect: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockReturnThis(),
            addOrderBy: vi.fn().mockReturnThis(),
            take: vi.fn().mockReturnThis(),
            andWhere: vi.fn().mockReturnThis(),
            getRawMany: vi.fn().mockResolvedValue([]),
        }
        const locationRepository = { createQueryBuilder: vi.fn().mockReturnValue(queryBuilder) }
        mocks.getRepository.mockImplementation((entity: unknown) => {
            if (entity === AutomotiveMarketEntity) return marketRepository
            if (entity === AutomotiveMarketCountryEntity) return { find: vi.fn().mockResolvedValue([{ id: 'country-1' }]) }
            if (entity === AutomotiveServiceLocationEntity) return locationRepository
            if (entity === AutomotiveProviderEntity || entity === AutomotiveServiceOfferingEntity || entity === AutomotiveServiceDefinitionEntity) return { find: vi.fn().mockResolvedValue([]), findByIds: vi.fn().mockResolvedValue([]) }
            return { find: vi.fn().mockResolvedValue([]), findOneBy: vi.fn().mockResolvedValue(null) }
        })

        expect(hiddenMarket.launchReady).toBe(false)
        await expect(getAutoCareDiscovery({})).resolves.toEqual({ items: [], nextCursor: null })
        expect(marketRepository.find).toHaveBeenCalledWith({
            where: { launchReady: true },
            select: { id: true, countryId: true, launchReady: true },
        })
        expect(queryBuilder.innerJoin).toHaveBeenCalledWith(
            AutomotiveMarketEntity,
            'market',
            'market.id = location.marketId AND market.launchReady = true',
        )
    })

    it('derives a benchmark from only the selected market and its currency', async () => {
        const definition = { id: 'definition-1', slug: 'brakes', priceType: 'from' }
        const targetLocation = { id: 'location-ready', marketId: readyMarket.id }
        const hiddenLocation = { id: 'location-other', marketId: 'market-other' }
        const definitionRepository = { findOneBy: vi.fn().mockResolvedValue(definition) }
        const benchmarkRepository = { find: vi.fn().mockResolvedValue([]) }
        const marketRepository = { findOneBy: vi.fn().mockResolvedValue(readyMarket) }
        const locationRepository = { find: vi.fn().mockResolvedValue([targetLocation, hiddenLocation]) }
        const offerRepository = {
            find: vi.fn().mockResolvedValue([
                { locationId: targetLocation.id, currencyCode: 'RUB', priceFromMinor: 25_000 },
                { locationId: targetLocation.id, currencyCode: 'USD', priceFromMinor: 100 },
                { locationId: hiddenLocation.id, currencyCode: 'RUB', priceFromMinor: 1 },
            ]),
        }
        mocks.getRepository.mockImplementation((entity: unknown) => {
            if (entity === AutomotiveServiceDefinitionEntity) return definitionRepository
            if (entity === AutomotiveMarketEntity) return marketRepository
            if (entity === AutomotiveMarketCountryEntity) return { findOneBy: vi.fn().mockResolvedValue({ id: 'country-1', active: true }) }
            if (entity === AutoCarePriceBenchmarkEntity) return benchmarkRepository
            if (entity === AutomotiveServiceLocationEntity) return locationRepository
            if (entity === AutomotiveServiceOfferingEntity) return offerRepository
            return undefined
        })

        const result = await getAutoCareFairPrice({ serviceId: 'brakes', marketId: 'samara' })

        expect(result).toMatchObject({
            marketId: readyMarket.id,
            currencyCode: 'RUB',
            minPriceMinor: 25_000,
            medianPriceMinor: 25_000,
            maxPriceMinor: 25_000,
            methodology: { kind: 'provider-offer-derived', sampleSize: 1 },
        })
        expect(locationRepository.find).toHaveBeenCalledWith({ where: { marketId: readyMarket.id } })
        expect(offerRepository.find).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({ locationId: expect.any(Object) }),
        }))
    })
})
