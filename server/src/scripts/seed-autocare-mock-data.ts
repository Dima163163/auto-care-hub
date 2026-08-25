import { AppDataSource } from '../database/data-source.js'
import { IsNull } from 'typeorm'
import {
    AutomotiveMarketEntity,
    AutomotiveLocationZoneEntity,
    AutomotiveProviderEntity,
    AutomotiveProviderMembershipEntity,
    AutomotiveProviderMembershipRole,
    AutomotiveProviderMembershipStatus,
    AutomotiveProviderStatus,
    AutomotiveReviewEntity,
    AutomotiveReviewStatus,
    AutomotiveServiceDefinitionEntity,
    AutomotiveServiceLocationEntity,
    AutomotiveServiceOfferingEntity,
    AutomotivePriceType,
    AutoCarePriceBenchmarkEntity,
    AutoCareTrustEvidenceEntity,
} from '../entities/index.js'
import { UserEntity } from '../entities/user/user.entity.js'
import {
    AUTOMOTIVE_MOCK_LOCATION_ZONES,
    AUTOMOTIVE_MOCK_MARKETS,
    AUTOMOTIVE_MOCK_MARKET,
    AUTOMOTIVE_MOCK_PROVIDERS,
    AUTOMOTIVE_MOCK_SERVICES,
    AUTOCARE_MOCK_FALLBACK_IMAGE,
    resolveMockAssetUrl,
} from '../modules/autocare/autocare-mock-catalog.js'
import { DEMO_USERS } from './demo-fixtures.js'

