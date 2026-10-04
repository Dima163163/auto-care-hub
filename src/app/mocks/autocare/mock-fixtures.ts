import { z } from "zod"
import { getVehicleImage, type ClientVehicle } from "@/entities/user/model/vehicles"
import type { Notification } from "@/entities/notification/model/types"
import { automotiveServices, type AutoCareApiProvider, type AutoCareCapacityResource } from "@/entities/automotive-service"
import { providerPreviews } from "@/entities/automotive-service/model/autocareMockProviders"
import { type ServiceChatMessage } from "@/entities/automotive-service/lib/service-chat"
import { mockUsers } from ".././data"
import { readMockChatReportAssignment } from ".././mock-chat-report-assignment"
import { mockChatReportSyntheticAttachment } from ".././data/mockChatReportSyntheticAttachment"

export const loginRequestSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
})

export const registerRequestSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(1),
    role: z.enum(['client', 'owner']),
    termsAccepted: z.literal(true),
    privacyAccepted: z.literal(true),
})

export const bookingRequestSchema = z.object({
    clientId: z.string().min(1).optional(),
    cabinetId: z.string().min(1),
    serviceId: z.string().min(1),
    date: z.string().min(1),
    startTime: z.string().min(1),
    endTime: z.string().min(1),
    status: z.enum(['pending', 'confirmed']),
    comment: z.string().optional(),
})

export const ownerActionCenterEventSchema = z.object({
    action: z.enum([
        'pending_bookings',
        'reschedule_requests',
        'draft_cabinets',
        'blocked_cabinets',
        'readiness',
    ]),
})

export const clientExperimentEventSchema = z.object({
    event: z.enum([
        'book_again_clicked',
        'preference_shortcut_used',
        'preference_shortcut_reset',
        'catalog_filter_used',
        'catalog_filter_reset',
        'catalog_search_to_detail',
        'catalog_search_to_book',
        'catalog_no_results',
    ]),
})

export const mockFavoritesByUser = new Map<string, string[]>()

export const mockAutoCareProviderActivity = new Map<string, { impressions: number; profileOpens: number }>()

type MockCommunityProfileState = { enabled: boolean; displayName: string | null; profileId: string }

export const mockCommunityProfiles = new Map<string, MockCommunityProfileState>([
    ['user-client-1', { enabled: false, displayName: 'Алексей Авто', profileId: '10000000-0000-4000-8000-000000000001' }],
    ['user-client-2', { enabled: false, displayName: 'Мария Сервис', profileId: '10000000-0000-4000-8000-000000000002' }],
])

export const mockHelpfulVotesByReview = new Map<string, Set<string>>()

export const mockCommunityConsentLedger: Array<{ userId: string; action: 'granted' | 'revoked'; at: string }> = []

let nextMockCommunityProfileId = 3

export const mockOptionalConsents = new Map<string, {
    analytics: { granted: boolean; version: string | null; recordedAt: string | null }
    marketing: { granted: boolean; version: string | null; recordedAt: string | null }
}>()

export const mockLegalDocumentVersions = { terms: 'draft-2026-08-13', privacy: 'draft-2026-08-13' } as const

export const mockOAuthIdentitiesByUser = new Map<string, Set<'google' | 'yandex'>>()

export const mockVehiclesByUser = new Map<string, ClientVehicle[]>([
    ['user-client-1', [{
        id: 'mock-vehicle-1',
        brandId: 'bmw',
        model: 'X5',
        year: 2021,
        fuelType: 'petrol',
        engineDisplacement: 3,
        horsepower: 249,
        color: 'black',
        vin: 'WBA1234567890ABCD',
        licensePlate: 'А123ВС163',
        internalNumber: 'AC-001',
        imageUrl: getVehicleImage('bmw', 'X5'),
        isPrimary: true,
        createdAt: '2026-05-24T10:00:00.000Z',
    }]],
])

