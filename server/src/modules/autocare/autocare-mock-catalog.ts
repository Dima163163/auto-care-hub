import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { AutomotiveLocationZoneType, AutomotivePriceType, AutomotiveProviderStatus } from '../../entities/automotive/automotive.entity.js'

export const AUTOCARE_MOCK_FALLBACK_IMAGE = '/images/autocare/placeholders/provider.svg'

export type AutomotiveMockProvider = {
    key: string
    name: string
    description: string
    verified: boolean
    yearsActive: number
    staffCount: number
    rating: number
    reviewCount: number
    bonusSummary?: string | null
    imageUrl?: string | null
    logoUrl?: string | null
    galleryImageUrls?: string[]
    amenityIds: string[]
    brandSpecializations: string[]
    isMultibrand: boolean
    address: string
    hours: string
    latitude: number
    longitude: number
    zoneSlug?: string
    offerings: Array<{ serviceSlug: string; priceFromMinor: number; durationMinutes: number }>
}

export const AUTOMOTIVE_MOCK_MARKET = {
    countryCode: 'RU',
    countryName: 'Россия',
    cityCode: 'moscow',
    cityName: 'Москва',
    regionCode: 'moscow',
    regionName: 'Москва',
    centerLatitude: 55.7558,
    centerLongitude: 37.6173,
    currencyCode: 'RUB',
    defaultLocale: 'ru',
    supportedLocales: ['ru', 'en', 'es', 'ro'],
    timezone: 'Europe/Moscow',
    launchReady: true,
}