async function seedAutoCareMockData() {
    await AppDataSource.initialize()

    try {
        await AppDataSource.transaction(async (manager) => {
            const marketRepository = manager.getRepository(AutomotiveMarketEntity)
            const zoneRepository = manager.getRepository(AutomotiveLocationZoneEntity)
            const definitionRepository = manager.getRepository(AutomotiveServiceDefinitionEntity)
            const providerRepository = manager.getRepository(AutomotiveProviderEntity)
            const membershipRepository = manager.getRepository(AutomotiveProviderMembershipEntity)
            const demoOwner = await manager.getRepository(UserEntity).findOneBy({ email: DEMO_USERS.owner.email })
            if (!demoOwner) throw new Error('Demo owner must be seeded before AutoCare mock data.')
            const locationRepository = manager.getRepository(AutomotiveServiceLocationEntity)
            const offeringRepository = manager.getRepository(AutomotiveServiceOfferingEntity)
            const reviewRepository = manager.getRepository(AutomotiveReviewEntity)
            const benchmarkRepository = manager.getRepository(AutoCarePriceBenchmarkEntity)
            const trustEvidenceRepository = manager.getRepository(AutoCareTrustEvidenceEntity)

            const markets = new Map<string, AutomotiveMarketEntity>()
            for (const marketInput of AUTOMOTIVE_MOCK_MARKETS) {
                const existingMarket = await marketRepository.findOneBy({ countryCode: marketInput.countryCode, cityCode: marketInput.cityCode })
                const market = marketRepository.create({ ...existingMarket, ...marketInput, supportedLocales: [...marketInput.supportedLocales] })
                markets.set(marketInput.cityCode, await marketRepository.save(market))
            }
            const zoneIdsByMarket = new Map<string, Map<string, string>>()
            for (const zoneInput of AUTOMOTIVE_MOCK_LOCATION_ZONES) {
                const zoneMarket = markets.get(zoneInput.marketCode)
                if (!zoneMarket) continue
                const existingZone = await zoneRepository.findOneBy({ marketId: zoneMarket.id, slug: zoneInput.slug })
                const zone = await zoneRepository.save(zoneRepository.create({
                    ...existingZone,
                    marketId: zoneMarket.id,
                    parentId: null,
                    slug: zoneInput.slug,
                    zoneType: zoneInput.zoneType,
                    names: zoneInput.names,
                    centerLatitude: zoneInput.centerLatitude,
                    centerLongitude: zoneInput.centerLongitude,
                    radiusKm: zoneInput.radiusKm,
                    imageUrl: zoneInput.imageUrl ?? null,
                    displayOrder: zoneInput.displayOrder,
                    active: true,
                }))
                const marketZones = zoneIdsByMarket.get(zoneMarket.id) ?? new Map<string, string>()
                marketZones.set(zone.slug, zone.id)
                zoneIdsByMarket.set(zoneMarket.id, marketZones)
            }
            const market = markets.get(AUTOMOTIVE_MOCK_MARKET.cityCode)
            if (!market) throw new Error('Primary AutoCare mock market was not seeded.')
            const marketZones = zoneIdsByMarket.get(market.id) ?? new Map<string, string>()
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
                    // Keep the seeded ProService usable in the real-mode pilot. We only
                    // claim an unowned demo provider; an existing real owner is never
                    // replaced by a seed rerun.
                    ownerId: input.name === 'ProService' && (!existing?.ownerId || existing.ownerId === demoOwner.id)
                        ? demoOwner.id
                        : existing?.ownerId ?? null,
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
                    trustScore: input.verified ? 91.5 : 78.2,
                    trustBadge: input.verified ? 'Надёжный сервис' : null,
                    trustReassessedAt: new Date(),
                }))

                const existingLocation = await locationRepository.findOneBy({ providerId: provider.id, marketId: market.id })
                const location = await locationRepository.save(locationRepository.create({
                    ...existingLocation,
                    providerId: provider.id,
                    marketId: market.id,
                    zoneId: input.zoneSlug ? (marketZones.get(input.zoneSlug) ?? null) : null,
                    address: input.address,
                    hours: input.hours,
                    latitude: input.latitude,
                    longitude: input.longitude,
                    supportsMobile: input.amenityIds.includes('pickup_delivery'),
                    supportsPickup: input.amenityIds.includes('pickup_delivery'),
                    coverageRadiusKm: input.amenityIds.includes('pickup_delivery') ? 15 : null,
                    dispatchBasePriceMinor: input.amenityIds.includes('pickup_delivery') ? 50000 : 0,
                    etaMinutes: input.amenityIds.includes('pickup_delivery') ? 60 : null,
                }))

                if (input.name === 'ProService' && provider.ownerId === demoOwner.id) {
                    const existingMembership = await membershipRepository.findOneBy({
                        providerId: provider.id,
                        userId: demoOwner.id,
                        locationId: IsNull(),
                    })
                    await membershipRepository.save(membershipRepository.create({
                        ...existingMembership,
                        providerId: provider.id,
                        userId: demoOwner.id,
                        locationId: null,
                        role: AutomotiveProviderMembershipRole.Owner,
                        status: AutomotiveProviderMembershipStatus.Active,
                    }))
                }

                const evidenceFixtures = [
                    ['profile', 'Данные компании подтверждены', input.verified ? 'verified' : 'pending'],
                    ['quality_review', 'Проверка качества и отзывов', input.verified ? 'verified' : 'pending'],
                ] as const
                for (const [kind, label, status] of evidenceFixtures) {
                    const existingEvidence = await trustEvidenceRepository.findOneBy({ providerId: provider.id, kind, label })
                    await trustEvidenceRepository.save(trustEvidenceRepository.create({
                        ...existingEvidence,
                        providerId: provider.id,
                        kind,
                        label,
                        status,
                        expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
                        reference: `seed:${provider.id}:${kind}`,
                        notes: status === 'verified' ? 'Проверено модератором в демо-каталоге.' : 'Ожидает проверки документов.',
                        verifiedAt: status === 'verified' ? new Date() : null,
                    }))
                }

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
                        verifiedVisit: true,
                        status: AutomotiveReviewStatus.Approved,
                    }))
                }
            }

            for (const definition of definitions.values()) {
                const offerings = await offeringRepository.find({ where: { definitionId: definition.id, active: true } })
                if (offerings.length === 0) continue
                const prices = offerings.map((offering) => offering.priceFromMinor).sort((left, right) => left - right)
                const existingBenchmark = await benchmarkRepository.findOneBy({ marketId: market.id, serviceDefinitionId: definition.id, makeId: IsNull(), modelId: IsNull() })
                await benchmarkRepository.save(benchmarkRepository.create({
                    ...existingBenchmark,
                    marketId: market.id,
                    serviceDefinitionId: definition.id,
                    makeId: null,
                    modelId: null,
                    fuelType: null,
                    engineLiters: null,
                    minPriceMinor: prices[0]!,
                    medianPriceMinor: prices[Math.floor(prices.length / 2)]!,
                    maxPriceMinor: prices.at(-1)!,
                    currencyCode: AUTOMOTIVE_MOCK_MARKET.currencyCode,
                    methodology: { kind: 'seeded-provider-sample', sampleSize: offerings.length, includes: ['parts', 'labour'], disclaimer: 'Ориентир, не финальная смета.' },
                    source: 'autocare-demo-seed',
                    active: true,
                }))
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
