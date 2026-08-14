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
                        description: `${definition.labels.ru ?? definition.slug}: предварительная оценка и фотоотчёт по запросу.`,
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
                    ['Алексей С.', 'BMW X5', 5, 'Быстро приняли машину, заранее объяснили стоимость и прислали понятный фотоотчёт.', '/images/autocare/avatars/alexey.webp', ['/images/autocare/providers/generated/review-oil-change.webp']],
                    ['Мария К.', 'Toyota RAV4', 4, 'Удобная запись и внимательный мастер. Итоговая цена совпала с предварительной оценкой.', '/images/autocare/avatars/maria.webp', ['/images/autocare/providers/generated/review-detailing.webp']],
                    ['Игорь П.', 'Skoda Octavia', 3, 'Работу выполнили, но пришлось немного подождать. Специалист подробно ответил на вопросы.', '/images/autocare/avatars/igor.webp', ['/images/autocare/providers/generated/review-tire-service.webp']],
                    ['Ольга Н.', 'Volkswagen Tiguan', 2, 'Цена оказалась выше ожиданий, зато сервис оперативно объяснил состав работ и предложил решение.', null, []],
                    ['Сергей В.', 'Kia Sportage', 5, 'Колёса заменили аккуратно, давление проверили, а фотографии результата прислали в чате.', null, ['/images/autocare/providers/generated/review-tire-service.webp', '/images/autocare/providers/generated/review-oil-change.webp']],
                    ['Елена Р.', 'Hyundai Tucson', 4, 'Мастер подробно показал повреждение и согласовал этапы ремонта до начала работы.', null, ['/images/autocare/providers/generated/review-body-repair.webp']],
                    ['Дмитрий Л.', 'Ford Focus', 1, 'Пришлось долго ждать ответа, а итоговую стоимость объяснили уже после выполнения работ.', null, []],
                    ['Наталья А.', 'Mazda CX-5', 5, 'Очень чисто отполировали кузов, вернули машину вовремя и учли все пожелания.', null, ['/images/autocare/providers/generated/review-detailing.webp']],
                    ['Андрей К.', 'Volvo XC60', 4, 'Хорошая диагностика и понятное объяснение рекомендаций. Фото деталей пригодились для отчёта.', null, ['/images/autocare/providers/generated/review-oil-change.webp']],
                    ['Виктор М.', 'Honda CR-V', 3, 'Основную проблему нашли, но по срокам вышло дольше, чем обещали при записи.', null, ['/images/autocare/providers/generated/review-body-repair.webp']],
                    ['Полина Т.', 'Renault Duster', 2, 'Работу пришлось перепроверять после визита, сервис принял замечания и исправил результат.', null, ['/images/autocare/providers/generated/review-body-repair.webp']],
                    ['Роман Д.', 'Nissan X-Trail', 5, 'Сервис держал связь на каждом шаге, прислал фотографии и выдал автомобиль без задержек.', null, ['/images/autocare/providers/generated/review-detailing.webp', '/images/autocare/providers/generated/review-tire-service.webp']],
                ] as const

                for (const [authorName, vehicleLabel, rating, text, avatarUrl, photoUrls] of reviewFixtures) {
                    const existingReview = await reviewRepository.findOneBy({ providerId: provider.id, authorName, vehicleLabel })
                    await reviewRepository.save(reviewRepository.create({
                        ...existingReview,
                        providerId: provider.id,
                        authorName,
                        vehicleLabel,
                        rating,
                        text,
                        avatarUrl,
                        photoUrls: [...photoUrls],
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
