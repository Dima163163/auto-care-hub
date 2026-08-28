import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { AutomotiveLocationZoneType, AutomotivePriceType, AutomotiveProviderStatus, type AutomotiveProviderCommunicationMode, type AutomotiveProviderResponseHours } from '../../entities/automotive/automotive.entity.js'

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
    phone?: string | null
    phones?: string[]
    email?: string | null
    communicationMode?: AutomotiveProviderCommunicationMode
    chatEnabled?: boolean
    responseWindowMinutes?: number | null
    responseHours?: AutomotiveProviderResponseHours
    phoneBookingEnabled?: boolean
    callbackEnabled?: boolean
    requestPhotosEnabled?: boolean
    publicContactNote?: string | null
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
    { countryCode: 'RU', countryName: 'Россия', cityCode: 'yekaterinburg', cityName: 'Екатеринбург', regionCode: 'sverdlovsk-oblast', regionName: 'Свердловская область', centerLatitude: 56.8389, centerLongitude: 60.6057, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Asia/Yekaterinburg', launchReady: true },
    { countryCode: 'RU', countryName: 'Россия', cityCode: 'nizhny-novgorod', cityName: 'Нижний Новгород', regionCode: 'nizhny-novgorod-oblast', regionName: 'Нижегородская область', centerLatitude: 56.3269, centerLongitude: 44.0059, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Europe/Moscow', launchReady: true },
    { countryCode: 'RU', countryName: 'Россия', cityCode: 'rostov-on-don', cityName: 'Ростов-на-Дону', regionCode: 'rostov-oblast', regionName: 'Ростовская область', centerLatitude: 47.2357, centerLongitude: 39.7015, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Europe/Moscow', launchReady: true },
    { countryCode: 'RU', countryName: 'Россия', cityCode: 'ufa', cityName: 'Уфа', regionCode: 'bashkortostan', regionName: 'Республика Башкортостан', centerLatitude: 54.7388, centerLongitude: 55.9721, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Asia/Yekaterinburg', launchReady: true },
    { countryCode: 'RU', countryName: 'Россия', cityCode: 'krasnoyarsk', cityName: 'Красноярск', regionCode: 'krasnoyarsk-krai', regionName: 'Красноярский край', centerLatitude: 56.0153, centerLongitude: 92.8932, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Asia/Krasnoyarsk', launchReady: true },
    { countryCode: 'RU', countryName: 'Россия', cityCode: 'perm', cityName: 'Пермь', regionCode: 'perm-krai', regionName: 'Пермский край', centerLatitude: 58.0105, centerLongitude: 56.2502, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Asia/Yekaterinburg', launchReady: true },
    { countryCode: 'RU', countryName: 'Россия', cityCode: 'voronezh', cityName: 'Воронеж', regionCode: 'voronezh-oblast', regionName: 'Воронежская область', centerLatitude: 51.6755, centerLongitude: 39.2089, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Europe/Moscow', launchReady: true },
    { countryCode: 'RU', countryName: 'Россия', cityCode: 'volgograd', cityName: 'Волгоград', regionCode: 'volgograd-oblast', regionName: 'Волгоградская область', centerLatitude: 48.708, centerLongitude: 44.5133, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Europe/Volgograd', launchReady: true },
    { countryCode: 'RU', countryName: 'Россия', cityCode: 'omsk', cityName: 'Омск', regionCode: 'omsk-oblast', regionName: 'Омская область', centerLatitude: 54.9885, centerLongitude: 73.3242, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Asia/Omsk', launchReady: true },
    { countryCode: 'RU', countryName: 'Россия', cityCode: 'chelyabinsk', cityName: 'Челябинск', regionCode: 'chelyabinsk-oblast', regionName: 'Челябинская область', centerLatitude: 55.1644, centerLongitude: 61.4368, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Asia/Yekaterinburg', launchReady: true },
    { countryCode: 'RU', countryName: 'Россия', cityCode: 'krasnodar', cityName: 'Краснодар', regionCode: 'krasnodar-krai', regionName: 'Краснодарский край', centerLatitude: 45.0355, centerLongitude: 38.9753, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Europe/Moscow', launchReady: true },
    { countryCode: 'RU', countryName: 'Россия', cityCode: 'saratov', cityName: 'Саратов', regionCode: 'saratov-oblast', regionName: 'Саратовская область', centerLatitude: 51.5336, centerLongitude: 46.0343, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Europe/Saratov', launchReady: true },
    { countryCode: 'RU', countryName: 'Россия', cityCode: 'tyumen', cityName: 'Тюмень', regionCode: 'tyumen-oblast', regionName: 'Тюменская область', centerLatitude: 57.153, centerLongitude: 65.5343, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Asia/Yekaterinburg', launchReady: true },
    { countryCode: 'RU', countryName: 'Россия', cityCode: 'izhevsk', cityName: 'Ижевск', regionCode: 'udmurtia', regionName: 'Удмуртская Республика', centerLatitude: 56.8527, centerLongitude: 53.2115, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Europe/Samara', launchReady: true },
    { countryCode: 'RU', countryName: 'Россия', cityCode: 'barnaul', cityName: 'Барнаул', regionCode: 'altai-krai', regionName: 'Алтайский край', centerLatitude: 53.3481, centerLongitude: 83.7798, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Asia/Barnaul', launchReady: true },
    { countryCode: 'RU', countryName: 'Россия', cityCode: 'vladivostok', cityName: 'Владивосток', regionCode: 'primorsky-krai', regionName: 'Приморский край', centerLatitude: 43.1155, centerLongitude: 131.8855, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Asia/Vladivostok', launchReady: true },
    { countryCode: 'RU', countryName: 'Россия', cityCode: 'irkutsk', cityName: 'Иркутск', regionCode: 'irkutsk-oblast', regionName: 'Иркутская область', centerLatitude: 52.2864, centerLongitude: 104.2807, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Asia/Irkutsk', launchReady: true },
    { countryCode: 'RU', countryName: 'Россия', cityCode: 'khabarovsk', cityName: 'Хабаровск', regionCode: 'khabarovsk-krai', regionName: 'Хабаровский край', centerLatitude: 48.4827, centerLongitude: 135.0838, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Asia/Vladivostok', launchReady: true },
    { countryCode: 'RU', countryName: 'Россия', cityCode: 'yaroslavl', cityName: 'Ярославль', regionCode: 'yaroslavl-oblast', regionName: 'Ярославская область', centerLatitude: 57.6261, centerLongitude: 39.8845, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Europe/Moscow', launchReady: true },
    { countryCode: 'RU', countryName: 'Россия', cityCode: 'tomsk', cityName: 'Томск', regionCode: 'tomsk-oblast', regionName: 'Томская область', centerLatitude: 56.501, centerLongitude: 84.9924, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Asia/Tomsk', launchReady: true },
    { countryCode: 'RU', countryName: 'Россия', cityCode: 'orenburg', cityName: 'Оренбург', regionCode: 'orenburg-oblast', regionName: 'Оренбургская область', centerLatitude: 51.7682, centerLongitude: 55.0969, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Asia/Yekaterinburg', launchReady: true },
    { countryCode: 'RU', countryName: 'Россия', cityCode: 'ryazan', cityName: 'Рязань', regionCode: 'ryazan-oblast', regionName: 'Рязанская область', centerLatitude: 54.6296, centerLongitude: 39.7417, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Europe/Moscow', launchReady: true },
    { countryCode: 'RU', countryName: 'Россия', cityCode: 'sochi', cityName: 'Сочи', regionCode: 'krasnodar-krai', regionName: 'Краснодарский край', centerLatitude: 43.5855, centerLongitude: 39.7231, currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Europe/Moscow', launchReady: true },
    { countryCode: 'ES', countryName: 'Испания', cityCode: 'madrid', cityName: 'Мадрид', regionCode: 'madrid', regionName: 'Мадрид', centerLatitude: 40.4168, centerLongitude: -3.7038, currencyCode: 'EUR', defaultLocale: 'es', supportedLocales: ['es', 'en', 'ru'], timezone: 'Europe/Madrid', launchReady: true },
    { countryCode: 'ES', countryName: 'Испания', cityCode: 'barcelona', cityName: 'Барселона', regionCode: 'catalonia', regionName: 'Каталония', centerLatitude: 41.3874, centerLongitude: 2.1686, currencyCode: 'EUR', defaultLocale: 'es', supportedLocales: ['es', 'en', 'ru'], timezone: 'Europe/Madrid', launchReady: true },
    { countryCode: 'ES', countryName: 'Испания', cityCode: 'valencia', cityName: 'Валенсия', regionCode: 'valencian-community', regionName: 'Валенсийское сообщество', centerLatitude: 39.4699, centerLongitude: -0.3763, currencyCode: 'EUR', defaultLocale: 'es', supportedLocales: ['es', 'en', 'ru'], timezone: 'Europe/Madrid', launchReady: true },
    { countryCode: 'ES', countryName: 'Испания', cityCode: 'seville', cityName: 'Севилья', regionCode: 'andalusia', regionName: 'Андалусия', centerLatitude: 37.3891, centerLongitude: -5.9845, currencyCode: 'EUR', defaultLocale: 'es', supportedLocales: ['es', 'en', 'ru'], timezone: 'Europe/Madrid', launchReady: true },
    { countryCode: 'ES', countryName: 'Испания', cityCode: 'zaragoza', cityName: 'Сарагоса', regionCode: 'aragon', regionName: 'Арагон', centerLatitude: 41.6488, centerLongitude: -0.8891, currencyCode: 'EUR', defaultLocale: 'es', supportedLocales: ['es', 'en', 'ru'], timezone: 'Europe/Madrid', launchReady: true },
    { countryCode: 'ES', countryName: 'Испания', cityCode: 'malaga', cityName: 'Малага', regionCode: 'andalusia', regionName: 'Андалусия', centerLatitude: 36.7213, centerLongitude: -4.4214, currencyCode: 'EUR', defaultLocale: 'es', supportedLocales: ['es', 'en', 'ru'], timezone: 'Europe/Madrid', launchReady: true },
    { countryCode: 'ES', countryName: 'Испания', cityCode: 'murcia', cityName: 'Мурсия', regionCode: 'murcia', regionName: 'Мурсия', centerLatitude: 37.9922, centerLongitude: -1.1307, currencyCode: 'EUR', defaultLocale: 'es', supportedLocales: ['es', 'en', 'ru'], timezone: 'Europe/Madrid', launchReady: true },
    { countryCode: 'ES', countryName: 'Испания', cityCode: 'palma', cityName: 'Пальма', regionCode: 'balearic-islands', regionName: 'Балеарские острова', centerLatitude: 39.5696, centerLongitude: 2.6502, currencyCode: 'EUR', defaultLocale: 'es', supportedLocales: ['es', 'en', 'ru'], timezone: 'Europe/Madrid', launchReady: true },
    { countryCode: 'ES', countryName: 'Испания', cityCode: 'bilbao', cityName: 'Бильбао', regionCode: 'basque-country', regionName: 'Страна Басков', centerLatitude: 43.263, centerLongitude: -2.935, currencyCode: 'EUR', defaultLocale: 'es', supportedLocales: ['es', 'en', 'ru'], timezone: 'Europe/Madrid', launchReady: true },
    { countryCode: 'ES', countryName: 'Испания', cityCode: 'alicante', cityName: 'Аликанте', regionCode: 'valencian-community', regionName: 'Валенсийское сообщество', centerLatitude: 38.3452, centerLongitude: -0.481, currencyCode: 'EUR', defaultLocale: 'es', supportedLocales: ['es', 'en', 'ru'], timezone: 'Europe/Madrid', launchReady: true },
    { countryCode: 'ES', countryName: 'Испания', cityCode: 'cordoba', cityName: 'Кордова', regionCode: 'andalusia', regionName: 'Андалусия', centerLatitude: 37.8882, centerLongitude: -4.7794, currencyCode: 'EUR', defaultLocale: 'es', supportedLocales: ['es', 'en', 'ru'], timezone: 'Europe/Madrid', launchReady: true },
    { countryCode: 'ES', countryName: 'Испания', cityCode: 'valladolid', cityName: 'Вальядолид', regionCode: 'castile-and-leon', regionName: 'Кастилия и Леон', centerLatitude: 41.6523, centerLongitude: -4.7245, currencyCode: 'EUR', defaultLocale: 'es', supportedLocales: ['es', 'en', 'ru'], timezone: 'Europe/Madrid', launchReady: true },
    { countryCode: 'ES', countryName: 'Испания', cityCode: 'vigo', cityName: 'Виго', regionCode: 'galicia', regionName: 'Галисия', centerLatitude: 42.2406, centerLongitude: -8.7207, currencyCode: 'EUR', defaultLocale: 'es', supportedLocales: ['es', 'en', 'ru'], timezone: 'Europe/Madrid', launchReady: true },
    { countryCode: 'ES', countryName: 'Испания', cityCode: 'granada', cityName: 'Гранада', regionCode: 'andalusia', regionName: 'Андалусия', centerLatitude: 37.1773, centerLongitude: -3.5986, currencyCode: 'EUR', defaultLocale: 'es', supportedLocales: ['es', 'en', 'ru'], timezone: 'Europe/Madrid', launchReady: true },
    { countryCode: 'ES', countryName: 'Испания', cityCode: 'oviedo', cityName: 'Овьедо', regionCode: 'asturias', regionName: 'Астурия', centerLatitude: 43.3619, centerLongitude: -5.8494, currencyCode: 'EUR', defaultLocale: 'es', supportedLocales: ['es', 'en', 'ru'], timezone: 'Europe/Madrid', launchReady: true },
    { countryCode: 'MD', countryName: 'Молдова', cityCode: 'chisinau', cityName: 'Кишинёв', regionCode: 'chisinau', regionName: 'Муниципий Кишинёв', centerLatitude: 47.0105, centerLongitude: 28.8638, currencyCode: 'MDL', defaultLocale: 'ro', supportedLocales: ['ro', 'ru', 'en'], timezone: 'Europe/Chisinau', launchReady: true },
    { countryCode: 'MD', countryName: 'Молдова', cityCode: 'balti', cityName: 'Бельцы', regionCode: 'balti', regionName: 'Муниципий Бельцы', centerLatitude: 47.7631, centerLongitude: 27.9293, currencyCode: 'MDL', defaultLocale: 'ro', supportedLocales: ['ro', 'ru', 'en'], timezone: 'Europe/Chisinau', launchReady: true },
    { countryCode: 'MD', countryName: 'Молдова', cityCode: 'cahul', cityName: 'Кагул', regionCode: 'cahul', regionName: 'Кагульский район', centerLatitude: 45.9043, centerLongitude: 28.1944, currencyCode: 'MDL', defaultLocale: 'ro', supportedLocales: ['ro', 'ru', 'en'], timezone: 'Europe/Chisinau', launchReady: true },
    { countryCode: 'MD', countryName: 'Молдова', cityCode: 'comrat', cityName: 'Комрат', regionCode: 'gagauzia', regionName: 'Гагаузия', centerLatitude: 46.3003, centerLongitude: 28.6573, currencyCode: 'MDL', defaultLocale: 'ro', supportedLocales: ['ro', 'ru', 'en'], timezone: 'Europe/Chisinau', launchReady: true },
    { countryCode: 'MD', countryName: 'Молдова', cityCode: 'orhei', cityName: 'Оргеев', regionCode: 'orhei', regionName: 'Оргеевский район', centerLatitude: 47.3849, centerLongitude: 28.8231, currencyCode: 'MDL', defaultLocale: 'ro', supportedLocales: ['ro', 'ru', 'en'], timezone: 'Europe/Chisinau', launchReady: true },
    { countryCode: 'MD', countryName: 'Молдова', cityCode: 'ungheni', cityName: 'Унгены', regionCode: 'ungheni', regionName: 'Унгенский район', centerLatitude: 47.2108, centerLongitude: 27.8005, currencyCode: 'MDL', defaultLocale: 'ro', supportedLocales: ['ro', 'ru', 'en'], timezone: 'Europe/Chisinau', launchReady: true },
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
    ...cityZones('yekaterinburg', 'Екатеринбурга', 56.8389, 60.6057),
    ...cityZones('nizhny-novgorod', 'Нижнего Новгорода', 56.3269, 44.0059),
    ...cityZones('rostov-on-don', 'Ростова-на-Дону', 47.2357, 39.7015),
    ...cityZones('ufa', 'Уфы', 54.7388, 55.9721),
    ...cityZones('krasnoyarsk', 'Красноярска', 56.0153, 92.8932),
    ...cityZones('perm', 'Перми', 58.0105, 56.2502),
    ...cityZones('voronezh', 'Воронежа', 51.6755, 39.2089),
    ...cityZones('volgograd', 'Волгограда', 48.708, 44.5133),
    ...cityZones('omsk', 'Омска', 54.9885, 73.3242),
    ...cityZones('chelyabinsk', 'Челябинска', 55.1644, 61.4368),
    ...cityZones('krasnodar', 'Краснодара', 45.0355, 38.9753),
    ...cityZones('saratov', 'Саратова', 51.5336, 46.0343),
    ...cityZones('tyumen', 'Тюмени', 57.153, 65.5343),
    ...cityZones('izhevsk', 'Ижевска', 56.8527, 53.2115),
    ...cityZones('barnaul', 'Барнаула', 53.3481, 83.7798),
    ...cityZones('vladivostok', 'Владивостока', 43.1155, 131.8855),
    ...cityZones('irkutsk', 'Иркутска', 52.2864, 104.2807),
    ...cityZones('khabarovsk', 'Хабаровска', 48.4827, 135.0838),
    ...cityZones('yaroslavl', 'Ярославля', 57.6261, 39.8845),
    ...cityZones('tomsk', 'Томска', 56.501, 84.9924),
    ...cityZones('orenburg', 'Оренбурга', 51.7682, 55.0969),
    ...cityZones('ryazan', 'Рязани', 54.6296, 39.7417),
    ...cityZones('sochi', 'Сочи', 43.5855, 39.7231),
    ...cityZones('madrid', 'Мадрида', 40.4168, -3.7038),
    ...cityZones('barcelona', 'Барселоны', 41.3874, 2.1686),
    ...cityZones('valencia', 'Валенсии', 39.4699, -0.3763),
    ...cityZones('seville', 'Севильи', 37.3891, -5.9845),
    ...cityZones('zaragoza', 'Сарагосы', 41.6488, -0.8891),
    ...cityZones('malaga', 'Малаги', 36.7213, -4.4214),
    ...cityZones('murcia', 'Мурсии', 37.9922, -1.1307),
    ...cityZones('palma', 'Пальмы', 39.5696, 2.6502),
    ...cityZones('bilbao', 'Бильбао', 43.263, -2.935),
    ...cityZones('alicante', 'Аликанте', 38.3452, -0.481),
    ...cityZones('cordoba', 'Кордовы', 37.8882, -4.7794),
    ...cityZones('valladolid', 'Вальядолида', 41.6523, -4.7245),
    ...cityZones('vigo', 'Виго', 42.2406, -8.7207),
    ...cityZones('granada', 'Гранады', 37.1773, -3.5986),
    ...cityZones('oviedo', 'Овьедо', 43.3619, -5.8494),
    ...cityZones('chisinau', 'Кишинёва', 47.0105, 28.8638),
    ...cityZones('balti', 'Бельц', 47.7631, 27.9293),
    ...cityZones('cahul', 'Кагула', 45.9043, 28.1944),
    ...cityZones('comrat', 'Комрата', 46.3003, 28.6573),
    ...cityZones('orhei', 'Оргеева', 47.3849, 28.8231),
    ...cityZones('ungheni', 'Унген', 47.2108, 27.8005),
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
        phone: '+7 495 123-45-67', phones: ['+7 495 123-45-67', '+7 495 123-45-68'], communicationMode: 'online', chatEnabled: true, responseWindowMinutes: 120, responseHours: 'working_hours', phoneBookingEnabled: true, callbackEnabled: true, requestPhotosEnabled: true, publicContactNote: 'Обычно отвечаем в течение 2 часов в рабочее время.',
        yearsActive: 8, staffCount: 24, rating: 4.7, reviewCount: 256, bonusSummary: '5% back', imageUrl: '/images/autocare/providers/proservice.webp', galleryImageUrls: ['/images/autocare/providers/proservice.webp'],
        amenityIds: ['waiting_room', 'customer_parking', 'wifi', 'online_booking', 'coffee', 'card_payment'],
        address: 'Москва, ул. Льва Толстого, 18', hours: 'Пн–Вс: 08:00–21:00', latitude: 55.7337, longitude: 37.5876, zoneSlug: 'central',
        brandSpecializations: ['bmw', 'mercedes-benz', 'audi'], isMultibrand: false,
        offerings: [
            { serviceSlug: 'oil-change', priceFromMinor: 290000, durationMinutes: 60 }, { serviceSlug: 'diagnostics', priceFromMinor: 120000, durationMinutes: 60 }, { serviceSlug: 'brakes', priceFromMinor: 350000, durationMinutes: 90 },
            { serviceSlug: 'mobile-diagnostics', priceFromMinor: 180000, durationMinutes: 90 }, { serviceSlug: 'electric', priceFromMinor: 260000, durationMinutes: 120 }, { serviceSlug: 'battery-service', priceFromMinor: 190000, durationMinutes: 60 }, { serviceSlug: 'wheel-alignment', priceFromMinor: 280000, durationMinutes: 60 }, { serviceSlug: 'tire-service', priceFromMinor: 240000, durationMinutes: 75 }, { serviceSlug: 'maintenance', priceFromMinor: 360000, durationMinutes: 120 },
        ],
    },
    {
        key: 'autolux-moscow', name: 'AutoLux', description: 'Диагностика, обслуживание и кузовные работы в одном месте.', verified: true,
        logoUrl: '/images/autocare/providers/logos/autolux.svg',
        phone: '+7 495 234-56-78', phones: ['+7 495 234-56-78'], communicationMode: 'request_then_confirm', chatEnabled: true, responseWindowMinutes: 240, responseHours: 'working_hours', phoneBookingEnabled: true, callbackEnabled: true, requestPhotosEnabled: true, publicContactNote: 'Сначала уточним детали и подтвердим время по телефону.',
        yearsActive: 5, staffCount: 12, rating: 4.9, reviewCount: 412, imageUrl: '/images/autocare/providers/detailing.webp', galleryImageUrls: ['/images/autocare/providers/detailing.webp'],
        amenityIds: ['waiting_room', 'customer_parking', 'wifi', 'online_booking', 'card_payment', 'electric_charging'],
        address: 'Москва, Комсомольский пр-т, 45', hours: 'Пн–Вс: 09:00–22:00', latitude: 55.7104, longitude: 37.5838, zoneSlug: 'south',
        brandSpecializations: ['toyota', 'volkswagen', 'skoda'], isMultibrand: false,
        offerings: [
            { serviceSlug: 'oil-change', priceFromMinor: 320000, durationMinutes: 60 }, { serviceSlug: 'detailing', priceFromMinor: 650000, durationMinutes: 180 },
            { serviceSlug: 'car-wash', priceFromMinor: 120000, durationMinutes: 45 }, { serviceSlug: 'windshield-repair', priceFromMinor: 540000, durationMinutes: 180 }, { serviceSlug: 'tow-truck', priceFromMinor: 350000, durationMinutes: 60 }, { serviceSlug: 'air-conditioning', priceFromMinor: 260000, durationMinutes: 90 },
        ],
    },
    {
        key: 'formula-moscow', name: 'Formula Motion', description: 'Сервис для планового обслуживания, шин и сложной диагностики.', verified: false,
        phone: '+7 495 345-67-89', phones: ['+7 495 345-67-89'], communicationMode: 'phone_only', chatEnabled: false, responseWindowMinutes: null, responseHours: 'working_hours', phoneBookingEnabled: true, callbackEnabled: true, requestPhotosEnabled: true, publicContactNote: 'Небольшая команда: для быстрой записи лучше позвонить.',
        yearsActive: 4, staffCount: 10, rating: 4.6, reviewCount: 189, bonusSummary: 'Free check',
        amenityIds: ['waiting_room', 'wifi', 'coffee', 'card_payment', 'pickup_delivery'],
        address: 'Москва, ул. Плющиха, 10', hours: 'Пн–Сб: 08:00–20:00', latitude: 55.7361, longitude: 37.5747, zoneSlug: 'central',
        brandSpecializations: [], isMultibrand: true,
        offerings: [
            { serviceSlug: 'oil-change', priceFromMinor: 280000, durationMinutes: 45 }, { serviceSlug: 'body-paint', priceFromMinor: 1500000, durationMinutes: 360 },
            { serviceSlug: 'roadside-assistance', priceFromMinor: 220000, durationMinutes: 60 }, { serviceSlug: 'engine', priceFromMinor: 620000, durationMinutes: 240 }, { serviceSlug: 'suspension', priceFromMinor: 380000, durationMinutes: 120 }, { serviceSlug: 'tire-service', priceFromMinor: 230000, durationMinutes: 75 }, { serviceSlug: 'diagnostics', priceFromMinor: 140000, durationMinutes: 60 },
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
