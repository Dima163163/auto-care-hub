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
    { countryCode: 'RU', countryName: 'Россия', cityCode: 'kaliningrad', cityName: 'Калининград', regionCode: 'kaliningrad-oblast', regionName: 'Калининградская область', centerLatitude: 54.7104, centerLongitude: 20.4522, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Europe/Kaliningrad', launchReady: true },
    { countryCode: 'RU', countryName: 'Россия', cityCode: 'saint-petersburg', cityName: 'Санкт-Петербург', regionCode: 'leningrad-oblast', regionName: 'Ленинградская область', centerLatitude: 59.9343, centerLongitude: 30.3351, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Europe/Moscow', launchReady: true },
    { countryCode: 'RU', countryName: 'Россия', cityCode: 'kazan', cityName: 'Казань', regionCode: 'tatarstan', regionName: 'Республика Татарстан', centerLatitude: 55.7879, centerLongitude: 49.1233, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Europe/Moscow', launchReady: true },
    { countryCode: 'RU', countryName: 'Россия', cityCode: 'novosibirsk', cityName: 'Новосибирск', regionCode: 'novosibirsk-oblast', regionName: 'Новосибирская область', centerLatitude: 55.0084, centerLongitude: 82.9357, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Asia/Novosibirsk', launchReady: true },
    { countryCode: 'ES', countryName: 'Испания', cityCode: 'madrid', cityName: 'Мадрид', regionCode: 'madrid', regionName: 'Мадрид', centerLatitude: 40.4168, centerLongitude: -3.7038, currencyCode: 'EUR', defaultLocale: 'es', supportedLocales: ['es', 'en', 'ru'], timezone: 'Europe/Madrid', launchReady: true },
    { countryCode: 'ES', countryName: 'Испания', cityCode: 'barcelona', cityName: 'Барселона', regionCode: 'catalonia', regionName: 'Каталония', centerLatitude: 41.3874, centerLongitude: 2.1686, currencyCode: 'EUR', defaultLocale: 'es', supportedLocales: ['es', 'en', 'ru'], timezone: 'Europe/Madrid', launchReady: true },
    { countryCode: 'ES', countryName: 'Испания', cityCode: 'valencia', cityName: 'Валенсия', regionCode: 'valencian-community', regionName: 'Валенсийское сообщество', centerLatitude: 39.4699, centerLongitude: -0.3763, currencyCode: 'EUR', defaultLocale: 'es', supportedLocales: ['es', 'en', 'ru'], timezone: 'Europe/Madrid', launchReady: true },
    { countryCode: 'MD', countryName: 'Молдова', cityCode: 'chisinau', cityName: 'Кишинёв', regionCode: 'chisinau', regionName: 'Муниципий Кишинёв', centerLatitude: 47.0105, centerLongitude: 28.8638, currencyCode: 'MDL', defaultLocale: 'ro', supportedLocales: ['ro', 'ru', 'en'], timezone: 'Europe/Chisinau', launchReady: true },
    { countryCode: 'MD', countryName: 'Молдова / Приднестровье', cityCode: 'tiraspol', cityName: 'Тирасполь', regionCode: 'transnistria', regionName: 'Приднестровье', centerLatitude: 46.8403, centerLongitude: 29.6433, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'ro', 'en'], timezone: 'Europe/Chisinau', launchReady: true },
    { countryCode: 'MD', countryName: 'Молдова / Приднестровье', cityCode: 'bender', cityName: 'Бендеры', regionCode: 'transnistria', regionName: 'Приднестровье', centerLatitude: 46.8316, centerLongitude: 29.4777, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'ro', 'en'], timezone: 'Europe/Chisinau', launchReady: true },
    { countryCode: 'MD', countryName: 'Молдова / Приднестровье', cityCode: 'rybnitsa', cityName: 'Рыбница', regionCode: 'transnistria', regionName: 'Приднестровье', centerLatitude: 47.7681, centerLongitude: 29.0044, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'ro', 'en'], timezone: 'Europe/Chisinau', launchReady: true },
    { countryCode: 'MD', countryName: 'Молдова / Приднестровье', cityCode: 'dubossary', cityName: 'Дубоссары', regionCode: 'transnistria', regionName: 'Приднестровье', centerLatitude: 47.2656, centerLongitude: 29.1667, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'ro', 'en'], timezone: 'Europe/Chisinau', launchReady: true },
    { countryCode: 'MD', countryName: 'Молдова / Приднестровье', cityCode: 'slobodzeya', cityName: 'Слободзея', regionCode: 'transnistria', regionName: 'Приднестровье', centerLatitude: 46.7281, centerLongitude: 29.7117, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'ro', 'en'], timezone: 'Europe/Chisinau', launchReady: true },
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

