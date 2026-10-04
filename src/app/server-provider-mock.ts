// Synthetic server-rendered profiles are loaded only by explicit mock builds.
import { automotiveServices } from '@/entities/automotive-service/model/autocareServiceCatalog'
import { providerPreviews } from '@/entities/automotive-service/model/autocareMockProviders'

export function getMockPublicProvider(providerId: string): unknown | null {
    const provider = providerPreviews.find((item) => `api-${item.id}` === providerId || item.id === providerId)
    if (!provider) return null

    const serviceIds = provider.serviceIds ?? automotiveServices.map((service) => service.id)
    const offers = serviceIds.map((serviceId) => {
        const service = automotiveServices.find((item) => item.id === serviceId)
        const price = provider.servicePrices?.[serviceId] ?? provider.price
        return {
            id: `offer-api-${provider.id}-${serviceId}`,
            serviceDefinitionId: serviceId,
            serviceSlug: serviceId,
            serviceLabels: service?.labels ?? {},
            description: service?.labels.ru ? `Работы по услуге «${service.labels.ru}» с предварительной оценкой и фотоотчётом.` : null,
            priceFromMinor: price * 100,
            priceToMinor: null,
            currencyCode: 'RUB',
            durationMinutes: 60,
            inclusions: ['Предварительная оценка', 'Фотоотчёт по запросу'],
            warrantyText: 'Гарантия на работы по условиям сервиса',
            active: true,
            priceType: 'from',
        }
    })

    return {
        id: `api-${provider.id}`,
        name: provider.name,
        description: 'Проверенный сервис с понятными ценами, фотоотчётом и гарантией на выполненные работы.',
        status: 'active',
        verified: provider.verified,
        yearsActive: provider.id === 'proservice-moscow' ? 8 : 5,
        staffCount: provider.id === 'proservice-moscow' ? 24 : 12,
        rating: provider.rating,
        reviewCount: provider.reviewCount,
        bonusSummary: provider.bonus ?? null,
        phone: '+7 (495) 645-35-35',
        phones: ['+7 (495) 645-35-35'],
        email: 'service@example.com',
        websiteUrl: null,
        metroStation: 'м. Парк культуры',
        workstationCount: provider.id === 'proservice-moscow' ? 12 : 8,
        teamSize: provider.id === 'formula-moscow' ? 'solo' : 'team',
        businessType: provider.id === 'formula-moscow' ? 'private_master' : 'company',
        chatEnabled: provider.id !== 'formula-moscow',
        communicationMode: provider.id === 'formula-moscow' ? 'phone_only' : provider.id === 'autolux-moscow' ? 'request_then_confirm' : 'online',
        responseWindowMinutes: provider.id === 'formula-moscow' ? null : provider.id === 'autolux-moscow' ? 240 : 120,
        responseHours: 'working_hours',
        phoneBookingEnabled: true,
        callbackEnabled: true,
        requestPhotosEnabled: provider.id !== 'formula-moscow',
        publicContactNote: provider.id === 'formula-moscow' ? 'Небольшая команда: принимаем записи по телефону.' : null,
        warrantyText: 'Гарантия на работы 12 месяцев',
        logoUrl: provider.logoUrl ?? null,
        brandSpecializations: [...provider.brandSpecializations],
        isMultibrand: provider.isMultibrand,
        coverImageUrl: provider.image ?? null,
        galleryImageUrls: provider.image ? [provider.image] : [],
        amenityIds: ['waiting_room', 'customer_parking', 'wifi', 'online_booking', 'coffee'],
        location: {
            id: `location-${provider.id}`,
            marketId: 'market-moscow',
            address: provider.id === 'proservice-moscow' ? 'Москва, ул. Льва Толстого, 18' : 'Москва, Комсомольский пр-т, 45',
            zoneId: null,
            hours: 'Пн–Вс: 08:00–21:00',
            timezone: 'Europe/Moscow',
            appointmentCapacity: provider.id === 'formula-moscow' ? 1 : 6,
            weeklySchedule: Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri'].map((day) => [day, { open: '08:00', close: '21:00', closed: false }]).concat([['sat', { open: '09:00', close: '18:00', closed: false }], ['sun', { open: '09:00', close: '18:00', closed: false }]])),
            blackoutDates: [],
            latitude: provider.mapPosition?.[0] ?? 55.75,
            longitude: provider.mapPosition?.[1] ?? 37.61,
        },
        offers,
    }
}
