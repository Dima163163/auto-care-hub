import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import type { User } from '@/entities/user'
import { getVehicleImage, type ClientVehicle, type CreateClientVehicleInput } from '@/entities/user/model/vehicles'
import type { Notification } from '@/entities/notification/model/types'
import {
    isDeploymentOAuthProviderEnabled,
    STATIC_DEPLOYMENT_CAPABILITIES,
    type DeploymentOAuthProvider,
} from '@/shared/config/deployment'
import {
    automotiveServices,
    vehicleCatalog,
    providerPreviews,
    supportsVehicleBrand,
    type AutoCareApiProvider,
} from '@/entities/automotive-service'
import { emitMockAutoCareChatEvent, emitMockServiceChatEvent, type ServiceChatMessage } from '@/entities/automotive-service/lib/service-chat'

import {
    mockBookings,
    mockCabinets,
    mockReviews,
    mockServices,
    mockUsers,
} from './data'
import { mockSession, clearMockSession, setMockSession } from './session'
import { parseMockJson } from './parseMockJson'
import { isMockEmpty, mockScenarioResponse } from './mock-scenario'

const loginRequestSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
})

const registerRequestSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(1),
    role: z.enum(['client', 'owner']),
})

const bookingRequestSchema = z.object({
    clientId: z.string().min(1).optional(),
    cabinetId: z.string().min(1),
    serviceId: z.string().min(1),
    date: z.string().min(1),
    startTime: z.string().min(1),
    endTime: z.string().min(1),
    status: z.enum(['pending', 'confirmed']),
    comment: z.string().optional(),
})

const ownerActionCenterEventSchema = z.object({
    action: z.enum([
        'pending_bookings',
        'reschedule_requests',
        'draft_cabinets',
        'blocked_cabinets',
        'readiness',
    ]),
})

const clientExperimentEventSchema = z.object({
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

function invalidMockBodyResponse() {
    return HttpResponse.json(
        { code: 'INVALID_REQUEST_BODY', message: 'Invalid request body.' },
        { status: 400 },
    )
}

const mockFavoritesByUser = new Map<string, string[]>()
const mockAutoCareProviderActivity = new Map<string, { impressions: number; profileOpens: number }>()
const mockOAuthIdentitiesByUser = new Map<string, Set<'google' | 'yandex'>>()
const mockVehiclesByUser = new Map<string, ClientVehicle[]>([
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
        imageUrl: getVehicleImage('bmw', 'X5'),
        isPrimary: true,
        createdAt: '2026-05-24T10:00:00.000Z',
    }]],
])

function getMockVehicles(userId: string) {
    const vehicles = mockVehiclesByUser.get(userId)
    if (vehicles) return vehicles

    const next: ClientVehicle[] = []
    mockVehiclesByUser.set(userId, next)
    return next
}