const namedCityZones = (
    marketCode: string,
    zones: Array<Omit<AutomotiveMockLocationZone, 'marketCode' | 'displayOrder'>>,
): AutomotiveMockLocationZone[] => zones.map((zone, index) => ({
    ...zone,
    marketCode,
    names: {
        ...zone.names,
        es: zone.names.es ?? zone.names.en ?? zone.names.ru ?? '',
        ro: zone.names.ro ?? zone.names.en ?? zone.names.ru ?? '',
    },
    displayOrder: index + 1,
}))

export const AUTOMOTIVE_MOCK_LOCATION_ZONES: readonly AutomotiveMockLocationZone[] = [
    ...namedCityZones('moscow', [
        { slug: 'central', zoneType: AutomotiveLocationZoneType.District, names: { ru: 'Центр Москвы (ЦАО)', en: 'Central Moscow', es: 'Centro de Moscú' }, centerLatitude: 55.7558, centerLongitude: 37.6173, radiusKm: 5, imageUrl: '/images/autocare/locations/center.webp' },
        { slug: 'north-west', zoneType: AutomotiveLocationZoneType.District, names: { ru: 'Северо-Запад Москвы (СЗАО)', en: 'North-West Moscow', es: 'Noroeste de Moscú' }, centerLatitude: 55.8078, centerLongitude: 37.4353, radiusKm: 8, imageUrl: '/images/autocare/locations/north-west.webp' },
        { slug: 'south-west', zoneType: AutomotiveLocationZoneType.District, names: { ru: 'Юго-Запад Москвы (ЮЗАО)', en: 'South-West Moscow', es: 'Suroeste de Moscú' }, centerLatitude: 55.6623, centerLongitude: 37.5223, radiusKm: 8, imageUrl: '/images/autocare/locations/south-west.webp' },
        { slug: 'east', zoneType: AutomotiveLocationZoneType.District, names: { ru: 'Восток Москвы (ВАО)', en: 'East Moscow', es: 'Este de Moscú' }, centerLatitude: 55.7558, centerLongitude: 37.7673, radiusKm: 9, imageUrl: '/images/autocare/locations/east.webp' },
        { slug: 'north', zoneType: AutomotiveLocationZoneType.District, names: { ru: 'Север Москвы (САО)', en: 'North Moscow', es: 'Norte de Moscú' }, centerLatitude: 55.846, centerLongitude: 37.531, radiusKm: 9 },
        { slug: 'north-east', zoneType: AutomotiveLocationZoneType.District, names: { ru: 'Северо-Восток Москвы (СВАО)', en: 'North-East Moscow', es: 'Noreste de Moscú' }, centerLatitude: 55.84, centerLongitude: 37.65, radiusKm: 9 },
        { slug: 'south-east', zoneType: AutomotiveLocationZoneType.District, names: { ru: 'Юго-Восток Москвы (ЮВАО)', en: 'South-East Moscow', es: 'Sureste de Moscú' }, centerLatitude: 55.69, centerLongitude: 37.77, radiusKm: 9 },
        { slug: 'south', zoneType: AutomotiveLocationZoneType.District, names: { ru: 'Юг Москвы (ЮАО)', en: 'South Moscow', es: 'Sur de Moscú' }, centerLatitude: 55.65, centerLongitude: 37.63, radiusKm: 9 },
        { slug: 'west', zoneType: AutomotiveLocationZoneType.District, names: { ru: 'Запад Москвы (ЗАО)', en: 'West Moscow', es: 'Oeste de Moscú' }, centerLatitude: 55.72, centerLongitude: 37.47, radiusKm: 9 },
        { slug: 'zelenograd', zoneType: AutomotiveLocationZoneType.ServiceArea, names: { ru: 'Зеленоградский округ', en: 'Zelenograd district', es: 'Distrito de Zelenograd' }, centerLatitude: 55.982, centerLongitude: 37.181, radiusKm: 10 },
        { slug: 'troitsk', zoneType: AutomotiveLocationZoneType.ServiceArea, names: { ru: 'Троицкий округ', en: 'Troitsk district', es: 'Distrito de Troitsk' }, centerLatitude: 55.485, centerLongitude: 37.305, radiusKm: 12 },
        { slug: 'novomoskovsk', zoneType: AutomotiveLocationZoneType.ServiceArea, names: { ru: 'Новомосковский округ', en: 'Novomoskovsky district', es: 'Distrito de Novomoskovsky' }, centerLatitude: 55.54, centerLongitude: 37.45, radiusKm: 12 },
    ]),
    ...namedCityZones('samara', [
        { slug: 'oktyabrsky', zoneType: AutomotiveLocationZoneType.District, names: { ru: 'Октябрьский район', en: 'Oktyabrsky district' }, centerLatitude: 53.213, centerLongitude: 50.19, radiusKm: 5 },
        { slug: 'leninsky', zoneType: AutomotiveLocationZoneType.District, names: { ru: 'Ленинский район', en: 'Leninsky district' }, centerLatitude: 53.195, centerLongitude: 50.102, radiusKm: 5 },
        { slug: 'promyshlenny', zoneType: AutomotiveLocationZoneType.District, names: { ru: 'Промышленный район', en: 'Promyshlenny district' }, centerLatitude: 53.221, centerLongitude: 50.22, radiusKm: 8 },
        { slug: 'kirovsky', zoneType: AutomotiveLocationZoneType.District, names: { ru: 'Кировский район', en: 'Kirovsky district' }, centerLatitude: 53.24, centerLongitude: 50.3, radiusKm: 10 },
        { slug: 'sovetsky', zoneType: AutomotiveLocationZoneType.District, names: { ru: 'Советский район', en: 'Sovetsky district' }, centerLatitude: 53.205, centerLongitude: 50.245, radiusKm: 6 },
        { slug: 'zheleznodorozhny', zoneType: AutomotiveLocationZoneType.District, names: { ru: 'Железнодорожный район', en: 'Zheleznodorozhny district' }, centerLatitude: 53.19, centerLongitude: 50.11, radiusKm: 5 },
        { slug: 'samarsky', zoneType: AutomotiveLocationZoneType.District, names: { ru: 'Самарский район', en: 'Samarsky district' }, centerLatitude: 53.18, centerLongitude: 50.095, radiusKm: 5 },
        { slug: 'kuibyshevsky', zoneType: AutomotiveLocationZoneType.District, names: { ru: 'Куйбышевский район', en: 'Kuibyshevsky district' }, centerLatitude: 53.13, centerLongitude: 50.11, radiusKm: 10 },
        { slug: 'krasnoglinsky', zoneType: AutomotiveLocationZoneType.District, names: { ru: 'Красноглинский район', en: 'Krasnoglinsky district' }, centerLatitude: 53.32, centerLongitude: 50.24, radiusKm: 14 },
    ]),
    ...namedCityZones('kaliningrad', [
        { slug: 'central', zoneType: AutomotiveLocationZoneType.District, names: { ru: 'Центральный район', en: 'Central district' }, centerLatitude: 54.715, centerLongitude: 20.5, radiusKm: 5 },
        { slug: 'moskovsky', zoneType: AutomotiveLocationZoneType.District, names: { ru: 'Московский район', en: 'Moskovsky district' }, centerLatitude: 54.69, centerLongitude: 20.5, radiusKm: 7 },
        { slug: 'leningradsky', zoneType: AutomotiveLocationZoneType.District, names: { ru: 'Ленинградский район', en: 'Leningradsky district' }, centerLatitude: 54.735, centerLongitude: 20.55, radiusKm: 7 },
    ]),
    ...namedCityZones('saint-petersburg', [
        { slug: 'central', zoneType: AutomotiveLocationZoneType.District, names: { ru: 'Центральный район', en: 'Central district' }, centerLatitude: 59.9343, centerLongitude: 30.3351, radiusKm: 5 },
        { slug: 'primorsky', zoneType: AutomotiveLocationZoneType.District, names: { ru: 'Приморский район', en: 'Primorsky district' }, centerLatitude: 60.01, centerLongitude: 30.26, radiusKm: 10 },
        { slug: 'moskovsky', zoneType: AutomotiveLocationZoneType.District, names: { ru: 'Московский район', en: 'Moskovsky district' }, centerLatitude: 59.85, centerLongitude: 30.32, radiusKm: 9 },
        { slug: 'vyborgsky', zoneType: AutomotiveLocationZoneType.District, names: { ru: 'Выборгский район', en: 'Vyborgsky district' }, centerLatitude: 60.04, centerLongitude: 30.34, radiusKm: 10 },
        { slug: 'petrogradsky', zoneType: AutomotiveLocationZoneType.District, names: { ru: 'Петроградский район', en: 'Petrogradsky district' }, centerLatitude: 59.965, centerLongitude: 30.3, radiusKm: 5 },
        { slug: 'nevsky', zoneType: AutomotiveLocationZoneType.District, names: { ru: 'Невский район', en: 'Nevsky district' }, centerLatitude: 59.9, centerLongitude: 30.48, radiusKm: 10 },
        { slug: 'kirovsky', zoneType: AutomotiveLocationZoneType.District, names: { ru: 'Кировский район', en: 'Kirovsky district' }, centerLatitude: 59.87, centerLongitude: 30.25, radiusKm: 8 },
        { slug: 'krasnogvardeysky', zoneType: AutomotiveLocationZoneType.District, names: { ru: 'Красногвардейский район', en: 'Krasnogvardeysky district' }, centerLatitude: 59.95, centerLongitude: 30.45, radiusKm: 8 },
    ]),
    ...cityZones('kazan', 'Казани', 55.7879, 49.1233),
    ...cityZones('novosibirsk', 'Новосибирска', 55.0084, 82.9357),
    ...cityZones('madrid', 'Мадрида', 40.4168, -3.7038),
    ...cityZones('barcelona', 'Барселоны', 41.3874, 2.1686),
    ...cityZones('valencia', 'Валенсии', 39.4699, -0.3763),
    ...cityZones('chisinau', 'Кишинёва', 47.0105, 28.8638),
    ...namedCityZones('tiraspol', [
        { slug: 'central', zoneType: AutomotiveLocationZoneType.District, names: { ru: 'Центр Тирасполя', en: 'Central Tiraspol' }, centerLatitude: 46.8403, centerLongitude: 29.6433, radiusKm: 4 },
        { slug: 'western', zoneType: AutomotiveLocationZoneType.Neighborhood, names: { ru: 'Западный микрорайон', en: 'Western neighborhood' }, centerLatitude: 46.845, centerLongitude: 29.6, radiusKm: 5 },
        { slug: 'kirovsky', zoneType: AutomotiveLocationZoneType.Neighborhood, names: { ru: 'Кировский микрорайон', en: 'Kirovsky neighborhood' }, centerLatitude: 46.825, centerLongitude: 29.66, radiusKm: 5 },
        { slug: 'october', zoneType: AutomotiveLocationZoneType.Neighborhood, names: { ru: 'Октябрьский микрорайон', en: 'Oktyabrsky neighborhood' }, centerLatitude: 46.86, centerLongitude: 29.68, radiusKm: 5 },
        { slug: 'balka', zoneType: AutomotiveLocationZoneType.Neighborhood, names: { ru: 'Микрорайон Балка', en: 'Balka neighborhood' }, centerLatitude: 46.815, centerLongitude: 29.62, radiusKm: 5 },
        { slug: 'novotiraspolsky', zoneType: AutomotiveLocationZoneType.ServiceArea, names: { ru: 'Новотираспольский', en: 'Novotiraspolsky area' }, centerLatitude: 46.89, centerLongitude: 29.67, radiusKm: 8 },
    ]),
    ...cityZones('bender', 'Бендер', 46.8316, 29.4777),
    ...cityZones('rybnitsa', 'Рыбницы', 47.7681, 29.0044),
    ...cityZones('dubossary', 'Дубоссар', 47.2656, 29.1667),
    ...cityZones('slobodzeya', 'Слободзеи', 46.7281, 29.7117),
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
