import { AppDataSource } from '../database/data-source.js'
import {
    AutomotiveMarketEntity,
    AutomotiveProviderEntity,
    AutomotiveProviderStatus,
    AutomotiveReviewEntity,
    AutomotiveReviewStatus,
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
            const reviewRepository = manager.getRepository(AutomotiveReviewEntity)

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
                    logoUrl: input.logoUrl ? resolveMockAssetUrl(input.logoUrl) : null,
                    coverImageUrl: input.imageUrl ? resolveMockAssetUrl(input.imageUrl) : null,
                    galleryImageUrls: (input.galleryImageUrls ?? []).map((image) => resolveMockAssetUrl(image)).filter((image) => image !== AUTOCARE_MOCK_FALLBACK_IMAGE),
                    amenityIds: input.amenityIds,
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

                const reviewFixtures = [
                    ['Алексей С.', 'BMW X5', 5, 'Быстро приняли машину, заранее объяснили стоимость и прислали понятный фотоотчёт.', '/images/autocare/avatars/alexey.webp'],
                    ['Мария К.', 'Toyota RAV4', 4, 'Удобная запись и внимательный мастер. Итоговая цена совпала с предварительной оценкой.', '/images/autocare/avatars/maria.webp'],
                    ['Игорь П.', 'Skoda Octavia', 3, 'Работу выполнили, но пришлось немного подождать. Специалист подробно ответил на вопросы.', '/images/autocare/avatars/igor.webp'],
                    ['Ольга Н.', 'Volkswagen Tiguan', 2, 'Цена оказалась выше ожиданий, зато сервис оперативно объяснил состав работ и предложил решение.', null],
                ] as const

                for (const [authorName, vehicleLabel, rating, text, avatarUrl] of reviewFixtures) {
                    const existingReview = await reviewRepository.findOneBy({ providerId: provider.id, authorName, vehicleLabel })
                    await reviewRepository.save(reviewRepository.create({
                        ...existingReview,
                        providerId: provider.id,
                        authorName,
                        vehicleLabel,
                        rating,
                        text,
                        avatarUrl,
                        status: AutomotiveReviewStatus.Approved,
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