export const AUTOMOTIVE_MOCK_MARKETS = [
    AUTOMOTIVE_MOCK_MARKET,
    { countryCode: 'RU', countryName: 'Россия', cityCode: 'samara', cityName: 'Самара', regionCode: 'samara-oblast', regionName: 'Самарская область', centerLatitude: 53.1959, centerLongitude: 50.1002, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Europe/Samara', launchReady: true },
    { countryCode: 'RU', countryName: 'Россия', cityCode: 'saint-petersburg', cityName: 'Санкт-Петербург', regionCode: 'leningrad-oblast', regionName: 'Ленинградская область', centerLatitude: 59.9343, centerLongitude: 30.3351, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Europe/Moscow', launchReady: true },
    { countryCode: 'RU', countryName: 'Россия', cityCode: 'kazan', cityName: 'Казань', regionCode: 'tatarstan', regionName: 'Республика Татарстан', centerLatitude: 55.7879, centerLongitude: 49.1233, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Europe/Moscow', launchReady: true },
    { countryCode: 'RU', countryName: 'Россия', cityCode: 'novosibirsk', cityName: 'Новосибирск', regionCode: 'novosibirsk-oblast', regionName: 'Новосибирская область', centerLatitude: 55.0084, centerLongitude: 82.9357, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Asia/Novosibirsk', launchReady: true },
    { countryCode: 'ES', countryName: 'Испания', cityCode: 'madrid', cityName: 'Мадрид', regionCode: 'madrid', regionName: 'Мадрид', centerLatitude: 40.4168, centerLongitude: -3.7038, currencyCode: 'EUR', defaultLocale: 'es', supportedLocales: ['es', 'en', 'ru'], timezone: 'Europe/Madrid', launchReady: true },
    { countryCode: 'ES', countryName: 'Испания', cityCode: 'barcelona', cityName: 'Барселона', regionCode: 'catalonia', regionName: 'Каталония', centerLatitude: 41.3874, centerLongitude: 2.1686, currencyCode: 'EUR', defaultLocale: 'es', supportedLocales: ['es', 'en', 'ru'], timezone: 'Europe/Madrid', launchReady: true },
    { countryCode: 'ES', countryName: 'Испания', cityCode: 'valencia', cityName: 'Валенсия', regionCode: 'valencian-community', regionName: 'Валенсийское сообщество', centerLatitude: 39.4699, centerLongitude: -0.3763, currencyCode: 'EUR', defaultLocale: 'es', supportedLocales: ['es', 'en', 'ru'], timezone: 'Europe/Madrid', launchReady: true },
    { countryCode: 'MD', countryName: 'Молдова', cityCode: 'chisinau', cityName: 'Кишинёв', regionCode: 'chisinau', regionName: 'Муниципий Кишинёв', centerLatitude: 47.0105, centerLongitude: 28.8638, currencyCode: 'MDL', defaultLocale: 'ro', supportedLocales: ['ro', 'ru', 'en'], timezone: 'Europe/Chisinau', launchReady: true },
    { countryCode: 'MD', countryName: 'Молдова / Приднестровье', cityCode: 'tiraspol', cityName: 'Тирасполь', regionCode: 'transnistria', regionName: 'Приднестровье', centerLatitude: 46.8403, centerLongitude: 29.6433, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'ro', 'en'], timezone: 'Europe/Chisinau', launchReady: true },
] as const

export type AutomotiveMockLocationZone = {
    marketCode: string
    slug: string
    zoneType: AutomotiveLocationZoneType
    names: Record<string, string>
    centerLatitude: number
    centerLongitude: number
    radiusKm: number
    imageUrl?: string | null
    displayOrder: number
}

const cityZones = (marketCode: string, cityName: string, latitude: number, longitude: number, imagePrefix?: string): AutomotiveMockLocationZone[] => [
    { marketCode, slug: 'central', zoneType: AutomotiveLocationZoneType.District, names: { ru: `Центр ${cityName}`, en: `${cityName} centre`, es: `Centro de ${cityName}` }, centerLatitude: latitude, centerLongitude: longitude, radiusKm: 5, imageUrl: imagePrefix === 'moscow' ? '/images/autocare/locations/center.webp' : null, displayOrder: 1 },
    { marketCode, slug: 'north', zoneType: AutomotiveLocationZoneType.District, names: { ru: 'Северный район', en: 'North district', es: 'Zona norte' }, centerLatitude: latitude + 0.035, centerLongitude: longitude, radiusKm: 6, imageUrl: imagePrefix === 'moscow' ? '/images/autocare/locations/north-west.webp' : null, displayOrder: 2 },
    { marketCode, slug: 'south', zoneType: AutomotiveLocationZoneType.District, names: { ru: 'Южный район', en: 'South district', es: 'Zona sur' }, centerLatitude: latitude - 0.035, centerLongitude: longitude, radiusKm: 6, imageUrl: imagePrefix === 'moscow' ? '/images/autocare/locations/south-west.webp' : null, displayOrder: 3 },
    { marketCode, slug: 'east', zoneType: AutomotiveLocationZoneType.ServiceArea, names: { ru: 'Восточная агломерация', en: 'East service area', es: 'Área este' }, centerLatitude: latitude, centerLongitude: longitude + 0.05, radiusKm: 8, imageUrl: imagePrefix === 'moscow' ? '/images/autocare/locations/east.webp' : null, displayOrder: 4 },
]

export const AUTOMOTIVE_MOCK_LOCATION_ZONES: readonly AutomotiveMockLocationZone[] = [
    ...cityZones('moscow', 'Москвы', 55.7558, 37.6173, 'moscow'),
    ...cityZones('samara', 'Самары', 53.1959, 50.1002),
    ...cityZones('saint-petersburg', 'Санкт-Петербурга', 59.9343, 30.3351),
    ...cityZones('kazan', 'Казани', 55.7879, 49.1233),
    ...cityZones('novosibirsk', 'Новосибирска', 55.0084, 82.9357),
    ...cityZones('madrid', 'Мадрида', 40.4168, -3.7038),
    ...cityZones('barcelona', 'Барселоны', 41.3874, 2.1686),
    ...cityZones('valencia', 'Валенсии', 39.4699, -0.3763),
    ...cityZones('chisinau', 'Кишинёва', 47.0105, 28.8638),
    ...cityZones('tiraspol', 'Тирасполя', 46.8403, 29.6433),
]

export const AUTOMOTIVE_MOCK_SERVICES = [
    { slug: 'oil-change', categorySlug: 'maintenance', labels: { ru: 'Замена масла', en: 'Oil change', es: 'Cambio de aceite', ro: 'Schimb ulei' } },
    { slug: 'tire-service', categorySlug: 'tires', labels: { ru: 'Шиномонтаж', en: 'Tire service', es: 'Neumáticos', ro: 'Anvelope' } },
    { slug: 'diagnostics', categorySlug: 'diagnostics', labels: { ru: 'Диагностика', en: 'Diagnostics', es: 'Diagnóstico', ro: 'Diagnoză' } },
    { slug: 'brakes', categorySlug: 'brakes', labels: { ru: 'Тормозная система', en: 'Brakes', es: 'Frenos', ro: 'Frâne' } },
    { slug: 'detailing', categorySlug: 'detailing', labels: { ru: 'Детейлинг', en: 'Detailing', es: 'Detallado', ro: 'Detailing' } },
    { slug: 'body-paint', categorySlug: 'body', labels: { ru: 'Кузов и покраска', en: 'Body & paint', es: 'Carrocería y pintura', ro: 'Caroserie și vopsire' } },
    { slug: 'air-conditioning', categorySlug: 'climate', labels: { ru: 'Кондиционер', en: 'Air conditioning', es: 'Aire acondicionado', ro: 'Aer condiționat' } },
    { slug: 'maintenance', categorySlug: 'maintenance', labels: { ru: 'Техническое обслуживание', en: 'Maintenance', es: 'Mantenimiento', ro: 'Întreținere' } },
    { slug: 'engine', categorySlug: 'engine', labels: { ru: 'Двигатель', en: 'Engine', es: 'Motor', ro: 'Motor' } },
    { slug: 'suspension', categorySlug: 'suspension', labels: { ru: 'Подвеска', en: 'Suspension', es: 'Suspensión', ro: 'Suspensie' } },
    { slug: 'electric', categorySlug: 'electric', labels: { ru: 'Электрика', en: 'Auto electrician', es: 'Electricidad del auto', ro: 'Electrică auto' } },
    { slug: 'tow-truck', categorySlug: 'roadside', labels: { ru: 'Эвакуатор', en: 'Tow truck', es: 'Grúa', ro: 'Evacuator' } },
    { slug: 'mobile-diagnostics', categorySlug: 'diagnostics', labels: { ru: 'Выездная диагностика', en: 'Mobile diagnostics', es: 'Diagnóstico móvil', ro: 'Diagnoză mobilă' } },
    { slug: 'roadside-assistance', categorySlug: 'roadside', labels: { ru: 'Помощь на дороге', en: 'Roadside assistance', es: 'Asistencia en carretera', ro: 'Asistență rutieră' } },
    { slug: 'battery-service', categorySlug: 'electrics', labels: { ru: 'Аккумулятор и запуск', en: 'Battery and jump start', es: 'Batería y arranque', ro: 'Baterie și pornire' } },
    { slug: 'wheel-alignment', categorySlug: 'tires', labels: { ru: 'Сход-развал', en: 'Wheel alignment', es: 'Alineación de ruedas', ro: 'Geometrie roți' } },
    { slug: 'car-wash', categorySlug: 'wash', labels: { ru: 'Автомойка', en: 'Car wash', es: 'Lavado de coche', ro: 'Spălătorie auto' } },
    { slug: 'windshield-repair', categorySlug: 'body', labels: { ru: 'Ремонт стекол', en: 'Glass repair', es: 'Reparación de lunas', ro: 'Reparații parbriz' } },
] as const satisfies ReadonlyArray<{ slug: string; categorySlug: string; labels: Record<string, string> }>

export const AUTOMOTIVE_MOCK_PROVIDERS: readonly AutomotiveMockProvider[] = [
    {
        key: 'proservice-moscow', name: 'ProService', description: 'Проверенный сервис с фотоотчётом и гарантией на выполненные работы.', verified: true,
        logoUrl: '/images/autocare/providers/logos/proservice.svg',
        yearsActive: 8, staffCount: 24, rating: 4.7, reviewCount: 256, bonusSummary: '5% back', imageUrl: '/images/autocare/providers/proservice.webp', galleryImageUrls: ['/images/autocare/providers/proservice.webp'],
        amenityIds: ['waiting_room', 'customer_parking', 'wifi', 'online_booking', 'coffee', 'card_payment'],
        address: 'Москва, ул. Льва Толстого, 18', hours: 'Пн–Вс: 08:00–21:00', latitude: 55.7337, longitude: 37.5876, zoneSlug: 'central',
        brandSpecializations: ['bmw', 'mercedes-benz', 'audi'], isMultibrand: false,
        offerings: [
            { serviceSlug: 'oil-change', priceFromMinor: 290000, durationMinutes: 60 }, { serviceSlug: 'diagnostics', priceFromMinor: 120000, durationMinutes: 60 }, { serviceSlug: 'brakes', priceFromMinor: 350000, durationMinutes: 90 },
            { serviceSlug: 'mobile-diagnostics', priceFromMinor: 180000, durationMinutes: 90 }, { serviceSlug: 'electric', priceFromMinor: 260000, durationMinutes: 120 }, { serviceSlug: 'battery-service', priceFromMinor: 190000, durationMinutes: 60 }, { serviceSlug: 'wheel-alignment', priceFromMinor: 280000, durationMinutes: 60 },
        ],
    },
    {
        key: 'autolux-moscow', name: 'AutoLux', description: 'Диагностика, обслуживание и кузовные работы в одном месте.', verified: true,
        logoUrl: '/images/autocare/providers/logos/autolux.svg',
        yearsActive: 5, staffCount: 12, rating: 4.9, reviewCount: 412, imageUrl: '/images/autocare/providers/detailing.webp', galleryImageUrls: ['/images/autocare/providers/detailing.webp'],
        amenityIds: ['waiting_room', 'customer_parking', 'wifi', 'online_booking', 'card_payment', 'electric_charging'],
        address: 'Москва, Комсомольский пр-т, 45', hours: 'Пн–Вс: 09:00–22:00', latitude: 55.7104, longitude: 37.5838, zoneSlug: 'south',
        brandSpecializations: ['toyota', 'volkswagen', 'skoda'], isMultibrand: false,
        offerings: [
            { serviceSlug: 'oil-change', priceFromMinor: 320000, durationMinutes: 60 }, { serviceSlug: 'detailing', priceFromMinor: 650000, durationMinutes: 180 },
            { serviceSlug: 'car-wash', priceFromMinor: 120000, durationMinutes: 45 }, { serviceSlug: 'windshield-repair', priceFromMinor: 540000, durationMinutes: 180 }, { serviceSlug: 'tow-truck', priceFromMinor: 350000, durationMinutes: 60 },
        ],
    },
    {
        key: 'formula-moscow', name: 'Formula Motion', description: 'Сервис для планового обслуживания, шин и сложной диагностики.', verified: false,
        yearsActive: 4, staffCount: 10, rating: 4.6, reviewCount: 189, bonusSummary: 'Free check',
        amenityIds: ['waiting_room', 'wifi', 'coffee', 'card_payment', 'pickup_delivery'],
        address: 'Москва, ул. Плющиха, 10', hours: 'Пн–Сб: 08:00–20:00', latitude: 55.7361, longitude: 37.5747, zoneSlug: 'central',
        brandSpecializations: [], isMultibrand: true,
        offerings: [
            { serviceSlug: 'oil-change', priceFromMinor: 280000, durationMinutes: 45 }, { serviceSlug: 'body-paint', priceFromMinor: 1500000, durationMinutes: 360 },
            { serviceSlug: 'roadside-assistance', priceFromMinor: 220000, durationMinutes: 60 }, { serviceSlug: 'engine', priceFromMinor: 620000, durationMinutes: 240 }, { serviceSlug: 'suspension', priceFromMinor: 380000, durationMinutes: 120 },
        ],
    },
] as const

export function resolveMockAssetUrl(imageUrl: string | null | undefined, publicRoot = resolve(process.cwd(), '../public')) {
    const candidate = imageUrl?.trim()
    if (!candidate || !candidate.startsWith('/')) {
        return AUTOCARE_MOCK_FALLBACK_IMAGE
    }

    const assetPath = resolve(publicRoot, `.${candidate}`)
    const normalizedRoot = resolve(publicRoot)
    const isInsidePublicRoot = assetPath === normalizedRoot || assetPath.startsWith(`${normalizedRoot}/`)

    return isInsidePublicRoot && existsSync(assetPath) ? candidate : AUTOCARE_MOCK_FALLBACK_IMAGE
}

export const AUTOCARE_MOCK_PRICE_TYPE = AutomotivePriceType.From
export const AUTOCARE_MOCK_PROVIDER_STATUS = AutomotiveProviderStatus.Active
