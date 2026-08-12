import { AppDataSource } from '../database/data-source.js'
import {
    AutomotiveMarketEntity,
    AutomotiveProviderEntity,
    AutomotiveProviderStatus,
    AutomotiveServiceDefinitionEntity,
    AutomotiveServiceLocationEntity,
    AutomotiveServiceOfferingEntity,
    AutomotivePriceType,
} from '../entities/index.js'
import {
    AUTOMOTIVE_MOCK_MARKET,
    AUTOMOTIVE_MOCK_PROVIDERS,
    AUTOMOTIVE_MOCK_SERVICES,
    AUTOCARE_MOCK_FALLBACK_IMAGE,
    resolveMockAssetUrl,
} from '../modules/autocare/autocare-mock-catalog.js'

async function seedAutoCareMockData() {
    await AppDataSource.initialize()

    try {
        await AppDataSource.transaction(async (manager) => {
            const marketRepository = manager.getRepository(AutomotiveMarketEntity)
            const definitionRepository = manager.getRepository(AutomotiveServiceDefinitionEntity)
            const providerRepository = manager.getRepository(AutomotiveProviderEntity)
            const locationRepository = manager.getRepository(AutomotiveServiceLocationEntity)
            const offeringRepository = manager.getRepository(AutomotiveServiceOfferingEntity)

            const existingMarket = await marketRepository.findOneBy({ countryCode: AUTOMOTIVE_MOCK_MARKET.countryCode, cityCode: AUTOMOTIVE_MOCK_MARKET.cityCode })
            const market = await marketRepository.save(marketRepository.create({ ...existingMarket, ...AUTOMOTIVE_MOCK_MARKET }))
            const definitions = new Map<string, AutomotiveServiceDefinitionEntity>()

            for (const input of AUTOMOTIVE_MOCK_SERVICES) {
                const existing = await definitionRepository.findOneBy({ slug: input.slug })
                const definition = await definitionRepository.save(definitionRepository.create({
                    ...existing,
                    ...input,
                    priceType: AutomotivePriceType.From,
                    comparisonAttributes: ['price', 'rating', 'distance', 'nextSlot'],
                    active: true,
                }))
                definitions.set(input.slug, definition)
            }

            for (const input of AUTOMOTIVE_MOCK_PROVIDERS) {
                const existing = await providerRepository.findOneBy({ name: input.name })
                const provider = await providerRepository.save(providerRepository.create({
                    ...existing,
                    name: input.name,
                    description: input.description,
                    status: AutomotiveProviderStatus.Active,
                    verified: input.verified,
                    yearsActive: input.yearsActive,
                    staffCount: input.staffCount,
                    rating: input.rating,
                    reviewCount: input.reviewCount,
                    bonusSummary: input.bonusSummary ?? null,
                    coverImageUrl: input.imageUrl ? resolveMockAssetUrl(input.imageUrl) : null,
                    galleryImageUrls: (input.galleryImageUrls ?? []).map((image) => resolveMockAssetUrl(image)).filter((image) => image !== AUTOCARE_MOCK_FALLBACK_IMAGE),
                    brandSpecializations: input.brandSpecializations,
                    isMultibrand: input.isMultibrand,
                }))

                const existingLocation = await locationRepository.findOneBy({ providerId: provider.id, marketId: market.id })
                const location = await locationRepository.save(locationRepository.create({
                    ...existingLocation,
                    providerId: provider.id,
                    marketId: market.id,
                    address: input.address,
                    hours: input.hours,
                    latitude: input.latitude,
                    longitude: input.longitude,
                }))

                for (const offeringInput of input.offerings) {
                    const definition = definitions.get(offeringInput.serviceSlug)
                    if (!definition) continue
                    const existingOffering = await offeringRepository.findOneBy({ locationId: location.id, definitionId: definition.id })
                    await offeringRepository.save(offeringRepository.create({
                        ...existingOffering,
                        locationId: location.id,
                        definitionId: definition.id,
                        priceFromMinor: offeringInput.priceFromMinor,
                        priceToMinor: null,
                        currencyCode: AUTOMOTIVE_MOCK_MARKET.currencyCode,
                        durationMinutes: offeringInput.durationMinutes,
                        inclusions: ['Предварительная оценка', 'Фотоотчёт по запросу'],
                        warrantyText: 'Гарантия на работы по условиям сервиса',
                        active: true,
                    }))
                }
            }
        })
        console.info('AutoCare mock catalog seeded with generated provider images and safe fallbacks.')
    } finally {
        await AppDataSource.destroy()
    }
}

seedAutoCareMockData().catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
})