export const autoCareMarket = {
    id: 'market-moscow',
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

export const autoCareMarkets = [
    autoCareMarket,
    { id: 'market-samara', countryCode: 'RU', countryName: 'Россия', cityCode: 'samara', cityName: 'Самара', regionCode: 'samara-oblast', regionName: 'Самарская область', centerLatitude: 53.1959, centerLongitude: 50.1002, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Europe/Samara', launchReady: true },
    { id: 'market-kaliningrad', countryCode: 'RU', countryName: 'Россия', cityCode: 'kaliningrad', cityName: 'Калининград', regionCode: 'kaliningrad-oblast', regionName: 'Калининградская область', centerLatitude: 54.7104, centerLongitude: 20.4522, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Europe/Kaliningrad', launchReady: true },
    { id: 'market-saint-petersburg', countryCode: 'RU', countryName: 'Россия', cityCode: 'saint-petersburg', cityName: 'Санкт-Петербург', regionCode: 'leningrad-oblast', regionName: 'Ленинградская область', centerLatitude: 59.9343, centerLongitude: 30.3351, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Europe/Moscow', launchReady: true },
    { id: 'market-kazan', countryCode: 'RU', countryName: 'Россия', cityCode: 'kazan', cityName: 'Казань', regionCode: 'tatarstan', regionName: 'Республика Татарстан', centerLatitude: 55.7879, centerLongitude: 49.1233, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Europe/Moscow', launchReady: true },
    { id: 'market-novosibirsk', countryCode: 'RU', countryName: 'Россия', cityCode: 'novosibirsk', cityName: 'Новосибирск', regionCode: 'novosibirsk-oblast', regionName: 'Новосибирская область', centerLatitude: 55.0084, centerLongitude: 82.9357, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Asia/Novosibirsk', launchReady: true },
    { id: 'market-yekaterinburg', countryCode: 'RU', countryName: 'Россия', cityCode: 'yekaterinburg', cityName: 'Екатеринбург', regionCode: 'sverdlovsk-oblast', regionName: 'Свердловская область', centerLatitude: 56.8389, centerLongitude: 60.6057, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Asia/Yekaterinburg', launchReady: true },
    { id: 'market-nizhny-novgorod', countryCode: 'RU', countryName: 'Россия', cityCode: 'nizhny-novgorod', cityName: 'Нижний Новгород', regionCode: 'nizhny-novgorod-oblast', regionName: 'Нижегородская область', centerLatitude: 56.3269, centerLongitude: 44.0059, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Europe/Moscow', launchReady: true },
    { id: 'market-rostov-on-don', countryCode: 'RU', countryName: 'Россия', cityCode: 'rostov-on-don', cityName: 'Ростов-на-Дону', regionCode: 'rostov-oblast', regionName: 'Ростовская область', centerLatitude: 47.2357, centerLongitude: 39.7015, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Europe/Moscow', launchReady: true },
    { id: 'market-ufa', countryCode: 'RU', countryName: 'Россия', cityCode: 'ufa', cityName: 'Уфа', regionCode: 'bashkortostan', regionName: 'Республика Башкортостан', centerLatitude: 54.7388, centerLongitude: 55.9721, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Asia/Yekaterinburg', launchReady: true },
    { id: 'market-krasnoyarsk', countryCode: 'RU', countryName: 'Россия', cityCode: 'krasnoyarsk', cityName: 'Красноярск', regionCode: 'krasnoyarsk-krai', regionName: 'Красноярский край', centerLatitude: 56.0153, centerLongitude: 92.8932, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Asia/Krasnoyarsk', launchReady: true },
    { id: 'market-perm', countryCode: 'RU', countryName: 'Россия', cityCode: 'perm', cityName: 'Пермь', regionCode: 'perm-krai', regionName: 'Пермский край', centerLatitude: 58.0105, centerLongitude: 56.2502, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Asia/Yekaterinburg', launchReady: true },
    { id: 'market-voronezh', countryCode: 'RU', countryName: 'Россия', cityCode: 'voronezh', cityName: 'Воронеж', regionCode: 'voronezh-oblast', regionName: 'Воронежская область', centerLatitude: 51.6755, centerLongitude: 39.2089, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Europe/Moscow', launchReady: true },
    { id: 'market-volgograd', countryCode: 'RU', countryName: 'Россия', cityCode: 'volgograd', cityName: 'Волгоград', regionCode: 'volgograd-oblast', regionName: 'Волгоградская область', centerLatitude: 48.708, centerLongitude: 44.5133, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Europe/Volgograd', launchReady: true },
    { id: 'market-omsk', countryCode: 'RU', countryName: 'Россия', cityCode: 'omsk', cityName: 'Омск', regionCode: 'omsk-oblast', regionName: 'Омская область', centerLatitude: 54.9885, centerLongitude: 73.3242, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Asia/Omsk', launchReady: true },
    { id: 'market-chelyabinsk', countryCode: 'RU', countryName: 'Россия', cityCode: 'chelyabinsk', cityName: 'Челябинск', regionCode: 'chelyabinsk-oblast', regionName: 'Челябинская область', centerLatitude: 55.1644, centerLongitude: 61.4368, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Asia/Yekaterinburg', launchReady: true },
    { id: 'market-madrid', countryCode: 'ES', countryName: 'Испания', cityCode: 'madrid', cityName: 'Мадрид', regionCode: 'madrid', regionName: 'Мадрид', centerLatitude: 40.4168, centerLongitude: -3.7038, currencyCode: 'EUR', defaultLocale: 'es', supportedLocales: ['es', 'en', 'ru'], timezone: 'Europe/Madrid', launchReady: true },
    { id: 'market-barcelona', countryCode: 'ES', countryName: 'Испания', cityCode: 'barcelona', cityName: 'Барселона', regionCode: 'catalonia', regionName: 'Каталония', centerLatitude: 41.3874, centerLongitude: 2.1686, currencyCode: 'EUR', defaultLocale: 'es', supportedLocales: ['es', 'en', 'ru'], timezone: 'Europe/Madrid', launchReady: true },
    { id: 'market-valencia', countryCode: 'ES', countryName: 'Испания', cityCode: 'valencia', cityName: 'Валенсия', regionCode: 'valencian-community', regionName: 'Валенсийское сообщество', centerLatitude: 39.4699, centerLongitude: -0.3763, currencyCode: 'EUR', defaultLocale: 'es', supportedLocales: ['es', 'en', 'ru'], timezone: 'Europe/Madrid', launchReady: true },
    { id: 'market-chisinau', countryCode: 'MD', countryName: 'Молдова', cityCode: 'chisinau', cityName: 'Кишинёв', regionCode: 'chisinau', regionName: 'Муниципий Кишинёв', centerLatitude: 47.0105, centerLongitude: 28.8638, currencyCode: 'MDL', defaultLocale: 'ro', supportedLocales: ['ro', 'ru', 'en'], timezone: 'Europe/Chisinau', launchReady: true },
    { id: 'market-tiraspol', countryCode: 'MD', countryName: 'Молдова / Приднестровье', cityCode: 'tiraspol', cityName: 'Тирасполь', regionCode: 'transnistria', regionName: 'Приднестровье', centerLatitude: 46.8403, centerLongitude: 29.6433, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'ro', 'en'], timezone: 'Europe/Chisinau', launchReady: true },
    { id: 'market-bender', countryCode: 'MD', countryName: 'Молдова / Приднестровье', cityCode: 'bender', cityName: 'Бендеры', regionCode: 'transnistria', regionName: 'Приднестровье', centerLatitude: 46.8316, centerLongitude: 29.4777, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'ro', 'en'], timezone: 'Europe/Chisinau', launchReady: true },
    { id: 'market-rybnitsa', countryCode: 'MD', countryName: 'Молдова / Приднестровье', cityCode: 'rybnitsa', cityName: 'Рыбница', regionCode: 'transnistria', regionName: 'Приднестровье', centerLatitude: 47.7681, centerLongitude: 29.0044, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'ro', 'en'], timezone: 'Europe/Chisinau', launchReady: true },
    { id: 'market-dubossary', countryCode: 'MD', countryName: 'Молдова / Приднестровье', cityCode: 'dubossary', cityName: 'Дубоссары', regionCode: 'transnistria', regionName: 'Приднестровье', centerLatitude: 47.2656, centerLongitude: 29.1667, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'ro', 'en'], timezone: 'Europe/Chisinau', launchReady: true },
    { id: 'market-slobodzeya', countryCode: 'MD', countryName: 'Молдова / Приднестровье', cityCode: 'slobodzeya', cityName: 'Слободзея', regionCode: 'transnistria', regionName: 'Приднестровье', centerLatitude: 46.7281, centerLongitude: 29.7117, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'ro', 'en'], timezone: 'Europe/Chisinau', launchReady: true },
    { id: 'market-krasnodar', countryCode: 'RU', countryName: 'Россия', cityCode: 'krasnodar', cityName: 'Краснодар', regionCode: 'krasnodar-krai', regionName: 'Краснодарский край', centerLatitude: 45.0355, centerLongitude: 38.9753, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Europe/Moscow', launchReady: true },
    { id: 'market-saratov', countryCode: 'RU', countryName: 'Россия', cityCode: 'saratov', cityName: 'Саратов', regionCode: 'saratov-oblast', regionName: 'Саратовская область', centerLatitude: 51.5336, centerLongitude: 46.0343, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Europe/Saratov', launchReady: true },
    { id: 'market-tyumen', countryCode: 'RU', countryName: 'Россия', cityCode: 'tyumen', cityName: 'Тюмень', regionCode: 'tyumen-oblast', regionName: 'Тюменская область', centerLatitude: 57.153, centerLongitude: 65.5343, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Asia/Yekaterinburg', launchReady: true },
    { id: 'market-izhevsk', countryCode: 'RU', countryName: 'Россия', cityCode: 'izhevsk', cityName: 'Ижевск', regionCode: 'udmurtia', regionName: 'Удмуртская Республика', centerLatitude: 56.8527, centerLongitude: 53.2115, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Europe/Samara', launchReady: true },
    { id: 'market-barnaul', countryCode: 'RU', countryName: 'Россия', cityCode: 'barnaul', cityName: 'Барнаул', regionCode: 'altai-krai', regionName: 'Алтайский край', centerLatitude: 53.3481, centerLongitude: 83.7798, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Asia/Barnaul', launchReady: true },
    { id: 'market-vladivostok', countryCode: 'RU', countryName: 'Россия', cityCode: 'vladivostok', cityName: 'Владивосток', regionCode: 'primorsky-krai', regionName: 'Приморский край', centerLatitude: 43.1155, centerLongitude: 131.8855, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Asia/Vladivostok', launchReady: true },
    { id: 'market-irkutsk', countryCode: 'RU', countryName: 'Россия', cityCode: 'irkutsk', cityName: 'Иркутск', regionCode: 'irkutsk-oblast', regionName: 'Иркутская область', centerLatitude: 52.2864, centerLongitude: 104.2807, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Asia/Irkutsk', launchReady: true },
    { id: 'market-khabarovsk', countryCode: 'RU', countryName: 'Россия', cityCode: 'khabarovsk', cityName: 'Хабаровск', regionCode: 'khabarovsk-krai', regionName: 'Хабаровский край', centerLatitude: 48.4827, centerLongitude: 135.0838, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Asia/Vladivostok', launchReady: true },
    { id: 'market-yaroslavl', countryCode: 'RU', countryName: 'Россия', cityCode: 'yaroslavl', cityName: 'Ярославль', regionCode: 'yaroslavl-oblast', regionName: 'Ярославская область', centerLatitude: 57.6261, centerLongitude: 39.8845, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Europe/Moscow', launchReady: true },
    { id: 'market-tomsk', countryCode: 'RU', countryName: 'Россия', cityCode: 'tomsk', cityName: 'Томск', regionCode: 'tomsk-oblast', regionName: 'Томская область', centerLatitude: 56.501, centerLongitude: 84.9924, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Asia/Tomsk', launchReady: true },
    { id: 'market-orenburg', countryCode: 'RU', countryName: 'Россия', cityCode: 'orenburg', cityName: 'Оренбург', regionCode: 'orenburg-oblast', regionName: 'Оренбургская область', centerLatitude: 51.7682, centerLongitude: 55.0969, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Asia/Yekaterinburg', launchReady: true },
    { id: 'market-ryazan', countryCode: 'RU', countryName: 'Россия', cityCode: 'ryazan', cityName: 'Рязань', regionCode: 'ryazan-oblast', regionName: 'Рязанская область', centerLatitude: 54.6296, centerLongitude: 39.7417, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Europe/Moscow', launchReady: true },
    { id: 'market-sochi', countryCode: 'RU', countryName: 'Россия', cityCode: 'sochi', cityName: 'Сочи', regionCode: 'krasnodar-krai', regionName: 'Краснодарский край', centerLatitude: 43.5855, centerLongitude: 39.7231, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Europe/Moscow', launchReady: true },
    { id: 'market-seville', countryCode: 'ES', countryName: 'Испания', cityCode: 'seville', cityName: 'Севилья', regionCode: 'andalusia', regionName: 'Андалусия', centerLatitude: 37.3891, centerLongitude: -5.9845, currencyCode: 'EUR', defaultLocale: 'es', supportedLocales: ['es', 'en', 'ru'], timezone: 'Europe/Madrid', launchReady: true },
    { id: 'market-zaragoza', countryCode: 'ES', countryName: 'Испания', cityCode: 'zaragoza', cityName: 'Сарагоса', regionCode: 'aragon', regionName: 'Арагон', centerLatitude: 41.6488, centerLongitude: -0.8891, currencyCode: 'EUR', defaultLocale: 'es', supportedLocales: ['es', 'en', 'ru'], timezone: 'Europe/Madrid', launchReady: true },
    { id: 'market-malaga', countryCode: 'ES', countryName: 'Испания', cityCode: 'malaga', cityName: 'Малага', regionCode: 'andalusia', regionName: 'Андалусия', centerLatitude: 36.7213, centerLongitude: -4.4214, currencyCode: 'EUR', defaultLocale: 'es', supportedLocales: ['es', 'en', 'ru'], timezone: 'Europe/Madrid', launchReady: true },
    { id: 'market-murcia', countryCode: 'ES', countryName: 'Испания', cityCode: 'murcia', cityName: 'Мурсия', regionCode: 'murcia', regionName: 'Мурсия', centerLatitude: 37.9922, centerLongitude: -1.1307, currencyCode: 'EUR', defaultLocale: 'es', supportedLocales: ['es', 'en', 'ru'], timezone: 'Europe/Madrid', launchReady: true },
    { id: 'market-palma', countryCode: 'ES', countryName: 'Испания', cityCode: 'palma', cityName: 'Пальма', regionCode: 'balearic-islands', regionName: 'Балеарские острова', centerLatitude: 39.5696, centerLongitude: 2.6502, currencyCode: 'EUR', defaultLocale: 'es', supportedLocales: ['es', 'en', 'ru'], timezone: 'Europe/Madrid', launchReady: true },
    { id: 'market-bilbao', countryCode: 'ES', countryName: 'Испания', cityCode: 'bilbao', cityName: 'Бильбао', regionCode: 'basque-country', regionName: 'Страна Басков', centerLatitude: 43.263, centerLongitude: -2.935, currencyCode: 'EUR', defaultLocale: 'es', supportedLocales: ['es', 'en', 'ru'], timezone: 'Europe/Madrid', launchReady: true },
    { id: 'market-alicante', countryCode: 'ES', countryName: 'Испания', cityCode: 'alicante', cityName: 'Аликанте', regionCode: 'valencian-community', regionName: 'Валенсийское сообщество', centerLatitude: 38.3452, centerLongitude: -0.481, currencyCode: 'EUR', defaultLocale: 'es', supportedLocales: ['es', 'en', 'ru'], timezone: 'Europe/Madrid', launchReady: true },
    { id: 'market-cordoba', countryCode: 'ES', countryName: 'Испания', cityName: 'Кордова', cityCode: 'cordoba', regionCode: 'andalusia', regionName: 'Андалусия', centerLatitude: 37.8882, centerLongitude: -4.7794, currencyCode: 'EUR', defaultLocale: 'es', supportedLocales: ['es', 'en', 'ru'], timezone: 'Europe/Madrid', launchReady: true },
    { id: 'market-valladolid', countryCode: 'ES', countryName: 'Испания', cityCode: 'valladolid', cityName: 'Вальядолид', regionCode: 'castile-and-leon', regionName: 'Кастилия и Леон', centerLatitude: 41.6523, centerLongitude: -4.7245, currencyCode: 'EUR', defaultLocale: 'es', supportedLocales: ['es', 'en', 'ru'], timezone: 'Europe/Madrid', launchReady: true },
    { id: 'market-vigo', countryCode: 'ES', countryName: 'Испания', cityCode: 'vigo', cityName: 'Виго', regionCode: 'galicia', regionName: 'Галисия', centerLatitude: 42.2406, centerLongitude: -8.7207, currencyCode: 'EUR', defaultLocale: 'es', supportedLocales: ['es', 'en', 'ru'], timezone: 'Europe/Madrid', launchReady: true },
    { id: 'market-granada', countryCode: 'ES', countryName: 'Испания', cityCode: 'granada', cityName: 'Гранада', regionCode: 'andalusia', regionName: 'Андалусия', centerLatitude: 37.1773, centerLongitude: -3.5986, currencyCode: 'EUR', defaultLocale: 'es', supportedLocales: ['es', 'en', 'ru'], timezone: 'Europe/Madrid', launchReady: true },
    { id: 'market-oviedo', countryCode: 'ES', countryName: 'Испания', cityCode: 'oviedo', cityName: 'Овьедо', regionCode: 'asturias', regionName: 'Астурия', centerLatitude: 43.3619, centerLongitude: -5.8494, currencyCode: 'EUR', defaultLocale: 'es', supportedLocales: ['es', 'en', 'ru'], timezone: 'Europe/Madrid', launchReady: true },
    { id: 'market-balti', countryCode: 'MD', countryName: 'Молдова', cityCode: 'balti', cityName: 'Бельцы', regionCode: 'balti', regionName: 'Муниципий Бельцы', centerLatitude: 47.7631, centerLongitude: 27.9293, currencyCode: 'MDL', defaultLocale: 'ro', supportedLocales: ['ro', 'ru', 'en'], timezone: 'Europe/Chisinau', launchReady: true },
    { id: 'market-cahul', countryCode: 'MD', countryName: 'Молдова', cityCode: 'cahul', cityName: 'Кагул', regionCode: 'cahul', regionName: 'Кагульский район', centerLatitude: 45.9043, centerLongitude: 28.1944, currencyCode: 'MDL', defaultLocale: 'ro', supportedLocales: ['ro', 'ru', 'en'], timezone: 'Europe/Chisinau', launchReady: true },
    { id: 'market-comrat', countryCode: 'MD', countryName: 'Молдова', cityCode: 'comrat', cityName: 'Комрат', regionCode: 'gagauzia', regionName: 'Гагаузия', centerLatitude: 46.3003, centerLongitude: 28.6573, currencyCode: 'MDL', defaultLocale: 'ro', supportedLocales: ['ro', 'ru', 'en'], timezone: 'Europe/Chisinau', launchReady: true },
    { id: 'market-orhei', countryCode: 'MD', countryName: 'Молдова', cityCode: 'orhei', cityName: 'Оргеев', regionCode: 'orhei', regionName: 'Оргеевский район', centerLatitude: 47.3849, centerLongitude: 28.8231, currencyCode: 'MDL', defaultLocale: 'ro', supportedLocales: ['ro', 'ru', 'en'], timezone: 'Europe/Chisinau', launchReady: true },
    { id: 'market-ungheni', countryCode: 'MD', countryName: 'Молдова', cityCode: 'ungheni', cityName: 'Унгены', regionCode: 'ungheni', regionName: 'Унгенский район', centerLatitude: 47.2108, centerLongitude: 27.8005, currencyCode: 'MDL', defaultLocale: 'ro', supportedLocales: ['ro', 'ru', 'en'], timezone: 'Europe/Chisinau', launchReady: true },
]

export type MockSuperAdminMarket = {
    id: string
    countryCode: string
    countryName: string
    cityCode: string
    cityName: string
    regionCode: string | null
    regionName: string | null
    centerLatitude: number | null
    centerLongitude: number | null
    currencyCode: string
    defaultLocale: string
    supportedLocales: string[]
    timezone: string
    capabilities?: Record<string, boolean>
    legalLinks?: Record<string, string>
    launchReady: boolean
}

export type MockSuperAdminCountry = {
    id: string
    code: string
    names: Record<string, string>
    defaultLocale: string
    supportedLocales: string[]
    timezone: string
    currencyCode: string
    capabilities: Record<string, boolean>
    legalLinks: Record<string, string>
    active: boolean
}

export type MockSuperAdminZone = {
    id: string
    marketId: string
    parentId: string | null
    slug: string
    zoneType: 'district' | 'neighborhood' | 'service_area'
    names: Record<string, string>
    centerLatitude: number | null
    centerLongitude: number | null
    radiusKm: number | null
    imageUrl: string | null
    displayOrder?: number
    active?: boolean
    serviceCount: number
}

export const mockSuperAdminTrustPolicy = {
    policyVersion: 'autocare-trust-v1',
    trustedMinimumRating: 4.2,
    trustedMinimumReviews: 5,
    trustedMinimumCompletedVisits: 10,
    trustedMaxNoShowRate: 0.1,
    trustedMaxComplaintRate: 0.1,
    trustedMaxResponseTimeMinutes: 120,
    reassessmentIntervalHours: 24,
    rollout: { enabled: true, marketIds: [] as string[], percentage: 100 },
    updatedAt: new Date().toISOString(),
}

export const editableAutoCareMarkets = autoCareMarkets as unknown as MockSuperAdminMarket[]

export const superAdminMarketCountries: MockSuperAdminCountry[] = Array.from(
    new Map(editableAutoCareMarkets.map((market) => [market.countryCode, market])).values(),
).map((market) => ({
    id: `country-${market.countryCode.toLowerCase()}`,
    code: market.countryCode,
    names: { [market.defaultLocale]: market.countryName, en: market.countryName },
    defaultLocale: market.defaultLocale,
    supportedLocales: [...market.supportedLocales],
    timezone: market.timezone,
    currencyCode: market.currencyCode,
    capabilities: {},
    legalLinks: {},
    active: true,
}))

export const autoCareLocationZones = [
    { id: 'zone-moscow-central', marketId: autoCareMarket.id, parentId: null, slug: 'central', zoneType: 'district', names: { ru: 'Центр Москвы', en: 'Moscow centre' }, centerLatitude: 55.7558, centerLongitude: 37.6173, radiusKm: 5, imageUrl: '/images/autocare/locations/center.webp', serviceCount: 1248 },
    { id: 'zone-moscow-north', marketId: autoCareMarket.id, parentId: null, slug: 'north', zoneType: 'district', names: { ru: 'Северо-Запад', en: 'North-West' }, centerLatitude: 55.7908, centerLongitude: 37.6173, radiusKm: 6, imageUrl: '/images/autocare/locations/north-west.webp', serviceCount: 892 },
    { id: 'zone-moscow-south', marketId: autoCareMarket.id, parentId: null, slug: 'south', zoneType: 'district', names: { ru: 'Юго-Запад', en: 'South-West' }, centerLatitude: 55.7208, centerLongitude: 37.6173, radiusKm: 6, imageUrl: '/images/autocare/locations/south-west.webp', serviceCount: 756 },
    { id: 'zone-moscow-east', marketId: autoCareMarket.id, parentId: null, slug: 'east', zoneType: 'service_area', names: { ru: 'Восток Москвы', en: 'East Moscow' }, centerLatitude: 55.7558, centerLongitude: 37.6673, radiusKm: 8, imageUrl: '/images/autocare/locations/east.webp', serviceCount: 645 },
    ...[
        { marketId: 'market-samara', slug: 'oktyabrsky', name: 'Октябрьский район', latitude: 53.213, longitude: 50.19 },
        { marketId: 'market-samara', slug: 'leninsky', name: 'Ленинский район', latitude: 53.195, longitude: 50.102 },
        { marketId: 'market-samara', slug: 'promyshlenny', name: 'Промышленный район', latitude: 53.221, longitude: 50.22 },
        { marketId: 'market-samara', slug: 'kirovsky', name: 'Кировский район', latitude: 53.24, longitude: 50.3 },
        { marketId: 'market-samara', slug: 'sovetsky', name: 'Советский район', latitude: 53.205, longitude: 50.245 },
        { marketId: 'market-samara', slug: 'zheleznodorozhny', name: 'Железнодорожный район', latitude: 53.19, longitude: 50.11 },
        { marketId: 'market-samara', slug: 'samarsky', name: 'Самарский район', latitude: 53.18, longitude: 50.095 },
        { marketId: 'market-samara', slug: 'kuibyshevsky', name: 'Куйбышевский район', latitude: 53.13, longitude: 50.11 },
        { marketId: 'market-samara', slug: 'krasnoglinsky', name: 'Красноглинский район', latitude: 53.32, longitude: 50.24 },
        { marketId: 'market-kaliningrad', slug: 'central', name: 'Центральный район', latitude: 54.715, longitude: 20.5 },
        { marketId: 'market-kaliningrad', slug: 'moskovsky', name: 'Московский район', latitude: 54.69, longitude: 20.5 },
        { marketId: 'market-kaliningrad', slug: 'leningradsky', name: 'Ленинградский район', latitude: 54.735, longitude: 20.55 },
        { marketId: 'market-saint-petersburg', slug: 'central', name: 'Центральный район', latitude: 59.9343, longitude: 30.3351 },
        { marketId: 'market-saint-petersburg', slug: 'primorsky', name: 'Приморский район', latitude: 60.01, longitude: 30.26 },
        { marketId: 'market-saint-petersburg', slug: 'moskovsky', name: 'Московский район', latitude: 59.85, longitude: 30.32 },
        { marketId: 'market-saint-petersburg', slug: 'vyborgsky', name: 'Выборгский район', latitude: 60.04, longitude: 30.34 },
        { marketId: 'market-saint-petersburg', slug: 'petrogradsky', name: 'Петроградский район', latitude: 59.965, longitude: 30.3 },
        { marketId: 'market-saint-petersburg', slug: 'nevsky', name: 'Невский район', latitude: 59.9, longitude: 30.48 },
        { marketId: 'market-saint-petersburg', slug: 'kirovsky', name: 'Кировский район', latitude: 59.87, longitude: 30.25 },
        { marketId: 'market-saint-petersburg', slug: 'krasnogvardeysky', name: 'Красногвардейский район', latitude: 59.95, longitude: 30.45 },
        { marketId: 'market-tiraspol', slug: 'central', name: 'Центр Тирасполя', latitude: 46.8403, longitude: 29.6433 },
        { marketId: 'market-tiraspol', slug: 'western', name: 'Западный микрорайон', latitude: 46.845, longitude: 29.6 },
        { marketId: 'market-tiraspol', slug: 'kirovsky', name: 'Кировский микрорайон', latitude: 46.825, longitude: 29.66 },
        { marketId: 'market-tiraspol', slug: 'october', name: 'Октябрьский микрорайон', latitude: 46.86, longitude: 29.68 },
        { marketId: 'market-tiraspol', slug: 'balka', name: 'Микрорайон Балка', latitude: 46.815, longitude: 29.62 },
        { marketId: 'market-tiraspol', slug: 'novotiraspolsky', name: 'Новотираспольский', latitude: 46.89, longitude: 29.67 },
    ].map((zone, index) => ({ id: `zone-${zone.marketId}-${zone.slug}`, marketId: zone.marketId, parentId: null, slug: zone.slug, zoneType: 'district', names: { ru: zone.name, en: zone.name, es: zone.name, ro: zone.name }, centerLatitude: zone.latitude, centerLongitude: zone.longitude, radiusKm: 8, imageUrl: null, serviceCount: 0, displayOrder: index + 1 })),
    ...autoCareMarkets.filter((market) => !['market-moscow', 'market-samara', 'market-kaliningrad', 'market-saint-petersburg', 'market-tiraspol'].includes(market.id)).flatMap((market) => [
        { id: `${market.id}-central`, marketId: market.id, parentId: null, slug: 'central', zoneType: 'district', names: { ru: `Центр ${market.cityName}`, en: `${market.cityName} centre` }, centerLatitude: market.centerLatitude, centerLongitude: market.centerLongitude, radiusKm: 5, imageUrl: null, serviceCount: 0 },
        { id: `${market.id}-north`, marketId: market.id, parentId: null, slug: 'north', zoneType: 'district', names: { ru: 'Северный район', en: 'North district' }, centerLatitude: market.centerLatitude + 0.035, centerLongitude: market.centerLongitude, radiusKm: 6, imageUrl: null, serviceCount: 0 },
        { id: `${market.id}-south`, marketId: market.id, parentId: null, slug: 'south', zoneType: 'district', names: { ru: 'Южный район', en: 'South district' }, centerLatitude: market.centerLatitude - 0.035, centerLongitude: market.centerLongitude, radiusKm: 6, imageUrl: null, serviceCount: 0 },
        { id: `${market.id}-east`, marketId: market.id, parentId: null, slug: 'east', zoneType: 'service_area', names: { ru: 'Восточная агломерация', en: 'East service area' }, centerLatitude: market.centerLatitude, centerLongitude: market.centerLongitude + 0.05, radiusKm: 8, imageUrl: null, serviceCount: 0 },
    ]),
]

type MockAutoCareDefinition = {
    id: string
    slug: string
    categorySlug: string
    labels: Record<string, string>
    priceType: 'fixed' | 'from' | 'range' | 'quote_required'
    comparisonAttributes: string[]
    active: boolean
}

export const autoCareDefinitions: MockAutoCareDefinition[] = automotiveServices.map((service) => ({
    id: `definition-${service.id}`,
    slug: service.id,
    categorySlug: service.id,
    labels: service.labels,
    priceType: 'from' as const,
    comparisonAttributes: ['price', 'rating', 'distance', 'nextSlot'],
    active: true,
}))

export const reviewPhotoAssets = [
    '/images/autocare/providers/generated/review-oil-change.webp',
    '/images/autocare/providers/generated/review-tire-service.webp',
    '/images/autocare/providers/generated/review-detailing.webp',
    '/images/autocare/providers/generated/review-body-repair.webp',
]

export type MockAutoCareReview = {
    id: string
    providerId: string
    authorName: string
    vehicleLabel: string
    rating: number
    text: string
    avatarUrl: string | null
    photoUrls: string[]
    createdAt: string
    clientId?: string | null
    idempotencyKey?: string | null
    serviceRequestId?: string | null
    verifiedVisit?: boolean
    serviceSlug?: string | null
    revisionAllowedUntil?: string | null
    revisionUsedAt?: string | null
    status?: 'pending' | 'approved' | 'rejected'
}

export const mockFeaturedAutoCareReviews: MockAutoCareReview[] = [
    { id: 'featured-review-1', providerId: 'api-proservice-moscow', authorName: 'Алексей С.', vehicleLabel: 'BMW X5', rating: 5, text: 'Быстро приняли машину, заранее объяснили стоимость и прислали понятный фотоотчёт.', avatarUrl: '/images/autocare/avatars/alexey.webp', photoUrls: [reviewPhotoAssets[0]], createdAt: '2026-08-12T10:00:00.000Z', clientId: 'user-client-1', serviceRequestId: 'client-request-closed', serviceSlug: 'oil-change', verifiedVisit: true, status: 'approved' },
    { id: 'featured-review-2', providerId: 'api-autolux-moscow', authorName: 'Мария К.', vehicleLabel: 'Toyota RAV4', rating: 4, text: 'Удобная запись и внимательный мастер. Итоговая цена совпала с предварительной оценкой.', avatarUrl: '/images/autocare/avatars/maria.webp', photoUrls: [reviewPhotoAssets[2]], createdAt: '2026-08-05T10:00:00.000Z' },
    { id: 'featured-review-3', providerId: 'api-formula-moscow', authorName: 'Игорь П.', vehicleLabel: 'Skoda Octavia', rating: 3, text: 'Работу выполнили, но пришлось немного подождать. Специалист подробно ответил на вопросы.', avatarUrl: '/images/autocare/avatars/igor.webp', photoUrls: [reviewPhotoAssets[1]], createdAt: '2026-07-29T10:00:00.000Z' },
    { id: 'featured-review-4', providerId: 'api-proservice-moscow', authorName: 'Ольга Н.', vehicleLabel: 'Volkswagen Tiguan', rating: 2, text: 'Цена оказалась выше ожиданий, зато сервис оперативно объяснил состав работ и предложил решение.', avatarUrl: null, photoUrls: [], createdAt: '2026-07-21T10:00:00.000Z' },
    ...[
        ...Array.from({ length: 10 }, () => 'api-proservice-moscow' as const),
        ...Array.from({ length: 11 }, () => 'api-autolux-moscow' as const),
    ].map((providerId, index) => {
        const names = ['Сергей В.', 'Елена Р.', 'Дмитрий Л.', 'Наталья А.', 'Андрей К.', 'Виктор М.', 'Полина Т.', 'Роман Д.']
        const vehicles = ['Kia Sportage', 'Hyundai Tucson', 'Ford Focus', 'Mazda CX-5', 'Volvo XC60', 'Honda CR-V', 'Renault Duster', 'Nissan X-Trail']
        const proServiceRatings = [5, 4, 1, 5, 4, 3, 2, 5, 4, 3] as const
        const autoLuxRatings = [5, 4, 3, 2, 5, 4, 1, 5, 4, 3, 3] as const
        const providerIndex = providerId === 'api-proservice-moscow' ? index : index - 10
        const rating = providerId === 'api-proservice-moscow' ? proServiceRatings[providerIndex] : autoLuxRatings[providerIndex]
        const photoUrls = providerIndex % 5 === 3 ? [] : [reviewPhotoAssets[providerIndex % reviewPhotoAssets.length], ...(providerIndex % 6 === 0 ? [reviewPhotoAssets[(providerIndex + 1) % reviewPhotoAssets.length]] : [])]
        return {
            id: `featured-review-generated-${index + 1}`,
            providerId,
            authorName: names[providerIndex % names.length]!,
            vehicleLabel: vehicles[providerIndex % vehicles.length]!,
            rating: rating!,
            verifiedVisit: true,
            text: providerIndex % 5 === 4
                ? 'Остались вопросы по срокам, но сервис быстро вышел на связь и предложил понятное решение.'
                : 'Мастер заранее объяснил состав работ, прислал фотографии и выдал автомобиль в согласованное время.',
            avatarUrl: null,
            photoUrls,
            createdAt: new Date(Date.UTC(2026, 7, 19 - providerIndex, 10, 0, 0)).toISOString(),
        }
    }),
]

export function getMockCommunityProfileState(userId: string) {
    let profile = mockCommunityProfiles.get(userId)
    if (!profile) {
        profile = { enabled: false, displayName: null, profileId: `10000000-0000-4000-8000-${String(nextMockCommunityProfileId++).padStart(12, '0')}` }
        mockCommunityProfiles.set(userId, profile)
    }
    return profile
}

export type MockPlatformReview = {
    id: string
    authorName: string
    avatarUrl: string | null
    authorRole: string
    rating: number
    text: string
    status: 'pending' | 'approved' | 'rejected' | 'removed'
    organizationResponse: string | null
    organizationRespondedAt: string | null
    createdAt: string
    clientId?: string | null
    idempotencyKey?: string | null
}

export const mockPlatformReviews: MockPlatformReview[] = [
    { id: 'platform-review-1', authorName: 'Алексей С.', avatarUrl: '/images/autocare/avatars/alexey.webp', authorRole: 'Водитель BMW X5', rating: 5, text: 'Наконец-то можно сравнить сервисы по цене и отзывам в одном месте. Запись прошла без звонков.', status: 'approved', organizationResponse: null, organizationRespondedAt: null, createdAt: '2026-08-12T10:00:00.000Z', clientId: 'user-client-1' },
    { id: 'platform-review-2', authorName: 'Мария К.', avatarUrl: '/images/autocare/avatars/maria.webp', authorRole: 'Водитель Toyota RAV4', rating: 5, text: 'Очень удобно видеть свободное время, реальные отзывы и переписку с сервисом в одном кабинете.', status: 'approved', organizationResponse: 'Спасибо за доверие! Мы продолжим проверять качество сервисов и улучшать поиск.', organizationRespondedAt: '2026-08-08T12:00:00.000Z', createdAt: '2026-08-05T10:00:00.000Z', clientId: 'user-client-2' },
    { id: 'platform-review-3', authorName: 'Игорь П.', avatarUrl: '/images/autocare/avatars/igor.webp', authorRole: 'Водитель Skoda Octavia', rating: 4, text: 'Понравилось, что можно заранее отправить фотографии повреждений и получить понятную оценку.', status: 'approved', organizationResponse: null, organizationRespondedAt: null, createdAt: '2026-07-29T10:00:00.000Z', clientId: 'user-client-1' },
    { id: 'platform-review-4', authorName: 'Ольга Н.', avatarUrl: null, authorRole: 'Водитель Volkswagen Tiguan', rating: 3, text: 'Хочется больше сервисов в небольших городах, но для Москвы сравнение уже очень полезное.', status: 'pending', organizationResponse: null, organizationRespondedAt: null, createdAt: '2026-07-21T10:00:00.000Z', clientId: 'user-client-1' },
]

export function toAutoCareOffer(providerId: string, serviceId: string, price: number, priceType: 'fixed' | 'from' | 'range' | 'quote_required' = 'from') {
    const service = autoCareDefinitions.find((item) => item.slug === serviceId) ?? autoCareDefinitions[0]
    return {
        id: `offer-${providerId}-${service?.slug ?? serviceId}`,
        serviceDefinitionId: service?.id ?? `definition-${serviceId}`,
        serviceSlug: service?.slug ?? serviceId,
        serviceLabels: service?.labels ?? {},
        description: service?.labels.ru ? `Работы по услуге «${service.labels.ru}» с предварительной оценкой и фотоотчётом.` : null,
        priceFromMinor: price * 100,
        priceToMinor: priceType === 'range' ? Math.round(price * 1.2 * 100) : null,
        currencyCode: 'RUB',
        durationMinutes: 60,
        inclusions: ['Предварительная оценка', 'Фотоотчёт по запросу'],
        warrantyText: 'Гарантия на работы по условиям сервиса',
        active: true,
        priceType,
    }
}

function toAutoCareProvider(provider: typeof providerPreviews[number]) {
    return {
        id: `api-${provider.id}`,
        name: provider.name,
        description: 'Проверенный сервис с понятными ценами, фотоотчётом и гарантией на выполненные работы.',
        status: 'active' as const,
        verified: provider.verified,
        yearsActive: provider.id === 'proservice-moscow' ? 8 : 5,
        staffCount: provider.id === 'proservice-moscow' ? 24 : 12,
        // Public review metrics are added lazily by API handlers after mock
        // service requests are initialized. Never seed provider-owned metrics
        // from unrelated or unlinked review fixtures.
        rating: 0,
        reviewCount: 0,
        bonusSummary: provider.bonus ?? null,
        phone: '+7 (495) 645-35-35',
        phones: ['+7 (495) 645-35-35'],
        email: 'service@example.com',
        websiteUrl: null,
        metroStation: 'м. Парк культуры',
        workstationCount: provider.id === 'proservice-moscow' ? 12 : 8,
        teamSize: provider.id === 'formula-moscow' ? 'solo' as const : 'team' as const,
        businessType: provider.id === 'formula-moscow' ? 'private_master' as const : 'company' as const,
        chatEnabled: provider.id !== 'formula-moscow',
        communicationMode: provider.id === 'formula-moscow' ? 'phone_only' as const : provider.id === 'autolux-moscow' ? 'request_then_confirm' as const : 'online' as const,
        responseWindowMinutes: provider.id === 'formula-moscow' ? null : provider.id === 'autolux-moscow' ? 240 : 120,
        responseHours: 'working_hours' as const,
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
            marketId: autoCareMarket.id,
            address: provider.id === 'proservice-moscow' ? 'Москва, ул. Льва Толстого, 18' : 'Москва, Комсомольский пр-т, 45',
            zoneId: null,
            hours: 'Пн–Вс: 08:00–21:00',
            timezone: 'Europe/Moscow',
            appointmentCapacity: provider.id === 'formula-moscow' ? 1 : 6,
            weeklySchedule: { mon: { open: '08:00', close: '21:00', closed: false }, tue: { open: '08:00', close: '21:00', closed: false }, wed: { open: '08:00', close: '21:00', closed: false }, thu: { open: '08:00', close: '21:00', closed: false }, fri: { open: '08:00', close: '21:00', closed: false }, sat: { open: '09:00', close: '18:00', closed: false }, sun: { open: '09:00', close: '18:00', closed: false } },
            blackoutDates: [],
            latitude: provider.mapPosition?.[0] ?? 55.75,
            longitude: provider.mapPosition?.[1] ?? 37.61,
        },
        serviceIds: provider.serviceIds ?? automotiveServices.map((service) => service.id),
        servicePrices: provider.servicePrices ?? { [automotiveServices[0]?.id ?? 'oil-change']: provider.price },
        offers: (provider.serviceIds ?? automotiveServices.map((service) => service.id)).map((serviceId) => toAutoCareOffer(
            `api-${provider.id}`,
            serviceId,
            provider.servicePrices?.[serviceId] ?? provider.price,
        )),
    }
}

export const autoCareProviders = providerPreviews.map(toAutoCareProvider)

type OwnerAutoCareProviderMock = AutoCareApiProvider & {
    serviceIds: readonly string[]
    servicePrices: Partial<Record<string, number>>
}

export const ownerAutoCareProviders: OwnerAutoCareProviderMock[] = autoCareProviders.slice(0, 2).map((provider) => ({ ...provider }))

// Resource-level capacity mirrors the real API contract so the owner calendar
// can be exercised in mock mode as well.  Defaults are intentionally created
// per branch (not per business) to make branch-scoped behaviour observable.
export const mockCapacityResources = new Map<string, AutoCareCapacityResource[]>()

for (const provider of ownerAutoCareProviders) {
    const now = new Date().toISOString()
    const specialistCount = Math.max(1, Math.min(provider.staffCount, 4))
    const bayCount = Math.max(1, Math.min(provider.location.appointmentCapacity ?? 1, 4))
    const defaults: AutoCareCapacityResource[] = [
        ...Array.from({ length: specialistCount }, (_, index) => ({
            id: `mock-resource-${provider.id}-specialist-${index + 1}`,
            providerId: provider.id,
            locationId: provider.location.id,
            type: 'specialist' as const,
            name: `Специалист ${index + 1}`,
            capacity: 1,
            active: true,
            metadata: {},
            createdAt: now,
            updatedAt: now,
        })),
        ...Array.from({ length: bayCount }, (_, index) => ({
            id: `mock-resource-${provider.id}-bay-${index + 1}`,
            providerId: provider.id,
            locationId: provider.location.id,
            type: 'bay' as const,
            name: `Пост ${index + 1}`,
            capacity: 1,
            active: true,
            metadata: {},
            createdAt: now,
            updatedAt: now,
        })),
    ]
    mockCapacityResources.set(provider.id, defaults)
}

export const mockAutoCareFavorites = new Map<string, Set<string>>([
    ['user-client-1', new Set(['api-proservice-moscow'])],
])

export const mockProviderLogos = new Map<string, string>()

export const mockProviderMedia = new Map<string, string>()

export const mockAutoCareTrustEvidence = autoCareProviders.flatMap((provider) => [
    { id: `evidence-${provider.id}-license`, providerId: provider.id, kind: 'license', label: 'Документы сервиса проверены', status: 'verified', expiresAt: null, verifiedAt: '2026-08-01T10:00:00.000Z' },
    { id: `evidence-${provider.id}-reviews`, providerId: provider.id, kind: 'reviews', label: 'Отзывы подтверждены визитами', status: 'verified', expiresAt: null, verifiedAt: '2026-08-01T10:00:00.000Z' },
])

export const mockAutoCareRepairEvents = new Map<string, Array<Record<string, unknown>>>()

export const mockAutoCareBroadcastRequests: Array<Record<string, unknown>> = []

export const mockAutoCareGuaranteeClaims: Array<Record<string, unknown>> = []

export const mockAutoCareExpertQuestions: Array<Record<string, unknown>> = []

export const mockAutoCareFleets: Array<Record<string, unknown>> = [{ id: 'fleet-demo', ownerId: 'user-owner-1', name: 'Автопарк ProService', notes: 'Согласование через диспетчера', vehicles: [{ id: 'fleet-vehicle-demo', fleetId: 'fleet-demo', label: 'BMW X5 · AC-001', vehicleSnapshot: { make: 'BMW', model: 'X5', year: 2021, fuelType: 'diesel' }, approvalPolicy: 'Только после подтверждения владельца', createdAt: '2026-08-10T10:00:00.000Z' }], createdAt: '2026-08-10T09:00:00.000Z', updatedAt: '2026-08-10T10:00:00.000Z' }]

export type MockAutoCareServiceRequest = {
    id: string
    providerId: string
    providerName: string
    locationId: string
    address: string
    definitionId: string
    serviceSlug: string
    serviceLabels: Record<string, string>
    serviceDescription?: string | null
    offeringId: string | null
    priceFromMinor: number | null
    currencyCode: string | null
    offeringSnapshot?: {
        serviceSlug: string
        serviceLabels: Record<string, string>
        description: string | null
        priceFromMinor: number
        priceToMinor: number | null
        currencyCode: string
        durationMinutes: number
        inclusions: string[]
        warrantyText: string | null
        priceType: string
    } | null
    preferredAt: string | null
    timezone?: string | null
    vehicleId?: string | null
    vehicleSnapshot: Record<string, string | number | null> | null
    contactSnapshot: Record<string, string | number | null> | null
    note: string | null
    quote: { amountMinor: number; currencyCode: string; note: string | null; createdAt: string; lineItems?: Array<{ kind: string; title: string; quantity: number; unitPriceMinor: number; totalMinor: number }>; subtotalMinor?: number; taxMinor?: number; feesMinor?: number; priceLocked?: boolean; status?: 'pending' | 'accepted' | 'declined' | 'expired' | 'superseded'; validUntil?: string | null } | null
    quoteHistory: Array<{ id: string; version: number; amountMinor: number; currencyCode: string; note: string | null; createdAt: string; lineItems?: Array<{ kind: string; title: string; quantity: number; unitPriceMinor: number; totalMinor: number }>; subtotalMinor?: number; taxMinor?: number; feesMinor?: number; priceLocked?: boolean; status?: 'pending' | 'accepted' | 'declined' | 'expired' | 'superseded'; validUntil?: string | null }>
    acceptedQuoteVersion?: number | null
    acceptedQuoteSnapshot?: Record<string, unknown> | null
    acceptedQuoteAt?: string | null
    booking?: {
        requestId: string
        quoteVersion: number
        amountMinor: number
        currencyCode: string
        lineItems: Array<{ kind: string; title: string; quantity: number; unitPriceMinor: number; totalMinor: number }>
        scheduledAt: string
        timezone: string
        serviceSlug: string
        providerId: string
        locationId: string
        status: 'confirmed'
        createdAt: string
        bonusDiscountMinor?: number
        payableAmountMinor?: number
        vehicleId?: string | null
        vehicleSnapshot?: Record<string, string | number | null> | null
    } | null
    idempotencyKey: string | null
    idempotencyFingerprint: string
    status: 'draft' | 'open' | 'awaiting_reply' | 'estimate_shared' | 'accepted' | 'declined' | 'cancelled' | 'no_show' | 'closed'
    clientId: string
    clientConfirmedAt: string | null
    providerConfirmedAt: string | null
    cancelledAt?: string | null
    cancelledById?: string | null
    cancellationReason?: string | null
    noShowAt?: string | null
    noShowById?: string | null
    noShowReason?: string | null
    completedAt?: string | null
    completedById?: string | null
    completionNote?: string | null
    reschedule?: {
        id: string
        proposedAt: string
        requestedById: string
        status: 'pending' | 'accepted' | 'rejected'
        reason: string | null
        resolvedById: string | null
        resolutionReason: string | null
        createdAt: string
        resolvedAt: string | null
    } | null
    createdAt: string
    updatedAt: string
}

export const mockAutoCareServiceRequests: MockAutoCareServiceRequest[] = [
    {
        id: 'owner-request-1', providerId: 'api-proservice-moscow', providerName: 'ProService', locationId: 'location-proservice-moscow', address: 'Москва, ул. Льва Толстого, 18', definitionId: 'definition-oil-change', serviceSlug: 'oil-change', serviceLabels: { ru: 'Замена масла', en: 'Oil change' }, serviceDescription: 'Замена масла и масляного фильтра', offeringId: 'offer-api-proservice-moscow-oil-change', priceFromMinor: 290_000, currencyCode: 'RUB', preferredAt: '2026-08-20T11:00:00.000Z', timezone: 'Europe/Moscow', vehicleId: 'mock-vehicle-1', vehicleSnapshot: { make: 'BMW', model: 'X5', year: 2021, fuelType: 'diesel', engineDisplacement: 3, horsepower: 249, color: 'Черный', licensePlate: 'А123ВС163', internalNumber: 'AC-001', vin: 'WBAJU71030L012345' }, contactSnapshot: { name: 'Алексей Смирнов', phone: '+7 999 123-45-67' }, note: 'Нужно подобрать масло и фильтр по VIN.', quote: null, quoteHistory: [], idempotencyKey: null, idempotencyFingerprint: 'seed-1', status: 'open', clientId: 'user-client-1', clientConfirmedAt: null, providerConfirmedAt: null, createdAt: '2026-08-13T09:00:00.000Z', updatedAt: '2026-08-13T09:00:00.000Z',
    },
    {
        id: 'owner-request-2', providerId: 'api-autolux-moscow', providerName: 'АвтоЛюкс', locationId: 'location-autolux-moscow', address: 'Москва, Комсомольский пр-т, 45', definitionId: 'definition-brake-service', serviceSlug: 'brake-service', serviceLabels: { ru: 'Диагностика тормозной системы', en: 'Brake diagnostics' }, serviceDescription: 'Диагностика тормозной системы', offeringId: 'offer-api-autolux-moscow-brake-service', priceFromMinor: 320_000, currencyCode: 'RUB', preferredAt: '2026-08-21T14:00:00.000Z', timezone: 'Europe/Moscow', vehicleSnapshot: { make: 'Toyota', model: 'RAV4', year: 2019 }, contactSnapshot: { name: 'Мария К.', phone: '+7 999 555-11-22' }, note: 'Слышу скрип при торможении, прикладываю фото дисков.', quote: { amountMinor: 450_000, lineItems: [], subtotalMinor: 450_000, taxMinor: 0, feesMinor: 0, currencyCode: 'RUB', note: 'Диагностика, замена колодок при необходимости.', validUntil: null, priceLocked: false, createdAt: '2026-08-12T16:00:00.000Z', status: 'pending' }, quoteHistory: [{ id: 'mock-quote-2-v1', version: 1, amountMinor: 450_000, lineItems: [], subtotalMinor: 450_000, taxMinor: 0, feesMinor: 0, currencyCode: 'RUB', note: 'Диагностика, замена колодок при необходимости.', validUntil: null, priceLocked: false, createdAt: '2026-08-12T16:00:00.000Z', status: 'pending' }], idempotencyKey: null, idempotencyFingerprint: 'seed-2', status: 'estimate_shared', clientId: 'user-client-1', clientConfirmedAt: null, providerConfirmedAt: null, createdAt: '2026-08-12T15:00:00.000Z', updatedAt: '2026-08-12T16:00:00.000Z',
    },
]

// Keep an expired estimate in the mock dataset so the client can verify that
// an unavailable quote is clearly explained and cannot be accepted again.
mockAutoCareServiceRequests.push({
    ...mockAutoCareServiceRequests[1]!,
    id: 'client-request-expired-quote',
    serviceLabels: { ru: 'Тормозная диагностика — смета истекла', en: 'Brake diagnostics — estimate expired' },
    status: 'awaiting_reply',
    quote: {
        ...mockAutoCareServiceRequests[1]!.quote!,
        status: 'expired',
        validUntil: '2026-08-01T12:00:00.000Z',
    },
    quoteHistory: [{
        ...mockAutoCareServiceRequests[1]!.quoteHistory[0]!,
        id: 'mock-quote-expired-v1',
        status: 'expired',
        validUntil: '2026-08-01T12:00:00.000Z',
    }],
    updatedAt: '2026-08-01T12:00:00.000Z',
})

mockAutoCareServiceRequests.push({
    ...mockAutoCareServiceRequests[0]!,
    id: 'client-request-closed',
    status: 'closed',
    clientConfirmedAt: '2026-08-10T11:05:00.000Z',
    providerConfirmedAt: '2026-08-10T11:10:00.000Z',
    preferredAt: '2026-08-10T09:30:00.000Z',
    vehicleId: 'mock-vehicle-1',
    vehicleSnapshot: { make: 'BMW', model: 'X5', year: 2021, fuelType: 'diesel', engineDisplacement: 3, horsepower: 249, color: 'Черный', licensePlate: 'А123ВС163', internalNumber: 'AC-001', vin: 'WBAJU71030L012345' },
    completedAt: '2026-08-10T11:00:00.000Z',
    booking: {
        requestId: 'client-request-closed',
        quoteVersion: 1,
        amountMinor: 290_000,
        currencyCode: 'RUB',
        lineItems: [],
        scheduledAt: '2026-08-10T09:30:00.000Z',
        timezone: 'Europe/Moscow',
        serviceSlug: 'oil-change',
        providerId: 'api-proservice-moscow',
        locationId: 'location-proservice-moscow',
        status: 'confirmed',
        createdAt: '2026-08-09T12:00:00.000Z',
        vehicleId: 'mock-vehicle-1',
        vehicleSnapshot: { make: 'BMW', model: 'X5', year: 2021, licensePlate: 'А123ВС163', internalNumber: 'AC-001', vin: 'WBAJU71030L012345' },
    },
})

mockAutoCareServiceRequests.push({
    ...mockAutoCareServiceRequests[0]!,
    id: 'community-visit-client-2',
    clientId: 'user-client-2',
    status: 'closed',
    clientConfirmedAt: '2026-08-11T12:05:00.000Z',
    providerConfirmedAt: '2026-08-11T12:10:00.000Z',
    preferredAt: '2026-08-11T10:30:00.000Z',
    completedAt: '2026-08-11T12:00:00.000Z',
    createdAt: '2026-08-10T09:00:00.000Z',
    updatedAt: '2026-08-11T12:10:00.000Z',
})

mockFeaturedAutoCareReviews.push({
    id: 'community-review-client-2', providerId: 'api-proservice-moscow', authorName: 'Мария К.', vehicleLabel: 'Toyota RAV4',
    rating: 5, text: 'Смету согласовали заранее, сроки выдержали, а после обслуживания прислали фотоотчёт.',
    avatarUrl: '/images/autocare/avatars/maria.webp', photoUrls: [], createdAt: '2026-08-12T13:00:00.000Z',
    clientId: 'user-client-2', serviceRequestId: 'community-visit-client-2', verifiedVisit: true, serviceSlug: 'oil-change', status: 'approved',
})

// A confirmed request is kept in the mock dataset so the client can exercise
// bonus redemption without having to complete the full provider workflow.
mockAutoCareServiceRequests.push({
    ...mockAutoCareServiceRequests[0]!,
    id: 'client-request-accepted',
    status: 'accepted',
    preferredAt: '2026-09-01T09:30:00.000Z',
    clientConfirmedAt: '2026-08-25T09:00:00.000Z',
    providerConfirmedAt: '2026-08-25T09:05:00.000Z',
    completedAt: null,
    completedById: null,
    booking: {
        requestId: 'client-request-accepted',
        quoteVersion: 1,
        amountMinor: 290_000,
        currencyCode: 'RUB',
        lineItems: [],
        scheduledAt: '2026-09-01T09:30:00.000Z',
        timezone: 'Europe/Moscow',
        serviceSlug: 'oil-change',
        providerId: 'api-proservice-moscow',
        locationId: 'location-proservice-moscow',
        status: 'confirmed',
        createdAt: '2026-08-25T09:00:00.000Z',
        vehicleId: 'mock-vehicle-1',
        vehicleSnapshot: { make: 'BMW', model: 'X5', year: 2021, licensePlate: 'А123ВС163', internalNumber: 'AC-001', vin: 'WBAJU71030L012345' },
    },
})

export const mockAutoCareMessages = new Map<string, ServiceChatMessage[]>()

export const mockAutoCareAttachments = new Map<string, Array<{ id: string; uploadedById: string; contentType: string; bytes: number; status: 'ready'; url: string; createdAt: string; contentBase64: string }>>()

mockAutoCareAttachments.set('owner-request-2', [{
    id: 'chat-report-synthetic-attachment-1',
    uploadedById: 'user-client-1',
    contentType: mockChatReportSyntheticAttachment.contentType,
    bytes: mockChatReportSyntheticAttachment.bytes,
    status: 'ready',
    url: '/api/v1/chats/chat-request-owner-request-2/attachments/chat-report-synthetic-attachment-1',
    createdAt: '2026-08-13T09:15:00.000Z',
    contentBase64: mockChatReportSyntheticAttachment.contentBase64,
}])

export const mockAutoCareChatAttachments = new Map<string, Array<{ id: string; uploadedById: string; contentType: string; bytes: number; status: 'ready'; url: string; createdAt: string; contentBase64: string }>>()

export type MockAutoCareChatThread = {
    id: string
    type: 'service_request' | 'provider_inquiry' | 'support' | 'admin_escalation'
    status: 'open' | 'closed'
    subject: string
    requestId: string | null
    providerId: string | null
    providerName: string | null
    clientId: string | null
    createdById: string | null
    lastMessageAt: string | null
    createdAt: string
    updatedAt: string
}

export const mockAutoCareChatThreads: MockAutoCareChatThread[] = [
    { id: 'chat-inquiry-proservice', type: 'provider_inquiry', status: 'open', subject: 'Вопрос по подбору масла', requestId: null, providerId: 'api-proservice-moscow', providerName: 'ProService', clientId: 'user-client-1', createdById: 'user-client-1', lastMessageAt: '2026-08-14T08:20:00.000Z', createdAt: '2026-08-14T08:15:00.000Z', updatedAt: '2026-08-14T08:20:00.000Z' },
    { id: 'chat-support-owner', type: 'support', status: 'open', subject: 'Не отображается новое расписание', requestId: null, providerId: 'api-proservice-moscow', providerName: 'ProService', clientId: null, createdById: 'user-owner-1', lastMessageAt: '2026-08-14T07:40:00.000Z', createdAt: '2026-08-14T07:30:00.000Z', updatedAt: '2026-08-14T07:40:00.000Z' },
    { id: 'chat-escalation-admin', type: 'admin_escalation', status: 'open', subject: 'Проверка блокировки сервиса', requestId: null, providerId: null, providerName: null, clientId: null, createdById: 'user-admin-1', lastMessageAt: '2026-08-14T06:40:00.000Z', createdAt: '2026-08-14T06:35:00.000Z', updatedAt: '2026-08-14T06:40:00.000Z' },
]

export type MockAutoCareChatReport = {
    id: string
    threadId: string
    messageId: string | null
    reporterId: string
    reportedUserId: string | null
    category: 'spam' | 'harassment' | 'threat' | 'fraud' | 'unsafe' | 'other'
    description: string | null
    acknowledgeFullThreadReview: true
    acknowledgedAt: string
    policyVersion: string
    relatedReportId: string | null
    assignedModeratorId: string | null
    accessExpiresAt: string | null
    extensionUsed: boolean
    status: 'pending' | 'resolved' | 'dismissed'
    reviewedById: string | null
    resolutionReason: string | null
    createdAt: string
    reviewedAt: string | null
    overturnedAt?: string | null
}

export type MockNewChatReportCategory = 'harassment' | 'threat' | 'fraud' | 'other'

export const mockChatReportCategories = ['harassment', 'threat', 'fraud', 'other'] as const

export type MockAutoCareChatBlock = {
    id: string
    threadId: string
    blockerId: string
    blockedUserId: string
    status: 'active' | 'revoked'
    reason: string | null
    sourceReportId: string | null
    expiresAt: string | null
    createdAt: string
    revokedAt: string | null
}

export const mockAutoCareChatReports: MockAutoCareChatReport[] = [{
    id: 'chat-report-demo-1',
    threadId: 'chat-request-owner-request-1',
    messageId: 'mock-message-2',
    reporterId: 'user-client-1',
    reportedUserId: 'user-owner-1',
    category: 'harassment',
    description: 'Проверочный отчёт для очереди модерации: клиент просит проверить переписку и вложения.',
    acknowledgeFullThreadReview: true,
    acknowledgedAt: '2026-08-14T08:25:00.000Z',
    policyVersion: 'chat-report-full-thread-v1',
    relatedReportId: null,
    assignedModeratorId: null,
    accessExpiresAt: null,
    extensionUsed: false,
    status: 'pending',
    reviewedById: null,
    resolutionReason: null,
    createdAt: '2026-08-14T08:09:00.000Z',
    reviewedAt: null,
}, {
    id: 'chat-report-legacy-unanchored',
    threadId: 'chat-inquiry-proservice',
    messageId: null,
    reporterId: 'user-client-1',
    reportedUserId: null,
    category: 'other',
    description: 'Legacy report created before message-level evidence was supported.',
    acknowledgeFullThreadReview: true,
    acknowledgedAt: '2026-07-01T12:00:00.000Z',
    policyVersion: 'legacy-unanchored',
    relatedReportId: null,
    assignedModeratorId: null,
    accessExpiresAt: null,
    extensionUsed: false,
    status: 'pending',
    reviewedById: null,
    resolutionReason: null,
    createdAt: '2026-07-01T12:00:00.000Z',
    reviewedAt: null,
}]

const demoChatReport = mockAutoCareChatReports.find((report) => report.id === 'chat-report-demo-1')

const persistedDemoAssignment = readMockChatReportAssignment()

if (demoChatReport && persistedDemoAssignment && mockUsers.some((user) => user.id === persistedDemoAssignment.moderatorId && user.role === 'admin' && user.status === 'active')) {
    demoChatReport.assignedModeratorId = persistedDemoAssignment.moderatorId
    demoChatReport.accessExpiresAt = persistedDemoAssignment.accessExpiresAt
    demoChatReport.extensionUsed = persistedDemoAssignment.extensionUsed
}

export const mockAutoCareChatBlocks: MockAutoCareChatBlock[] = []

export type MockAutoCareAppeal = {
    id: string
    subject: 'provider' | 'review' | 'suspension' | 'catalog' | 'chat_restriction'
    subjectId: string
    submittedById: string
    providerId: string | null
    reason: string
    evidenceIds: string[]
    status: 'pending' | 'accepted' | 'rejected' | 'withdrawn'
    decidedById: string | null
    decisionReason: string | null
    createdAt: string
    decidedAt: string | null
}

export const mockAutoCareAppeals: MockAutoCareAppeal[] = [{ id: 'appeal-demo-1', subject: 'provider', subjectId: 'api-proservice-moscow', submittedById: 'user-owner-1', providerId: 'api-proservice-moscow', reason: 'Просим пересмотреть решение по публикации профиля после загрузки подтверждающих документов.', evidenceIds: [], status: 'pending', decidedById: null, decisionReason: null, createdAt: '2026-08-14T09:00:00.000Z', decidedAt: null }]

type MockAdminAutoCareModerationEvidence = {
    id: string
    providerId: string
    kind: 'provider_cover' | 'provider_gallery' | 'provider_document' | 'registration_document' | 'review'
    label: string
    status: 'pending' | 'approved' | 'rejected'
    reference: string | null
    notes: string | null
    expiresAt: string | null
    createdAt: string
    verifiedAt: string | null
    provider: { id: string; name: string; address: string | null }
    review: { id: string; authorName: string; vehicleLabel: string; rating: number; text: string; photoUrls: string[]; createdAt: string; status: 'pending' | 'approved' | 'rejected' } | null
}

export const mockAdminAutoCareModerationEvidence: MockAdminAutoCareModerationEvidence[] = [{
    id: 'evidence-demo-provider-cover',
    providerId: 'api-proservice-moscow',
    kind: 'provider_cover',
    label: 'Главное фото сервиса',
    status: 'pending',
    reference: autoCareProviders[0]?.coverImageUrl ?? null,
    notes: 'Ожидает проверки публичного медиа.',
    expiresAt: null,
    createdAt: '2026-08-18T09:30:00.000Z',
    verifiedAt: null,
    provider: { id: 'api-proservice-moscow', name: 'ProService', address: 'Москва, ул. Льва Толстого, 18' },
    review: null,
}, {
    id: 'evidence-demo-review',
    providerId: 'api-proservice-moscow',
    kind: 'review',
    label: 'Отзыв о подтверждённом визите',
    status: 'pending',
    reference: 'review-demo-evidence',
    notes: 'Ожидает модерации текста и приложенных материалов.',
    expiresAt: null,
    createdAt: '2026-08-18T10:00:00.000Z',
    verifiedAt: null,
    provider: { id: 'api-proservice-moscow', name: 'ProService', address: 'Москва, ул. Льва Толстого, 18' },
    review: { id: 'review-demo-evidence', authorName: 'Алексей С.', vehicleLabel: 'BMW X5', rating: 5, text: 'Работы выполнили в согласованный срок, стоимость не изменилась.', photoUrls: [], createdAt: '2026-08-18T09:55:00.000Z', status: 'pending' },
}, {
    id: 'evidence-demo-provider-document',
    providerId: 'api-proservice-moscow',
    kind: 'provider_document',
    label: 'Лицензия и регистрационные данные',
    status: 'pending',
    reference: 'private://provider-documents/api-proservice-moscow/license-2026.pdf',
    notes: 'Ожидает проверки регистрационных данных сервиса.',
    expiresAt: '2027-12-31T00:00:00.000Z',
    createdAt: '2026-08-18T11:00:00.000Z',
    verifiedAt: null,
    provider: { id: 'api-proservice-moscow', name: 'ProService', address: 'Москва, ул. Льва Толстого, 18' },
    review: null,
}]

export const mockAutoCareChatMessages = new Map<string, ServiceChatMessage[]>([
    ['chat-inquiry-proservice', [{ id: 'chat-message-1', senderId: 'user-client-1', kind: 'text', body: 'Здравствуйте! Можно ли подобрать масло по VIN и сколько займёт работа?', offer: null, deliveredAt: '2026-08-14T08:16:00.000Z', readAt: null, createdAt: '2026-08-14T08:16:00.000Z' }, { id: 'chat-message-2', senderId: 'user-owner-1', kind: 'text', body: 'Да, пришлите VIN и фото текущего фильтра — проверим совместимость.', offer: null, deliveredAt: '2026-08-14T08:20:00.000Z', readAt: null, createdAt: '2026-08-14T08:20:00.000Z' }]],
    ['chat-support-owner', [{ id: 'chat-message-3', senderId: 'user-owner-1', kind: 'text', body: 'После сохранения расписания новые слоты не видны клиентам.', offer: null, deliveredAt: '2026-08-14T07:31:00.000Z', readAt: null, createdAt: '2026-08-14T07:31:00.000Z' }, { id: 'chat-message-4', senderId: 'user-admin-1', kind: 'text', body: 'Проверяем кэш расписания, вернёмся с результатом в этом чате.', offer: null, deliveredAt: '2026-08-14T07:40:00.000Z', readAt: null, createdAt: '2026-08-14T07:40:00.000Z' }]],
    ['chat-escalation-admin', [{ id: 'chat-message-5', senderId: 'user-admin-1', kind: 'text', body: 'Нужна консультация по блокировке повторного нарушителя.', offer: null, deliveredAt: '2026-08-14T06:40:00.000Z', readAt: null, createdAt: '2026-08-14T06:40:00.000Z' }]],
])

mockAutoCareMessages.set('owner-request-1', [
    { id: 'mock-message-1', senderId: 'user-client-1', kind: 'text', body: 'Здравствуйте! Подскажите, какое масло подойдёт по VIN?', offer: null, deliveredAt: '2026-08-14T08:05:00.000Z', readAt: '2026-08-14T08:06:00.000Z', createdAt: '2026-08-14T08:05:00.000Z' },
    { id: 'mock-message-2', senderId: 'user-owner-1', kind: 'text', body: 'Добрый день! Проверим VIN и предложим два варианта по цене.', offer: null, deliveredAt: '2026-08-14T08:07:00.000Z', readAt: null, createdAt: '2026-08-14T08:07:00.000Z' },
    { id: 'mock-message-3', senderId: 'user-owner-1', kind: 'offer', body: 'Предложение по заявке', offer: { type: 'discount', title: 'Скидка 15% на замену масла', description: 'Действует при записи в течение 7 дней. В стоимость входит масло и фильтр.', discountPercent: 15, couponCode: 'AC-OIL15', amountMinor: null, currencyCode: 'RUB', expiresAt: '2026-08-21T23:59:59.000Z', status: 'pending' }, deliveredAt: '2026-08-14T08:08:00.000Z', readAt: null, createdAt: '2026-08-14T08:08:00.000Z' },
])

mockAutoCareMessages.set('owner-request-2', [
    { id: 'mock-message-report-fixture', senderId: 'user-owner-1', kind: 'text', body: 'Сначала проверим состояние тормозных колодок и согласуем стоимость до ремонта.', offer: null, deliveredAt: '2026-08-13T09:20:00.000Z', readAt: null, createdAt: '2026-08-13T09:20:00.000Z' },
    { id: 'mock-message-4', senderId: 'user-owner-1', kind: 'offer', body: 'Альтернативный вариант', offer: { type: 'alternative', title: 'Диагностика тормозов сегодня', description: 'Можем начать с бесплатной проверки дисков, а замену выполнить после согласования.', discountPercent: null, couponCode: null, amountMinor: 0, currencyCode: 'RUB', expiresAt: null, status: 'pending' }, deliveredAt: '2026-08-13T09:30:00.000Z', readAt: null, createdAt: '2026-08-13T09:30:00.000Z' },
])

export type MockAutoCareReviewPromo = {
    id: string
    reviewId: string
    providerId: string
    clientId: string
    serviceRequestId: string | null
    serviceSlug: string | null
    code: string
    discountPercent: number
    status: 'active' | 'redeemed' | 'revoked' | 'expired'
    expiresAt: string
    redeemedAt: string | null
}

export const mockAutoCareReviewPromos: MockAutoCareReviewPromo[] = []

type MockAutoCareBonusProgram = {
    id: string
    providerId: string
    name: string
    earnPercent: number
    maxEarnPointsPerVisit: number | null
    expiresAfterDays: number | null
    active: boolean
    createdAt: string
    updatedAt: string
}

export type MockAutoCareBonusAccount = {
    id: string
    clientId: string
    providerId: string
    balancePoints: number
    earnedPoints: number
    redeemedPoints: number
    entries: Array<{ id: string; type: 'earn' | 'redeem' | 'refund' | 'expire' | 'adjustment'; points: number; reason: string; requestId: string | null; expiresAt: string | null; createdAt: string }>
}

export type MockAutoCareProviderInvitation = {
    id: string
    providerId: string
    email: string
    locationId: string | null
    role: 'manager' | 'staff'
    status: 'pending' | 'accepted' | 'revoked' | 'expired'
    expiresAt: string
    acceptedAt: string | null
    revokedAt: string | null
    createdAt: string
    inviteToken: string | null
}

export type MockAutoCareProviderChangeRequest = {
    id: string
    providerId: string
    requestedById: string
    kind: 'verification' | 'profile_update'
    status: 'pending' | 'approved' | 'rejected' | 'cancelled'
    payload: Record<string, unknown>
    reviewedById: string | null
    reviewReason: string | null
    reviewedAt: string | null
    createdAt: string
    updatedAt: string
}

export type MockAutoCareCatalogGapRequest = {
    id: string
    requestedById: string
    providerId: string | null
    proposedSlug: string
    categorySlug: string
    labels: Record<string, string>
    priceType: 'fixed' | 'from' | 'range' | 'quote_required'
    comparisonAttributes: string[]
    rationale: string
    status: 'pending' | 'approved' | 'rejected'
    reviewedById: string | null
    reviewReason: string | null
    reviewedAt: string | null
    createdAt: string
    updatedAt: string
}

// A deterministic pending invitation keeps the acceptance flow testable in
// mock mode without first creating data in the owner UI. The invitee is the
// seeded branch-scoped staff account from data/users.ts.
export const mockAutoCareProviderInvitations: MockAutoCareProviderInvitation[] = [{
    id: 'provider-invite-staff-proservice',
    providerId: 'api-proservice-moscow',
    email: 'ilya.orlov@proservice.test',
    locationId: 'location-proservice-moscow',
    role: 'staff',
    status: 'pending',
    expiresAt: '2026-09-05T10:00:00.000Z',
    acceptedAt: null,
    revokedAt: null,
    createdAt: '2026-08-29T10:00:00.000Z',
    inviteToken: 'mock-invite-staff-proservice',
}]

export const mockAutoCareProviderChangeRequests: MockAutoCareProviderChangeRequest[] = []

export const mockAutoCareCatalogGapRequests: MockAutoCareCatalogGapRequest[] = []

export type MockAutoCareProviderMembership = {
    id: string
    providerId: string
    userId: string
    locationId: string | null
    role: 'owner' | 'manager' | 'staff'
    status: 'active' | 'revoked'
    createdAt: string
}

export type MockManagedProviderAssignment = {
    providerId: string
    locationId: string | null
    role: MockAutoCareProviderMembership['role']
}

export const mockAutoCareProviderMemberships = new Map<string, MockAutoCareProviderMembership[]>([
    ['api-proservice-moscow', [
        { id: 'membership-owner-proservice', providerId: 'api-proservice-moscow', userId: 'user-owner-1', locationId: null, role: 'owner', status: 'active', createdAt: '2026-08-01T10:00:00.000Z' },
        { id: 'membership-staff-proservice-moscow', providerId: 'api-proservice-moscow', userId: 'user-staff-proservice-1', locationId: 'location-proservice-moscow', role: 'staff', status: 'active', createdAt: '2026-08-20T08:00:00.000Z' },
    ]],
    ['api-autolux-moscow', [
        { id: 'membership-owner-autolux', providerId: 'api-autolux-moscow', userId: 'user-owner-1', locationId: null, role: 'owner', status: 'active', createdAt: '2026-08-01T10:00:00.000Z' },
    ]],
])

export const mockAutoCareBonusPrograms = new Map<string, MockAutoCareBonusProgram>([
    ['api-proservice-moscow', { id: 'bonus-program-proservice', providerId: 'api-proservice-moscow', name: 'ProService Bonus', earnPercent: 5, maxEarnPointsPerVisit: null, expiresAfterDays: 365, active: true, createdAt: '2026-08-01T10:00:00.000Z', updatedAt: '2026-08-01T10:00:00.000Z' }],
])

export const mockAutoCareBonusAccounts: MockAutoCareBonusAccount[] = [{
    id: 'bonus-account-client-proservice', clientId: 'user-client-1', providerId: 'api-proservice-moscow', balancePoints: 1490, earnedPoints: 1800, redeemedPoints: 350,
    entries: [
        { id: 'bonus-entry-1', type: 'earn', points: 1800, reason: 'Бонус за завершённый визит', requestId: null, expiresAt: '2027-08-01T10:00:00.000Z', createdAt: '2026-08-01T10:00:00.000Z' },
        { id: 'bonus-entry-2', type: 'redeem', points: -350, reason: 'Списание при записи на услугу', requestId: null, expiresAt: null, createdAt: '2026-08-10T10:00:00.000Z' },
        { id: 'bonus-entry-3', type: 'refund', points: 120, reason: 'Возврат бонусов после отмены записи', requestId: 'owner-request-2', expiresAt: '2027-08-15T10:00:00.000Z', createdAt: '2026-08-15T10:00:00.000Z' },
        { id: 'bonus-entry-4', type: 'expire', points: -80, reason: 'Истёк срок действия бонусов', requestId: null, expiresAt: '2026-08-12T10:00:00.000Z', createdAt: '2026-08-12T10:00:00.000Z' },
    ],
}]

export const mockProviderWorkspacePermissions: Record<MockAutoCareProviderMembership['role'], readonly string[]> = {
    owner: ['analytics', 'calendar', 'catalog', 'chats', 'profile', 'requests', 'reviews', 'team', 'bonuses'],
    manager: ['analytics', 'calendar', 'catalog', 'chats', 'requests', 'reviews'],
    staff: ['calendar', 'chats', 'requests'],
}

export const mockNotifications: Notification[] = [
    {
        id: 'notification-1',
        userId: 'user-client-1',
        category: 'booking',
        title: 'Booking confirmed',
        message: 'Your booking in Cabinet 1 was confirmed.',
        link: '/profile/bookings',
        metadata: {},
        readAt: null,
        createdAt: '2026-02-01T10:00:00.000Z',
    } as Notification & { userId: string },
    {
        id: 'notification-2',
        userId: 'user-owner-1',
        category: 'booking',
        title: 'New booking request',
        message: 'A client requested a booking in Cabinet 1.',
        link: '/owner/bookings',
        metadata: {},
        readAt: '2026-02-01T12:00:00.000Z',
        createdAt: '2026-02-01T09:30:00.000Z',
    } as Notification & { userId: string },
]

type MockSystemIncident = {
    id: string
    type: 'server_error' | 'health_check' | 'background_job'
    severity: 'warning' | 'critical'
    status: 'open' | 'acknowledged' | 'resolved'
    title: string
    requestId: string | null
    metadata: Record<string, unknown>
    occurrenceCount: number
    firstOccurredAt: string
    lastOccurredAt: string
    acknowledgedAt: string | null
    resolvedAt: string | null
}

export const mockSystemIncidents: MockSystemIncident[] = [
    {
        id: 'incident-1',
        type: 'server_error',
        severity: 'critical',
        status: 'open',
        title: 'Unhandled server error',
        requestId: 'mock-request-0001',
        metadata: { route: '/bookings', statusCode: 500 },
        occurrenceCount: 2,
        firstOccurredAt: '2026-07-16T08:00:00.000Z',
        lastOccurredAt: '2026-07-16T08:10:00.000Z',
        acknowledgedAt: null,
        resolvedAt: null,
    },
]

export type MockSecurityEvent = {
    id: string
    userId: string | null
    type: 'login_failed' | 'account_locked' | 'refresh_token_reuse' | 'rate_limit_exceeded' | 'invalid_token' | 'csrf_violation' | 'route_scan' | 'malformed_request' | 'oversized_request' | 'privilege_denied' | 'webhook_abuse' | 'mutation_burst'
    severity: 'info' | 'warning' | 'high' | 'critical'
    status: 'open' | 'acknowledged' | 'investigating' | 'resolved' | 'suppressed'
    assigneeId: string | null
    failedLoginAttempts: number | null
    lockedUntil: string | null
    ipAddress: string | null
    userAgent: string | null
    correlationId: string | null
    requestId: string | null
    method: string | null
    route: string | null
    statusCode: number | null
    actorRole: 'client' | 'owner' | 'admin' | 'super_admin' | null
    authOutcome: 'unknown' | 'anonymous' | 'authenticated' | 'failed'
    rateLimitResult: 'not_checked' | 'allowed' | 'blocked'
    requestSizeBytes: number | null
    reasonCode: string | null
    proxyProvenance: 'unknown' | 'direct' | 'trusted_proxy' | 'forwarded_header_untrusted'
    metadata: Record<string, unknown>
    createdAt: string
    lastAction: {
        status: 'acknowledged' | 'investigating' | 'resolved' | 'suppressed'
        operatorNote: string | null
        actorId: string
        assigneeId: string | null
        createdAt: string
    } | null
    actionTimeline: Array<{
        id: string
        status: 'acknowledged' | 'investigating' | 'resolved' | 'suppressed'
        operatorNote: string | null
        actorId: string
        assigneeId: string | null
        createdAt: string
    }>
    relatedAuditLogs: Array<{
        id: string
        action: string
        targetType: string | null
        correlationId: string | null
        createdAt: string
    }>
    relatedSystemIncidents: Array<{
        id: string
        type: 'server_error' | 'health_check' | 'background_job'
        severity: 'warning' | 'critical'
        status: 'open' | 'acknowledged' | 'resolved'
        title: string
        requestId: string | null
        occurrenceCount: number
        firstOccurredAt: string
        lastOccurredAt: string
    }>
}

export type MockSecurityMitigation = {
    id: string
    kind: 'ip_block'
    displayValue: string
    reason: string
    expiresAt: string
    revokedAt: string | null
    createdBy: string
    revokedBy: string | null
    createdAt: string
    status: 'active' | 'expired' | 'revoked'
}

export const mockSecurityEvents: MockSecurityEvent[] = [
    {
        id: 'security-event-1',
        userId: 'mock-user-1',
        type: 'login_failed',
        severity: 'warning',
        status: 'open',
        assigneeId: null,
        failedLoginAttempts: 2,
        lockedUntil: null,
        ipAddress: '192.0.2.*',
        userAgent: 'AutoCare Hub mock browser',
        correlationId: 'mock-request-security-1',
        requestId: 'mock-request-security-1',
        method: 'POST',
        route: '/auth/login',
        statusCode: 401,
        actorRole: null,
        authOutcome: 'failed',
        rateLimitResult: 'not_checked',
        requestSizeBytes: 96,
        reasonCode: 'invalid_credentials',
        proxyProvenance: 'direct',
        metadata: { errorCode: 'UNAUTHORIZED', failedLoginAttempts: 2 },
        createdAt: '2026-07-16T08:20:00.000Z',
        lastAction: null,
        actionTimeline: [],
        relatedAuditLogs: [],
        relatedSystemIncidents: [],
    },
]

export const mockSecurityMitigations: MockSecurityMitigation[] = []

export type MockAccountDeletionRequest = {
    id: string
    status: 'pending' | 'cancelled' | 'completed'
    requestedAt: string
    cancelledAt: string | null
    completedAt: string | null
}

export const mockAccountDeletionRequests = new Map<string, MockAccountDeletionRequest>()

export function allocateMockCommunityProfileId() { return nextMockCommunityProfileId++ }