const autoCareMarket = {
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

const autoCareMarkets = [
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

type MockSuperAdminMarket = {
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

type MockSuperAdminCountry = {
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

type MockSuperAdminZone = {
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

const editableAutoCareMarkets = autoCareMarkets as unknown as MockSuperAdminMarket[]
const superAdminMarketCountries: MockSuperAdminCountry[] = Array.from(
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

function toMockMarket(market: MockSuperAdminMarket) {
    return {
        ...market,
        capabilities: market.capabilities ?? {},
        legalLinks: market.legalLinks ?? {},
    }
}

function toMockZone(zone: MockSuperAdminZone) {
    return {
        ...zone,
        displayOrder: zone.displayOrder ?? 0,
        active: zone.active ?? true,
    }
}

function hasMockSuperAdminAccess() {
    return currentMockUser()?.role === 'super_admin'
}

const autoCareLocationZones = [
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
const autoCareDefinitions: MockAutoCareDefinition[] = automotiveServices.map((service) => ({
    id: `definition-${service.id}`,
    slug: service.id,
    categorySlug: service.id,
    labels: service.labels,
    priceType: 'from' as const,
    comparisonAttributes: ['price', 'rating', 'distance', 'nextSlot'],
    active: true,
}))

const reviewPhotoAssets = [
    '/images/autocare/providers/generated/review-oil-change.webp',
    '/images/autocare/providers/generated/review-tire-service.webp',
    '/images/autocare/providers/generated/review-detailing.webp',
    '/images/autocare/providers/generated/review-body-repair.webp',
]

type MockAutoCareReview = {
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
    serviceRequestId?: string | null
    serviceSlug?: string | null
    revisionAllowedUntil?: string | null
    revisionUsedAt?: string | null
    status?: 'pending' | 'approved' | 'rejected'
}

const mockFeaturedAutoCareReviews: MockAutoCareReview[] = [
    { id: 'featured-review-1', providerId: 'api-proservice-moscow', authorName: 'Алексей С.', vehicleLabel: 'BMW X5', rating: 5, text: 'Быстро приняли машину, заранее объяснили стоимость и прислали понятный фотоотчёт.', avatarUrl: '/images/autocare/avatars/alexey.webp', photoUrls: [reviewPhotoAssets[0]], createdAt: '2026-08-12T10:00:00.000Z', clientId: 'user-client-1', serviceRequestId: 'owner-request-1', serviceSlug: 'oil-change' },
    { id: 'featured-review-2', providerId: 'api-autolux-moscow', authorName: 'Мария К.', vehicleLabel: 'Toyota RAV4', rating: 4, text: 'Удобная запись и внимательный мастер. Итоговая цена совпала с предварительной оценкой.', avatarUrl: '/images/autocare/avatars/maria.webp', photoUrls: [reviewPhotoAssets[2]], createdAt: '2026-08-05T10:00:00.000Z' },
    { id: 'featured-review-3', providerId: 'api-formula-moscow', authorName: 'Игорь П.', vehicleLabel: 'Skoda Octavia', rating: 3, text: 'Работу выполнили, но пришлось немного подождать. Специалист подробно ответил на вопросы.', avatarUrl: '/images/autocare/avatars/igor.webp', photoUrls: [reviewPhotoAssets[1]], createdAt: '2026-07-29T10:00:00.000Z' },
    { id: 'featured-review-4', providerId: 'api-proservice-moscow', authorName: 'Ольга Н.', vehicleLabel: 'Volkswagen Tiguan', rating: 2, text: 'Цена оказалась выше ожиданий, зато сервис оперативно объяснил состав работ и предложил решение.', avatarUrl: null, photoUrls: [], createdAt: '2026-07-21T10:00:00.000Z' },
    ...Array.from({ length: 24 }, (_, index) => {
        const providers = ['api-proservice-moscow', 'api-autolux-moscow'] as const
        const names = ['Сергей В.', 'Елена Р.', 'Дмитрий Л.', 'Наталья А.', 'Андрей К.', 'Виктор М.', 'Полина Т.', 'Роман Д.']
        const vehicles = ['Kia Sportage', 'Hyundai Tucson', 'Ford Focus', 'Mazda CX-5', 'Volvo XC60', 'Honda CR-V', 'Renault Duster', 'Nissan X-Trail']
        const ratings = [5, 4, 3, 2, 1] as const
        const photoUrls = index % 5 === 3 ? [] : [reviewPhotoAssets[index % reviewPhotoAssets.length], ...(index % 6 === 0 ? [reviewPhotoAssets[(index + 1) % reviewPhotoAssets.length]] : [])]
        return {
            id: `featured-review-generated-${index + 1}`,
            providerId: providers[index % providers.length],
            authorName: names[index % names.length]!,
            vehicleLabel: vehicles[index % vehicles.length]!,
            rating: ratings[index % ratings.length]!,
            text: index % 5 === 4
                ? 'Остались вопросы по срокам, но сервис быстро вышел на связь и предложил понятное решение.'
                : 'Мастер заранее объяснил состав работ, прислал фотографии и выдал автомобиль в согласованное время.',
            avatarUrl: null,
            photoUrls,
            createdAt: new Date(Date.UTC(2026, 7, 19 - index, 10, 0, 0)).toISOString(),
        }
    }),
]

type MockPlatformReview = {
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
}

const mockPlatformReviews: MockPlatformReview[] = [
    { id: 'platform-review-1', authorName: 'Алексей С.', avatarUrl: '/images/autocare/avatars/alexey.webp', authorRole: 'Водитель BMW X5', rating: 5, text: 'Наконец-то можно сравнить сервисы по цене и отзывам в одном месте. Запись прошла без звонков.', status: 'approved', organizationResponse: null, organizationRespondedAt: null, createdAt: '2026-08-12T10:00:00.000Z', clientId: 'user-client-1' },
    { id: 'platform-review-2', authorName: 'Мария К.', avatarUrl: '/images/autocare/avatars/maria.webp', authorRole: 'Водитель Toyota RAV4', rating: 5, text: 'Очень удобно видеть свободное время, реальные отзывы и переписку с сервисом в одном кабинете.', status: 'approved', organizationResponse: 'Спасибо за доверие! Мы продолжим проверять качество сервисов и улучшать поиск.', organizationRespondedAt: '2026-08-08T12:00:00.000Z', createdAt: '2026-08-05T10:00:00.000Z', clientId: 'user-client-2' },
    { id: 'platform-review-3', authorName: 'Игорь П.', avatarUrl: '/images/autocare/avatars/igor.webp', authorRole: 'Водитель Skoda Octavia', rating: 4, text: 'Понравилось, что можно заранее отправить фотографии повреждений и получить понятную оценку.', status: 'approved', organizationResponse: null, organizationRespondedAt: null, createdAt: '2026-07-29T10:00:00.000Z', clientId: 'user-client-1' },
    { id: 'platform-review-4', authorName: 'Ольга Н.', avatarUrl: null, authorRole: 'Водитель Volkswagen Tiguan', rating: 3, text: 'Хочется больше сервисов в небольших городах, но для Москвы сравнение уже очень полезное.', status: 'pending', organizationResponse: null, organizationRespondedAt: null, createdAt: '2026-07-21T10:00:00.000Z', clientId: 'user-client-1' },
]

function toAutoCareOffer(providerId: string, serviceId: string, price: number, priceType: 'fixed' | 'from' | 'range' | 'quote_required' = 'from') {
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
        rating: provider.rating,
        reviewCount: provider.reviewCount,
        bonusSummary: provider.bonus ?? null,
        phone: '+7 (495) 645-35-35',
        phones: ['+7 (495) 645-35-35'],
        email: 'service@example.com',
        websiteUrl: null,
        metroStation: 'м. Парк культуры',
        workstationCount: provider.id === 'proservice-moscow' ? 12 : 8,
        warrantyText: 'Гарантия на работы 12 месяцев',
        logoUrl: provider.logoUrl ?? null,
        brandSpecializations: [...provider.brandSpecializations],
        isMultibrand: provider.isMultibrand,
        coverImageUrl: provider.image ?? null,
        galleryImageUrls: provider.image ? [provider.image] : [],
        amenityIds: ['waiting_room', 'customer_parking', 'wifi', 'online_booking', 'coffee', 'card_payment'],
        location: {
            id: `location-${provider.id}`,
            marketId: autoCareMarket.id,
            address: provider.id === 'proservice-moscow' ? 'Москва, ул. Льва Толстого, 18' : 'Москва, Комсомольский пр-т, 45',
            zoneId: null,
            hours: 'Пн–Вс: 08:00–21:00',
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

const autoCareProviders = providerPreviews.map(toAutoCareProvider)
type OwnerAutoCareProviderMock = AutoCareApiProvider & {
    serviceIds: readonly string[]
    servicePrices: Partial<Record<string, number>>
}
const ownerAutoCareProviders: OwnerAutoCareProviderMock[] = autoCareProviders.slice(0, 2).map((provider) => ({ ...provider }))
const mockAutoCareFavorites = new Map<string, Set<string>>([
    ['user-client-1', new Set(['api-proservice-moscow'])],
])
const mockProviderLogos = new Map<string, string>()
const mockProviderMedia = new Map<string, string>()

const mockAutoCareTrustEvidence = autoCareProviders.flatMap((provider) => [
    { id: `evidence-${provider.id}-license`, providerId: provider.id, kind: 'license', label: 'Документы сервиса проверены', status: 'verified', expiresAt: null, verifiedAt: '2026-08-01T10:00:00.000Z' },
    { id: `evidence-${provider.id}-reviews`, providerId: provider.id, kind: 'reviews', label: 'Отзывы подтверждены визитами', status: 'verified', expiresAt: null, verifiedAt: '2026-08-01T10:00:00.000Z' },
])
const mockAutoCareRepairEvents = new Map<string, Array<Record<string, unknown>>>()
const mockAutoCareBroadcastRequests: Array<Record<string, unknown>> = []
const mockAutoCareGuaranteeClaims: Array<Record<string, unknown>> = []
const mockAutoCareExpertQuestions: Array<Record<string, unknown>> = []
const mockAutoCareFleets: Array<Record<string, unknown>> = [{ id: 'fleet-demo', ownerId: 'user-owner-1', name: 'Автопарк ProService', notes: 'Согласование через диспетчера', vehicles: [{ id: 'fleet-vehicle-demo', fleetId: 'fleet-demo', label: 'BMW X5 · AC-001', vehicleSnapshot: { make: 'BMW', model: 'X5', year: 2021, fuelType: 'diesel' }, approvalPolicy: 'Только после подтверждения владельца', createdAt: '2026-08-10T10:00:00.000Z' }], createdAt: '2026-08-10T09:00:00.000Z', updatedAt: '2026-08-10T10:00:00.000Z' }]

type MockAutoCareServiceRequest = {
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
    vehicleSnapshot: Record<string, string | number | null> | null
    contactSnapshot: Record<string, string | number | null> | null
    note: string | null
    quote: { amountMinor: number; currencyCode: string; note: string | null; createdAt: string } | null
    quoteHistory: Array<{ id: string; version: number; amountMinor: number; currencyCode: string; note: string | null; createdAt: string }>
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

const mockAutoCareServiceRequests: MockAutoCareServiceRequest[] = [
    {
        id: 'owner-request-1', providerId: 'api-proservice-moscow', providerName: 'ProService', locationId: 'location-proservice-moscow', address: 'Москва, ул. Льва Толстого, 18', definitionId: 'definition-oil-change', serviceSlug: 'oil-change', serviceLabels: { ru: 'Замена масла', en: 'Oil change' }, serviceDescription: 'Замена масла и масляного фильтра', offeringId: 'offer-api-proservice-moscow-oil-change', priceFromMinor: 290_000, currencyCode: 'RUB', preferredAt: '2026-08-20T11:00:00.000Z', vehicleSnapshot: { make: 'BMW', model: 'X5', year: 2021 }, contactSnapshot: { name: 'Алексей Смирнов', phone: '+7 999 123-45-67' }, note: 'Нужно подобрать масло и фильтр по VIN.', quote: null, quoteHistory: [], idempotencyKey: null, idempotencyFingerprint: 'seed-1', status: 'open', clientId: 'user-client-1', clientConfirmedAt: null, providerConfirmedAt: null, createdAt: '2026-08-13T09:00:00.000Z', updatedAt: '2026-08-13T09:00:00.000Z',
    },
    {
        id: 'owner-request-2', providerId: 'api-autolux-moscow', providerName: 'АвтоЛюкс', locationId: 'location-autolux-moscow', address: 'Москва, Комсомольский пр-т, 45', definitionId: 'definition-brake-service', serviceSlug: 'brake-service', serviceLabels: { ru: 'Диагностика тормозной системы', en: 'Brake diagnostics' }, serviceDescription: 'Диагностика тормозной системы', offeringId: 'offer-api-autolux-moscow-brake-service', priceFromMinor: 320_000, currencyCode: 'RUB', preferredAt: '2026-08-21T14:00:00.000Z', vehicleSnapshot: { make: 'Toyota', model: 'RAV4', year: 2019 }, contactSnapshot: { name: 'Мария К.', phone: '+7 999 555-11-22' }, note: 'Слышу скрип при торможении, прикладываю фото дисков.', quote: { amountMinor: 450_000, currencyCode: 'RUB', note: 'Диагностика, замена колодок при необходимости.', createdAt: '2026-08-12T16:00:00.000Z' }, quoteHistory: [{ id: 'mock-quote-2-v1', version: 1, amountMinor: 450_000, currencyCode: 'RUB', note: 'Диагностика, замена колодок при необходимости.', createdAt: '2026-08-12T16:00:00.000Z' }], idempotencyKey: null, idempotencyFingerprint: 'seed-2', status: 'estimate_shared', clientId: 'user-client-1', clientConfirmedAt: null, providerConfirmedAt: null, createdAt: '2026-08-12T15:00:00.000Z', updatedAt: '2026-08-12T16:00:00.000Z',
    },
]
const mockAutoCareMessages = new Map<string, ServiceChatMessage[]>()
const mockAutoCareAttachments = new Map<string, Array<{ id: string; uploadedById: string; contentType: string; bytes: number; status: 'ready'; url: string; createdAt: string; contentBase64: string }>>()
const mockAutoCareChatAttachments = new Map<string, Array<{ id: string; uploadedById: string; contentType: string; bytes: number; status: 'ready'; url: string; createdAt: string; contentBase64: string }>>()
type MockAutoCareChatThread = {
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
const mockAutoCareChatThreads: MockAutoCareChatThread[] = [
    { id: 'chat-inquiry-proservice', type: 'provider_inquiry', status: 'open', subject: 'Вопрос по подбору масла', requestId: null, providerId: 'api-proservice-moscow', providerName: 'ProService', clientId: 'user-client-1', createdById: 'user-client-1', lastMessageAt: '2026-08-14T08:20:00.000Z', createdAt: '2026-08-14T08:15:00.000Z', updatedAt: '2026-08-14T08:20:00.000Z' },
    { id: 'chat-support-owner', type: 'support', status: 'open', subject: 'Не отображается новое расписание', requestId: null, providerId: 'api-proservice-moscow', providerName: 'ProService', clientId: null, createdById: 'user-owner-1', lastMessageAt: '2026-08-14T07:40:00.000Z', createdAt: '2026-08-14T07:30:00.000Z', updatedAt: '2026-08-14T07:40:00.000Z' },
    { id: 'chat-escalation-admin', type: 'admin_escalation', status: 'open', subject: 'Проверка блокировки сервиса', requestId: null, providerId: null, providerName: null, clientId: null, createdById: 'user-admin-1', lastMessageAt: '2026-08-14T06:40:00.000Z', createdAt: '2026-08-14T06:35:00.000Z', updatedAt: '2026-08-14T06:40:00.000Z' },
]
type MockAutoCareChatReport = {
    id: string
    threadId: string
    reporterId: string
    reportedUserId: string | null
    category: 'spam' | 'harassment' | 'fraud' | 'unsafe' | 'other'
    description: string | null
    status: 'pending' | 'resolved' | 'dismissed'
    reviewedById: string | null
    resolutionReason: string | null
    createdAt: string
    reviewedAt: string | null
}
type MockAutoCareChatBlock = {
    id: string
    threadId: string
    blockerId: string
    blockedUserId: string
    status: 'active' | 'revoked'
    reason: string | null
    createdAt: string
    revokedAt: string | null
}
const mockAutoCareChatReports: MockAutoCareChatReport[] = []
const mockAutoCareChatBlocks: MockAutoCareChatBlock[] = []
type MockAutoCareAppeal = {
    id: string
    subject: 'provider' | 'review' | 'suspension' | 'catalog'
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
const mockAutoCareAppeals: MockAutoCareAppeal[] = [{ id: 'appeal-demo-1', subject: 'provider', subjectId: 'api-proservice-moscow', submittedById: 'user-owner-1', providerId: 'api-proservice-moscow', reason: 'Просим пересмотреть решение по публикации профиля после загрузки подтверждающих документов.', evidenceIds: [], status: 'pending', decidedById: null, decisionReason: null, createdAt: '2026-08-14T09:00:00.000Z', decidedAt: null }]
type MockAdminAutoCareModerationEvidence = {
    id: string
    providerId: string
    kind: 'provider_cover' | 'provider_gallery' | 'review'
    label: string
    status: 'pending' | 'approved' | 'rejected'
    reference: string | null
    notes: string | null
    createdAt: string
    verifiedAt: string | null
    provider: { id: string; name: string; address: string | null }
    review: { id: string; authorName: string; vehicleLabel: string; rating: number; text: string; photoUrls: string[]; createdAt: string; status: 'pending' | 'approved' | 'rejected' } | null
}
const mockAdminAutoCareModerationEvidence: MockAdminAutoCareModerationEvidence[] = [{
    id: 'evidence-demo-provider-cover',
    providerId: 'api-proservice-moscow',
    kind: 'provider_cover',
    label: 'Главное фото сервиса',
    status: 'pending',
    reference: autoCareProviders[0]?.coverImageUrl ?? null,
    notes: 'Ожидает проверки публичного медиа.',
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
    createdAt: '2026-08-18T10:00:00.000Z',
    verifiedAt: null,
    provider: { id: 'api-proservice-moscow', name: 'ProService', address: 'Москва, ул. Льва Толстого, 18' },
    review: { id: 'review-demo-evidence', authorName: 'Алексей С.', vehicleLabel: 'BMW X5', rating: 5, text: 'Работы выполнили в согласованный срок, стоимость не изменилась.', photoUrls: [], createdAt: '2026-08-18T09:55:00.000Z', status: 'pending' },
}]
const mockAutoCareChatMessages = new Map<string, ServiceChatMessage[]>([
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
    { id: 'mock-message-4', senderId: 'user-owner-1', kind: 'offer', body: 'Альтернативный вариант', offer: { type: 'alternative', title: 'Диагностика тормозов сегодня', description: 'Можем начать с бесплатной проверки дисков, а замену выполнить после согласования.', discountPercent: null, couponCode: null, amountMinor: 0, currencyCode: 'RUB', expiresAt: null, status: 'pending' }, deliveredAt: '2026-08-13T09:30:00.000Z', readAt: null, createdAt: '2026-08-13T09:30:00.000Z' },
])
type MockAutoCareReviewPromo = {
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
const mockAutoCareReviewPromos: MockAutoCareReviewPromo[] = []
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
type MockAutoCareBonusAccount = {
    id: string
    clientId: string
    providerId: string
    balancePoints: number
    earnedPoints: number
    redeemedPoints: number
    entries: Array<{ id: string; type: 'earn' | 'redeem' | 'refund' | 'expire' | 'adjustment'; points: number; reason: string; requestId: string | null; expiresAt: string | null; createdAt: string }>
}
type MockAutoCareProviderInvitation = {
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
type MockAutoCareProviderChangeRequest = {
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
type MockAutoCareCatalogGapRequest = {
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
const mockAutoCareProviderInvitations: MockAutoCareProviderInvitation[] = []
const mockAutoCareProviderChangeRequests: MockAutoCareProviderChangeRequest[] = []
const mockAutoCareCatalogGapRequests: MockAutoCareCatalogGapRequest[] = []
const mockAutoCareProviderMemberships = new Map<string, Array<{ id: string; providerId: string; userId: string; locationId: string | null; role: 'owner' | 'manager' | 'staff'; status: 'active' | 'revoked'; createdAt: string }>>()
const mockAutoCareBonusPrograms = new Map<string, MockAutoCareBonusProgram>([
    ['api-proservice-moscow', { id: 'bonus-program-proservice', providerId: 'api-proservice-moscow', name: 'ProService Bonus', earnPercent: 5, maxEarnPointsPerVisit: null, expiresAfterDays: 365, active: true, createdAt: '2026-08-01T10:00:00.000Z', updatedAt: '2026-08-01T10:00:00.000Z' }],
])
const mockAutoCareBonusAccounts: MockAutoCareBonusAccount[] = [{
    id: 'bonus-account-client-proservice', clientId: 'user-client-1', providerId: 'api-proservice-moscow', balancePoints: 1450, earnedPoints: 1800, redeemedPoints: 350,
    entries: [
        { id: 'bonus-entry-1', type: 'earn', points: 1450, reason: 'Бонус за завершённый визит', requestId: null, expiresAt: '2027-08-01T10:00:00.000Z', createdAt: '2026-08-01T10:00:00.000Z' },
        { id: 'bonus-entry-2', type: 'redeem', points: -350, reason: 'Списание при записи на услугу', requestId: null, expiresAt: null, createdAt: '2026-08-10T10:00:00.000Z' },
    ],
}]

function awardMockAutoCareBonus(item: MockAutoCareServiceRequest, actorId: string) {
    const program = mockAutoCareBonusPrograms.get(item.providerId)
    if (!program || !item.booking || item.booking.amountMinor <= 0) return
    const points = Math.min(Math.floor(item.booking.amountMinor * program.earnPercent / 10_000), program.maxEarnPointsPerVisit ?? Number.MAX_SAFE_INTEGER)
    if (points <= 0) return
    const account = mockAutoCareBonusAccounts.find((candidate) => candidate.clientId === item.clientId && candidate.providerId === item.providerId)
        ?? (() => { const created: MockAutoCareBonusAccount = { id: `bonus-account-${Date.now()}`, clientId: item.clientId, providerId: item.providerId, balancePoints: 0, earnedPoints: 0, redeemedPoints: 0, entries: [] }; mockAutoCareBonusAccounts.push(created); return created })()
    if (account.entries.some((entry) => entry.requestId === item.id && entry.type === 'earn')) return
    const createdAt = new Date().toISOString()
    account.balancePoints += points
    account.earnedPoints += points
    account.entries.unshift({ id: `bonus-entry-${Date.now()}`, type: 'earn', points, reason: 'Бонус за завершённый визит', requestId: item.id, expiresAt: program.expiresAfterDays ? new Date(Date.now() + program.expiresAfterDays * 86_400_000).toISOString() : null, createdAt })
    void actorId
}

function currentMockUser() {
    return mockUsers.find((user) => user.id === mockSession.currentUserId)
}

function toMockAutoCareFavorite(providerId: string, userId: string) {
    const provider = autoCareProviders.find((item) => item.id === providerId)
    if (!provider) return null
    return {
        id: `favorite-${userId}-${provider.id}`,
        providerId: provider.id,
        locationId: provider.location.id,
        createdAt: '2026-08-14T08:00:00.000Z',
        provider,
        offer: provider.offers?.[0] ?? null,
    }
}

function mockChatThreadFromRequest(request: MockAutoCareServiceRequest): MockAutoCareChatThread {
    return { id: `chat-request-${request.id}`, type: 'service_request', status: request.status === 'closed' ? 'closed' : 'open', subject: request.serviceLabels.ru ?? request.serviceSlug, requestId: request.id, providerId: request.providerId, providerName: request.providerName, clientId: request.clientId, createdById: request.clientId, lastMessageAt: request.updatedAt, createdAt: request.createdAt, updatedAt: request.updatedAt }
}

function getMockAutoCareChatThreads(user: User) {
    const requestThreads = mockAutoCareServiceRequests
        .filter((request) => request.clientId === user.id || (user.role === 'owner' && ownerAutoCareProviders.some((provider) => provider.id === request.providerId)))
        .map(mockChatThreadFromRequest)
    const genericThreads = mockAutoCareChatThreads.filter((thread) => ((user.role === 'super_admin' || user.role === 'admin') && ['support', 'admin_escalation'].includes(thread.type)) || thread.clientId === user.id || thread.createdById === user.id || (user.role === 'owner' && thread.providerId !== null && ownerAutoCareProviders.some((provider) => provider.id === thread.providerId)))
    return [...requestThreads, ...genericThreads].sort((left, right) => (right.updatedAt ?? '').localeCompare(left.updatedAt ?? ''))
}

function mockChatMessages(thread: MockAutoCareChatThread) {
    return thread.requestId ? (mockAutoCareMessages.get(thread.requestId) ?? []) : (mockAutoCareChatMessages.get(thread.id) ?? [])
}

function mockChatAttachments(thread: MockAutoCareChatThread) {
    return thread.requestId ? (mockAutoCareAttachments.get(thread.requestId) ?? []) : (mockAutoCareChatAttachments.get(thread.id) ?? [])
}

function encodeMockChatCursor(message: ServiceChatMessage) {
    return btoa(JSON.stringify({ createdAt: message.createdAt, id: message.id })).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function decodeMockChatCursor(cursor: string | null) {
    if (!cursor) return null
    try {
        const normalized = cursor.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - cursor.length % 4) % 4)
        const value = JSON.parse(atob(normalized)) as { id?: string }
        return value.id ?? null
    } catch {
        return null
    }
}

function pushMockAutoCareNotification(input: { userId: string; requestId: string; title: string; message: string; role: 'client' | 'owner' }) {
    mockNotifications.unshift({
        id: `notification-autocare-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        category: 'booking',
        title: input.title,
        message: input.message,
        link: input.role === 'owner' ? `/owner/autocare-requests?request=${input.requestId}` : `/profile/bookings?request=${input.requestId}`,
        metadata: { serviceRequestId: input.requestId, domain: 'autocare' },
        readAt: null,
        createdAt: new Date().toISOString(),
        userId: input.userId,
    } as Notification & { userId: string })
}

function getMockOAuthIdentities(user: User) {
    const existing = mockOAuthIdentitiesByUser.get(user.id)

    if (existing) {
        return existing
    }

    const identities = new Set<'google' | 'yandex'>()

    if (user.provider === 'google' || user.provider === 'yandex') {
        identities.add(user.provider)
    }

    mockOAuthIdentitiesByUser.set(user.id, identities)

    return identities
}

function getMockAvailabilityPreview(
    cabinetId: string,
    options?: { date?: string; durationMinutes?: number },
) {
    const durations = mockServices
        .filter((service) => service.cabinetId === cabinetId && service.isActive)
        .map((service) => service.durationMinutes)
    const durationMinutes = options?.durationMinutes ?? Math.min(...durations)

    if (!Number.isFinite(durationMinutes)) {
        return null
    }

    const now = new Date()
    const today = new Date()
    const todayString = today.toISOString().slice(0, 10)
    const dateString = options?.date ?? todayString
    const isPastDate = dateString < todayString
    let firstSlot: { date: string; startTime: string; endTime: string } | null = null
    let freeSlots = 0
    const slots: Array<{ startTime: string; endTime: string }> = []

    const occupied = mockBookings
            .filter((booking) =>
                booking.cabinetId === cabinetId &&
                booking.date === dateString &&
                (booking.status === 'pending' || booking.status === 'confirmed')
            )
            .map((booking) => ({ start: booking.startTime, end: booking.endTime }))

    for (let start = 8 * 60; start + durationMinutes <= 22 * 60; start += 30) {
            const startTime = `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`
            const end = start + durationMinutes
            const endTime = `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`
            const isPast = isPastDate || (dateString === todayString && start <= now.getHours() * 60 + now.getMinutes())
            const isOccupied = occupied.some((slot) => startTime < slot.end && endTime > slot.start)

            if (!isPast && !isOccupied) {
                freeSlots += 1
                if (slots.length < 4) {
                    slots.push({ startTime, endTime })
                }
                firstSlot ??= { date: dateString, startTime, endTime }
            }
    }

    return firstSlot ? { ...firstSlot, freeSlots, slots } : null
}

const mockNotifications: Notification[] = [
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

const mockSystemIncidents: MockSystemIncident[] = [
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

type MockSecurityEvent = {
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

type MockSecurityMitigation = {
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

const mockSecurityEvents: MockSecurityEvent[] = [
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

const mockSecurityMitigations: MockSecurityMitigation[] = []

type MockAccountDeletionRequest = {
    id: string
    status: 'pending' | 'cancelled' | 'completed'
    requestedAt: string
    cancelledAt: string | null
    completedAt: string | null
}

const mockAccountDeletionRequests = new Map<string, MockAccountDeletionRequest>()

function addMockNotification(input: Omit<Notification, 'id' | 'createdAt' | 'readAt'> & { userId: string }) {
    mockNotifications.unshift({
        ...input,
        id: `notification-${Date.now()}-${mockNotifications.length + 1}`,
        readAt: null,
        createdAt: new Date().toISOString(),
    } as Notification & { userId: string })
}

function toClientBooking(booking: typeof mockBookings[number]) {
    const cabinet = mockCabinets.find(
        (item) => item.id === booking.cabinetId
    )

    const service = mockServices.find(
        (item) => item.id === booking.serviceId
    )

    return {
        ...booking,
        cabinet: {
            id: cabinet?.id ?? booking.cabinetId,
            title: cabinet?.title ?? 'Unknown cabinet',
            address: cabinet?.address ?? '',
            city: cabinet?.city ?? '',
        },
        service: {
            id: service?.id ?? booking.serviceId,
            title: service?.title ?? 'Unknown service',
            durationMinutes: service?.durationMinutes ?? 0,
            price: service?.price ?? 0,
        },
    }
}

function toOwnerBooking(booking: typeof mockBookings[number]) {
    const client = mockUsers.find(
        (user) => user.id === booking.clientId
    )

    return {
        ...toClientBooking(booking),
        client: {
            id: client?.id ?? booking.clientId,
            name: client?.name ?? 'Unknown client',
            email: client?.email ?? '',
            phone: client?.phone ?? null,
        },
        ownerNote: null,
    }
}

function toPublicReview(review: typeof mockReviews[number]) {
    return {
        id: review.id,
        cabinetId: review.cabinetId,
        clientId: review.clientId,
        rating: review.rating,
        text: review.text,
        status: review.status,
        createdAt: review.createdAt,
        client: review.client,
    }
}

function toClientReview(review: typeof mockReviews[number]) {
    const cabinet = mockCabinets.find((item) => item.id === review.cabinetId)

    return {
        ...toPublicReview(review),
        cabinet: {
            id: review.cabinetId,
            title: cabinet?.title ?? review.cabinet?.title ?? 'Unknown cabinet',
        },
    }
}

export const handlers = [
    http.get('/api/auth/me', () => {
       const currentUser = mockUsers.find(
           (user) => user.id === mockSession.currentUserId
       )

        if (!currentUser) {
            return HttpResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            )
        }

        return HttpResponse.json(currentUser)
    }),

    http.post('/api/auth/refresh', () => {
        const currentUser = mockUsers.find(
            (user) => user.id === mockSession.currentUserId,
        )

        if (!currentUser) {
            return HttpResponse.json(
                { message: 'Unauthorized' },
                { status: 401 },
            )
        }

        return HttpResponse.json({
            accessToken: `mock-access-token-${currentUser.id}`,
        })
    }),

    http.get('/api/auth/oauth/identities', () => {
        const currentUser = mockUsers.find(
            (user) => user.id === mockSession.currentUserId
        )

        if (!currentUser) {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        const identities = getMockOAuthIdentities(currentUser)

        return HttpResponse.json(
            (['google', 'yandex'] as const)
                .filter((provider) => isDeploymentOAuthProviderEnabled(provider))
                .map((provider) => ({
                provider,
                isLinked: identities.has(provider),
                identityCount: identities.has(provider) ? 1 : 0,
                createdAt: identities.has(provider)
                    ? currentUser.createdAt
                    : null,
                canUnlink: identities.has(provider) && identities.size > 1,
                }))
        )
    }),

    http.post('/api/auth/oauth/:provider/link/start', ({ params }) => {
        const currentUser = mockUsers.find(
            (user) => user.id === mockSession.currentUserId
        )
        const provider = params.provider

        if (!currentUser) {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        if (provider !== 'google' && provider !== 'yandex') {
            return HttpResponse.json({ message: 'Invalid provider' }, { status: 400 })
        }

        if (!isDeploymentOAuthProviderEnabled(provider as DeploymentOAuthProvider)) {
            return HttpResponse.json({ message: 'OAuth provider is not enabled for this deployment.' }, { status: 403 })
        }

        getMockOAuthIdentities(currentUser).add(provider)

        return HttpResponse.json({
            provider,
            authUrl: `/profile?tab=security&oauth=linked&provider=${provider}`,
        })
    }),

    http.post('/api/auth/oauth/:provider/unlink/start', ({ params }) => {
        const currentUser = mockUsers.find(
            (user) => user.id === mockSession.currentUserId
        )
        const provider = params.provider

        if (!currentUser) {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        if (provider !== 'google' && provider !== 'yandex') {
            return HttpResponse.json({ message: 'Invalid provider' }, { status: 400 })
        }

        if (!isDeploymentOAuthProviderEnabled(provider as DeploymentOAuthProvider)) {
            return HttpResponse.json({ message: 'OAuth provider is not enabled for this deployment.' }, { status: 403 })
        }

        const identities = getMockOAuthIdentities(currentUser)

        if (!identities.has(provider)) {
            return HttpResponse.json(
                {
                    code: 'OAUTH_IDENTITY_NOT_LINKED',
                    message: 'This OAuth provider is not linked to the account.',
                },
                { status: 409 }
            )
        }

        if (identities.size <= 1) {
            return HttpResponse.json(
                {
                    code: 'OAUTH_LAST_LOGIN_METHOD',
                    message: 'The last available login method cannot be removed.',
                },
                { status: 409 }
            )
        }

        identities.delete(provider)

        return HttpResponse.json({
            provider,
            authUrl: `/profile?tab=security&oauth=unlinked&provider=${provider}`,
        })
    }),

    http.post('/api/auth/login', async ({ request }) => {
        const body = await parseMockJson(request, loginRequestSchema)

        if (!body) return invalidMockBodyResponse()

        const user = mockUsers.find(
            (user) => user.email.toLowerCase() === body.email.toLowerCase()
        )

        if (!user) {
            return HttpResponse.json(
                { message: 'Invalid email or password' },
                { status: 401 }
            )
        }

        if (user.status === 'blocked') {
            return HttpResponse.json(
                { message: 'User is blocked' },
                { status: 403 }
            )
        }

        setMockSession({
            currentUserId: user.id,
            currentRole: user.role,
        })

        return HttpResponse.json(user)
    }),

    http.post('/api/auth/logout', () => {
        clearMockSession()

        return HttpResponse.json({
            message: 'Logged out'
        })
    }),

    http.get('/api/users/me/favorites', () => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        const favoriteIds = mockFavoritesByUser.get(mockSession.currentUserId) ?? []
        const items = favoriteIds
            .map((id) => mockCabinets.find((cabinet) => cabinet.id === id && cabinet.status === 'active'))
            .filter((cabinet): cabinet is typeof mockCabinets[number] => Boolean(cabinet))

        return HttpResponse.json({ items })
    }),

    http.post('/api/users/me/favorites/sync', async ({ request }) => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json() as { cabinetIds?: unknown }
        const cabinetIds = Array.isArray(body.cabinetIds)
            ? body.cabinetIds.filter((id): id is string => typeof id === 'string')
            : []
        const currentIds = mockFavoritesByUser.get(mockSession.currentUserId) ?? []
        const acceptedCabinets = cabinetIds
            .map((id) => mockCabinets.find((cabinet) => cabinet.id === id && cabinet.status === 'active'))
            .filter((cabinet): cabinet is typeof mockCabinets[number] => Boolean(cabinet))

        mockFavoritesByUser.set(
            mockSession.currentUserId,
            [...new Set([...currentIds, ...acceptedCabinets.map((cabinet) => cabinet.id)])],
        )

        return HttpResponse.json({ items: acceptedCabinets })
    }),

    http.post('/api/users/me/favorites/:cabinetId', ({ params }) => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        const cabinetId = String(params.cabinetId)
        const cabinet = mockCabinets.find(
            (item) => item.id === cabinetId && item.status === 'active',
        )

        if (!cabinet) {
            return HttpResponse.json({ message: 'Cabinet not found' }, { status: 404 })
        }

        const currentIds = mockFavoritesByUser.get(mockSession.currentUserId) ?? []
        mockFavoritesByUser.set(
            mockSession.currentUserId,
            [...new Set([cabinetId, ...currentIds])],
        )

        return HttpResponse.json(cabinet)
    }),

    http.delete('/api/users/me/favorites/:cabinetId', ({ params }) => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        const cabinetId = String(params.cabinetId)
        const currentIds = mockFavoritesByUser.get(mockSession.currentUserId) ?? []
        mockFavoritesByUser.set(
            mockSession.currentUserId,
            currentIds.filter((id) => id !== cabinetId),
        )

        return HttpResponse.json({ success: true })
    }),

    http.get('/api/notifications', ({ request }) => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            )
        }

        const url = new URL(request.url)
        const userNotifications = mockNotifications.filter(
            (notification) =>
                (notification as Notification & { userId: string }).userId === mockSession.currentUserId
        )
        const limit = Number(url.searchParams.get('limit'))

        if (!Number.isInteger(limit) || limit <= 0) {
            return HttpResponse.json(userNotifications)
        }

        const offset = Number(url.searchParams.get('cursor') ?? '0')
        const items = userNotifications.slice(offset, offset + limit)
        const nextOffset = offset + items.length

        return HttpResponse.json({
            items,
            nextCursor: nextOffset < userNotifications.length ? String(nextOffset) : null,
        })
    }),

    http.get('/api/notifications/unread-count', () => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            )
        }

        return HttpResponse.json({
            count: mockNotifications.filter(
                (notification) =>
                    (notification as Notification & { userId: string }).userId === mockSession.currentUserId &&
                    !notification.readAt
            ).length,
        })
    }),

    http.patch('/api/notifications/:id/read', ({ params }) => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            )
        }

        const notification = mockNotifications.find(
            (item) =>
                item.id === String(params.id) &&
                (item as Notification & { userId: string }).userId === mockSession.currentUserId
        )

        if (!notification) {
            return HttpResponse.json(
                { message: 'Notification not found' },
                { status: 404 }
            )
        }

        notification.readAt ??= new Date().toISOString()

        return HttpResponse.json(notification)
    }),

    http.patch('/api/notifications/read-all', () => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            )
        }

        let updated = 0
        mockNotifications.forEach((notification) => {
            if (
                (notification as Notification & { userId: string }).userId === mockSession.currentUserId &&
                !notification.readAt
            ) {
                notification.readAt = new Date().toISOString()
                updated += 1
            }
        })

        return HttpResponse.json({ updated })
    }),

    http.post('/api/auth/register', async ({ request }) => {
        const body = await parseMockJson(request, registerRequestSchema)

        if (!body) return invalidMockBodyResponse()
        const existingUser = mockUsers.find(
            (user) => user.email.toLowerCase() === body.email.toLowerCase()
        )

        if (existingUser) {
            return HttpResponse.json(
                { message: 'User with this email already exists' },
                { status: 409 }
            )
        }

        const newUser: User = {
            id: `user-${Date.now()}`,
            name: body.name,
            email: body.email,
            phone: null,
            role: body.role,
            status: 'active' as const,
            avatarUrl: null,
            provider: 'email' as const,
            locale: null,
            emailVerifiedAt: null,
            emailNotifications: true,
            bookingEmailNotifications: true,
            preferredCity: null,
            preferredCategories: [],
            createdAt: new Date().toISOString(),
        }

        mockUsers.push(newUser)

        setMockSession({
            currentUserId: newUser.id,
            currentRole: newUser.role,
        })

        return HttpResponse.json(newUser, {
            status: 201
        })
    }),

    http.post('/api/auth/password/setup/verify', async ({ request }) => {
        const body = await request.json() as {
            token: string
        }

        if (body.token !== 'mock-password-setup-token-1234567890') {
            return HttpResponse.json(
                {
                    message: 'Password setup link is invalid or expired.',
                },
                {
                    status: 400,
                }
            )
        }

        return HttpResponse.json({
            email: 'admin@autocarehub.test',
            expiresAt: '2026-12-31T23:59:59.000Z',
        })
    }),

    http.post('/api/auth/password/setup/complete', async ({ request }) => {
        const body = await request.json() as {
            token: string
            password: string
        }

        if (
            body.token !== 'mock-password-setup-token-1234567890' ||
            body.password.length < 6
        ) {
            return HttpResponse.json(
                {
                    message: 'Password setup link is invalid or expired.',
                },
                {
                    status: 400,
                }
            )
        }

        const user = mockUsers.find(
            (item) => item.email === 'admin@autocarehub.test'
        )

        if (!user) {
            return HttpResponse.json(
                {
                    message: 'User not found.',
                },
                {
                    status: 404,
                }
            )
        }

        setMockSession({
            currentUserId: user.id,
            currentRole: user.role,
        })

        return HttpResponse.json(user)
    }),

    http.post('/api/auth/password/reset/request', () => {
        return HttpResponse.json({
            success: true,
        })
    }),

    http.post('/api/auth/password/reset/verify', async ({ request }) => {
        const body = await request.json() as {
            token: string
        }

        if (body.token !== 'mock-password-reset-token-1234567890') {
            return HttpResponse.json(
                {
                    message: 'Password reset link is invalid or expired.',
                },
                {
                    status: 400,
                }
            )
        }

        return HttpResponse.json({
            email: 'emily.carter@example.com',
            expiresAt: '2026-12-31T23:59:59.000Z',
        })
    }),

    http.post('/api/auth/password/reset/complete', async ({ request }) => {
        const body = await request.json() as {
            token: string
            password: string
        }

        if (
            body.token !== 'mock-password-reset-token-1234567890' ||
            body.password.length < 6
        ) {
            return HttpResponse.json(
                {
                    message: 'Password reset link is invalid or expired.',
                },
                {
                    status: 400,
                }
            )
        }

        clearMockSession()

        return HttpResponse.json({
            success: true,
        })
    }),

    http.post('/api/auth/email-verification/request', () => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            )
        }

        return HttpResponse.json({
            success: true,
        })
    }),

    http.post('/api/auth/email-verification/verify', async ({ request }) => {
        const body = await request.json() as {
            token: string
        }

        if (body.token !== 'mock-email-verification-token-1234567890') {
            return HttpResponse.json(
                {
                    message: 'Email verification link is invalid or expired.',
                },
                {
                    status: 400,
                }
            )
        }

        const user = mockUsers.find(
            (item) => item.id === mockSession.currentUserId
        )

        return HttpResponse.json({
            email: user?.email ?? 'user@example.com',
            expiresAt: '2026-12-31T23:59:59.000Z',
        })
    }),

    http.post('/api/auth/email-verification/complete', async ({ request }) => {
        const body = await request.json() as {
            token: string
        }

        if (body.token !== 'mock-email-verification-token-1234567890') {
            return HttpResponse.json(
                {
                    message: 'Email verification link is invalid or expired.',
                },
                {
                    status: 400,
                }
            )
        }

        const user = mockUsers.find(
            (item) => item.id === mockSession.currentUserId
        )

        if (user) {
            user.emailVerifiedAt = new Date().toISOString()
        }

        return HttpResponse.json({
            success: true,
        })
    }),

    http.post('/api/auth/change-password', () => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            )
        }

        return HttpResponse.json({
            success: true,
        })
    }),

    http.get('/api/auth/sessions', () => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            )
        }

        return HttpResponse.json([
            {
                id: 'mock-session-1',
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                ipAddress: '127.0.0.1',
                lastActiveAt: new Date().toISOString(),
                isCurrent: true,
            },
            {
                id: 'mock-session-2',
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
                ipAddress: '192.168.1.5',
                lastActiveAt: new Date(Date.now() - 86400000).toISOString(),
                isCurrent: false,
            },
        ])
    }),

    http.delete('/api/auth/sessions/:id', () => {
        return HttpResponse.json({
            success: true,
        })
    }),

    http.post('/api/auth/sessions/revoke-all', () => {
        return HttpResponse.json({
            success: true,
        })
    }),

    http.post('/api/admin/admins', async ({ request }) => {
        const body = await request.json() as {
            name: string
            email: string
        }

        const newAdmin = {
            id: `admin-${Date.now()}`,
            name: body.name,
            email: body.email,
            phone: null,
            role: 'admin',
            status: 'active',
            avatarUrl: null,
            provider: 'email',
            locale: null,
            emailVerifiedAt: new Date().toISOString(),
            emailNotifications: true,
            bookingEmailNotifications: true,
            preferredCity: null,
            preferredCategories: [],
            createdAt: new Date().toISOString(),
        } satisfies User

        mockUsers.push(newAdmin)

        return HttpResponse.json({
            user: newAdmin,
            passwordSetupToken: 'mock-setup-token-123',
            passwordSetupExpiresAt: new Date(Date.now() + 3600000).toISOString(),
        })
    }),

    http.get('/api/admin/audit-logs', ({ request }) => {
        const url = new URL(request.url)
        const search = url.searchParams.get('search')?.trim().toLowerCase()
        const auditLogs = [
            {
                id: 'log-1',
                actor: { id: 'admin-1', name: 'Super Admin' },
                action: 'admin_created',
                targetId: 'admin-2',
                targetType: 'user',
                metadata: { email: 'new.admin@example.com' },
                ipAddress: '127.0.0.1',
                createdAt: new Date().toISOString(),
            },
            {
                id: 'log-2',
                actor: { id: 'admin-1', name: 'Super Admin' },
                action: 'user_status_updated',
                targetId: 'user-123',
                targetType: 'user',
                metadata: { oldStatus: 'active', newStatus: 'blocked' },
                ipAddress: '127.0.0.1',
                createdAt: new Date(Date.now() - 3600000).toISOString(),
            },
        ]
        const filteredLogs = search
            ? auditLogs.filter((log) => JSON.stringify(log).toLowerCase().includes(search))
            : auditLogs

        if (url.searchParams.has('limit') || url.searchParams.has('cursor')) {
            return HttpResponse.json({ items: filteredLogs, nextCursor: null })
        }

        return HttpResponse.json(filteredLogs)
    }),

    http.get('/api/admin/security-events', ({ request }) => {
        const url = new URL(request.url)
        const type = url.searchParams.get('type')
        const userId = url.searchParams.get('userId')
        const filteredEvents = mockSecurityEvents.filter((event) => (
            (!type || event.type === type) &&
            (!userId || event.userId === userId)
        ))

        if (url.searchParams.has('limit') || url.searchParams.has('cursor')) {
            return HttpResponse.json({ items: filteredEvents, nextCursor: null })
        }

        return HttpResponse.json(filteredEvents)
    }),

    http.get('/api/admin/security-center/summary', () => {
        const byType = new Map<string, number>()
        const bySeverity = new Map<string, number>()
        const ips = new Map<string, number>()
        const routes = new Map<string, number>()
        for (const event of mockSecurityEvents) {
            byType.set(event.type, (byType.get(event.type) ?? 0) + 1)
            bySeverity.set(event.severity, (bySeverity.get(event.severity) ?? 0) + 1)
            if (event.ipAddress) ips.set(event.ipAddress, (ips.get(event.ipAddress) ?? 0) + 1)
            if (event.route) routes.set(event.route, (routes.get(event.route) ?? 0) + 1)
        }
        return HttpResponse.json({
            windowMinutes: 1440,
            sampled: false,
            totalEvents: mockSecurityEvents.length,
            openEvents: mockSecurityEvents.filter((event) => event.status === 'open').length,
            highSeverityEvents: mockSecurityEvents.filter((event) => event.severity === 'high').length,
            criticalSeverityEvents: mockSecurityEvents.filter((event) => event.severity === 'critical').length,
            blockedSignals: mockSecurityEvents.filter((event) => event.type === 'rate_limit_exceeded' || event.type === 'privilege_denied').length,
            byType: [...byType.entries()].map(([type, count]) => ({ type, count })),
            bySeverity: [...bySeverity.entries()].map(([severity, count]) => ({ severity, count })),
            topIps: [...ips.entries()].map(([ipAddress, count]) => ({ ipAddress, count })),
            topRoutes: [...routes.entries()].map(([route, count]) => ({ route, count })),
            uniqueIpCount: new Set(mockSecurityEvents.map((event) => event.ipAddress).filter(Boolean)).size,
            affectedAccountCount: new Set(mockSecurityEvents.map((event) => event.userId).filter(Boolean)).size,
            repeatedFailedLoginCount: mockSecurityEvents.filter((event) => event.type === 'login_failed' && (event.failedLoginAttempts ?? 0) > 1).length,
            requestBursts: [],
            topUserAgents: [{ userAgent: 'AutoCare Hub mock', count: mockSecurityEvents.length }],
            rateLimitEffectiveness: {
                blocked: mockSecurityEvents.filter((event) => event.rateLimitResult === 'blocked').length,
                allowed: mockSecurityEvents.filter((event) => event.rateLimitResult === 'allowed').length,
                notChecked: mockSecurityEvents.filter((event) => event.rateLimitResult === 'not_checked').length,
                blockedSharePercent: 0,
            },
            recentEvents: mockSecurityEvents.slice(0, 12),
        })
    }),

    http.get('/api/admin/security-center/events', ({ request }) => {
        const url = new URL(request.url)
        const type = url.searchParams.get('type')
        const severity = url.searchParams.get('severity')
        const status = url.searchParams.get('status')
        const ip = url.searchParams.get('ip')
        const route = url.searchParams.get('route')
        const actorRole = url.searchParams.get('actorRole')
        const requestId = url.searchParams.get('requestId')
        const authOutcome = url.searchParams.get('authOutcome')
        const rateLimitResult = url.searchParams.get('rateLimitResult')
        const filteredEvents = mockSecurityEvents.filter((event) => (
            (!type || event.type === type) &&
            (!severity || event.severity === severity) &&
            (!status || event.status === status) &&
            (!ip || event.ipAddress === ip) &&
            (!route || event.route?.includes(route)) &&
            (!actorRole || event.actorRole === actorRole) &&
            (!requestId || event.requestId === requestId) &&
            (!authOutcome || event.authOutcome === authOutcome) &&
            (!rateLimitResult || event.rateLimitResult === rateLimitResult)
        ))
        return HttpResponse.json({ items: filteredEvents, nextCursor: null })
    }),

    http.get('/api/admin/security-center/events/export', ({ request }) => {
        const url = new URL(request.url)
        const filters = {
            type: url.searchParams.get('type'),
            severity: url.searchParams.get('severity'),
            status: url.searchParams.get('status'),
            ip: url.searchParams.get('ip'),
            route: url.searchParams.get('route'),
            actorRole: url.searchParams.get('actorRole'),
            requestId: url.searchParams.get('requestId'),
            authOutcome: url.searchParams.get('authOutcome'),
            rateLimitResult: url.searchParams.get('rateLimitResult'),
        }
        const filteredEvents = mockSecurityEvents.filter((event) => (
            (!filters.type || event.type === filters.type) &&
            (!filters.severity || event.severity === filters.severity) &&
            (!filters.status || event.status === filters.status) &&
            (!filters.ip || event.ipAddress === filters.ip) &&
            (!filters.route || event.route?.includes(filters.route)) &&
            (!filters.actorRole || event.actorRole === filters.actorRole) &&
            (!filters.requestId || event.requestId === filters.requestId) &&
            (!filters.authOutcome || event.authOutcome === filters.authOutcome) &&
            (!filters.rateLimitResult || event.rateLimitResult === filters.rateLimitResult)
        )).slice(0, 100)
        const cell = (value: unknown) => `"${String(value ?? '').replace(/^[=+\-@]/, (prefix) => `'${prefix}`).replaceAll('"', '""')}"`
        const header = ['createdAt', 'type', 'severity', 'status', 'ipAddress', 'requestId', 'method', 'route', 'statusCode', 'actorRole', 'authOutcome', 'rateLimitResult', 'requestSizeBytes', 'reasonCode', 'proxyProvenance', 'userAgent', 'metadata']
        const rows = filteredEvents.map((event) => [
            event.createdAt, event.type, event.severity, event.status, event.ipAddress, event.requestId,
            event.method, event.route, event.statusCode, event.actorRole, event.authOutcome,
            event.rateLimitResult, event.requestSizeBytes, event.reasonCode, event.proxyProvenance,
            event.userAgent, '[redacted]',
        ])
        const csv = [header, ...rows].map((row) => row.map(cell).join(',')).join('\n') + '\n'
        return new HttpResponse(csv, {
            headers: {
                'cache-control': 'no-store',
                'content-disposition': `attachment; filename="autocarehub-security-events-${new Date().toISOString().slice(0, 10)}.csv"`,
                'content-type': 'text/csv; charset=utf-8',
            },
        })
    }),

    http.get('/api/admin/security-center/mitigations', ({ request }) => {
        const url = new URL(request.url)
        const status = url.searchParams.get('status') ?? 'active'
        const ipAddress = url.searchParams.get('ipAddress')
        const now = Date.now()
        const items = mockSecurityMitigations
            .map((item) => item.status === 'active' && item.revokedAt === null && Date.parse(item.expiresAt) <= now
                ? { ...item, status: 'expired' as const }
                : item)
            .filter((item) => (
                item.status === status &&
                (!ipAddress || item.displayValue === ipAddress)
            ))
        return HttpResponse.json(items)
    }),

    http.post('/api/admin/security-center/mitigations', async ({ request }) => {
        const body = await request.json() as {
            kind?: 'ip_block'
            ipAddress?: string
            reason?: string
            ttlMinutes?: number
        }
        const ttlMinutes = body.ttlMinutes
        if (!body.ipAddress || !body.reason || typeof ttlMinutes !== 'number' || !Number.isInteger(ttlMinutes)) {
            return invalidMockBodyResponse()
        }
        const now = new Date()
        const mitigation: MockSecurityMitigation = {
            id: `mock-mitigation-${Date.now()}`,
            kind: 'ip_block',
            displayValue: body.ipAddress.trim(),
            reason: body.reason.trim(),
            expiresAt: new Date(now.getTime() + ttlMinutes * 60_000).toISOString(),
            revokedAt: null,
            createdBy: 'user-admin-1',
            revokedBy: null,
            createdAt: now.toISOString(),
            status: 'active',
        }
        mockSecurityMitigations.unshift(mitigation)
        return HttpResponse.json(mitigation)
    }),

    http.delete('/api/admin/security-center/mitigations/:id', ({ params }) => {
        const mitigation = mockSecurityMitigations.find((item) => item.id === params.id)
        if (!mitigation) return HttpResponse.json({ message: 'Security mitigation not found.' }, { status: 404 })
        mitigation.status = 'revoked'
        mitigation.revokedAt = new Date().toISOString()
        mitigation.revokedBy = 'user-admin-1'
        return HttpResponse.json(mitigation)
    }),

    http.patch('/api/admin/security-center/mitigations/:id', async ({ params, request }) => {
        const mitigation = mockSecurityMitigations.find((item) => item.id === params.id)
        if (!mitigation) return HttpResponse.json({ message: 'Security mitigation not found.' }, { status: 404 })
        const body = await request.json() as { extensionMinutes?: number }
        const extensionMinutes = body.extensionMinutes
        if (
            mitigation.status !== 'active'
            || mitigation.revokedAt !== null
            || typeof extensionMinutes !== 'number'
            || !Number.isInteger(extensionMinutes)
            || extensionMinutes < 1
            || extensionMinutes > 1_440
        ) {
            return invalidMockBodyResponse()
        }
        const nextExpiry = Date.parse(mitigation.expiresAt) + extensionMinutes * 60_000
        if (nextExpiry > Date.now() + 1_440 * 60_000) {
            return HttpResponse.json({ message: 'The extension would exceed the 24-hour recovery window.' }, { status: 409 })
        }
        mitigation.expiresAt = new Date(nextExpiry).toISOString()
        return HttpResponse.json(mitigation, { headers: { 'cache-control': 'no-store' } })
    }),

    http.post('/api/admin/security-center/users/:id/revoke-sessions', ({ params }) => (
        HttpResponse.json(
            {
                userId: params.id,
                revokedAt: new Date().toISOString(),
            },
            { headers: { 'cache-control': 'no-store' } },
        )
    )),

    http.get('/api/admin/security-center/events/:id', ({ params }) => {
        const event = mockSecurityEvents.find((item) => item.id === params.id)
        return event
            ? HttpResponse.json(event)
            : HttpResponse.json({ message: 'Security event not found.' }, { status: 404 })
    }),

    http.patch('/api/admin/security-center/events/:id/status', async ({ params, request }) => {
        const event = mockSecurityEvents.find((item) => item.id === params.id)
        if (!event) return HttpResponse.json({ message: 'Security event not found.' }, { status: 404 })
        const body = await request.json() as {
            status: MockSecurityEvent['status']
            operatorNote?: string
            assigneeId?: string | null
        }
        event.status = body.status
        const action = {
            status: body.status === 'open' ? 'acknowledged' : body.status,
            operatorNote: body.operatorNote ?? null,
            actorId: 'user-admin-1',
            assigneeId: body.assigneeId === undefined ? event.assigneeId : body.assigneeId,
            createdAt: new Date().toISOString(),
        }
        event.assigneeId = action.assigneeId
        event.lastAction = action
        event.actionTimeline.unshift({ id: `mock-security-action-${Date.now()}`, ...action })
        return HttpResponse.json(event)
    }),

    http.get('/api/admin/system-incidents', ({ request }) => {
        const url = new URL(request.url)
        const search = url.searchParams.get('search')?.trim().toLowerCase()
        const status = url.searchParams.get('status')
        const filteredIncidents = mockSystemIncidents.filter((incident) => (
            (!search || incident.title.toLowerCase().includes(search)) &&
            (!status || incident.status === status)
        ))

        if (url.searchParams.has('limit') || url.searchParams.has('cursor')) {
            return HttpResponse.json({ items: filteredIncidents, nextCursor: null })
        }

        return HttpResponse.json(filteredIncidents)
    }),

    http.get('/api/admin/outbox/health', () => HttpResponse.json({
        counts: {
            pending: 0,
            processing: 0,
            completed: 0,
            failed: 0,
            dead_letter: 0,
        },
        abandonedCount: 0,
        deadLetterCount: 0,
        failedEvents: [],
    })),

    http.patch('/api/admin/system-incidents/:id/status', async ({ params, request }) => {
        const body = await request.json() as { status: 'open' | 'acknowledged' | 'resolved' }
        const incident = mockSystemIncidents.find((item) => item.id === params.id)

        if (!incident) {
            return HttpResponse.json({ message: 'System incident not found.' }, { status: 404 })
        }

        incident.status = body.status
        incident.acknowledgedAt = body.status === 'acknowledged'
            ? new Date().toISOString()
            : incident.acknowledgedAt
        incident.resolvedAt = body.status === 'resolved'
            ? new Date().toISOString()
            : null

        return HttpResponse.json(incident)
    }),

    http.get('/api/cabinets', ({ request }) => {
        const url = new URL(request.url)
        const search = url.searchParams.get('search')?.toLowerCase()
        const sortBy = url.searchParams.get('sortBy')
        const city = url.searchParams.get('city')?.toLowerCase()
        const category = url.searchParams.get('category')?.toLowerCase()
        const service = url.searchParams.get('service')?.toLowerCase()
        const parseNumericParam = (value: string | null) => value === null ? undefined : Number(value)
        const minPrice = parseNumericParam(url.searchParams.get('minPrice'))
        const maxPrice = parseNumericParam(url.searchParams.get('maxPrice'))
        const minRating = parseNumericParam(url.searchParams.get('minRating'))
        const availableToday = url.searchParams.get('availableToday') === 'true'
        const availabilityDate = url.searchParams.get('availabilityDate') || undefined
        const durationMinutes = parseNumericParam(url.searchParams.get('durationMinutes'))
        const page = Number(url.searchParams.get('page')) || 1
        const limit = Number(url.searchParams.get('limit')) || 12

        let activeCabinets = mockCabinets.filter(
            (cabinet) => cabinet.status === 'active'
        )

        if (search) {
            activeCabinets = activeCabinets.filter(
                (cabinet) =>
                    cabinet.title.toLowerCase().includes(search) ||
                    cabinet.city.toLowerCase().includes(search)
            )
        }

        if (city) {
            activeCabinets = activeCabinets.filter((cabinet) => cabinet.city.toLowerCase().includes(city))
        }

        if (category) {
            activeCabinets = activeCabinets.filter((cabinet) => {
                const cabinetText = [cabinet.title, cabinet.description, ...(cabinet.amenities ?? [])]
                    .join(' ')
                    .toLowerCase()
                const serviceText = mockServices
                    .filter((item) => item.cabinetId === cabinet.id && item.isActive)
                    .map((item) => item.title)
                    .join(' ')
                    .toLowerCase()

                return cabinetText.includes(category) || serviceText.includes(category)
            })
        }

        if (service) {
            activeCabinets = activeCabinets.filter((cabinet) =>
                mockServices.some((item) =>
                    item.cabinetId === cabinet.id &&
                    item.isActive &&
                    item.title.toLowerCase().includes(service)
                )
            )
        }

        if (minPrice !== undefined && Number.isFinite(minPrice)) {
            activeCabinets = activeCabinets.filter((cabinet) => cabinet.pricePerHour >= minPrice)
        }

        if (maxPrice !== undefined && Number.isFinite(maxPrice)) {
            activeCabinets = activeCabinets.filter((cabinet) => cabinet.pricePerHour <= maxPrice)
        }

        if (minRating !== undefined && Number.isFinite(minRating)) {
            activeCabinets = activeCabinets.filter((cabinet) => {
                const approvedRatings = mockReviews
                    .filter((review) => review.cabinetId === cabinet.id && review.status === 'approved')
                    .map((review) => review.rating)
                const averageRating = approvedRatings.length === 0
                    ? 0
                    : approvedRatings.reduce((sum, rating) => sum + rating, 0) / approvedRatings.length

                return averageRating >= minRating
            })
        }

        if (sortBy === 'popular') {
            activeCabinets.sort((a, b) => b.pricePerHour - a.pricePerHour)
        } else if (sortBy === 'price_asc') {
            activeCabinets.sort((a, b) => a.pricePerHour - b.pricePerHour)
        } else if (sortBy === 'price_desc') {
            activeCabinets.sort((a, b) => b.pricePerHour - a.pricePerHour)
        } else {
            activeCabinets.reverse()
        }

        const needsAvailability = availableToday || Boolean(availabilityDate || durationMinutes)
        const cabinetsWithAvailability = activeCabinets.map((cabinet) => ({
            cabinet,
            availabilityPreview: getMockAvailabilityPreview(cabinet.id, {
                date: availabilityDate,
                durationMinutes,
            }),
        }))
        const filteredCabinets = needsAvailability
            ? cabinetsWithAvailability.filter(({ availabilityPreview }) => (availabilityPreview?.freeSlots ?? 0) > 0)
            : cabinetsWithAvailability
        const total = filteredCabinets.length
        const totalPages = Math.ceil(total / limit)
        const items = filteredCabinets
            .slice((page - 1) * limit, page * limit)
            .map(({ cabinet, availabilityPreview }) => ({
                ...cabinet,
                availabilityPreview,
            }))

        return HttpResponse.json({
            items,
            total,
            page,
            totalPages
        })
    }),

    http.get('/api/v1/markets', ({ request }) => mockScenarioResponse(request) ?? HttpResponse.json(isMockEmpty(request) ? [] : editableAutoCareMarkets.map(toMockMarket))),
    http.patch('/api/super-admin/markets/:id', async ({ params, request }) => {
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ code: 'UNAUTHORIZED', message: 'Unauthorized' }, { status: 401 })
        if (user.role !== 'super_admin') return HttpResponse.json({ code: 'FORBIDDEN', message: 'Only super-admins can update markets.' }, { status: 403 })
        const market = editableAutoCareMarkets.find((item) => item.id === params.id || item.cityCode === params.id)
        if (!market) return HttpResponse.json({ code: 'NOT_FOUND', message: 'Automotive market not found.' }, { status: 404 })
        const body = await request.json() as Partial<{ defaultLocale: string; supportedLocales: string[]; timezone: string; currencyCode: string; capabilities: Record<string, boolean>; legalLinks: Record<string, string>; launchReady: boolean }>
        const currencyCode = body.currencyCode
        const locales = Array.isArray(body.supportedLocales) ? body.supportedLocales.filter((locale): locale is string => typeof locale === 'string' && locale.trim().length > 0).map((locale) => locale.trim()) : []
        if (typeof body.defaultLocale !== 'string' || locales.length === 0 || !locales.includes(body.defaultLocale) || typeof body.timezone !== 'string' || typeof currencyCode !== 'string' || !/^[A-Z]{3}$/.test(currencyCode) || typeof body.launchReady !== 'boolean') return invalidMockBodyResponse()
        market.defaultLocale = body.defaultLocale.trim()
        market.supportedLocales = [...new Set(locales)]
        market.timezone = body.timezone.trim()
        market.currencyCode = currencyCode
        market.launchReady = body.launchReady
        if (body.capabilities && typeof body.capabilities === 'object') market.capabilities = body.capabilities
        if (body.legalLinks && typeof body.legalLinks === 'object') market.legalLinks = body.legalLinks
        return HttpResponse.json(toMockMarket(market))
    }),
    http.get('/api/super-admin/market-hierarchy', () => {
        if (!hasMockSuperAdminAccess()) return HttpResponse.json({ code: 'FORBIDDEN', message: 'Only super-admins can manage the market hierarchy.' }, { status: 403 })
        return HttpResponse.json(superAdminMarketCountries.map((country) => ({
            ...country,
            cities: editableAutoCareMarkets.filter((market) => market.countryCode === country.code).map((market) => ({
                ...toMockMarket(market),
                zones: (autoCareLocationZones as unknown as MockSuperAdminZone[]).filter((zone) => zone.marketId === market.id).map(toMockZone),
            })),
        })))
    }),
    http.post('/api/super-admin/market-countries', async ({ request }) => {
        if (!hasMockSuperAdminAccess()) return HttpResponse.json({ code: 'FORBIDDEN', message: 'Only super-admins can manage countries.' }, { status: 403 })
        const body = await request.json() as Partial<MockSuperAdminCountry>
        if (!body.code || !/^[A-Z]{2,3}$/.test(body.code) || !body.names || typeof body.names !== 'object' || !body.defaultLocale || !Array.isArray(body.supportedLocales) || !body.timezone || !body.currencyCode || !/^[A-Z]{3}$/.test(body.currencyCode)) return invalidMockBodyResponse()
        if (superAdminMarketCountries.some((country) => country.code === body.code)) return HttpResponse.json({ code: 'CONFLICT', message: 'Country already exists.' }, { status: 409 })
        const country: MockSuperAdminCountry = { id: `country-${body.code.toLowerCase()}-${Date.now()}`, code: body.code, names: body.names, defaultLocale: body.defaultLocale, supportedLocales: body.supportedLocales, timezone: body.timezone, currencyCode: body.currencyCode, capabilities: body.capabilities ?? {}, legalLinks: body.legalLinks ?? {}, active: body.active ?? true }
        superAdminMarketCountries.push(country)
        return HttpResponse.json(country, { status: 201 })
    }),
    http.patch('/api/super-admin/market-countries/:id', async ({ params, request }) => {
        if (!hasMockSuperAdminAccess()) return HttpResponse.json({ code: 'FORBIDDEN', message: 'Only super-admins can manage countries.' }, { status: 403 })
        const country = superAdminMarketCountries.find((item) => item.id === params.id)
        if (!country) return HttpResponse.json({ code: 'NOT_FOUND', message: 'Country not found.' }, { status: 404 })
        const body = await request.json() as Partial<MockSuperAdminCountry>
        if (!body.names || !body.defaultLocale || !Array.isArray(body.supportedLocales) || !body.timezone || !body.currencyCode || !/^[A-Z]{3}$/.test(body.currencyCode) || typeof body.active !== 'boolean') return invalidMockBodyResponse()
        Object.assign(country, { names: body.names, defaultLocale: body.defaultLocale, supportedLocales: body.supportedLocales, timezone: body.timezone, currencyCode: body.currencyCode, capabilities: body.capabilities ?? {}, legalLinks: body.legalLinks ?? {}, active: body.active })
        return HttpResponse.json(country)
    }),
    http.post('/api/super-admin/market-countries/:id/cities', async ({ params, request }) => {
        if (!hasMockSuperAdminAccess()) return HttpResponse.json({ code: 'FORBIDDEN', message: 'Only super-admins can manage cities.' }, { status: 403 })
        const country = superAdminMarketCountries.find((item) => item.id === params.id)
        if (!country) return HttpResponse.json({ code: 'NOT_FOUND', message: 'Country not found.' }, { status: 404 })
        const body = await request.json() as Partial<MockSuperAdminMarket>
        if (!body.cityCode || !/^[a-z0-9][a-z0-9_-]{1,119}$/.test(body.cityCode) || !body.cityName || !body.defaultLocale || !Array.isArray(body.supportedLocales) || !body.timezone || !body.currencyCode || !/^[A-Z]{3}$/.test(body.currencyCode)) return invalidMockBodyResponse()
        if (editableAutoCareMarkets.some((market) => market.cityCode === body.cityCode)) return HttpResponse.json({ code: 'CONFLICT', message: 'City already exists.' }, { status: 409 })
        const city: MockSuperAdminMarket = { id: `market-${body.cityCode}-${Date.now()}`, countryCode: country.code, countryName: country.names[body.defaultLocale] ?? country.names.en ?? country.code, cityCode: body.cityCode, cityName: body.cityName, regionCode: body.regionCode ?? null, regionName: body.regionName ?? null, centerLatitude: body.centerLatitude ?? null, centerLongitude: body.centerLongitude ?? null, currencyCode: body.currencyCode, defaultLocale: body.defaultLocale, supportedLocales: body.supportedLocales, timezone: body.timezone, capabilities: body.capabilities ?? {}, legalLinks: body.legalLinks ?? {}, launchReady: body.launchReady ?? false }
        editableAutoCareMarkets.push(city)
        return HttpResponse.json(toMockMarket(city), { status: 201 })
    }),
    http.patch('/api/super-admin/market-cities/:id', async ({ params, request }) => {
        if (!hasMockSuperAdminAccess()) return HttpResponse.json({ code: 'FORBIDDEN', message: 'Only super-admins can manage cities.' }, { status: 403 })
        const city = editableAutoCareMarkets.find((item) => item.id === params.id)
        if (!city) return HttpResponse.json({ code: 'NOT_FOUND', message: 'City not found.' }, { status: 404 })
        const body = await request.json() as Partial<MockSuperAdminMarket>
        if (!body.cityCode || !body.cityName || !body.defaultLocale || !Array.isArray(body.supportedLocales) || !body.timezone || !body.currencyCode || !/^[A-Z]{3}$/.test(body.currencyCode) || typeof body.launchReady !== 'boolean') return invalidMockBodyResponse()
        Object.assign(city, { cityCode: body.cityCode, cityName: body.cityName, regionCode: body.regionCode ?? null, regionName: body.regionName ?? null, centerLatitude: body.centerLatitude ?? null, centerLongitude: body.centerLongitude ?? null, currencyCode: body.currencyCode, defaultLocale: body.defaultLocale, supportedLocales: body.supportedLocales, timezone: body.timezone, capabilities: body.capabilities ?? {}, legalLinks: body.legalLinks ?? {}, launchReady: body.launchReady })
        return HttpResponse.json(toMockMarket(city))
    }),
    http.post('/api/super-admin/market-cities/:id/zones', async ({ params, request }) => {
        if (!hasMockSuperAdminAccess()) return HttpResponse.json({ code: 'FORBIDDEN', message: 'Only super-admins can manage zones.' }, { status: 403 })
        if (!editableAutoCareMarkets.some((item) => item.id === params.id)) return HttpResponse.json({ code: 'NOT_FOUND', message: 'City not found.' }, { status: 404 })
        const body = await request.json() as Partial<MockSuperAdminZone>
        if (!body.slug || !/^[a-z0-9][a-z0-9_-]{1,119}$/.test(body.slug) || !body.names || typeof body.names !== 'object' || !['district', 'neighborhood', 'service_area'].includes(body.zoneType ?? '')) return invalidMockBodyResponse()
        const zones = autoCareLocationZones as unknown as MockSuperAdminZone[]
        if (zones.some((zone) => zone.marketId === params.id && zone.slug === body.slug)) return HttpResponse.json({ code: 'CONFLICT', message: 'Zone already exists.' }, { status: 409 })
        const zone: MockSuperAdminZone = { id: `zone-${String(params.id)}-${body.slug}-${Date.now()}`, marketId: String(params.id), parentId: body.parentId ?? null, slug: body.slug, zoneType: body.zoneType!, names: body.names, centerLatitude: body.centerLatitude ?? null, centerLongitude: body.centerLongitude ?? null, radiusKm: body.radiusKm ?? null, imageUrl: body.imageUrl ?? null, displayOrder: body.displayOrder ?? zones.filter((item) => item.marketId === params.id).length, active: body.active ?? true, serviceCount: 0 }
        zones.push(zone)
        return HttpResponse.json(toMockZone(zone), { status: 201 })
    }),
    http.patch('/api/super-admin/market-zones/:id', async ({ params, request }) => {
        if (!hasMockSuperAdminAccess()) return HttpResponse.json({ code: 'FORBIDDEN', message: 'Only super-admins can manage zones.' }, { status: 403 })
        const zone = (autoCareLocationZones as unknown as MockSuperAdminZone[]).find((item) => item.id === params.id)
        if (!zone) return HttpResponse.json({ code: 'NOT_FOUND', message: 'Zone not found.' }, { status: 404 })
        const body = await request.json() as Partial<MockSuperAdminZone>
        if (!body.slug || !body.names || typeof body.names !== 'object' || !['district', 'neighborhood', 'service_area'].includes(body.zoneType ?? '') || typeof body.displayOrder !== 'number' || typeof body.active !== 'boolean') return invalidMockBodyResponse()
        Object.assign(zone, { parentId: body.parentId ?? null, slug: body.slug, zoneType: body.zoneType, names: body.names, centerLatitude: body.centerLatitude ?? null, centerLongitude: body.centerLongitude ?? null, radiusKm: body.radiusKm ?? null, imageUrl: body.imageUrl ?? null, displayOrder: body.displayOrder, active: body.active })
        return HttpResponse.json(toMockZone(zone))
    }),
    http.get('/api/v1/deployment-capabilities', () => HttpResponse.json(STATIC_DEPLOYMENT_CAPABILITIES)),
    http.get('/api/v1/markets/:marketId/zones', ({ params, request }) => {
        const scenario = mockScenarioResponse(request)
        if (scenario) return scenario
        const market = autoCareMarkets.find((item) => item.id === params.marketId || item.cityCode === params.marketId)
        const requestedLimit = Number(new URL(request.url).searchParams.get('limit') ?? 24)
        const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.min(Math.floor(requestedLimit), 100) : 24
        return HttpResponse.json(isMockEmpty(request) ? [] : autoCareLocationZones.filter((zone) => zone.marketId === market?.id).slice(0, limit))
    }),

    http.get('/api/v1/service-definitions', () => HttpResponse.json(autoCareDefinitions)),
    http.patch('/api/admin/service-definitions/:id', async ({ params, request }) => {
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ code: 'UNAUTHORIZED', message: 'Unauthorized' }, { status: 401 })
        if (user.role !== 'admin' && user.role !== 'super_admin') return HttpResponse.json({ code: 'FORBIDDEN', message: 'Only administrators can update service definitions.' }, { status: 403 })
        const definition = autoCareDefinitions.find((item) => item.id === params.id)
        if (!definition) return HttpResponse.json({ code: 'NOT_FOUND', message: 'Automotive service definition not found.' }, { status: 404 })
        const body = await request.json() as Partial<{ categorySlug: string; labels: Record<string, string>; priceType: 'fixed' | 'from' | 'range' | 'quote_required'; comparisonAttributes: string[]; active: boolean }>
        if (typeof body.categorySlug !== 'string' || !body.categorySlug.trim() || !body.labels || typeof body.labels !== 'object' || !body.priceType || !Array.isArray(body.comparisonAttributes) || typeof body.active !== 'boolean') return invalidMockBodyResponse()
        definition.categorySlug = body.categorySlug.trim()
        definition.labels = body.labels
        definition.priceType = body.priceType
        definition.comparisonAttributes = body.comparisonAttributes.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
        definition.active = body.active
        return HttpResponse.json(definition)
    }),
    http.post('/api/v1/catalog-gap-requests', async ({ request }) => {
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        const body = await request.json() as Partial<MockAutoCareCatalogGapRequest>
        if (typeof body.proposedSlug !== 'string' || !/^[a-z0-9][a-z0-9_-]{1,119}$/.test(body.proposedSlug) || typeof body.categorySlug !== 'string' || !body.labels || typeof body.labels !== 'object' || !body.rationale || typeof body.rationale !== 'string' || body.rationale.trim().length < 10) return invalidMockBodyResponse()
        if (mockAutoCareCatalogGapRequests.some((item) => item.proposedSlug === body.proposedSlug && item.status === 'pending')) return HttpResponse.json({ message: 'A catalog request for this service is already pending.' }, { status: 409 })
        const now = new Date().toISOString()
        const item: MockAutoCareCatalogGapRequest = { id: `catalog-gap-${Date.now()}`, requestedById: user.id, providerId: typeof body.providerId === 'string' ? body.providerId : null, proposedSlug: body.proposedSlug, categorySlug: body.categorySlug, labels: body.labels as Record<string, string>, priceType: body.priceType ?? 'quote_required', comparisonAttributes: body.comparisonAttributes ?? [], rationale: body.rationale.trim(), status: 'pending', reviewedById: null, reviewReason: null, reviewedAt: null, createdAt: now, updatedAt: now }
        mockAutoCareCatalogGapRequests.unshift(item)
        return HttpResponse.json(item, { status: 201 })
    }),

    http.get('/api/v1/bonuses/my', ({ request }) => {
        const scenario = mockScenarioResponse(request)
        if (scenario) return scenario
        const user = currentMockUser()
        if (!user || user.role !== 'client') return HttpResponse.json({ message: 'Only clients can view bonus balances.' }, { status: 403 })
        return HttpResponse.json(isMockEmpty(request) ? [] : mockAutoCareBonusAccounts.filter((account) => account.clientId === user.id).map(({ clientId: _clientId, ...account }) => account))
    }),

    http.post('/api/v1/bonuses/redeem', async ({ request }) => {
        const user = currentMockUser()
        if (!user || user.role !== 'client') return HttpResponse.json({ message: 'Only clients can redeem bonus points.' }, { status: 403 })
        const body = await request.json() as { providerId?: string; requestId?: string; points?: number }
        if (!body.providerId || !body.requestId || typeof body.points !== 'number' || !Number.isInteger(body.points) || body.points <= 0) return invalidMockBodyResponse()
        const points = body.points
        const item = mockAutoCareServiceRequests.find((candidate) => candidate.id === body.requestId && candidate.clientId === user.id && candidate.providerId === body.providerId)
        if (!item || !['accepted', 'closed'].includes(item.status)) return HttpResponse.json({ message: 'Bonuses can be redeemed only for a confirmed service request.' }, { status: 409 })
        const account = mockAutoCareBonusAccounts.find((candidate) => candidate.clientId === user.id && candidate.providerId === body.providerId)
        if (!account || account.balancePoints < points) return HttpResponse.json({ message: 'The bonus balance is too low for this redemption.' }, { status: 409 })
        if (account.entries.some((entry) => entry.requestId === item.id && entry.type === 'redeem')) {
            const { clientId: _clientId, ...response } = account
            return HttpResponse.json(response)
        }
        const now = new Date().toISOString()
        account.balancePoints -= points
        account.redeemedPoints += points
        account.entries.unshift({ id: `bonus-entry-${Date.now()}`, type: 'redeem', points: -points, reason: 'Списание бонусов при подтверждённой записи', requestId: item.id, expiresAt: null, createdAt: now })
        const { clientId: _clientId, ...response } = account
        return HttpResponse.json(response)
    }),

    http.get('/api/v1/fair-price', ({ request }) => {
        const url = new URL(request.url)
        const serviceSlug = url.searchParams.get('serviceId') ?? 'oil-change'
        const definition = autoCareDefinitions.find((item) => item.slug === serviceSlug) ?? autoCareDefinitions[0]
        const prices = autoCareProviders.map((provider) => provider.offers?.find((offer) => offer.serviceSlug === definition?.slug)?.priceFromMinor).filter((price): price is number => typeof price === 'number').sort((left, right) => left - right)
        if (!definition || prices.length === 0) return HttpResponse.json(null)
        return HttpResponse.json({ serviceDefinitionId: definition.id, serviceSlug: definition.slug, marketId: url.searchParams.get('marketId'), makeId: url.searchParams.get('makeId'), modelId: url.searchParams.get('modelId'), minPriceMinor: prices[0], medianPriceMinor: prices[Math.floor(prices.length / 2)], maxPriceMinor: prices.at(-1), currencyCode: 'RUB', methodology: { kind: 'provider-offer-derived', sampleSize: prices.length, disclaimer: 'Ориентир по опубликованным предложениям.' }, source: 'mock-provider-offers', generatedAt: new Date().toISOString() })
    }),

    http.get('/api/v1/providers/:providerId/trust', ({ params }) => {
        const provider = autoCareProviders.find((item) => item.id === params.providerId)
        if (!provider) return HttpResponse.json({ message: 'Provider not found.' }, { status: 404 })
        return HttpResponse.json({ providerId: provider.id, score: provider.verified ? 91.5 : 78.2, badge: provider.verified ? 'Надёжный сервис' : null, reassessedAt: '2026-08-01T10:00:00.000Z', evidence: mockAutoCareTrustEvidence.filter((item) => item.providerId === provider.id), explanation: 'Оценка доверия складывается из документов, отзывов и соблюдения условий.' })
    }),

    http.get('/api/v1/vehicle-catalog', ({ request }) => {
        const scenario = mockScenarioResponse(request)
        if (scenario) return scenario
        const brandId = new URL(request.url).searchParams.get('brandId')
        return HttpResponse.json(isMockEmpty(request) ? [] : brandId ? vehicleCatalog.filter((brand) => brand.id === brandId) : vehicleCatalog)
    }),

    http.get('/api/v1/discovery/providers', ({ request }) => {
        const scenario = mockScenarioResponse(request)
        if (scenario) return scenario
        if (isMockEmpty(request)) return HttpResponse.json({ items: [], nextCursor: null })
        const url = new URL(request.url)
        const serviceId = url.searchParams.get('serviceId') ?? 'oil-change'
        const providerName = url.searchParams.get('providerName')?.trim().toLowerCase() ?? ''
        const radiusKm = Number(url.searchParams.get('radiusKm') ?? 25)
        const sort = url.searchParams.get('sort') ?? 'recommended'
        const minPrice = Number(url.searchParams.get('minPrice') ?? 0)
        const maxPrice = Number(url.searchParams.get('maxPrice') ?? Number.POSITIVE_INFINITY)
        const minRating = Number(url.searchParams.get('minRating') ?? 0)
        const availableToday = url.searchParams.get('availableToday') === 'true'
        const priceType = url.searchParams.get('priceType')
        const verifiedOnly = url.searchParams.get('verifiedOnly') === 'true'
        const warrantyOnly = url.searchParams.get('warrantyOnly') === 'true'
        const hasBonus = url.searchParams.get('hasBonus') === 'true'
        const inclusion = url.searchParams.get('inclusion')
        const brandId = url.searchParams.get('brandId') ?? ''
        const marketId = url.searchParams.get('marketId') ?? ''
        const zoneId = url.searchParams.get('zoneId') ?? ''
        const definition = autoCareDefinitions.find((item) => item.slug === serviceId) ?? autoCareDefinitions[0]
        const items = autoCareProviders.map((provider, index) => ({
            provider,
            offer: toAutoCareOffer(provider.id, definition?.slug ?? serviceId, provider.servicePrices?.[definition?.slug ?? serviceId] ?? providerPreviews[index]?.price ?? 0, providerPreviews[index]?.priceType ?? definition?.priceType),
            distanceKm: providerPreviews[index]?.distance ? Number.parseFloat(providerPreviews[index]!.distance) : index + 1,
            nextSlot: providerPreviews[index]?.nextSlot ?? null,
        })).filter((item) => {
            const hasService = item.provider.serviceIds?.includes(definition?.slug ?? serviceId) ?? true
            const price = item.offer.priceFromMinor / 100
            const available = item.nextSlot?.toLowerCase().includes('today') ?? false
            const source = providerPreviews.find((preview) => `api-${preview.id}` === item.provider.id)
            const matchesInclusion = !inclusion || (source?.inclusions ?? []).some((value) => value.toLowerCase().includes(inclusion))
            const matchesBrand = !source || supportsVehicleBrand(source, brandId)
            const requestedMarket = marketId.replace(/^api-/, '').replace(/^\w+-/, '')
            const providerMarket = item.provider.location.marketId.replace(/^market-/, '')
            const matchesMarket = !marketId || item.provider.location.marketId === marketId || providerMarket === requestedMarket
            const matchesZone = !zoneId || item.provider.location.zoneId === zoneId
            const matchesWarranty = !warrantyOnly || (source?.warrantyMonths ?? 0) > 0
            const matchesPriceType = !priceType || source?.priceType === priceType
            const matchesProvider = !providerName || item.provider.name.toLowerCase().includes(providerName)
            return matchesProvider && hasService && matchesMarket && matchesZone && item.distanceKm <= radiusKm && price >= minPrice && price <= maxPrice && item.provider.rating >= minRating && (!availableToday || available) && (!verifiedOnly || item.provider.verified) && matchesWarranty && (!hasBonus || Boolean(item.provider.bonusSummary)) && matchesPriceType && matchesInclusion && matchesBrand
        })

        if (sort === 'price_asc') items.sort((left, right) => left.offer.priceFromMinor - right.offer.priceFromMinor)
        if (sort === 'rating_desc') items.sort((left, right) => right.provider.rating - left.provider.rating)
        if (sort === 'distance_asc') items.sort((left, right) => left.distanceKm - right.distanceKm)

        items.forEach((item) => {
            const activity = mockAutoCareProviderActivity.get(item.provider.id) ?? { impressions: 0, profileOpens: 0 }
            activity.impressions += 1
            mockAutoCareProviderActivity.set(item.provider.id, activity)
        })
        return HttpResponse.json({ items, nextCursor: null })
    }),

    http.get('/api/v1/favorites/providers', () => {
        const user = currentMockUser()
        if (!user || user.role !== 'client') return HttpResponse.json({ message: 'Only clients can view automotive favorites.' }, { status: 403 })
        const providerIds = [...(mockAutoCareFavorites.get(user.id) ?? new Set<string>())]
        return HttpResponse.json(providerIds.map((providerId) => toMockAutoCareFavorite(providerId, user.id)).filter((item): item is NonNullable<typeof item> => item !== null))
    }),

    http.post('/api/v1/favorites/providers/sync', async ({ request }) => {
        const user = currentMockUser()
        if (!user || user.role !== 'client') return HttpResponse.json({ message: 'Only clients can sync automotive favorites.' }, { status: 403 })
        const body = await request.json() as { providerIds?: unknown }
        const providerIds = Array.isArray(body.providerIds) ? body.providerIds.filter((value): value is string => typeof value === 'string').slice(0, 100) : []
        const favorites = mockAutoCareFavorites.get(user.id) ?? new Set<string>()
        providerIds.forEach((providerId) => {
            if (autoCareProviders.some((provider) => provider.id === providerId)) favorites.add(providerId)
        })
        mockAutoCareFavorites.set(user.id, favorites)
        return HttpResponse.json([...favorites].map((providerId) => toMockAutoCareFavorite(providerId, user.id)).filter((item): item is NonNullable<typeof item> => item !== null))
    }),

    http.post('/api/v1/favorites/providers/:providerId', async ({ params }) => {
        const user = currentMockUser()
        if (!user || user.role !== 'client') return HttpResponse.json({ message: 'Only clients can save automotive favorites.' }, { status: 403 })
        const providerId = String(params.providerId)
        if (!autoCareProviders.some((provider) => provider.id === providerId)) return HttpResponse.json({ message: 'Provider not found.' }, { status: 404 })
        const favorites = mockAutoCareFavorites.get(user.id) ?? new Set<string>()
        favorites.add(providerId)
        mockAutoCareFavorites.set(user.id, favorites)
        return HttpResponse.json(toMockAutoCareFavorite(providerId, user.id), { status: 201 })
    }),

    http.delete('/api/v1/favorites/providers/:providerId', ({ params }) => {
        const user = currentMockUser()
        if (!user || user.role !== 'client') return HttpResponse.json({ message: 'Only clients can remove automotive favorites.' }, { status: 403 })
        const favorites = mockAutoCareFavorites.get(user.id) ?? new Set<string>()
        favorites.delete(String(params.providerId))
        mockAutoCareFavorites.set(user.id, favorites)
        return HttpResponse.json({ success: true })
    }),

    http.get('/api/v1/service-requests/:requestId/timeline', ({ params, request }) => {
        const scenario = mockScenarioResponse(request)
        if (scenario) return scenario
        const user = currentMockUser()
        const requestItem = mockAutoCareServiceRequests.find((item) => item.id === params.requestId)
        if (!user || !requestItem || (requestItem.clientId !== user.id && user.role !== 'owner')) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const existing = mockAutoCareRepairEvents.get(requestItem.id)
        if (!existing) {
            const events = [
                { id: `repair-event-${requestItem.id}-created`, requestId: requestItem.id, eventType: 'request_created', actorId: requestItem.clientId, title: 'Заявка создана', notes: requestItem.note, metadata: {}, createdAt: requestItem.createdAt },
                ...(requestItem.quote ? [{ id: `repair-event-${requestItem.id}-quote`, requestId: requestItem.id, eventType: 'quote_shared', actorId: 'user-owner-1', title: 'Смета отправлена сервисом', notes: requestItem.quote.note, metadata: { amountMinor: requestItem.quote.amountMinor }, createdAt: requestItem.quote.createdAt }] : []),
            ]
            mockAutoCareRepairEvents.set(requestItem.id, events)
        }
        return HttpResponse.json(mockAutoCareRepairEvents.get(requestItem.id) ?? [])
    }),

    http.post('/api/v1/broadcast-requests', async ({ request }) => {
        const user = currentMockUser()
        if (!user || user.role !== 'client') return HttpResponse.json({ message: 'Only clients can create broadcast requests.' }, { status: 403 })
        const body = await request.json() as { serviceDefinitionId?: string; marketId?: string | null; issueDescription?: string; vehicleSnapshot?: Record<string, string | number | null> | null; photoUrls?: string[]; preferredAt?: string | null; maxProviders?: number }
        if (!body.serviceDefinitionId || !body.issueDescription?.trim()) return invalidMockBodyResponse()
        const now = new Date().toISOString()
        const item = { id: `broadcast-${Date.now()}`, clientId: user.id, serviceDefinitionId: body.serviceDefinitionId, serviceSlug: autoCareDefinitions.find((definition) => definition.id === body.serviceDefinitionId || definition.slug === body.serviceDefinitionId)?.slug ?? body.serviceDefinitionId, marketId: body.marketId ?? autoCareMarket.id, issueDescription: body.issueDescription.trim(), vehicleSnapshot: body.vehicleSnapshot ?? null, preferredAt: body.preferredAt ?? null, status: 'open', maxProviders: body.maxProviders ?? 5, expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), createdAt: now, offers: [] }
        mockAutoCareBroadcastRequests.unshift(item)
        return HttpResponse.json(item, { status: 201 })
    }),

    http.get('/api/v1/broadcast-requests/my', () => {
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        return HttpResponse.json(mockAutoCareBroadcastRequests.filter((item) => item.clientId === user.id))
    }),

    http.get('/api/v1/broadcast-requests/:broadcastId', ({ params }) => {
        const user = currentMockUser()
        const item = mockAutoCareBroadcastRequests.find((candidate) => candidate.id === params.broadcastId)
        if (!user || !item || (item.clientId !== user.id && user.role === 'client')) return HttpResponse.json({ message: 'Broadcast request not found.' }, { status: 404 })
        const { clientId: _clientId, ...response } = item
        return HttpResponse.json(response)
    }),

    http.get('/api/owner/broadcast-requests', () => {
        const user = currentMockUser()
        if (!user || user.role !== 'owner') return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        return HttpResponse.json(mockAutoCareBroadcastRequests.filter((item) => item.status === 'open' && new Date(String(item.expiresAt)) > new Date()))
    }),

    http.post('/api/owner/broadcast-requests/:broadcastId/offers', async ({ params, request }) => {
        const user = currentMockUser()
        const item = mockAutoCareBroadcastRequests.find((candidate) => candidate.id === params.broadcastId)
        if (!user || user.role !== 'owner' || !item) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const body = await request.json() as Record<string, unknown>
        const provider = ownerAutoCareProviders[0]
        const offer = { id: `broadcast-offer-${Date.now()}`, broadcastRequestId: item.id, providerId: provider.id, providerName: provider.name, locationId: provider.location.id, address: provider.location.address, offerSnapshot: body, status: 'pending', createdAt: new Date().toISOString() }
        ;(item.offers as Array<unknown>).push(offer)
        return HttpResponse.json(offer, { status: 201 })
    }),

    http.post('/api/v1/guarantee-claims', async ({ request }) => {
        const user = currentMockUser()
        if (!user || user.role !== 'client') return HttpResponse.json({ message: 'Only clients can create claims.' }, { status: 403 })
        const body = await request.json() as { requestId?: string; claimType?: string; summary?: string; evidenceUrls?: string[] }
        if (!body.requestId || !body.claimType || !body.summary?.trim()) return invalidMockBodyResponse()
        const now = new Date().toISOString()
        const claim = { id: `guarantee-${Date.now()}`, requestId: body.requestId, claimType: body.claimType, status: 'submitted', summary: body.summary.trim(), evidenceUrls: body.evidenceUrls ?? [], resolution: null, createdAt: now, updatedAt: now, clientId: user.id }
        mockAutoCareGuaranteeClaims.unshift(claim)
        const { clientId: _clientId, ...response } = claim
        return HttpResponse.json(response, { status: 201 })
    }),

    http.get('/api/v1/guarantee-claims/my', () => {
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        return HttpResponse.json(mockAutoCareGuaranteeClaims.filter((claim) => claim.clientId === user.id).map(({ clientId: _clientId, ...claim }) => claim))
    }),

    http.post('/api/v1/expert-questions', async ({ request }) => {
        const user = currentMockUser()
        if (!user || user.role !== 'client') return HttpResponse.json({ message: 'Only clients can ask experts.' }, { status: 403 })
        const body = await request.json() as { symptoms?: string; categorySlug?: string | null; vehicleSnapshot?: Record<string, unknown> | null }
        if (!body.symptoms?.trim()) return invalidMockBodyResponse()
        const item = { id: `expert-question-${Date.now()}`, clientId: user.id, symptoms: body.symptoms.trim(), categorySlug: body.categorySlug ?? null, vehicleSnapshot: body.vehicleSnapshot ?? null, status: 'open', answer: null, createdAt: new Date().toISOString(), answeredAt: null }
        mockAutoCareExpertQuestions.unshift(item)
        const { clientId: _clientId, ...response } = item
        return HttpResponse.json(response, { status: 201 })
    }),

    http.get('/api/v1/expert-questions/my', () => {
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        return HttpResponse.json(mockAutoCareExpertQuestions.filter((question) => question.clientId === user.id).map(({ clientId: _clientId, ...question }) => question))
    }),

    http.get('/api/owner/fleets', () => {
        const user = currentMockUser()
        if (!user || user.role !== 'owner') return HttpResponse.json({ message: 'Only owners can view fleets.' }, { status: 403 })
        return HttpResponse.json(mockAutoCareFleets.filter((fleet) => fleet.ownerId === user.id).map(({ ownerId: _ownerId, ...fleet }) => fleet))
    }),

    http.post('/api/owner/fleets', async ({ request }) => {
        const user = currentMockUser()
        if (!user || user.role !== 'owner') return HttpResponse.json({ message: 'Only owners can create fleets.' }, { status: 403 })
        const body = await request.json() as { name?: string; notes?: string | null }
        if (!body.name?.trim()) return invalidMockBodyResponse()
        const now = new Date().toISOString()
        const fleet = { id: `fleet-${Date.now()}`, ownerId: user.id, name: body.name.trim(), notes: body.notes?.trim() || null, vehicles: [], createdAt: now, updatedAt: now }
        mockAutoCareFleets.unshift(fleet)
        const { ownerId: _ownerId, ...response } = fleet
        return HttpResponse.json(response, { status: 201 })
    }),

    http.post('/api/owner/fleets/:fleetId/vehicles', async ({ params, request }) => {
        const user = currentMockUser()
        const fleet = mockAutoCareFleets.find((candidate) => candidate.id === params.fleetId && candidate.ownerId === user?.id)
        if (!user || user.role !== 'owner' || !fleet) return HttpResponse.json({ message: 'Fleet not found.' }, { status: 404 })
        const body = await request.json() as { label?: string; vehicleSnapshot?: Record<string, unknown>; approvalPolicy?: string | null }
        if (!body.label?.trim() || !body.vehicleSnapshot) return invalidMockBodyResponse()
        const vehicle = { id: `fleet-vehicle-${Date.now()}`, fleetId: fleet.id, label: body.label.trim(), vehicleSnapshot: body.vehicleSnapshot, approvalPolicy: body.approvalPolicy?.trim() || null, createdAt: new Date().toISOString() }
        ;(fleet.vehicles as Array<unknown>).push(vehicle)
        fleet.updatedAt = new Date().toISOString()
        return HttpResponse.json(vehicle, { status: 201 })
    }),

    http.get('/api/v1/providers/:providerId', ({ params, request }) => {
        const scenario = mockScenarioResponse(request)
        if (scenario) return scenario
        const provider = [...autoCareProviders, ...ownerAutoCareProviders].find((item) => item.id === params.providerId || item.id.replace('api-', '') === params.providerId)
        if (!provider) return HttpResponse.json({ message: 'Automotive provider not found.' }, { status: 404 })

        const source = providerPreviews.find((item) => item.id === provider.id.replace('api-', ''))
        const offers = source
            ? automotiveServices.map((service) => toAutoCareOffer(provider.id, service.id, source.servicePrices?.[service.id] ?? source.price, source.priceType ?? 'from'))
            : []

        const activity = mockAutoCareProviderActivity.get(provider.id) ?? { impressions: 0, profileOpens: 0 }
        activity.profileOpens += 1
        mockAutoCareProviderActivity.set(provider.id, activity)
        return HttpResponse.json({ ...provider, offers })
    }),

    http.get('/api/v1/providers/:providerId/reviews', ({ params, request }) => {
        const scenario = mockScenarioResponse(request)
        if (scenario) return scenario
        const provider = [...autoCareProviders, ...ownerAutoCareProviders].find((item) => item.id === params.providerId || item.id.replace('api-', '') === params.providerId)
        if (!provider) return HttpResponse.json({ message: 'Automotive provider not found.' }, { status: 404 })

        const allProviderReviews = mockFeaturedAutoCareReviews.filter((review) => review.providerId === provider.id)
        const reviewFixture = request.headers.get('x-autocare-review-fixture')
        const providerReviews = reviewFixture === 'empty'
            ? []
            : reviewFixture === 'one'
                ? allProviderReviews.slice(0, 1)
                : reviewFixture === 'photos'
                    ? allProviderReviews.filter((review) => review.photoUrls.length > 0).slice(0, 1)
                    : allProviderReviews
        const distribution: Record<'1' | '2' | '3' | '4' | '5', number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
        providerReviews.forEach((review) => { distribution[String(review.rating) as keyof typeof distribution] += 1 })
        const averageRating = providerReviews.length === 0 ? 0 : Number((providerReviews.reduce((sum, review) => sum + review.rating, 0) / providerReviews.length).toFixed(1))
        const rawLimit = Number(new URL(request.url).searchParams.get('limit') ?? 20)
        const limit = Number.isFinite(rawLimit) ? Math.min(50, Math.max(1, Math.floor(rawLimit))) : 20
        return HttpResponse.json({ providerId: provider.id, totalReviews: providerReviews.length, averageRating, distribution, reviews: providerReviews.slice(0, limit) })
    }),

    http.get('/api/v1/providers/:providerId/availability', ({ params, request }) => {
        const provider = [...autoCareProviders, ...ownerAutoCareProviders].find((item) => item.id === params.providerId || item.id.replace('api-', '') === params.providerId)
        const url = new URL(request.url)
        const date = url.searchParams.get('date')
        const locationId = url.searchParams.get('locationId')
        const offeringId = url.searchParams.get('offeringId')
        const source = provider ? providerPreviews.find((item) => item.id === provider.id.replace('api-', '')) : undefined
        if (!provider || !date || !locationId || !offeringId) return HttpResponse.json({ message: 'Invalid availability request.' }, { status: 400 })
        const durationMinutes = 60
        const reserved = mockAutoCareServiceRequests.filter((item) => item.providerId === provider.id && item.locationId === locationId && item.preferredAt?.slice(0, 10) === date && item.status !== 'declined' && item.status !== 'closed').map((item) => item.preferredAt?.slice(11, 16))
        const slots = Array.from({ length: 20 }, (_, index) => 8 * 60 + index * 30).map((start) => ({ startTime: `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`, endTime: `${String(Math.floor((start + durationMinutes) / 60)).padStart(2, '0')}:${String((start + durationMinutes) % 60).padStart(2, '0')}` })).filter((slot) => !reserved.includes(slot.startTime))
        return HttpResponse.json({ date, durationMinutes, slots, source: source?.name ?? null })
    }),

    http.post('/api/v1/service-requests', async ({ request }) => {
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (user.role !== 'client') return HttpResponse.json({ message: 'Only clients can create service requests.' }, { status: 403 })
        const body = await request.json() as {
            providerId?: string
            locationId?: string
            offeringId?: string
            preferredAt?: string
            vehicleSnapshot?: Record<string, string | number | null> | null
            contactSnapshot?: Record<string, string | number | null>
            note?: string | null
        }
        const idempotencyKey = request.headers.get('Idempotency-Key')
        const fingerprint = JSON.stringify({ providerId: body.providerId, locationId: body.locationId, offeringId: body.offeringId, preferredAt: body.preferredAt, vehicleSnapshot: body.vehicleSnapshot ?? null, contactSnapshot: body.contactSnapshot, note: body.note ?? null })
        if (idempotencyKey) {
            if (!/^[a-zA-Z0-9_-]{8,128}$/.test(idempotencyKey)) return HttpResponse.json({ message: 'Invalid Idempotency-Key.' }, { status: 400 })
            const existing = mockAutoCareServiceRequests.find((item) => item.clientId === user.id && item.idempotencyKey === idempotencyKey)
            if (existing) {
                if (existing.idempotencyFingerprint !== fingerprint) return HttpResponse.json({ message: 'Idempotency key was already used for another service request.' }, { status: 409 })
                const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = existing
                return HttpResponse.json(response)
            }
        }
        const provider = autoCareProviders.find((item) => item.id === body.providerId || item.id.replace('api-', '') === body.providerId)
        const source = provider ? providerPreviews.find((item) => item.id === provider.id.replace('api-', '')) : undefined
        const service = automotiveServices.find((item) => body.offeringId?.endsWith(`-${item.id}`)) ?? automotiveServices[0]
        const definition = autoCareDefinitions.find((item) => item.slug === service?.id) ?? autoCareDefinitions[0]
        const offer = provider?.offers?.find((item) => item.id === body.offeringId)
        if (!provider || !body.locationId || !body.offeringId || !body.preferredAt || !body.contactSnapshot || !definition) {
            return HttpResponse.json({ message: 'Invalid service request.' }, { status: 400 })
        }
        const now = new Date().toISOString()
        const result: MockAutoCareServiceRequest = {
            id: `mock-request-${Date.now()}`,
            providerId: provider.id,
            providerName: provider.name,
            locationId: body.locationId,
            address: provider.location.address,
            definitionId: definition.id,
            serviceSlug: definition.slug,
            serviceLabels: definition.labels,
            serviceDescription: offer?.description ?? null,
            offeringId: body.offeringId,
            priceFromMinor: offer?.priceFromMinor ?? (source?.price ? source.price * 100 : null),
            currencyCode: offer?.currencyCode ?? 'RUB',
            offeringSnapshot: offer ? {
                serviceSlug: offer.serviceSlug ?? definition.slug,
                serviceLabels: offer.serviceLabels ?? definition.labels,
                description: offer.description ?? null,
                priceFromMinor: offer.priceFromMinor,
                priceToMinor: offer.priceToMinor,
                currencyCode: offer.currencyCode,
                durationMinutes: offer.durationMinutes,
                inclusions: offer.inclusions,
                warrantyText: offer.warrantyText,
                priceType: offer.priceType ?? definition.priceType,
            } : null,
            preferredAt: body.preferredAt,
            vehicleSnapshot: body.vehicleSnapshot ?? null,
            contactSnapshot: body.contactSnapshot,
            note: body.note ?? null,
            quote: null,
            quoteHistory: [],
            idempotencyKey,
            idempotencyFingerprint: fingerprint,
            status: 'awaiting_reply',
            clientId: user.id,
            clientConfirmedAt: now,
            providerConfirmedAt: null,
            createdAt: now,
            updatedAt: now,
        }
        mockAutoCareServiceRequests.unshift(result)
        pushMockAutoCareNotification({ userId: user.id, requestId: result.id, role: 'client', title: 'Заявка отправлена', message: 'Заявка передана автосервису и появится в переписке.' })
        const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = result
        return HttpResponse.json(response, { status: 201 })
    }),

    http.get('/api/v1/service-requests/my', ({ request }) => {
        const scenario = mockScenarioResponse(request)
        if (scenario) return scenario
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        const items = isMockEmpty(request) ? [] : mockAutoCareServiceRequests.filter((item) => item.clientId === user.id).map(({ clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...item }) => item)
        return HttpResponse.json(items)
    }),

    http.get('/api/v1/chats', ({ request }) => {
        const scenario = mockScenarioResponse(request)
        if (scenario) return scenario
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        const threads = getMockAutoCareChatThreads(user).map((thread) => ({ ...thread, unreadCount: mockChatMessages(thread).filter((message) => message.senderId !== user.id && !message.readAt).length }))
        return HttpResponse.json(threads)
    }),

    http.post('/api/v1/chats', async ({ request }) => {
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        const body = await request.json() as { type?: MockAutoCareChatThread['type']; providerId?: string; subject?: string }
        if (!body.type || body.type === 'service_request' || !body.subject?.trim()) return HttpResponse.json({ message: 'Invalid chat.' }, { status: 400 })
        if (body.type === 'provider_inquiry' && user.role !== 'client') return HttpResponse.json({ message: 'Only clients can ask a service a question.' }, { status: 403 })
        if (body.type === 'support' && !['client', 'owner'].includes(user.role)) return HttpResponse.json({ message: 'Only clients and service owners can open support.' }, { status: 403 })
        if (body.type === 'support' && body.providerId && user.role !== 'owner') return HttpResponse.json({ message: 'Only service owners can link support to a service.' }, { status: 403 })
        if (body.type === 'admin_escalation' && user.role !== 'admin') return HttpResponse.json({ message: 'Only administrators can escalate.' }, { status: 403 })
        const provider = body.providerId ? autoCareProviders.find((candidate) => candidate.id === body.providerId) : undefined
        const clientId = user.role === 'client' ? user.id : null
        const existing = body.type === 'support'
            ? mockAutoCareChatThreads.find((thread) => thread.type === 'support' && thread.status === 'open' && thread.createdById === user.id && thread.providerId === (body.providerId ?? null) && thread.clientId === clientId)
            : undefined
        if (existing) return HttpResponse.json({ ...existing, unreadCount: mockChatMessages(existing).filter((message) => message.senderId !== user.id && !message.readAt).length }, { status: 201 })
        const now = new Date().toISOString()
        const thread: MockAutoCareChatThread = { id: `chat-${Date.now()}`, type: body.type, status: 'open', subject: body.subject.trim(), requestId: null, providerId: body.providerId ?? null, providerName: provider?.name ?? null, clientId, createdById: user.id, lastMessageAt: null, createdAt: now, updatedAt: now }
        mockAutoCareChatThreads.unshift(thread)
        mockAutoCareChatMessages.set(thread.id, [])
        mockAutoCareChatAttachments.set(thread.id, [])
        return HttpResponse.json({ ...thread, unreadCount: 0 }, { status: 201 })
    }),

    http.post('/api/v1/chats/:chatId/reports', async ({ params, request }) => {
        const user = currentMockUser()
        const thread = user ? getMockAutoCareChatThreads(user).find((candidate) => candidate.id === params.chatId) : undefined
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (!thread) return HttpResponse.json({ message: 'Chat not found.' }, { status: 404 })
        const body = await request.json() as { category?: MockAutoCareChatReport['category']; description?: string | null }
        if (!body.category || !['spam', 'harassment', 'fraud', 'unsafe', 'other'].includes(body.category)) return HttpResponse.json({ message: 'Invalid report.' }, { status: 400 })
        const existing = mockAutoCareChatReports.find((report) => report.threadId === thread.id && report.reporterId === user.id)
        if (existing) return HttpResponse.json(existing, { status: 201 })
        const reportedUserId = thread.clientId === user.id ? 'user-owner-1' : thread.clientId
        const now = new Date().toISOString()
        const report: MockAutoCareChatReport = { id: `chat-report-${Date.now()}`, threadId: thread.id, reporterId: user.id, reportedUserId, category: body.category, description: body.description?.trim() || null, status: 'pending', reviewedById: null, resolutionReason: null, createdAt: now, reviewedAt: null }
        mockAutoCareChatReports.unshift(report)
        return HttpResponse.json(report, { status: 201 })
    }),

    http.post('/api/v1/chats/:chatId/blocks', async ({ params, request }) => {
        const user = currentMockUser()
        const thread = user ? getMockAutoCareChatThreads(user).find((candidate) => candidate.id === params.chatId) : undefined
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (!thread) return HttpResponse.json({ message: 'Chat not found.' }, { status: 404 })
        const body = await request.json() as { blockedUserId?: string; reason?: string | null }
        const blockedUserId = body.blockedUserId ?? (thread.clientId === user.id ? 'user-owner-1' : thread.clientId)
        if (!blockedUserId || blockedUserId === user.id) return HttpResponse.json({ message: 'Another participant is required.' }, { status: 400 })
        const now = new Date().toISOString()
        const existing = mockAutoCareChatBlocks.find((block) => block.threadId === thread.id && block.blockerId === user.id && block.blockedUserId === blockedUserId)
        const block: MockAutoCareChatBlock = existing
            ? Object.assign(existing, { status: 'active' as const, reason: body.reason?.trim() || existing.reason, revokedAt: null })
            : { id: `chat-block-${Date.now()}`, threadId: thread.id, blockerId: user.id, blockedUserId, status: 'active', reason: body.reason?.trim() || null, createdAt: now, revokedAt: null }
        if (!existing) mockAutoCareChatBlocks.unshift(block)
        return HttpResponse.json(block, { status: 201 })
    }),

    http.delete('/api/v1/chats/:chatId/blocks/:blockId', ({ params }) => {
        const user = currentMockUser()
        const block = mockAutoCareChatBlocks.find((candidate) => candidate.id === params.blockId && candidate.threadId === params.chatId)
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (!block) return HttpResponse.json({ message: 'Chat block not found.' }, { status: 404 })
        if (block.blockerId !== user.id && !['admin', 'super_admin'].includes(user.role)) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        block.status = 'revoked'
        block.revokedAt = new Date().toISOString()
        return HttpResponse.json(block)
    }),

    http.get('/api/v1/chats/:chatId', ({ params, request }) => {
        const scenario = mockScenarioResponse(request)
        if (scenario) return scenario
        const user = currentMockUser()
        const thread = user ? getMockAutoCareChatThreads(user).find((candidate) => candidate.id === params.chatId) : undefined
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (!thread) return HttpResponse.json({ message: 'Chat not found.' }, { status: 404 })
        const allMessages = mockChatMessages(thread)
        const url = new URL(request.url)
        const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 50) || 50, 1), 100)
        const cursorId = decodeMockChatCursor(url.searchParams.get('cursor'))
        const cursorIndex = cursorId ? allMessages.findIndex((message) => message.id === cursorId) : -1
        const start = cursorIndex >= 0 ? cursorIndex + 1 : 0
        const page = allMessages.slice(start, start + limit + 1)
        const hasMore = page.length > limit
        const messages = hasMore ? page.slice(0, limit) : page
        const now = new Date().toISOString()
        messages.filter((message) => message.senderId !== user.id && !message.readAt).forEach((message) => { message.readAt = now })
        const attachments = mockChatAttachments(thread).map(({ contentBase64: _contentBase64, ...attachment }) => attachment)
        return HttpResponse.json({ thread: { ...thread, unreadCount: 0 }, messages, attachments, nextCursor: hasMore && messages.at(-1) ? encodeMockChatCursor(messages.at(-1)!) : null })
    }),

    http.post('/api/v1/chats/:chatId/messages', async ({ params, request }) => {
        const user = currentMockUser()
        const thread = user ? getMockAutoCareChatThreads(user).find((candidate) => candidate.id === params.chatId) : undefined
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (!thread) return HttpResponse.json({ message: 'Chat not found.' }, { status: 404 })
        const blocked = mockAutoCareChatBlocks.some((block) => block.threadId === thread.id && block.status === 'active' && (block.blockerId === user.id || block.blockedUserId === user.id))
        if (blocked) return HttpResponse.json({ message: 'Messaging is unavailable because this chat is blocked.' }, { status: 403 })
        const body = await request.json() as { body?: string }
        if (!body.body?.trim()) return HttpResponse.json({ message: 'Message is required.' }, { status: 400 })
        const now = new Date().toISOString()
        const message: ServiceChatMessage = { id: `chat-message-${Date.now()}`, senderId: user.id, kind: 'text', body: body.body.trim(), offer: null, deliveredAt: now, readAt: null, createdAt: now }
        const messages = mockChatMessages(thread)
        messages.push(message)
        thread.lastMessageAt = now
        thread.updatedAt = now
        emitMockAutoCareChatEvent({ type: 'message.created', threadId: thread.id, requestId: thread.requestId ?? undefined, payload: message })
        return HttpResponse.json(message, { status: 201 })
    }),

    http.post('/api/v1/chats/:chatId/read', ({ params }) => {
        const user = currentMockUser()
        const thread = user ? getMockAutoCareChatThreads(user).find((candidate) => candidate.id === params.chatId) : undefined
        if (!user || !thread) return HttpResponse.json({ message: 'Chat not found.' }, { status: 404 })
        const now = new Date().toISOString()
        const messages = mockChatMessages(thread)
        const unread = messages.filter((message) => message.senderId !== user.id && !message.readAt)
        unread.forEach((message) => { message.readAt = now })
        if (unread.length) emitMockAutoCareChatEvent({ type: 'message.read', threadId: thread.id, requestId: thread.requestId ?? undefined, payload: { messageIds: unread.map((message) => message.id), readAt: now } })
        return HttpResponse.json({ updated: unread.length })
    }),

    http.post('/api/v1/chats/:chatId/attachments', async ({ params, request }) => {
        const user = currentMockUser()
        const thread = user ? getMockAutoCareChatThreads(user).find((candidate) => candidate.id === params.chatId) : undefined
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (!thread) return HttpResponse.json({ message: 'Chat not found.' }, { status: 404 })
        const body = await request.json() as { fileName?: string; contentType?: string; size?: number; contentBase64?: string }
        if (!body.fileName || !body.contentType || !body.size || !body.contentBase64 || !['image/jpeg', 'image/png', 'image/webp'].includes(body.contentType)) return HttpResponse.json({ message: 'Invalid attachment.' }, { status: 400 })
        const now = new Date().toISOString()
        const attachment = { id: `chat-attachment-${Date.now()}`, uploadedById: user.id, contentType: body.contentType, bytes: body.size, status: 'ready' as const, url: `data:${body.contentType};base64,${body.contentBase64}`, createdAt: now, contentBase64: body.contentBase64 }
        const attachments = mockChatAttachments(thread)
        attachments.push(attachment)
        mockAutoCareChatAttachments.set(thread.id, attachments)
        thread.updatedAt = now
        thread.lastMessageAt = now
        emitMockAutoCareChatEvent({ type: 'attachment.created', threadId: thread.id, requestId: thread.requestId ?? undefined, payload: attachment })
        const { contentBase64: _contentBase64, ...response } = attachment
        return HttpResponse.json(response, { status: 201 })
    }),

    http.get('/api/v1/service-requests/:requestId', ({ params }) => {
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((request) => request.id === params.requestId)
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (!item) return HttpResponse.json({ message: 'Service request not found.' }, { status: 404 })
        const provider = autoCareProviders.find((candidate) => candidate.id === item.providerId)
        const allowed = item.clientId === user.id || (user.role === 'owner' && provider?.id === item.providerId)
        if (!allowed) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = item
        return HttpResponse.json(response)
    }),

    http.get('/api/v1/service-requests/:requestId/conversation', ({ params, request }) => {
        const scenario = mockScenarioResponse(request)
        if (scenario) return scenario
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((request) => request.id === params.requestId)
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        const provider = item ? autoCareProviders.find((candidate) => candidate.id === item.providerId) : undefined
        const allowed = Boolean(item && (item.clientId === user.id || (user.role === 'owner' && provider?.id === item.providerId)))
        if (!allowed || !item) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const now = new Date().toISOString()
        const allMessages = mockAutoCareMessages.get(item.id) ?? []
        const requestedLimit = Number(new URL(request.url).searchParams.get('limit') ?? 50)
        const limit = Number.isInteger(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 100) : 50
        const requestedOffset = Number(new URL(request.url).searchParams.get('cursor') ?? 0)
        const offset = Number.isInteger(requestedOffset) && requestedOffset >= 0 ? requestedOffset : 0
        const messages = allMessages.slice(offset, offset + limit)
        const unread = messages.filter((message) => message.senderId !== user.id && !message.readAt)
        unread.forEach((message) => { message.readAt = now })
        if (unread.length) emitMockServiceChatEvent({ type: 'message.read', requestId: item.id, payload: { messageIds: unread.map((message) => message.id), readAt: now } })
        const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = item
        const attachments = (mockAutoCareAttachments.get(item.id) ?? []).map(({ contentBase64: _contentBase64, ...attachment }) => attachment)
        return HttpResponse.json({ request: response, messages, attachments, nextCursor: offset + messages.length < allMessages.length ? String(offset + messages.length) : null })
    }),

    http.post('/api/v1/service-requests/:requestId/messages', async ({ params, request }) => {
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((candidate) => candidate.id === params.requestId)
        const provider = item ? autoCareProviders.find((candidate) => candidate.id === item.providerId) : undefined
        const allowed = Boolean(item && (item.clientId === user?.id || (user?.role === 'owner' && provider?.id === item.providerId)))
        if (!user || !item || !allowed) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const body = await request.json() as { body?: string }
        if (!body.body?.trim()) return HttpResponse.json({ message: 'Message is required.' }, { status: 400 })
        const idempotencyKey = request.headers.get('Idempotency-Key')
        const normalizedBody = body.body.trim()
        const existing = idempotencyKey
            ? (mockAutoCareMessages.get(item.id) ?? []).find((candidate) => candidate.senderId === user.id && candidate.idempotencyKey === idempotencyKey)
            : undefined
        if (existing) {
            if (existing.idempotencyFingerprint !== normalizedBody) return HttpResponse.json({ message: 'Idempotency key was already used for another message.' }, { status: 409 })
            return HttpResponse.json(existing, { status: 201 })
        }
        const now = new Date().toISOString()
        const message: ServiceChatMessage = { id: `mock-message-${Date.now()}`, senderId: user.id, kind: 'text', body: normalizedBody, offer: null, deliveredAt: now, readAt: null, createdAt: now, idempotencyKey, idempotencyFingerprint: normalizedBody }
        mockAutoCareMessages.set(item.id, [...(mockAutoCareMessages.get(item.id) ?? []), message])
        emitMockServiceChatEvent({ type: 'message.created', requestId: item.id, payload: message })
        pushMockAutoCareNotification({ userId: user.id === item.clientId ? 'user-owner-1' : item.clientId, requestId: item.id, role: user.id === item.clientId ? 'owner' : 'client', title: 'Новое сообщение по заявке', message: 'В переписке по услуге появилось новое сообщение.' })
        return HttpResponse.json(message, { status: 201 })
    }),

    http.post('/api/owner/service-requests/:requestId/offers', async ({ params, request }) => {
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((candidate) => candidate.id === params.requestId)
        const provider = item ? autoCareProviders.find((candidate) => candidate.id === item.providerId) : undefined
        if (!user || user.role !== 'owner' || !item || provider?.id !== item.providerId) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const body = await request.json() as { type?: 'discount' | 'alternative'; title?: string; description?: string | null; discountPercent?: number | null; couponCode?: string | null; amountMinor?: number | null; currencyCode?: string | null; expiresAt?: string | null }
        if (!body.type || !body.title?.trim() || (body.type === 'discount' && !body.discountPercent)) return HttpResponse.json({ message: 'Invalid service offer.' }, { status: 400 })
        const now = new Date().toISOString()
        const message: ServiceChatMessage = { id: `mock-message-${Date.now()}`, senderId: user.id, kind: 'offer', body: body.title.trim(), offer: { type: body.type, title: body.title.trim(), description: body.description?.trim() || null, discountPercent: body.discountPercent ?? null, couponCode: body.type === 'discount' ? body.couponCode?.trim().toUpperCase() || `AC-${Math.random().toString(36).slice(2, 8).toUpperCase()}` : null, amountMinor: body.amountMinor ?? null, currencyCode: body.currencyCode ?? null, expiresAt: body.expiresAt ?? null, status: 'pending' }, deliveredAt: now, readAt: null, createdAt: now }
        mockAutoCareMessages.set(item.id, [...(mockAutoCareMessages.get(item.id) ?? []), message])
        emitMockServiceChatEvent({ type: 'message.created', requestId: item.id, payload: message })
        return HttpResponse.json(message, { status: 201 })
    }),

    http.post('/api/v1/service-requests/:requestId/offers/:messageId/decision', async ({ params, request }) => {
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((candidate) => candidate.id === params.requestId)
        const message = item ? mockAutoCareMessages.get(item.id)?.find((candidate) => candidate.id === params.messageId) : undefined
        if (!user || !item || user.id !== item.clientId || !message?.offer) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const body = await request.json() as { decision?: 'accept' | 'decline' }
        if (message.offer.status !== 'pending' || !body.decision) return HttpResponse.json({ message: 'Offer is no longer available.' }, { status: 409 })
        message.offer = { ...message.offer, status: body.decision === 'accept' ? 'accepted' : 'declined' }
        emitMockServiceChatEvent({ type: 'offer.updated', requestId: item.id, payload: message })
        return HttpResponse.json(message)
    }),

    http.post('/api/v1/service-requests/:requestId/read', ({ params }) => {
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((candidate) => candidate.id === params.requestId)
        if (!user || !item) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const now = new Date().toISOString()
        const messages = mockAutoCareMessages.get(item.id) ?? []
        const unread = messages.filter((message) => message.senderId !== user.id && !message.readAt)
        unread.forEach((message) => { message.readAt = now })
        if (unread.length) emitMockServiceChatEvent({ type: 'message.read', requestId: item.id, payload: { messageIds: unread.map((message) => message.id), readAt: now } })
        return HttpResponse.json({ updated: unread.length })
    }),

    http.post('/api/v1/service-requests/:requestId/attachments', async ({ params, request }) => {
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((candidate) => candidate.id === params.requestId)
        const provider = item ? autoCareProviders.find((candidate) => candidate.id === item.providerId) : undefined
        const allowed = Boolean(user && item && (item.clientId === user.id || (user.role === 'owner' && provider?.id === item.providerId)))
        if (!allowed || !user || !item) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const body = await request.json() as { fileName?: string; contentType?: string; size?: number; contentBase64?: string }
        if (!body.fileName || !body.contentType || !body.size || !body.contentBase64) return HttpResponse.json({ message: 'Invalid attachment.' }, { status: 400 })
        const attachmentId = `mock-attachment-${Date.now()}`
        const attachment = { id: attachmentId, uploadedById: user.id, contentType: body.contentType, bytes: body.size, status: 'ready' as const, url: `/v1/service-requests/${item.id}/attachments/${attachmentId}`, createdAt: new Date().toISOString(), contentBase64: body.contentBase64 }
        mockAutoCareAttachments.set(item.id, [...(mockAutoCareAttachments.get(item.id) ?? []), attachment])
        emitMockServiceChatEvent({ type: 'attachment.created', requestId: item.id, payload: attachment })
        const { contentBase64: _contentBase64, ...response } = attachment
        return HttpResponse.json(response, { status: 201 })
    }),

    http.get('/api/v1/service-requests/:requestId/attachments/:attachmentId', ({ params }) => {
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((candidate) => candidate.id === params.requestId)
        const attachment = mockAutoCareAttachments.get(String(params.requestId))?.find((candidate) => candidate.id === params.attachmentId)
        const provider = item ? autoCareProviders.find((candidate) => candidate.id === item.providerId) : undefined
        const allowed = Boolean(user && item && attachment && (item.clientId === user.id || (user.role === 'owner' && provider?.id === item.providerId)))
        if (!allowed || !attachment) return HttpResponse.json({ message: 'Attachment not found.' }, { status: 404 })
        const [, encoded] = attachment.contentBase64.split(',', 2)
        const body = encoded ?? attachment.contentBase64
        const bytes = Uint8Array.from(atob(body), (character) => character.charCodeAt(0))
        return new HttpResponse(bytes, { headers: { 'Content-Type': attachment.contentType, 'Cache-Control': 'private, max-age=60' } })
    }),

    http.post('/api/v1/service-requests/:requestId/confirm', ({ params }) => {
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((request) => request.id === params.requestId)
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (!item || item.clientId !== user.id) return HttpResponse.json({ message: 'Service request not found.' }, { status: 404 })
        item.clientConfirmedAt ??= new Date().toISOString()
        item.updatedAt = new Date().toISOString()
        const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = item
        return HttpResponse.json(response)
    }),

    http.post('/api/v1/service-requests/:requestId/cancel', async ({ params, request }) => {
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((candidate) => candidate.id === params.requestId)
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (!item || item.clientId !== user.id) return HttpResponse.json({ message: 'Service request not found.' }, { status: 404 })
        if (item.status === 'cancelled') {
            const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = item
            return HttpResponse.json(response)
        }
        if (['declined', 'closed'].includes(item.status)) return HttpResponse.json({ message: 'This service request can no longer be cancelled.' }, { status: 409 })
        const body = await request.json().catch(() => ({})) as { reason?: string | null }
        const now = new Date().toISOString()
        item.status = 'cancelled'
        item.cancelledAt = now
        item.cancelledById = user.id
        item.cancellationReason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 1000) || null : null
        item.updatedAt = now
        pushMockAutoCareNotification({ userId: 'user-owner-1', requestId: item.id, role: 'owner', title: 'Клиент отменил заявку', message: 'Клиент отменил заявку на услугу.' })
        const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = item
        return HttpResponse.json(response)
    }),

    http.post('/api/owner/service-requests/:requestId/reschedule', async ({ params, request }) => {
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((candidate) => candidate.id === params.requestId)
        if (!user || user.role !== 'owner' || !item) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const body = await request.json().catch(() => ({})) as { proposedAt?: string; reason?: string | null }
        const proposedAt = new Date(body.proposedAt ?? '')
        if (Number.isNaN(proposedAt.getTime()) || proposedAt.getTime() <= Date.now()) return HttpResponse.json({ message: 'The proposed visit time must be in the future.' }, { status: 400 })
        if (item.reschedule?.status === 'pending') return HttpResponse.json({ message: 'This service request already has a pending reschedule request.' }, { status: 409 })
        const result = { id: `mock-reschedule-${Date.now()}`, proposedAt: proposedAt.toISOString(), requestedById: user.id, status: 'pending' as const, reason: typeof body.reason === 'string' ? body.reason.trim().slice(0, 1000) || null : null, resolvedById: null, resolutionReason: null, createdAt: new Date().toISOString(), resolvedAt: null }
        item.reschedule = result
        item.updatedAt = result.createdAt
        pushMockAutoCareNotification({ userId: item.clientId, requestId: item.id, role: 'client', title: 'Сервис предложил новое время', message: 'Проверьте новое время визита в заявке.' })
        return HttpResponse.json(result, { status: 201 })
    }),

    http.post('/api/v1/service-requests/:requestId/reschedule/decision', async ({ params, request }) => {
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((candidate) => candidate.id === params.requestId)
        if (!user || !item || item.clientId !== user.id) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const body = await request.json().catch(() => ({})) as { decision?: 'accept' | 'reject'; reason?: string | null }
        const reschedule = item.reschedule
        if (!reschedule) return HttpResponse.json({ message: 'Reschedule request not found.' }, { status: 404 })
        if (reschedule.status !== 'pending') {
            if ((body.decision === 'accept' && reschedule.status === 'accepted') || (body.decision === 'reject' && reschedule.status === 'rejected')) {
                const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = item
                return HttpResponse.json(response)
            }
            return HttpResponse.json({ message: 'This reschedule request has already been resolved.' }, { status: 409 })
        }
        if (!body.decision) return HttpResponse.json({ message: 'Decision is required.' }, { status: 400 })
        const now = new Date().toISOString()
        reschedule.status = body.decision === 'accept' ? 'accepted' : 'rejected'
        reschedule.resolvedById = user.id
        reschedule.resolutionReason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 1000) || null : null
        reschedule.resolvedAt = now
        if (body.decision === 'accept') item.preferredAt = reschedule.proposedAt
        item.updatedAt = now
        pushMockAutoCareNotification({ userId: 'user-owner-1', requestId: item.id, role: 'owner', title: body.decision === 'accept' ? 'Клиент подтвердил новое время' : 'Клиент отклонил новое время', message: body.decision === 'accept' ? 'Новое время визита подтверждено клиентом.' : 'Клиент отклонил предложенное время визита.' })
        const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = item
        return HttpResponse.json(response)
    }),

    http.post('/api/owner/service-requests/:requestId/no-show', async ({ params, request }) => {
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((candidate) => candidate.id === params.requestId)
        if (!user || user.role !== 'owner' || !item) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        if (item.status === 'no_show') {
            const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = item
            return HttpResponse.json(response)
        }
        if (item.status !== 'accepted' || !item.providerConfirmedAt || !item.preferredAt || new Date(item.preferredAt).getTime() > Date.now()) return HttpResponse.json({ message: 'Only confirmed visits after their scheduled time can be marked as no-show.' }, { status: 409 })
        const body = await request.json().catch(() => ({})) as { reason?: string | null }
        const now = new Date().toISOString()
        item.status = 'no_show'
        item.noShowAt = now
        item.noShowById = user.id
        item.noShowReason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 1000) || null : null
        item.updatedAt = now
        pushMockAutoCareNotification({ userId: item.clientId, requestId: item.id, role: 'client', title: 'Визит отмечен как неявка', message: 'Сервис отметил, что визит не состоялся.' })
        const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = item
        return HttpResponse.json(response)
    }),

    http.post('/api/owner/service-requests/:requestId/complete', async ({ params, request }) => {
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((candidate) => candidate.id === params.requestId)
        if (!user || user.role !== 'owner' || !item) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        if (item.status === 'closed') {
            const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = item
            return HttpResponse.json(response)
        }
        if (item.status !== 'accepted' || !item.clientConfirmedAt || !item.providerConfirmedAt || !item.preferredAt || new Date(item.preferredAt).getTime() > Date.now()) {
            return HttpResponse.json({ message: 'Only confirmed visits after their scheduled time can be completed.' }, { status: 409 })
        }
        const body = await request.json().catch(() => ({})) as { note?: string | null }
        const now = new Date().toISOString()
        item.status = 'closed'
        item.completedAt = now
        item.completedById = user.id
        item.completionNote = typeof body.note === 'string' ? body.note.trim().slice(0, 1000) || null : null
        item.updatedAt = now
        awardMockAutoCareBonus(item, user.id)
        pushMockAutoCareNotification({ userId: item.clientId, requestId: item.id, role: 'client', title: 'Визит завершён', message: 'Сервис отметил услугу завершённой. Теперь можно оставить отзыв.' })
        const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = item
        return HttpResponse.json(response)
    }),

    http.post('/api/v1/service-requests/:requestId/quote/accept', ({ params }) => {
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((request) => request.id === params.requestId)
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (!item || item.clientId !== user.id) return HttpResponse.json({ message: 'Service request not found.' }, { status: 404 })
        if (item.status !== 'estimate_shared' || !item.quote) return HttpResponse.json({ message: 'There is no pending estimate.' }, { status: 409 })
        item.status = 'accepted'
        const acceptedAt = new Date().toISOString()
        const latestQuote = item.quoteHistory.at(-1) ?? item.quote
        const latestQuoteVersion = latestQuote && 'version' in latestQuote && typeof latestQuote.version === 'number' ? latestQuote.version : null
        item.clientConfirmedAt = acceptedAt
        item.acceptedQuoteVersion = latestQuoteVersion
        item.acceptedQuoteSnapshot = latestQuote ? { ...latestQuote, acceptedAt, acceptedFromQuoteVersion: latestQuoteVersion } : null
        item.acceptedQuoteAt = acceptedAt
        item.booking = latestQuote && latestQuoteVersion !== null && item.preferredAt
            ? {
                requestId: item.id,
                quoteVersion: latestQuoteVersion,
                amountMinor: latestQuote.amountMinor,
                currencyCode: latestQuote.currencyCode,
                lineItems: 'lineItems' in latestQuote && Array.isArray(latestQuote.lineItems) ? latestQuote.lineItems : [],
                scheduledAt: item.preferredAt,
                timezone: 'Europe/Moscow',
                serviceSlug: item.serviceSlug,
                providerId: item.providerId,
                locationId: item.locationId,
                status: 'confirmed',
                createdAt: acceptedAt,
            }
            : null
        item.updatedAt = acceptedAt
        pushMockAutoCareNotification({ userId: 'user-owner-1', requestId: item.id, role: 'owner', title: 'Клиент принял смету', message: 'Клиент подтвердил предварительную стоимость услуги.' })
        const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = item
        return HttpResponse.json(response)
    }),

    http.post('/api/v1/service-requests/:requestId/quote/decline', ({ params }) => {
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((request) => request.id === params.requestId)
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (!item || item.clientId !== user.id) return HttpResponse.json({ message: 'Service request not found.' }, { status: 404 })
        if (item.status !== 'estimate_shared' || !item.quote) return HttpResponse.json({ message: 'There is no pending estimate.' }, { status: 409 })
        item.status = 'declined'
        item.clientConfirmedAt = new Date().toISOString()
        item.acceptedQuoteVersion = null
        item.acceptedQuoteSnapshot = null
        item.acceptedQuoteAt = null
        item.updatedAt = new Date().toISOString()
        pushMockAutoCareNotification({ userId: 'user-owner-1', requestId: item.id, role: 'owner', title: 'Клиент отклонил смету', message: 'Клиент попросил не продолжать по этой смете.' })
        const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = item
        return HttpResponse.json(response)
    }),

    http.get('/api/owner/service-requests', ({ request }) => {
        const scenario = mockScenarioResponse(request)
        if (scenario) return scenario
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (user.role !== 'owner') return HttpResponse.json({ message: 'Only owners can view service requests.' }, { status: 403 })
        const items = isMockEmpty(request) ? [] : mockAutoCareServiceRequests.filter((item) => autoCareProviders.some((provider) => provider.id === item.providerId)).map(({ clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...item }) => item)
        return HttpResponse.json(items)
    }),

    http.post('/api/owner/service-requests/:requestId/confirm', ({ params }) => {
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((request) => request.id === params.requestId)
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (user.role !== 'owner' || !item) return HttpResponse.json({ message: 'Service request not found.' }, { status: 404 })
        item.providerConfirmedAt ??= new Date().toISOString()
        item.status = 'accepted'
        item.updatedAt = new Date().toISOString()
        pushMockAutoCareNotification({ userId: item.clientId, requestId: item.id, role: 'client', title: 'Сервис подтвердил заявку', message: 'Сервис подтвердил заявку и готов перейти к следующему шагу.' })
        const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = item
        return HttpResponse.json(response)
    }),

    http.post('/api/owner/service-requests/:requestId/quote', async ({ params, request }) => {
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((candidate) => candidate.id === params.requestId)
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (user.role !== 'owner' || !item) return HttpResponse.json({ message: 'Service request not found.' }, { status: 404 })
        if (item.status === 'accepted' || item.status === 'declined' || item.status === 'closed') return HttpResponse.json({ message: 'This service request cannot receive a new estimate.' }, { status: 409 })
        const body = await request.json() as { amountMinor?: number; currencyCode?: string; note?: string | null }
        const amountMinor = body.amountMinor
        const currencyCode = body.currencyCode
        if (typeof amountMinor !== 'number' || !Number.isInteger(amountMinor) || amountMinor <= 0 || !/^[A-Z]{3}$/.test(currencyCode ?? '')) return invalidMockBodyResponse()
        const now = new Date().toISOString()
        item.quote = { amountMinor, currencyCode: currencyCode!, note: body.note?.trim() || null, createdAt: now }
        item.quoteHistory.push({ id: `mock-quote-${Date.now()}`, version: item.quoteHistory.length + 1, amountMinor, currencyCode: currencyCode!, note: body.note?.trim() || null, createdAt: now })
        item.status = 'estimate_shared'
        item.updatedAt = now
        pushMockAutoCareNotification({ userId: item.clientId, requestId: item.id, role: 'client', title: 'Сервис прислал предварительную смету', message: 'Проверьте предварительную стоимость услуги.' })
        const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = item
        return HttpResponse.json(response)
    }),

    http.get('/api/owner/autocare-providers', ({ request }) => {
        const scenario = mockScenarioResponse(request)
        if (scenario) return scenario
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)

        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'owner') return HttpResponse.json({ message: 'Only owners can manage automotive service profiles.' }, { status: 403 })

        return HttpResponse.json(isMockEmpty(request) ? [] : ownerAutoCareProviders)
    }),

    http.get('/api/owner/workspace-access', () => {
        const currentUser = currentMockUser()
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        const scopes = currentUser.role === 'owner'
            ? ownerAutoCareProviders.map((provider) => ({ providerId: provider.id, locationIds: null, roles: ['owner'] }))
            : []
        return HttpResponse.json({ allowed: scopes.length > 0, providerIds: scopes.map((scope) => scope.providerId), scopes })
    }),

    http.get('/api/owner/autocare-providers/:providerId/members', ({ params }) => {
        const currentUser = currentMockUser()
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'owner') return HttpResponse.json({ message: 'Only owners can manage provider members.' }, { status: 403 })
        if (!ownerAutoCareProviders.some((provider) => provider.id === params.providerId)) return HttpResponse.json({ message: 'Automotive service not found.' }, { status: 404 })
        return HttpResponse.json({ memberships: mockAutoCareProviderMemberships.get(String(params.providerId)) ?? [], invitations: mockAutoCareProviderInvitations.filter((invitation) => invitation.providerId === params.providerId) })
    }),

    http.post('/api/owner/autocare-providers/:providerId/members/invitations', async ({ params, request }) => {
        const currentUser = currentMockUser()
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'owner') return HttpResponse.json({ message: 'Only owners can invite provider members.' }, { status: 403 })
        const provider = ownerAutoCareProviders.find((candidate) => candidate.id === params.providerId)
        if (!provider) return HttpResponse.json({ message: 'Automotive service not found.' }, { status: 404 })
        const body = await request.json() as { email?: unknown; role?: unknown; locationId?: unknown }
        if (typeof body.email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email) || (body.role !== 'manager' && body.role !== 'staff') || (body.locationId !== undefined && body.locationId !== null && typeof body.locationId !== 'string')) return invalidMockBodyResponse()
        const email = body.email.trim().toLowerCase()
        const pending = mockAutoCareProviderInvitations.find((invitation) => invitation.providerId === provider.id && invitation.email === email && invitation.role === body.role && invitation.locationId === (body.locationId ?? null) && invitation.status === 'pending' && new Date(invitation.expiresAt) > new Date())
        if (pending) return HttpResponse.json({ message: 'A pending invitation already exists for this scope.' }, { status: 409 })
        const now = new Date().toISOString()
        const role = body.role === 'manager' ? 'manager' : 'staff'
        const invitation: MockAutoCareProviderInvitation = { id: `provider-invite-${Date.now()}`, providerId: provider.id, email, locationId: typeof body.locationId === 'string' ? body.locationId : null, role, status: 'pending', expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(), acceptedAt: null, revokedAt: null, createdAt: now, inviteToken: `mock-invite-${Date.now()}` }
        mockAutoCareProviderInvitations.unshift(invitation)
        return HttpResponse.json(invitation, { status: 201 })
    }),

    http.delete('/api/owner/autocare-providers/:providerId/members/invitations/:invitationId', ({ params }) => {
        const currentUser = currentMockUser()
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'owner') return HttpResponse.json({ message: 'Only owners can revoke provider invitations.' }, { status: 403 })
        const invitation = mockAutoCareProviderInvitations.find((candidate) => candidate.id === params.invitationId && candidate.providerId === params.providerId)
        if (!invitation) return HttpResponse.json({ message: 'Provider invitation not found.' }, { status: 404 })
        if (invitation.status === 'pending') { invitation.status = 'revoked'; invitation.revokedAt = new Date().toISOString() }
        return HttpResponse.json(invitation)
    }),
    http.delete('/api/owner/autocare-providers/:providerId/members/:membershipId', ({ params }) => {
        const currentUser = currentMockUser()
        if (!currentUser || currentUser.role !== 'owner') return HttpResponse.json({ message: 'Only owners can revoke provider memberships.' }, { status: 403 })
        const memberships = mockAutoCareProviderMemberships.get(String(params.providerId)) ?? []
        const membership = memberships.find((candidate) => candidate.id === String(params.membershipId))
        if (!membership) return HttpResponse.json({ message: 'Provider membership not found.' }, { status: 404 })
        membership.status = 'revoked'
        mockAutoCareProviderMemberships.set(String(params.providerId), memberships)
        return HttpResponse.json(membership)
    }),

    http.post('/api/owner/autocare-provider-invitations/accept', async ({ request }) => {
        const currentUser = currentMockUser()
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        const body = await request.json() as { token?: unknown }
        if (typeof body.token !== 'string' || body.token.length < 8) return invalidMockBodyResponse()
        const invitation = mockAutoCareProviderInvitations.find((candidate) => candidate.inviteToken === body.token && candidate.status === 'pending')
        if (!invitation) return HttpResponse.json({ message: 'Provider invitation not found or no longer active.' }, { status: 404 })
        if (new Date(invitation.expiresAt) <= new Date()) { invitation.status = 'expired'; return HttpResponse.json({ message: 'Provider invitation has expired.' }, { status: 409 }) }
        if (currentUser.email.toLowerCase() !== invitation.email) return HttpResponse.json({ message: 'This invitation was issued for another email address.' }, { status: 403 })
        const memberships = mockAutoCareProviderMemberships.get(invitation.providerId) ?? []
        const membership = memberships.find((candidate) => candidate.userId === currentUser.id && candidate.locationId === invitation.locationId) ?? { id: `provider-membership-${Date.now()}`, providerId: invitation.providerId, userId: currentUser.id, locationId: invitation.locationId, role: invitation.role, status: 'active' as const, createdAt: new Date().toISOString() }
        if (!memberships.some((candidate) => candidate.id === membership.id)) memberships.push(membership)
        mockAutoCareProviderMemberships.set(invitation.providerId, memberships)
        invitation.status = 'accepted'; invitation.acceptedAt = new Date().toISOString(); invitation.inviteToken = null
        return HttpResponse.json({ membership, invitation })
    }),

    http.get('/api/owner/autocare-providers/:providerId/change-requests', ({ params }) => {
        const currentUser = currentMockUser()
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'owner') return HttpResponse.json({ message: 'Only owners can manage provider changes.' }, { status: 403 })
        if (!ownerAutoCareProviders.some((provider) => provider.id === params.providerId)) return HttpResponse.json({ message: 'Automotive service not found.' }, { status: 404 })
        return HttpResponse.json(mockAutoCareProviderChangeRequests.filter((request) => request.providerId === params.providerId))
    }),

    http.post('/api/owner/autocare-providers/:providerId/change-requests', async ({ params, request }) => {
        const currentUser = currentMockUser()
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'owner') return HttpResponse.json({ message: 'Only owners can submit provider changes.' }, { status: 403 })
        if (!ownerAutoCareProviders.some((provider) => provider.id === params.providerId)) return HttpResponse.json({ message: 'Automotive service not found.' }, { status: 404 })
        const body = await request.json() as { kind?: unknown; payload?: unknown }
        if (body.kind !== 'verification' && body.kind !== 'profile_update') return invalidMockBodyResponse()
        const payload = body.payload && typeof body.payload === 'object' && !Array.isArray(body.payload) ? body.payload as Record<string, unknown> : {}
        if (body.kind === 'verification' && Object.keys(payload).length > 0) return invalidMockBodyResponse()
        const pending = mockAutoCareProviderChangeRequests.find((candidate) => candidate.providerId === params.providerId && candidate.kind === body.kind && candidate.status === 'pending')
        if (pending) return HttpResponse.json({ message: 'A provider change request of this type is already pending.' }, { status: 409 })
        const now = new Date().toISOString()
        const changeRequest: MockAutoCareProviderChangeRequest = { id: `provider-change-${Date.now()}`, providerId: String(params.providerId), requestedById: currentUser.id, kind: body.kind, status: 'pending', payload, reviewedById: null, reviewReason: null, reviewedAt: null, createdAt: now, updatedAt: now }
        mockAutoCareProviderChangeRequests.unshift(changeRequest)
        return HttpResponse.json(changeRequest, { status: 201 })
    }),

    http.delete('/api/owner/autocare-providers/:providerId/change-requests/:requestId', ({ params }) => {
        const currentUser = currentMockUser()
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'owner') return HttpResponse.json({ message: 'Only owners can cancel provider changes.' }, { status: 403 })
        const changeRequest = mockAutoCareProviderChangeRequests.find((candidate) => candidate.id === params.requestId && candidate.providerId === params.providerId)
        if (!changeRequest) return HttpResponse.json({ message: 'Provider change request not found.' }, { status: 404 })
        if (changeRequest.status === 'pending') { changeRequest.status = 'cancelled'; changeRequest.updatedAt = new Date().toISOString() }
        return HttpResponse.json(changeRequest)
    }),

    http.get('/api/owner/autocare-providers/:providerId/analytics', ({ params, request }) => {
        const scenario = mockScenarioResponse(request)
        if (scenario) return scenario
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'owner') return HttpResponse.json({ message: 'Only owners can view automotive analytics.' }, { status: 403 })
        const provider = ownerAutoCareProviders.find((item) => item.id === params.providerId)
        if (!provider) return HttpResponse.json({ message: 'Automotive service not found.' }, { status: 404 })
        const requests = mockAutoCareServiceRequests.filter((item) => item.providerId === provider.id)
        const confirmed = requests.filter((item) => Boolean(item.clientConfirmedAt && item.providerConfirmedAt))
        const completed = requests.filter((item) => item.status === 'closed' && item.clientConfirmedAt && item.providerConfirmedAt)
        const quoteRequests = new Set(requests.filter((item) => item.quote || item.acceptedQuoteAt).map((item) => item.id))
        const acceptedQuotes = requests.filter((item) => Boolean(item.acceptedQuoteAt)).length
        const clients = new Map<string, number>()
        requests.forEach((item) => clients.set(item.clientId, (clients.get(item.clientId) ?? 0) + 1))
        const reviews = mockFeaturedAutoCareReviews.filter((item) => item.providerId === provider.id)
        const percent = (value: number, total: number) => total === 0 ? 0 : Number(((value / total) * 100).toFixed(1))
        return HttpResponse.json({
            providerId: provider.id,
            generatedAt: new Date().toISOString(),
            inquiries: requests.filter((item) => item.status !== 'draft').length,
            openRequests: requests.filter((item) => ['open', 'awaiting_reply', 'estimate_shared'].includes(item.status)).length,
            confirmedBookings: confirmed.length,
            completedVisits: completed.length,
            cancelledRequests: requests.filter((item) => item.status === 'cancelled').length,
            noShowRequests: requests.filter((item) => item.status === 'no_show').length,
            completionRate: percent(completed.length, confirmed.length),
            quoteConversionRate: percent(acceptedQuotes, quoteRequests.size),
            averageResponseMinutes: null,
            repeatCustomers: [...clients.values()].filter((count) => count > 1).length,
            reviewCount: reviews.length,
            averageRating: reviews.length ? Number((reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length).toFixed(1)) : 0,
            bonusLiabilityPoints: mockAutoCareBonusAccounts.filter((item) => item.providerId === provider.id).reduce((sum, item) => sum + item.balancePoints, 0),
            tracking: { ...(mockAutoCareProviderActivity.get(provider.id) ?? { impressions: 0, profileOpens: 0 }), available: true },
        })
    }),

    http.get('/api/owner/autocare-providers/:providerId/bonus-program', ({ params }) => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'owner') return HttpResponse.json({ message: 'Only owners can manage bonus programs.' }, { status: 403 })
        if (!ownerAutoCareProviders.some((provider) => provider.id === params.providerId)) return HttpResponse.json({ message: 'Automotive service not found.' }, { status: 404 })
        return HttpResponse.json(mockAutoCareBonusPrograms.get(String(params.providerId)) ?? null)
    }),

    http.get('/api/owner/autocare-providers/:providerId/bonus-liability', ({ params }) => {
        const currentUser = currentMockUser()
        if (!currentUser || currentUser.role !== 'owner') return HttpResponse.json({ message: 'Only owners can view bonus liability.' }, { status: 403 })
        const accounts = mockAutoCareBonusAccounts.filter((account) => account.providerId === params.providerId)
        const entries = accounts.flatMap((account) => account.entries.map((entry) => ({
            ...entry,
            clientId: account.clientId,
            clientName: mockUsers.find((user) => user.id === account.clientId)?.name ?? 'Клиент AutoCare',
        }))).sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        return HttpResponse.json({ providerId: String(params.providerId), activeAccounts: accounts.filter((account) => account.balancePoints > 0).length, liabilityPoints: accounts.reduce((total, account) => total + account.balancePoints, 0), entries })
    }),

    http.put('/api/owner/autocare-providers/:providerId/bonus-program', async ({ params, request }) => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'owner') return HttpResponse.json({ message: 'Only owners can manage bonus programs.' }, { status: 403 })
        const provider = ownerAutoCareProviders.find((candidate) => candidate.id === params.providerId)
        if (!provider) return HttpResponse.json({ message: 'Automotive service not found.' }, { status: 404 })
        const body = await request.json() as { name?: string; earnPercent?: number; maxEarnPointsPerVisit?: number | null; expiresAfterDays?: number | null; active?: boolean }
        if (!body.name?.trim() || typeof body.earnPercent !== 'number' || body.earnPercent < 0 || body.earnPercent > 100) return invalidMockBodyResponse()
        const now = new Date().toISOString()
        const existing = mockAutoCareBonusPrograms.get(provider.id)
        const program = { id: existing?.id ?? `bonus-program-${Date.now()}`, providerId: provider.id, name: body.name.trim(), earnPercent: body.earnPercent, maxEarnPointsPerVisit: body.maxEarnPointsPerVisit ?? null, expiresAfterDays: body.expiresAfterDays ?? null, active: body.active ?? true, createdAt: existing?.createdAt ?? now, updatedAt: now }
        mockAutoCareBonusPrograms.set(provider.id, program)
        return HttpResponse.json(program)
    }),

    http.post('/api/owner/autocare-providers/:providerId/bonus-accounts/:clientId/grants', async ({ params, request }) => {
        const currentUser = currentMockUser()
        if (!currentUser || currentUser.role !== 'owner') return HttpResponse.json({ message: 'Only owners can grant bonus points.' }, { status: 403 })
        if (!ownerAutoCareProviders.some((provider) => provider.id === params.providerId)) return HttpResponse.json({ message: 'Automotive service not found.' }, { status: 404 })
        const idempotencyKey = request.headers.get('Idempotency-Key')
        if (!idempotencyKey || !/^[a-zA-Z0-9_-]{8,128}$/.test(idempotencyKey)) return HttpResponse.json({ message: 'Idempotency-Key is required when granting bonus points.' }, { status: 400 })
        const body = await request.json() as { points?: number; reason?: string }
        if (typeof body.points !== 'number' || !Number.isInteger(body.points) || body.points <= 0 || body.points > 100_000 || !body.reason || body.reason.trim().length < 10) return invalidMockBodyResponse()
        const points = body.points
        const account = mockAutoCareBonusAccounts.find((candidate) => candidate.clientId === params.clientId && candidate.providerId === params.providerId)
            ?? (() => { const created: MockAutoCareBonusAccount = { id: `bonus-account-${Date.now()}`, clientId: String(params.clientId), providerId: String(params.providerId), balancePoints: 0, earnedPoints: 0, redeemedPoints: 0, entries: [] }; mockAutoCareBonusAccounts.push(created); return created })()
        if (account.entries.some((entry) => entry.id === `bonus-entry-${idempotencyKey}`)) {
            const { clientId: _clientId, ...response } = account
            return HttpResponse.json(response)
        }
        const now = new Date().toISOString()
        account.balancePoints += points
        account.earnedPoints += points
        account.entries.unshift({ id: `bonus-entry-${idempotencyKey}`, type: 'adjustment', points, reason: body.reason.trim(), requestId: null, expiresAt: null, createdAt: now })
        const { clientId: _clientId, ...response } = account
        return HttpResponse.json(response)
    }),

    http.patch('/api/owner/autocare-providers/:providerId/offers/:offerId', async ({ params, request }) => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)
        const provider = ownerAutoCareProviders.find((item) => item.id === params.providerId)
        const offer = provider?.offers?.find((item) => item.id === params.offerId)
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'owner') return HttpResponse.json({ message: 'Only owners can edit automotive service offers.' }, { status: 403 })
        if (!provider || !offer) return HttpResponse.json({ message: 'Automotive service offer not found.' }, { status: 404 })

        const body = await request.json() as { description?: unknown; priceFromMinor?: unknown }
        if ((body.description !== null && (typeof body.description !== 'string' || body.description.length > 2_000)) || typeof body.priceFromMinor !== 'number' || !Number.isInteger(body.priceFromMinor) || body.priceFromMinor < 0 || body.priceFromMinor > 10_000_000_000) {
            return HttpResponse.json({ message: 'Invalid automotive service offer.' }, { status: 400 })
        }

        offer.description = typeof body.description === 'string' ? body.description.trim() || null : null
        offer.priceFromMinor = body.priceFromMinor
        if (offer.priceToMinor !== null && offer.priceToMinor < offer.priceFromMinor) offer.priceToMinor = offer.priceFromMinor
        return HttpResponse.json(offer)
    }),

    http.get('/api/owner/autocare-providers/:providerId/reviews', ({ params }) => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)
        const providerId = String(params.providerId)
        const provider = ownerAutoCareProviders.find((item) => item.id === providerId)
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'owner') return HttpResponse.json({ message: 'Only owners can view automotive service reviews.' }, { status: 403 })
        if (!provider) return HttpResponse.json({ message: 'Automotive service provider not found.' }, { status: 404 })

        const now = Date.now()
        const reviews = mockFeaturedAutoCareReviews.filter((review) => review.providerId === providerId).map((review) => ({
            ...review,
            canContact: Boolean(review.serviceRequestId),
            canEdit: Boolean(review.revisionAllowedUntil && new Date(review.revisionAllowedUntil).getTime() > now && !review.revisionUsedAt),
        }))
        const distribution = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
        for (const review of reviews) distribution[String(review.rating) as keyof typeof distribution]++
        const totalReviews = reviews.length
        const averageRating = totalReviews === 0 ? 0 : Number((reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews).toFixed(1))
        return HttpResponse.json({ providerId, totalReviews, averageRating, distribution, reviews })
    }),

    http.get('/api/owner/autocare-reviews', ({ request }) => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'owner') return HttpResponse.json({ message: 'Only owners can view automotive service reviews.' }, { status: 403 })
        const providerId = new URL(request.url).searchParams.get('providerId') || null
        const selectedProviders = providerId ? ownerAutoCareProviders.filter((provider) => provider.id === providerId) : ownerAutoCareProviders
        if (providerId && selectedProviders.length === 0) return HttpResponse.json({ message: 'Automotive service provider not found.' }, { status: 404 })
        const providerIds = new Set(selectedProviders.map((provider) => provider.id))
        const now = Date.now()
        const reviews = mockFeaturedAutoCareReviews.filter((review) => providerIds.has(review.providerId)).map((review) => {
            const provider = selectedProviders.find((item) => item.id === review.providerId)
            return { ...review, providerName: provider?.name ?? 'AutoCare service', providerAddress: provider?.location.address ?? '', canContact: Boolean(review.serviceRequestId), canEdit: Boolean(review.revisionAllowedUntil && new Date(review.revisionAllowedUntil).getTime() > now && !review.revisionUsedAt) }
        })
        const distribution = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
        for (const review of reviews) distribution[String(review.rating) as keyof typeof distribution]++
        return HttpResponse.json({ selectedProviderId: providerId, providers: ownerAutoCareProviders.map((provider) => ({ id: provider.id, name: provider.name, address: provider.location.address, rating: provider.rating, reviewCount: provider.reviewCount })), totalReviews: reviews.length, averageRating: reviews.length ? Number((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)) : 0, distribution, reviews })
    }),

    http.post('/api/owner/autocare-providers/:providerId/reviews/:reviewId/promos', async ({ params, request }) => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)
        const providerId = String(params.providerId)
        const reviewId = String(params.reviewId)
        const provider = ownerAutoCareProviders.find((item) => item.id === providerId)
        const review = mockFeaturedAutoCareReviews.find((item) => item.id === reviewId && item.providerId === providerId)
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'owner') return HttpResponse.json({ message: 'Only owners can issue service promos.' }, { status: 403 })
        if (!provider || !review) return HttpResponse.json({ message: 'Automotive review not found.' }, { status: 404 })
        if (!review.clientId) return HttpResponse.json({ message: 'This review is not linked to a client account yet.' }, { status: 409 })

        const body = await request.json() as { discountPercent?: unknown; serviceSlug?: unknown; expiresInDays?: unknown }
        const discountPercent = body.discountPercent
        const expiresInDays = body.expiresInDays ?? 30
        if (typeof discountPercent !== 'number' || !Number.isInteger(discountPercent) || discountPercent < 1 || discountPercent > 100 || typeof expiresInDays !== 'number' || !Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 90) {
            return HttpResponse.json({ message: 'Discount must be between 1 and 100 percent.' }, { status: 400 })
        }
        let code = `CARE-${crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`
        while (mockAutoCareReviewPromos.some((promo) => promo.code === code)) code = `CARE-${crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`
        const promo: MockAutoCareReviewPromo = {
            id: crypto.randomUUID(),
            reviewId,
            providerId,
            clientId: review.clientId,
            serviceRequestId: review.serviceRequestId ?? null,
            serviceSlug: typeof body.serviceSlug === 'string' ? body.serviceSlug.trim() || null : review.serviceSlug ?? null,
            code,
            discountPercent,
            status: 'active',
            expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1_000).toISOString(),
            redeemedAt: null,
        }
        mockAutoCareReviewPromos.unshift(promo)
        return HttpResponse.json(promo)
    }),

    http.get('/api/v1/autocare-reviews/my', () => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'client') return HttpResponse.json({ message: 'Only clients can view automotive reviews.' }, { status: 403 })
        const now = Date.now()
        return HttpResponse.json(mockFeaturedAutoCareReviews.filter((review) => review.clientId === currentUser.id).map((review) => ({
            ...review,
            canContact: false,
            canEdit: Boolean(review.revisionAllowedUntil && new Date(review.revisionAllowedUntil).getTime() > now && !review.revisionUsedAt),
        })))
    }),

    http.post('/api/v1/autocare-reviews', async ({ request }) => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'client') return HttpResponse.json({ message: 'Only clients can create automotive reviews.' }, { status: 403 })
        const body = await request.json() as { requestId?: unknown; rating?: unknown; text?: unknown }
        const serviceRequest = typeof body.requestId === 'string' ? mockAutoCareServiceRequests.find((item) => item.id === body.requestId && item.clientId === currentUser.id) : undefined
        if (!serviceRequest) return HttpResponse.json({ message: 'Service request not found.' }, { status: 404 })
        if (!['accepted', 'closed'].includes(serviceRequest.status) || !serviceRequest.clientConfirmedAt || !serviceRequest.providerConfirmedAt) return HttpResponse.json({ message: 'A completed and confirmed visit is required before leaving a review.' }, { status: 409 })
        if (mockFeaturedAutoCareReviews.some((review) => review.serviceRequestId === serviceRequest.id)) return HttpResponse.json({ message: 'This service visit already has a review.' }, { status: 409 })
        if (typeof body.rating !== 'number' || !Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5 || typeof body.text !== 'string' || body.text.trim().length < 10 || body.text.trim().length > 1_000) return HttpResponse.json({ message: 'Invalid review.' }, { status: 400 })
        const review: MockAutoCareReview = {
            id: `autocare-review-${crypto.randomUUID()}`,
            providerId: serviceRequest.providerId,
            authorName: currentUser.name,
            vehicleLabel: serviceRequest.vehicleSnapshot ? `${serviceRequest.vehicleSnapshot.make} ${serviceRequest.vehicleSnapshot.model}` : 'Автомобиль',
            rating: body.rating,
            text: body.text.trim(),
            avatarUrl: currentUser.avatarUrl ?? null,
            photoUrls: [],
            createdAt: new Date().toISOString(),
            clientId: currentUser.id,
            serviceRequestId: serviceRequest.id,
            serviceSlug: serviceRequest.serviceSlug,
        }
        mockFeaturedAutoCareReviews.unshift(review)
        return HttpResponse.json({ ...review, canContact: true, canEdit: false }, { status: 201 })
    }),

    http.post('/api/v1/autocare-review-promos/redeem', async ({ request }) => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'client') return HttpResponse.json({ message: 'Only clients can redeem service promos.' }, { status: 403 })
        const body = await request.json() as { code?: unknown }
        const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : ''
        const promo = mockAutoCareReviewPromos.find((item) => item.code === code && item.clientId === currentUser.id)
        if (!promo) return HttpResponse.json({ message: 'Promo code not found.' }, { status: 404 })
        if (promo.status !== 'active') return HttpResponse.json({ message: 'This promo code has already been used or revoked.' }, { status: 409 })
        if (new Date(promo.expiresAt).getTime() <= Date.now()) {
            promo.status = 'expired'
            return HttpResponse.json({ message: 'This promo code has expired.' }, { status: 409 })
        }
        promo.status = 'redeemed'
        promo.redeemedAt = new Date().toISOString()
        const review = mockFeaturedAutoCareReviews.find((item) => item.id === promo.reviewId && item.clientId === currentUser.id)
        if (!review) return HttpResponse.json({ message: 'Review linked to this promo was not found.' }, { status: 404 })
        review.revisionAllowedUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1_000).toISOString()
        review.revisionUsedAt = null
        return HttpResponse.json(promo)
    }),

    http.patch('/api/v1/autocare-reviews/:reviewId', async ({ params, request }) => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)
        const review = mockFeaturedAutoCareReviews.find((item) => item.id === String(params.reviewId))
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'client') return HttpResponse.json({ message: 'Only clients can edit automotive reviews.' }, { status: 403 })
        if (!review || review.clientId !== currentUser.id) return HttpResponse.json({ message: 'Automotive review not found.' }, { status: 404 })
        if (!review.revisionAllowedUntil || new Date(review.revisionAllowedUntil).getTime() <= Date.now() || review.revisionUsedAt) return HttpResponse.json({ message: 'Redeem a valid service promo before editing this review.' }, { status: 409 })
        const body = await request.json() as { rating?: unknown; text?: unknown }
        if (typeof body.rating !== 'number' || !Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5 || typeof body.text !== 'string' || body.text.trim().length < 10 || body.text.trim().length > 1_000) return HttpResponse.json({ message: 'Invalid review.' }, { status: 400 })
        review.rating = body.rating
        review.text = body.text.trim()
        review.revisionUsedAt = new Date().toISOString()
        return HttpResponse.json({ ...review, canContact: false, canEdit: false })
    }),

    http.post('/api/owner/autocare-providers/logo', async ({ request }) => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'owner') return HttpResponse.json({ message: 'Only owners can manage automotive service profiles.' }, { status: 403 })
        const body = await request.json() as { contentBase64?: string }
        if (!body.contentBase64) return HttpResponse.json({ message: 'Invalid provider logo.' }, { status: 400 })
        const fileName = `${crypto.randomUUID()}.webp`
        mockProviderLogos.set(fileName, body.contentBase64)
        return HttpResponse.json({ url: `/uploads/autocare/logos/${fileName}` })
    }),

    http.get('/api/uploads/autocare/logos/:fileName', ({ params }) => {
        const contentBase64 = mockProviderLogos.get(String(params.fileName))
        if (!contentBase64) return HttpResponse.redirect('/images/autocare/placeholders/provider.svg')
        const bytes = Uint8Array.from(atob(contentBase64), (character) => character.charCodeAt(0))
        return new HttpResponse(bytes, { headers: { 'content-type': 'image/webp' } })
    }),

    http.post('/api/owner/autocare-providers/media', async ({ request }) => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'owner') return HttpResponse.json({ message: 'Only owners can manage automotive service profiles.' }, { status: 403 })
        const body = await request.json() as { kind?: string; contentBase64?: string }
        if ((body.kind !== 'cover' && body.kind !== 'gallery') || !body.contentBase64) return HttpResponse.json({ message: 'Invalid provider image.' }, { status: 400 })
        const fileName = `${crypto.randomUUID()}.webp`
        mockProviderMedia.set(`${body.kind}/${fileName}`, body.contentBase64)
        return HttpResponse.json({ url: `/uploads/autocare/media/${body.kind}/${fileName}` })
    }),

    http.get('/api/uploads/autocare/media/:kind/:fileName', ({ params }) => {
        const key = `${String(params.kind)}/${String(params.fileName)}`
        const contentBase64 = mockProviderMedia.get(key)
        if (!contentBase64) return HttpResponse.redirect('/images/autocare/placeholders/provider.svg')
        const bytes = Uint8Array.from(atob(contentBase64), (character) => character.charCodeAt(0))
        return new HttpResponse(bytes, { headers: { 'content-type': 'image/webp' } })
    }),

    http.post('/api/owner/autocare-providers', async ({ request }) => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)

        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'owner') return HttpResponse.json({ message: 'Only owners can manage automotive service profiles.' }, { status: 403 })

        const body = await request.json() as {
            name?: string
            description?: string
            marketId?: string
            address?: string
            hours?: string
            yearsActive?: number
            staffCount?: number
            workstationCount?: number
            phone?: string | null
            phones?: string[]
            email?: string | null
            websiteUrl?: string | null
            metroStation?: string | null
            warrantyText?: string | null
            bonusSummary?: string | null
            isMultibrand?: boolean
            brandSpecializations?: string[]
            amenityIds?: string[]
            logoUrl?: string | null
            coverImageUrl?: string | null
            galleryImageUrls?: string[]
        }

        if (!body.name?.trim() || !body.marketId || !body.address?.trim() || !body.hours?.trim()) {
            return HttpResponse.json({ message: 'Invalid service profile.' }, { status: 400 })
        }

        const id = `owner-provider-${Date.now()}`
        const provider = {
            id,
            name: body.name.trim(),
            description: body.description?.trim() || null,
            status: 'draft' as const,
            verified: false,
            yearsActive: Math.max(0, Number(body.yearsActive) || 0),
            staffCount: Math.max(0, Number(body.staffCount) || 0),
            workstationCount: Math.max(0, Number(body.workstationCount) || 0),
            phone: body.phone?.trim() || null,
            phones: [...new Set([body.phone?.trim() ?? '', ...(body.phones ?? [])].map((phone) => phone.trim()).filter(Boolean))],
            email: body.email?.trim() || null,
            websiteUrl: body.websiteUrl?.trim() || null,
            metroStation: body.metroStation?.trim() || null,
            warrantyText: body.warrantyText?.trim() || null,
            bonusSummary: body.bonusSummary?.trim() || null,
            rating: 0,
            reviewCount: 0,
            logoUrl: body.logoUrl ?? null,
            brandSpecializations: body.isMultibrand ? [] : [...new Set(body.brandSpecializations ?? [])],
            isMultibrand: Boolean(body.isMultibrand),
            coverImageUrl: body.coverImageUrl ?? null,
            galleryImageUrls: [...new Set(body.galleryImageUrls ?? [])],
            amenityIds: [...new Set(body.amenityIds ?? [])],
            location: {
                id: `location-${id}`,
                marketId: body.marketId,
                address: body.address.trim(),
                hours: body.hours.trim(),
                latitude: null,
                longitude: null,
            },
            serviceIds: [],
            servicePrices: {},
        }

        ownerAutoCareProviders.unshift(provider)
        return HttpResponse.json(provider, { status: 201 })
    }),

    http.get('/api/cabinets/all', () => {
        return HttpResponse.json(mockCabinets.filter((cabinet) => cabinet.status === 'active'))
    }),

    http.get('/api/v1/platform-reviews', ({ request }) => {
        const limit = Number(new URL(request.url).searchParams.get('limit') ?? 30)
        return HttpResponse.json(mockPlatformReviews.filter((review) => review.status === 'approved').slice(0, Number.isFinite(limit) ? limit : 30))
    }),

    http.post('/api/v1/platform-reviews', async ({ request }) => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'client') return HttpResponse.json({ message: 'Only clients can publish platform reviews.' }, { status: 403 })
        const body = await request.json() as { rating?: unknown; text?: unknown }
        if (typeof body.rating !== 'number' || !Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5 || typeof body.text !== 'string' || body.text.trim().length < 10 || body.text.trim().length > 1_000) return HttpResponse.json({ message: 'Invalid platform review.' }, { status: 400 })
        const review: MockPlatformReview = { id: `platform-review-${Date.now()}`, authorName: currentUser.name, avatarUrl: currentUser.avatarUrl ?? null, authorRole: 'AutoCare Hub клиент', rating: body.rating, text: body.text.trim(), status: 'pending', organizationResponse: null, organizationRespondedAt: null, createdAt: new Date().toISOString(), clientId: currentUser.id }
        mockPlatformReviews.unshift(review)
        return HttpResponse.json(review, { status: 201 })
    }),

    http.get('/api/v1/platform-reviews/my', () => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'client') return HttpResponse.json({ message: 'Only clients can view platform reviews.' }, { status: 403 })
        return HttpResponse.json(mockPlatformReviews.filter((review) => review.clientId === currentUser.id))
    }),

    http.get('/api/admin/platform-reviews', () => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') return HttpResponse.json({ message: 'Only administrators can moderate platform reviews.' }, { status: 403 })
        return HttpResponse.json(mockPlatformReviews)
    }),

    http.post('/api/admin/platform-reviews/:reviewId/response', async ({ params, request }) => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)
        const review = mockPlatformReviews.find((item) => item.id === String(params.reviewId))
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') return HttpResponse.json({ message: 'Only administrators can respond to platform reviews.' }, { status: 403 })
        if (!review) return HttpResponse.json({ message: 'Platform review not found.' }, { status: 404 })
        const body = await request.json() as { response?: unknown }
        if (typeof body.response !== 'string' || body.response.trim().length < 5 || body.response.trim().length > 2_000) return HttpResponse.json({ message: 'Invalid organization response.' }, { status: 400 })
        review.organizationResponse = body.response.trim()
        review.organizationRespondedAt = new Date().toISOString()
        if (review.status === 'pending') review.status = 'approved'
        return HttpResponse.json(review)
    }),

    http.delete('/api/super-admin/platform-reviews/:reviewId', ({ params }) => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)
        const review = mockPlatformReviews.find((item) => item.id === String(params.reviewId))
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'super_admin') return HttpResponse.json({ message: 'Only a super administrator can remove platform reviews.' }, { status: 403 })
        if (!review) return HttpResponse.json({ message: 'Platform review not found.' }, { status: 404 })
        review.status = 'removed'
        return HttpResponse.json({ success: true })
    }),

    http.get('/api/v1/reviews/featured', ({ request }) => {
        const limit = Number(new URL(request.url).searchParams.get('limit') ?? 6)
        const fixture = request.headers.get('x-autocare-review-fixture')
        const reviews = fixture === 'empty'
            ? []
            : fixture === 'one'
                ? mockFeaturedAutoCareReviews.slice(0, 1)
                : fixture === 'photos'
                    ? mockFeaturedAutoCareReviews.filter((review) => review.photoUrls.length > 0).slice(0, 3)
                    : mockFeaturedAutoCareReviews
        return HttpResponse.json(reviews.slice(0, Number.isFinite(limit) ? limit : 6))
    }),

    http.get('/api/cabinets/:id', ({ params }) => {
        const cabinetId = String(params.id)

        const cabinet = mockCabinets.find(
            (item) => item.id === cabinetId
        )

        if (!cabinet) {
            return HttpResponse.json({ message: 'Cabinet not found' }, { status: 404 })
        }

        return HttpResponse.json({
            ...cabinet,
            availabilityPreview: getMockAvailabilityPreview(cabinet.id),
        })
    }),

    http.get('/api/cabinets/:id/reviews', ({ params }) => {
        const cabinetId = String(params.id)
        const reviews = mockReviews
            .filter((review) =>
                review.cabinetId === cabinetId &&
                review.status === 'approved'
            )
            .map(toPublicReview)

        return HttpResponse.json(reviews)
    }),

    http.get('/api/reviews/my', () => {
        const client = mockUsers.find(
            (user) =>
                user.id === mockSession.currentUserId &&
                user.role === 'client',
        )

        if (!client) {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        const reviews = mockReviews
            .filter((review) => review.clientId === client.id)
            .map(toClientReview)

        return HttpResponse.json(reviews)
    }),

    http.post('/api/cabinets/:id/reviews', async ({ params, request }) => {
        const cabinetId = String(params.id)
        const client = mockUsers.find(
            (user) =>
                user.id === mockSession.currentUserId &&
                user.role === 'client'
        )

        if (!client) {
            return HttpResponse.json(
                { message: 'Only clients can create reviews.' },
                { status: 403 }
            )
        }

        const eligibleBooking = mockBookings.find((booking) =>
            booking.clientId === client.id &&
            booking.cabinetId === cabinetId &&
            booking.status === 'completed' &&
            !mockReviews.some((review) => review.bookingId === booking.id)
        )

        if (!eligibleBooking) {
            return HttpResponse.json(
                { message: 'A completed booking for this cabinet is required before leaving a review.' },
                { status: 409 }
            )
        }

        const body = await request.json() as {
            rating: number
            text: string
        }
        const cabinet = mockCabinets.find((item) => item.id === cabinetId)

        if (!cabinet) {
            return HttpResponse.json(
                { message: 'Cabinet not found' },
                { status: 404 }
            )
        }

        const newReview = {
            id: `review-${Date.now()}`,
            cabinetId,
            clientId: client.id,
            bookingId: eligibleBooking.id,
            rating: body.rating,
            text: body.text,
            status: 'pending' as const,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            client: {
                id: client.id,
                name: client.name,
            },
            cabinet: {
                id: cabinet.id,
                title: cabinet.title,
            },
        }

        mockReviews.push(newReview)

        return HttpResponse.json(toPublicReview(newReview), {
            status: 201,
        })
    }),

    http.patch('/api/reviews/:id', async ({ params, request }) => {
        const reviewId = String(params.id)
        const client = mockUsers.find(
            (user) =>
                user.id === mockSession.currentUserId &&
                user.role === 'client',
        )
        const review = mockReviews.find(
            (item) => item.id === reviewId && item.clientId === client?.id,
        )

        if (!client || !review) {
            return HttpResponse.json({ message: 'Review not found' }, { status: 404 })
        }

        const body = await request.json() as { rating?: number; text?: string }
        const rating = body.rating
        if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5 || typeof body.text !== 'string') {
            return HttpResponse.json({ message: 'Invalid review' }, { status: 400 })
        }

        review.rating = rating
        review.text = body.text
        review.status = 'pending'
        review.updatedAt = new Date().toISOString()

        return HttpResponse.json(toClientReview(review))
    }),

    http.delete('/api/cabinets/:id', ({ params }) => {
        const cabinetId = String(params.id)

        const cabinetIndex = mockCabinets.findIndex(
            (item) =>
                item.id === cabinetId &&
                item.ownerId === mockSession.currentUserId
        )

        if (cabinetIndex === -1) {
            return HttpResponse.json(
                { message: 'Cabinet not found' },
                { status: 404 }
            )
        }

        const hasBookings = mockBookings.some(
            (booking) => booking.cabinetId === cabinetId
        )

        if (hasBookings) {
            return HttpResponse.json(
                { message: 'Cabinet has bookings and cannot be deleted' },
                { status: 400 }
            )
        }

        for (let index = mockServices.length - 1; index >= 0; index -= 1) {
            if (mockServices[index]?.cabinetId === cabinetId) {
                mockServices.splice(index, 1)
            }
        }

        mockCabinets.splice(cabinetIndex, 1)

        return HttpResponse.json({
            success: true,
        })
    }),

    http.get('/api/services', ({ request }) => {
        const url = new URL(request.url)
        const cabinetId = url.searchParams.get('cabinetId')

        const services = cabinetId
            ? mockServices.filter(service => service.cabinetId === cabinetId)
            : mockServices

        return HttpResponse.json(services)
    }),

    http.patch('/api/services/:id/status', async ({ params, request }) => {
        const serviceId = String(params.id)

        const body = await request.json() as {
            isActive: boolean
        }

        if (typeof body.isActive !== 'boolean') {
            return HttpResponse.json(
                { message: 'Invalid service status' },
                { status: 400 }
            )
        }

        const service = mockServices.find(
            (item) => item.id === serviceId
        )

        if (!service) {
            return HttpResponse.json(
                { message: 'Service not found' },
                { status: 404 }
            )
        }

        const cabinet = mockCabinets.find(
            (item) =>
                item.id === service.cabinetId &&
                item.ownerId === mockSession.currentUserId
        )

        if (!cabinet) {
            return HttpResponse.json(
                { message: 'Service not found' },
                { status: 404 }
            )
        }

        service.isActive = body.isActive

        return HttpResponse.json(service)
    }),

    http.patch('/api/services/:id', async ({ params, request }) => {
        const serviceId = String(params.id)

        const body = await request.json() as {
            title: string
            description?: string
            durationMinutes: number
            price: number
        }

        const service = mockServices.find(
            (item) => item.id === serviceId
        )

        if (!service) {
            return HttpResponse.json(
                { message: 'Service not found' },
                { status: 404 }
            )
        }

        const cabinet = mockCabinets.find(
            (item) =>
                item.id === service.cabinetId &&
                item.ownerId === mockSession.currentUserId
        )

        if (!cabinet) {
            return HttpResponse.json(
                { message: 'Service not found' },
                { status: 404 }
            )
        }

        service.title = body.title
        service.description = body.description ?? ''
        service.durationMinutes = body.durationMinutes
        service.price = body.price

        return HttpResponse.json(service)
    }),

    http.delete('/api/services/:id', ({ params }) => {
        const serviceId = String(params.id)

        const serviceIndex = mockServices.findIndex(
            (item) => item.id === serviceId
        )

        if (serviceIndex === -1) {
            return HttpResponse.json(
                { message: 'Service not found' },
                { status: 404 }
            )
        }

        const service = mockServices[serviceIndex]

        if (!service) {
            return HttpResponse.json(
                { message: 'Service not found' },
                { status: 404 }
            )
        }

        const cabinet = mockCabinets.find(
            (item) =>
                item.id === service.cabinetId &&
                item.ownerId === mockSession.currentUserId
        )

        if (!cabinet) {
            return HttpResponse.json(
                { message: 'Service not found' },
                { status: 404 }
            )
        }

        mockServices.splice(serviceIndex, 1)

        return HttpResponse.json({
            success: true,
        })
    }),

    http.get('/api/owner/cabinets', () => {
        const ownerCabinets = mockCabinets.filter(
            (cabinet) => cabinet.ownerId === mockSession.currentUserId
        )

        return HttpResponse.json(ownerCabinets)
    }),

    http.post('/api/owner/action-center/events', async ({ request }) => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)

        if (!currentUser) {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        if (currentUser.role !== 'owner') {
            return HttpResponse.json({ message: 'Only owners can record owner workspace events.' }, { status: 403 })
        }

        const parsed = ownerActionCenterEventSchema.safeParse(await request.json())

        if (!parsed.success) {
            return HttpResponse.json({ message: 'Invalid request body.' }, { status: 400 })
        }

        return HttpResponse.json({ accepted: true })
    }),

    http.post('/api/client/experiment-events', async ({ request }) => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)

        if (!currentUser) {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        if (currentUser.role !== 'client') {
            return HttpResponse.json({ message: 'Only clients can record client experiment events.' }, { status: 403 })
        }

        const parsed = clientExperimentEventSchema.safeParse(await request.json())

        if (!parsed.success) {
            return invalidMockBodyResponse()
        }

        return HttpResponse.json({ accepted: true })
    }),

    http.get('/api/owner/cabinets/:id', ({ params }) => {
        const cabinetId = String(params.id)

        const cabinet = mockCabinets.find(
            (item) =>
                item.id === cabinetId &&
                item.ownerId === mockSession.currentUserId
        )

        if (!cabinet) {
            return HttpResponse.json(
                { message: 'Cabinet not found' },
                { status: 404 }
            )
        }

        return HttpResponse.json(cabinet)
    }),

    http.patch('/api/cabinets/:id', async ({ params, request }) => {
        const cabinetId = String(params.id)

        const body = await request.json() as {
            title: string
            description: string
            address: string
            city: string
            pricePerHour: number
            photos?: string[]
        }

        const cabinet = mockCabinets.find(
            (item) =>
                item.id === cabinetId &&
                item.ownerId === mockSession.currentUserId
        )

        if (!cabinet) {
            return HttpResponse.json(
                { message: 'Cabinet not found' },
                { status: 404 }
            )
        }

        cabinet.title = body.title
        cabinet.description = body.description
        cabinet.address = body.address
        cabinet.city = body.city
        cabinet.pricePerHour = body.pricePerHour
        if (body.photos) {
            cabinet.photos = body.photos
        }

        return HttpResponse.json(cabinet)
    }),

    http.get('/api/owner/services', () => {
        const ownerCabinetIds = mockCabinets
            .filter((cabinet) => cabinet.ownerId === mockSession.currentUserId)
            .map((cabinet) => cabinet.id)

        const ownerServices = mockServices.filter((service) =>
            ownerCabinetIds.includes(service.cabinetId)
        )

        return HttpResponse.json(ownerServices)
    }),

    http.get('/api/bookings/occupied', ({ request }) => {
        const url = new URL(request.url)
        const cabinetId = url.searchParams.get('cabinetId')
        const date = url.searchParams.get('date')

        if (!cabinetId || !date) {
            return HttpResponse.json(
                { message: 'Cabinet and date are required' },
                { status: 400 },
            )
        }

        const occupiedSlots = mockBookings
            .filter(
                (booking) =>
                    booking.cabinetId === cabinetId &&
                    booking.date === date &&
                    (booking.status === 'pending' ||
                        booking.status === 'confirmed'),
            )
            .map((booking) => ({
                start: booking.startTime,
                end: booking.endTime,
            }))

        return HttpResponse.json(occupiedSlots)
    }),

    http.get('/api/owner/bookings', () => {
        const currentUser = mockUsers.find(
            (user) => user.id === mockSession.currentUserId
        )

        if (!currentUser) {
            return HttpResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            )
        }

        if (currentUser.role !== 'owner') {
            return HttpResponse.json(
                { message: 'Only owners can use this booking endpoint.' },
                { status: 403 }
            )
        }

        const ownerCabinetIds = new Set(
            mockCabinets
                .filter((cabinet) => cabinet.ownerId === currentUser.id)
                .map((cabinet) => cabinet.id)
        )

        const ownerBookings = mockBookings
            .filter((booking) => ownerCabinetIds.has(booking.cabinetId))
            .map(toOwnerBooking)

        return HttpResponse.json(ownerBookings)
    }),

    http.get('/api/owner/bookings/reschedule-requests', () => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)

        if (!currentUser) {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        if (currentUser.role !== 'owner') {
            return HttpResponse.json({ message: 'Only owners can use this booking endpoint.' }, { status: 403 })
        }

        return HttpResponse.json([])
    }),

    http.post('/api/owner/bookings', async ({ request }) => {
        const body = await request.json() as {
            clientId: string
            cabinetId: string
            serviceId: string
            date: string
            startTime: string
            endTime: string
            comment?: string
        }

        const client = mockUsers.find(
            (user) =>
                user.id === body.clientId &&
                user.role === 'client' &&
                user.status === 'active'
        )

        if (!client) {
            return HttpResponse.json(
                { message: 'Client not found' },
                { status: 404 }
            )
        }

        const cabinet = mockCabinets.find(
            (item) =>
                item.id === body.cabinetId &&
                item.ownerId === mockSession.currentUserId
        )

        if (!cabinet) {
            return HttpResponse.json(
                { message: 'Cabinet not found' },
                { status: 404 }
            )
        }

        const service = mockServices.find(
            (item) =>
                item.id === body.serviceId &&
                item.cabinetId === body.cabinetId &&
                item.isActive
        )

        if (!service) {
            return HttpResponse.json(
                { message: 'Service not found' },
                { status: 404 }
            )
        }

        const newBooking = {
            id: `booking-${Date.now()}`,
            clientId: body.clientId,
            cabinetId: body.cabinetId,
            serviceId: body.serviceId,
            date: body.date,
            startTime: body.startTime,
            endTime: body.endTime,
            status: 'confirmed' as const,
            comment: body.comment ?? null,
            createdAt: new Date().toISOString(),
        }

        mockBookings.push(newBooking)

        addMockNotification({
            userId: client.id,
            category: 'booking',
            title: 'Booking confirmed',
            message: `Booking for ${service.title} in ${cabinet.title} was created by the owner.`,
            link: '/profile/bookings',
            metadata: {
                bookingId: newBooking.id,
            },
        })

        return HttpResponse.json(
            {
                ...toClientBooking(newBooking),
                client: {
                    id: client.id,
                    name: client.name,
                    email: client.email,
                    phone: client.phone ?? null,
                },
            },
            { status: 201 }
        )
    }),

    http.get('/api/admin/users', () => {
        return HttpResponse.json(mockUsers)
    }),

    http.get('/api/admin/autocare-providers', () => {
        const user = currentMockUser()
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const providers: AutoCareApiProvider[] = [...new Map([...autoCareProviders, ...ownerAutoCareProviders].map((provider) => [provider.id, provider])).values()]
        return HttpResponse.json(providers.map((provider) => ({ ...provider, ownerName: 'Demo Owner', trustScore: Math.min(100, Math.round((provider.verified ? 30 : 0) + provider.rating * 9 + Math.min(provider.reviewCount, 40) / 2 + Math.min(provider.yearsActive, 10))) })))
    }),

    http.patch('/api/admin/autocare-providers/:id/status', async ({ params, request }) => {
        const user = currentMockUser()
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const body = await request.json() as { status?: 'draft' | 'active' | 'suspended' }
        if (!body.status || !['draft', 'active', 'suspended'].includes(body.status)) return invalidMockBodyResponse()
        const provider = [...autoCareProviders, ...ownerAutoCareProviders].find((item) => item.id === params.id)
        if (!provider) return HttpResponse.json({ message: 'Automotive provider not found.' }, { status: 404 })
        provider.status = body.status
        return HttpResponse.json({ ...provider, ownerName: 'Demo Owner', trustScore: Math.min(100, Math.round((provider.verified ? 30 : 0) + provider.rating * 9 + Math.min(provider.reviewCount, 40) / 2 + Math.min(provider.yearsActive, 10))) })
    }),

    http.get('/api/admin/autocare-provider-change-requests', ({ request }) => {
        const user = currentMockUser()
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const query = new URL(request.url).searchParams
        const status = query.get('status')
        const kind = query.get('kind')
        return HttpResponse.json(mockAutoCareProviderChangeRequests.filter((item) => (!status || item.status === status) && (!kind || item.kind === kind)))
    }),

    http.patch('/api/admin/autocare-provider-change-requests/:id/decision', async ({ params, request }) => {
        const user = currentMockUser()
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const body = await request.json() as { status?: unknown; reason?: unknown }
        if (body.status !== 'approved' && body.status !== 'rejected') return invalidMockBodyResponse()
        const changeRequest = mockAutoCareProviderChangeRequests.find((item) => item.id === params.id)
        if (!changeRequest) return HttpResponse.json({ message: 'Provider change request not found.' }, { status: 404 })
        if (changeRequest.status !== 'pending') return HttpResponse.json({ message: 'Provider change request has already been decided.' }, { status: 409 })
        if (body.reason !== undefined && body.reason !== null && typeof body.reason !== 'string') return invalidMockBodyResponse()
        const provider = [...autoCareProviders, ...ownerAutoCareProviders].find((item) => item.id === changeRequest.providerId)
        if (!provider) return HttpResponse.json({ message: 'Automotive provider not found.' }, { status: 404 })
        if (body.status === 'approved') {
            if (changeRequest.kind === 'verification') { provider.verified = true; if (provider.status === 'draft') provider.status = 'active' }
            else Object.assign(provider, changeRequest.payload)
        }
        changeRequest.status = body.status
        changeRequest.reviewedById = user.id
        changeRequest.reviewReason = typeof body.reason === 'string' ? body.reason.trim() || null : null
        changeRequest.reviewedAt = new Date().toISOString()
        changeRequest.updatedAt = changeRequest.reviewedAt
        return HttpResponse.json(changeRequest)
    }),

    http.get('/api/admin/catalog-gap-requests', ({ request }) => {
        const user = currentMockUser()
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const status = new URL(request.url).searchParams.get('status')
        return HttpResponse.json(mockAutoCareCatalogGapRequests.filter((item) => !status || item.status === status))
    }),

    http.patch('/api/admin/catalog-gap-requests/:id/decision', async ({ params, request }) => {
        const user = currentMockUser()
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const body = await request.json() as { status?: unknown; reason?: unknown }
        if (body.status !== 'approved' && body.status !== 'rejected') return invalidMockBodyResponse()
        if (body.status === 'rejected' && (typeof body.reason !== 'string' || body.reason.trim().length === 0)) return HttpResponse.json({ message: 'A rejection reason is required.' }, { status: 422 })
        const item = mockAutoCareCatalogGapRequests.find((candidate) => candidate.id === params.id)
        if (!item) return HttpResponse.json({ message: 'Catalog gap request not found.' }, { status: 404 })
        if (item.status !== 'pending') return HttpResponse.json({ message: 'Catalog gap request has already been decided.' }, { status: 409 })
        if (body.status === 'approved' && autoCareDefinitions.some((definition) => definition.slug === item.proposedSlug)) return HttpResponse.json({ message: 'A service with this slug already exists.' }, { status: 409 })
        if (body.status === 'approved') autoCareDefinitions.push({ id: `definition-${Date.now()}`, slug: item.proposedSlug, categorySlug: item.categorySlug, labels: item.labels, priceType: item.priceType, comparisonAttributes: item.comparisonAttributes, active: true })
        item.status = body.status
        item.reviewedById = user.id
        item.reviewReason = typeof body.reason === 'string' ? body.reason.trim() || null : null
        item.reviewedAt = new Date().toISOString()
        item.updatedAt = item.reviewedAt
        return HttpResponse.json(item)
    }),

    http.get('/api/admin/autocare-moderation-evidence', ({ request }) => {
        const user = currentMockUser()
        if (!user || !['admin', 'super_admin'].includes(user.role)) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const status = new URL(request.url).searchParams.get('status')
        return HttpResponse.json(mockAdminAutoCareModerationEvidence.filter((item) => !status || item.status === status))
    }),

    http.patch('/api/admin/autocare-moderation-evidence/:id/decision', async ({ params, request }) => {
        const user = currentMockUser()
        if (!user || !['admin', 'super_admin'].includes(user.role)) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const evidence = mockAdminAutoCareModerationEvidence.find((item) => item.id === params.id)
        if (!evidence) return HttpResponse.json({ message: 'Moderation evidence not found.' }, { status: 404 })
        if (evidence.status !== 'pending') return HttpResponse.json({ message: 'Moderation evidence has already been decided.' }, { status: 409 })
        const body = await request.json() as { status?: unknown; reason?: unknown }
        if ((body.status !== 'approved' && body.status !== 'rejected') || typeof body.reason !== 'string' || body.reason.trim().length === 0) return invalidMockBodyResponse()
        evidence.status = body.status
        evidence.notes = body.reason.trim()
        evidence.verifiedAt = new Date().toISOString()
        if (evidence.review) evidence.review.status = body.status
        return HttpResponse.json(evidence)
    }),

    http.get('/api/admin/chat-reports', ({ request }) => {
        const user = currentMockUser()
        if (!user || !['admin', 'super_admin'].includes(user.role)) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const status = new URL(request.url).searchParams.get('status')
        return HttpResponse.json(mockAutoCareChatReports.filter((report) => !status || report.status === status))
    }),

    http.patch('/api/admin/chat-reports/:id/decision', async ({ params, request }) => {
        const user = currentMockUser()
        if (!user || !['admin', 'super_admin'].includes(user.role)) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const report = mockAutoCareChatReports.find((candidate) => candidate.id === params.id)
        if (!report) return HttpResponse.json({ message: 'Chat report not found.' }, { status: 404 })
        const body = await request.json() as { status?: 'resolved' | 'dismissed'; reason?: string | null; blockUser?: boolean }
        if (!body.status || !['resolved', 'dismissed'].includes(body.status)) return HttpResponse.json({ message: 'Invalid decision.' }, { status: 400 })
        const now = new Date().toISOString()
        report.status = body.status
        report.reviewedById = user.id
        report.resolutionReason = body.reason?.trim() || null
        report.reviewedAt = now
        if (body.blockUser && report.reportedUserId) mockAutoCareChatBlocks.unshift({ id: `chat-block-${Date.now()}`, threadId: report.threadId, blockerId: user.id, blockedUserId: report.reportedUserId, status: 'active', reason: body.reason?.trim() || 'Moderation decision', createdAt: now, revokedAt: null })
        return HttpResponse.json(report)
    }),

    http.get('/api/admin/autocare-quality-monitoring', ({ request }) => {
        const scenario = mockScenarioResponse(request)
        if (scenario) return scenario
        const user = currentMockUser()
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const providers: AutoCareApiProvider[] = [...new Map([...autoCareProviders, ...ownerAutoCareProviders].map((provider) => [provider.id, provider])).values()]
        const reviews = mockFeaturedAutoCareReviews
        const reviewSamples = reviews.map((review) => ({ clientId: review.clientId ?? null, providerId: review.providerId, serviceRequestId: review.serviceRequestId ?? null, text: review.text, rating: review.rating, createdAt: new Date(review.createdAt) }))
        const anomalyCandidates = reviewSamples.reduce((count, review, index) => {
            const normalized = review.text.trim().toLocaleLowerCase()
            return count + (reviewSamples.slice(index + 1).some((candidate) => candidate.providerId === review.providerId && candidate.clientId === review.clientId && candidate.text.trim().toLocaleLowerCase() === normalized) ? 1 : 0)
        }, 0)
        const completed = mockAutoCareServiceRequests.filter((request) => request.status === 'closed').length
        const cancelled = mockAutoCareServiceRequests.filter((request) => request.status === 'cancelled').length
        const noShows = mockAutoCareServiceRequests.filter((request) => request.status === 'no_show').length
        const reassessedProviders = providers.filter((provider) => provider.trustReassessedAt).length
        return HttpResponse.json({
            generatedAt: new Date().toISOString(),
            providers: { total: providers.length, active: providers.filter((provider) => provider.status === 'active').length, verified: providers.filter((provider) => provider.verified).length, trusted: providers.filter((provider) => provider.trustBadge === 'trusted').length, suspended: providers.filter((provider) => provider.status === 'suspended').length },
            reviews: { approved: reviews.filter((review) => review.status !== 'pending' && review.status !== 'rejected').length, pending: reviews.filter((review) => review.status === 'pending').length, rejected: reviews.filter((review) => review.status === 'rejected').length, anomalyCandidates },
            requests: { total: mockAutoCareServiceRequests.length, completed, cancelled, noShows },
            ranking: { trustSnapshots: reassessedProviders, reassessedProviders, evidenceCoveragePercent: providers.length === 0 ? 0 : Number(((reassessedProviders / providers.length) * 100).toFixed(1)) },
            catalog: { activeDefinitions: 18, activeOffers: providers.length * 4, providersWithOffers: providers.length, offerCoveragePercent: providers.length === 0 ? 0 : 100, offersWithDescription: providers.length * 4, offersWithPrice: providers.length * 4, priceCoveragePercent: 100 },
            supply: { activeMarkets: 1, averageLocationsPerProvider: 1, markets: [{ marketId: 'market-moscow', providers: providers.length, locations: providers.length, activeOffers: providers.length * 4 }] },
            reliability: { responseSamples: mockAutoCareServiceRequests.length, averageResponseMinutes: 18, p95ResponseMinutes: 42, confirmedBookings: completed, confirmationSamples: mockAutoCareServiceRequests.length, confirmationReliabilityPercent: mockAutoCareServiceRequests.length === 0 ? 0 : Number(((completed / mockAutoCareServiceRequests.length) * 100).toFixed(1)), bookingConflicts: cancelled + noShows },
            appeals: { available: true, pending: 2 },
        })
    }),

    http.get('/api/v1/autocare-appeals/my', ({ request }) => {
        const scenario = mockScenarioResponse(request)
        if (scenario) return scenario
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        return HttpResponse.json(mockAutoCareAppeals.filter((appeal) => appeal.submittedById === user.id))
    }),

    http.post('/api/v1/autocare-appeals', async ({ request }) => {
        const scenario = mockScenarioResponse(request)
        if (scenario) return scenario
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        const body = await request.json() as Partial<MockAutoCareAppeal>
        if (!body.subject || !body.subjectId || typeof body.reason !== 'string' || body.reason.trim().length < 20) return HttpResponse.json({ message: 'Appeal reason must be at least 20 characters.' }, { status: 422 })
        const duplicate = mockAutoCareAppeals.find((appeal) => appeal.submittedById === user.id && appeal.subject === body.subject && appeal.subjectId === body.subjectId && appeal.status === 'pending')
        if (duplicate) return HttpResponse.json(duplicate)
        const appeal: MockAutoCareAppeal = { id: `appeal-${Date.now()}`, subject: body.subject as MockAutoCareAppeal['subject'], subjectId: body.subjectId, submittedById: user.id, providerId: body.providerId ?? null, reason: body.reason.trim(), evidenceIds: Array.isArray(body.evidenceIds) ? body.evidenceIds : [], status: 'pending', decidedById: null, decisionReason: null, createdAt: new Date().toISOString(), decidedAt: null }
        mockAutoCareAppeals.unshift(appeal)
        return HttpResponse.json(appeal, { status: 201 })
    }),

    http.delete('/api/v1/autocare-appeals/:appealId', ({ params }) => {
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        const appeal = mockAutoCareAppeals.find((item) => item.id === params.appealId && item.submittedById === user.id)
        if (!appeal) return HttpResponse.json({ message: 'Appeal not found.' }, { status: 404 })
        if (appeal.status !== 'pending') return HttpResponse.json({ message: 'Only a pending appeal can be withdrawn.' }, { status: 409 })
        appeal.status = 'withdrawn'
        return HttpResponse.json(appeal)
    }),

    http.get('/api/admin/autocare-appeals', ({ request }) => {
        const scenario = mockScenarioResponse(request)
        if (scenario) return scenario
        const user = currentMockUser()
        if (!user || !['admin', 'super_admin'].includes(user.role)) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const params = new URL(request.url).searchParams
        return HttpResponse.json(mockAutoCareAppeals.filter((appeal) => (!params.get('status') || appeal.status === params.get('status')) && (!params.get('subject') || appeal.subject === params.get('subject'))))
    }),

    http.patch('/api/admin/autocare-appeals/:id/decision', async ({ params, request }) => {
        const user = currentMockUser()
        if (!user || !['admin', 'super_admin'].includes(user.role)) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const appeal = mockAutoCareAppeals.find((item) => item.id === params.id)
        if (!appeal) return HttpResponse.json({ message: 'Appeal not found.' }, { status: 404 })
        const body = await request.json() as { status?: 'accepted' | 'rejected'; reason?: string }
        if (appeal.status !== 'pending' || !body.status || !body.reason?.trim()) return HttpResponse.json({ message: 'Appeal decision is invalid.' }, { status: 409 })
        appeal.status = body.status
        appeal.decisionReason = body.reason.trim()
        appeal.decidedById = user.id
        appeal.decidedAt = new Date().toISOString()
        return HttpResponse.json(appeal)
    }),

    http.get('/api/super-admin/platform-overview', ({ request }) => {
        const scenario = mockScenarioResponse(request)
        if (scenario) return scenario
        const user = currentMockUser()
        if (!user || user.role !== 'super_admin') return HttpResponse.json({ message: 'Only super admin can use this endpoint.' }, { status: 403 })
        const providers = [...new Map([...autoCareProviders, ...ownerAutoCareProviders].map((provider) => [provider.id, provider])).values()]
        return HttpResponse.json({ markets: [autoCareMarket], providers: { total: providers.length, active: providers.filter((provider) => provider.status === 'active').length, draft: providers.filter((provider) => provider.status === 'draft').length, suspended: providers.filter((provider) => provider.status === 'suspended').length, verified: providers.filter((provider) => provider.verified).length }, users: { clients: mockUsers.filter((item) => item.role === 'client').length, owners: mockUsers.filter((item) => item.role === 'owner').length, admins: mockUsers.filter((item) => item.role === 'admin').length, superAdmins: mockUsers.filter((item) => item.role === 'super_admin').length }, billing: { phase: 'launch', subscriptionsEnabled: false, promoCodesEnabled: false } })
    }),

    http.get('/api/admin/cabinets', () => {
        return HttpResponse.json(mockCabinets)
    }),

    http.get('/api/admin/reviews', () => {
        return HttpResponse.json(mockReviews)
    }),

    http.patch('/api/admin/reviews/:id/status', async ({ params, request }) => {
        const reviewId = String(params.id)
        const body = await request.json() as {
            status: 'pending' | 'approved' | 'rejected'
        }
        const review = mockReviews.find((item) => item.id === reviewId)

        if (!review) {
            return HttpResponse.json(
                { message: 'Review not found' },
                { status: 404 }
            )
        }

        review.status = body.status
        review.updatedAt = new Date().toISOString()

        return HttpResponse.json(review)
    }),

    http.delete('/api/admin/reviews/:id', ({ params }) => {
        const reviewId = String(params.id)
        const reviewIndex = mockReviews.findIndex((item) => item.id === reviewId)

        if (reviewIndex === -1) {
            return HttpResponse.json({ message: 'Review not found' }, { status: 404 })
        }

        mockReviews.splice(reviewIndex, 1)

        return HttpResponse.json({ success: true })
    }),

    http.get('/api/owner/clients', () => {
        const clients = mockUsers.filter(
            (user) => user.role === 'client' && user.status === 'active'
        )

        return HttpResponse.json(clients)
    }),

    http.patch('/api/admin/cabinets/:id/status', async ({ params, request }) => {
        const cabinetId = String(params.id)

        const body = await request.json() as {
            status: 'draft' | 'active' | 'blocked'
        }

        const cabinet = mockCabinets.find((item) => item.id === cabinetId)


        if (!cabinet) {
            return HttpResponse.json(
                { message: 'Cabinet not found' },
                { status: 404 }
            )
        }

        cabinet.status = body.status

        return HttpResponse.json(cabinet)
    }),

    http.post('/api/cabinets', async ({ request }) => {
        const body = await request.json() as {
            title: string
            description: string
            address: string
            city: string
            pricePerHour: number
            photos?: string[]
        }

        const newCabinet = {
            id: `cabinet-${Date.now()}`,
            ownerId: mockSession.currentUserId!,
            title: body.title,
            description: body.description,
            address: body.address,
            city: body.city,
            pricePerHour: body.pricePerHour,
            status: 'draft' as const,
            photos: body.photos ?? [],
            createdAt: new Date().toISOString(),
        }

        mockCabinets.push(newCabinet)

        return HttpResponse.json(newCabinet, {
            status: 201
        })
    }),

    http.post('/api/cabinet-images', async ({ request }) => {
        const body = await request.json() as {
            mimeType: string
            size: number
            contentBase64: string
        }

        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp']

        if (!allowedMimeTypes.includes(body.mimeType)) {
            return HttpResponse.json(
                {
                    code: 'CABINET_IMAGE_UNSUPPORTED_TYPE',
                    message: 'Cabinet image must be JPEG, PNG, or WebP.',
                },
                { status: 400 }
            )
        }

        if (body.size > 1024 * 1024) {
            return HttpResponse.json(
                {
                    code: 'CABINET_IMAGE_TOO_LARGE',
                    message: 'Cabinet image must be 1048576 bytes or smaller.',
                },
                { status: 400 }
            )
        }

        return HttpResponse.json({
            url: `data:${body.mimeType};base64,${body.contentBase64}`,
        })
    }),

    http.post('/api/services', async ({ request }) => {
        const body = await request.json() as {
            cabinetId: string
            title: string
            description: string
            durationMinutes: number
            price: number
            isActive: boolean
        }

        const cabinet = mockCabinets.find(
            (item) =>
                item.id === body.cabinetId &&
                item.ownerId === mockSession.currentUserId
        )

        if (!cabinet) {
            return HttpResponse.json(
                { message: 'Cabinet not found' },
                { status: 404 }
            )
        }

        const newService = {
            id: `service-${Date.now()}`,
            cabinetId: body.cabinetId,
            title: body.title,
            description: body.description,
            durationMinutes: body.durationMinutes,
            price: body.price,
            isActive: body.isActive,
        }

        mockServices.push(newService)

        return HttpResponse.json(newService, { status: 201 })
    }),

    http.patch('/api/admin/users/:id/status', async ({ params, request }) => {
        const userId = String(params.id)

        const body = await request.json() as {
            status: 'active' | 'blocked'
        }

        const user = mockUsers.find((item) => item.id === userId)

        if (!user) {
            return HttpResponse.json(
                {
                    message: 'User not found',
                },
                {
                    status: 404,
                },
            )
        }

        user.status = body.status

        return HttpResponse.json(user)
    }),

    http.post('/api/bookings', async ({ request }) => {
        const body = await parseMockJson(request, bookingRequestSchema)

        if (!body) return invalidMockBodyResponse()

        const isOwnerManualBooking = Boolean(body.clientId)
        const clientId = body.clientId ?? mockSession.currentUserId

        if (!clientId) {
            return HttpResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            )
        }

        const client = mockUsers.find(
            (user) =>
                user.id === clientId &&
                user.role === 'client' &&
                user.status === 'active'
        )

        if (!client) {
            return HttpResponse.json(
                { message: 'Client not found' },
                { status: 404 }
            )
        }

        const cabinet = mockCabinets.find(
            (cabinet) =>
                cabinet.id === body.cabinetId
        )

        if (!cabinet) {
            return HttpResponse.json(
                { message: 'Cabinet not found' },
                { status: 404 }
            )
        }

        if (isOwnerManualBooking && cabinet.ownerId !== mockSession.currentUserId) {
            return HttpResponse.json(
                { message: 'Cabinet not found' },
                { status: 404 }
            )
        }

        if (!isOwnerManualBooking && cabinet.status !== 'active') {
            return HttpResponse.json(
                { message: 'Cabinet is not available for booking' },
                { status: 400 }
            )
        }

        const service = mockServices.find(
            (service) =>
                service.id === body.serviceId &&
                service.cabinetId === body.cabinetId
        )

        if (!service) {
            return HttpResponse.json(
                { message: 'Service not found' },
                { status: 404 }
            )
        }

        if (!service.isActive) {
            return HttpResponse.json(
                { message: 'Service is not available for booking' },
                { status: 400 }
            )
        }

        const newBooking = {
            id: `booking-${Date.now()}`,
            clientId,
            cabinetId: body.cabinetId,
            serviceId: body.serviceId,
            date: body.date,
            startTime: body.startTime,
            endTime: body.endTime,
            status: body.status,
            comment: body.comment ?? null,
            createdAt: new Date().toISOString(),
        }

        mockBookings.push(newBooking)

        addMockNotification({
            userId: client.id,
            category: 'booking',
            title: isOwnerManualBooking ? 'Booking confirmed' : 'Booking request sent',
            message: isOwnerManualBooking
                ? `Booking for ${service.title} in ${cabinet.title} was created by the owner.`
                : `Your booking request for ${service.title} in ${cabinet.title} was sent.`,
            link: '/profile/bookings',
            metadata: {
                bookingId: newBooking.id,
            },
        })

        if (!isOwnerManualBooking) {
            addMockNotification({
                userId: cabinet.ownerId,
                category: 'booking',
                title: 'New booking request',
                message: `${client.name} requested ${service.title} in ${cabinet.title}.`,
                link: '/owner/bookings',
                metadata: {
                    bookingId: newBooking.id,
                },
            })
        }

        return HttpResponse.json(newBooking, {
            status: 201
        })
    }),

    http.get('/api/bookings/my', () => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            )
        }

        const clientBookings = mockBookings
            .filter((booking) => booking.clientId === mockSession.currentUserId)
            .map(toClientBooking)

        return HttpResponse.json(clientBookings)
    }),

    http.get('/api/bookings/:id/history', ({ params }) => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        const booking = mockBookings.find((item) => item.id === String(params.id))
        if (!booking) {
            return HttpResponse.json({ message: 'Booking not found' }, { status: 404 })
        }

        const cabinet = mockCabinets.find((item) => item.id === booking.cabinetId)
        if (booking.clientId !== mockSession.currentUserId && cabinet?.ownerId !== mockSession.currentUserId) {
            return HttpResponse.json({ message: 'Booking not found' }, { status: 404 })
        }

        return HttpResponse.json([
            {
                id: `${booking.id}-status`,
                status: booking.status,
                changedById: booking.clientId,
                reason: booking.cancellationReason ?? null,
                createdAt: booking.createdAt,
            },
        ])
    }),

    http.patch('/api/bookings/:id/status', async ({ params, request }) => {
        const bookingId = String(params.id)

        const body = await request.json() as {
            status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
        }

        const booking = mockBookings.find((item) => item.id === bookingId)

        if (!booking) {
            return HttpResponse.json(
                { message: 'Booking not found' },
                { status: 404 }
            )
        }

        const cabinet = mockCabinets.find(
            (item) =>
                item.id === booking.cabinetId &&
                item.ownerId === mockSession.currentUserId
        )

        if (!cabinet) {
            return HttpResponse.json(
                { message: 'Booking not found' },
                { status: 404 }
            )
        }

        booking.status = body.status
        addMockNotification({
            userId: booking.clientId,
            category: 'booking',
            title: 'Booking status updated',
            message: `Your booking status changed to ${body.status}.`,
            link: '/profile/bookings',
            metadata: {
                bookingId: booking.id,
                status: body.status,
            },
        })

        return HttpResponse.json(booking)
    }),

    http.patch('/api/bookings/:id/cancel', ({ params }) => {
        const bookingId = String(params.id)

        if (!mockSession.currentUserId) {
            return HttpResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            )
        }

        const booking = mockBookings.find(
            (item) =>
                item.id === bookingId &&
                item.clientId === mockSession.currentUserId
        )

        if (!booking) {
            return HttpResponse.json(
                { message: 'Booking not found' },
                { status: 404 }
            )
        }

        if (booking.status !== 'pending' && booking.status !== 'confirmed') {
            return HttpResponse.json(
                { message: 'Booking cannot be cancelled' },
                { status: 400 }
            )
        }

        booking.status = 'cancelled'
        addMockNotification({
            userId: booking.clientId,
            category: 'booking',
            title: 'Booking cancelled',
            message: 'Your booking was cancelled.',
            link: '/profile/bookings',
            metadata: {
                bookingId: booking.id,
            },
        })

        return HttpResponse.json(booking)
    }),

    http.post('/api/auth/google/mock', () => {
        if (!isDeploymentOAuthProviderEnabled('google')) {
            return HttpResponse.json({ message: 'OAuth provider is not enabled for this deployment.' }, { status: 403 })
        }

        const user = mockUsers.find(
            (user) => user.provider === 'google'
        )

        if (!user) {
            return HttpResponse.json(
                { message: 'Google mock user not found' },
                { status: 404 }
            )
        }

        if (user.status === 'blocked') {
            return HttpResponse.json(
                { message: 'User is blocked' },
                { status: 403 }
            )
        }

        setMockSession({
            currentUserId: user.id,
            currentRole: user.role,
        })

        return HttpResponse.json(user)
    }),

    http.post('/api/auth/yandex/mock', () => {
        if (!isDeploymentOAuthProviderEnabled('yandex')) {
            return HttpResponse.json({ message: 'OAuth provider is not enabled for this deployment.' }, { status: 403 })
        }

        const user = mockUsers.find(
            (user) => user.provider === 'yandex'
        )

        if (!user) {
            return HttpResponse.json(
                { message: 'Yandex mock user not found' },
                { status: 404 }
            )
        }

        if (user.status === 'blocked') {
            return HttpResponse.json(
                { message: 'User is blocked' },
                { status: 403 }
            )
        }

        setMockSession({
            currentUserId: user.id,
            currentRole: user.role,
        })

        return HttpResponse.json(user)
    }),

    http.patch('/api/users/me/preferences', async ({ request }) => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            )
        }

        const body = await request.json() as {
            emailNotifications?: boolean
            bookingEmailNotifications?: boolean
            preferredCity?: string | null
            preferredCategories?: string[]
            locale?: import('@/shared/config/i18n').SupportedLocale | null
        }

        const user = mockUsers.find(
            (item) => item.id === mockSession.currentUserId
        )

        if (user) {
            if (body.emailNotifications !== undefined) {
                user.emailNotifications = body.emailNotifications
            }
            if (body.bookingEmailNotifications !== undefined) {
                user.bookingEmailNotifications = body.bookingEmailNotifications
            }
            if (body.preferredCity !== undefined) {
                user.preferredCity = body.preferredCity
            }
            if (body.preferredCategories !== undefined) {
                user.preferredCategories = body.preferredCategories
            }
            if (body.locale !== undefined) {
                user.locale = body.locale
            }
        }

        return HttpResponse.json(user)
    }),

    http.get('/api/users/me/vehicles', () => {
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (user.role !== 'client') return HttpResponse.json({ message: 'Only clients can manage vehicles.' }, { status: 403 })
        return HttpResponse.json(getMockVehicles(user.id))
    }),

    http.post('/api/users/me/vehicles', async ({ request }) => {
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (user.role !== 'client') return HttpResponse.json({ message: 'Only clients can manage vehicles.' }, { status: 403 })

        const body = await request.json() as CreateClientVehicleInput
        const vehicles = getMockVehicles(user.id)
        if (vehicles.length >= 20) return HttpResponse.json({ message: 'A client can save up to 20 vehicles.' }, { status: 409 })

        const vehicle: ClientVehicle = {
            ...body,
            id: `mock-vehicle-${Date.now()}`,
            imageUrl: getVehicleImage(body.brandId, body.model),
            isPrimary: vehicles.length === 0,
            createdAt: new Date().toISOString(),
        }
        vehicles.push(vehicle)
        return HttpResponse.json(vehicle, { status: 201 })
    }),

    http.patch('/api/users/me/vehicles/:id', async ({ params, request }) => {
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (user.role !== 'client') return HttpResponse.json({ message: 'Only clients can manage vehicles.' }, { status: 403 })

        const vehicle = getMockVehicles(user.id).find((item) => item.id === String(params.id))
        if (!vehicle) return HttpResponse.json({ message: 'Vehicle not found.' }, { status: 404 })

        const patch = await request.json() as Partial<CreateClientVehicleInput>
        Object.assign(vehicle, patch)
        if (patch.brandId || patch.model) vehicle.imageUrl = getVehicleImage(patch.brandId ?? vehicle.brandId, patch.model ?? vehicle.model)
        return HttpResponse.json(vehicle)
    }),

    http.delete('/api/users/me/vehicles/:id', ({ params }) => {
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (user.role !== 'client') return HttpResponse.json({ message: 'Only clients can manage vehicles.' }, { status: 403 })

        const vehicles = getMockVehicles(user.id)
        const index = vehicles.findIndex((item) => item.id === String(params.id))
        if (index < 0) return HttpResponse.json({ message: 'Vehicle not found.' }, { status: 404 })
        vehicles.splice(index, 1)
        if (vehicles.length > 0 && !vehicles.some((item) => item.isPrimary)) vehicles[0]!.isPrimary = true
        return HttpResponse.json({ success: true })
    }),

    http.get('/api/users/me/export', () => {
        const user = mockUsers.find((item) => item.id === mockSession.currentUserId)

        if (!user) {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        return HttpResponse.json({
            schemaVersion: 1,
            generatedAt: new Date().toISOString(),
            user,
            favorites: [],
            bookings: [],
            notifications: [],
            cabinets: [],
            vehicles: getMockVehicles(user.id),
            integrity: {
                algorithm: 'sha256',
                checksum: 'mock-export-checksum',
            },
        })
    }),

    http.get('/api/users/me/deletion-request', () => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        const request = mockAccountDeletionRequests.get(mockSession.currentUserId)

        return HttpResponse.json(request?.status === 'pending' ? request : null)
    }),

    http.post('/api/users/me/deletion-request', async ({ request }) => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        const current = mockAccountDeletionRequests.get(mockSession.currentUserId)
        if (current?.status === 'pending') return HttpResponse.json(current)

        const nextRequest: MockAccountDeletionRequest = {
            id: `mock-deletion-${Date.now()}`,
            status: 'pending',
            requestedAt: new Date().toISOString(),
            cancelledAt: null,
            completedAt: null,
        }
        mockAccountDeletionRequests.set(mockSession.currentUserId, nextRequest)
        await request.json().catch(() => null)

        return HttpResponse.json(nextRequest)
    }),

    http.delete('/api/users/me/deletion-request', () => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        const current = mockAccountDeletionRequests.get(mockSession.currentUserId)
        if (!current || current.status !== 'pending') return HttpResponse.json(null)

        const cancelledRequest = {
            ...current,
            status: 'cancelled' as const,
            cancelledAt: new Date().toISOString(),
        }
        mockAccountDeletionRequests.set(mockSession.currentUserId, cancelledRequest)

        return HttpResponse.json(cancelledRequest)
    }),

    http.patch('/api/admin/users/:id/role', async ({ params, request }) => {
        const userId = String(params.id)

        const body = await request.json() as {
            role: 'client' | 'owner' | 'admin' | 'super_admin'
        }

        const user = mockUsers.find((item) => item.id === userId)

        if (!user) {
            return HttpResponse.json(
                {
                    message: 'User not found',
                },
                {
                    status: 404,
                },
            )
        }

        user.role = body.role

        return HttpResponse.json(user)
    }),

]
