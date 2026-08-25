export type MarketDefinition = {
    id: string
    countryCode: string
    countryName: string
    cityCode: string
    cityName: string
    currencyCode: string
    defaultLocale: string
    supportedLocales: readonly string[]
    timezone: string
    launchReady: boolean
}

/**
 * Data-driven market registry. Adding a market should be a data/config change,
 * not a new conditional in a page or API handler.
 */
export const MARKET_REGISTRY: readonly MarketDefinition[] = [
    {
        id: 'ru-moscow',
        countryCode: 'RU',
        countryName: 'Russia',
        cityCode: 'moscow',
        cityName: 'Moscow',
        currencyCode: 'RUB',
        defaultLocale: 'ru',
        supportedLocales: ['ru', 'en', 'es'],
        timezone: 'Europe/Moscow',
        launchReady: true,
    },
    {
        id: 'es-madrid',
        countryCode: 'ES',
        countryName: 'Spain',
        cityCode: 'madrid',
        cityName: 'Madrid',
        currencyCode: 'EUR',
        defaultLocale: 'es',
        supportedLocales: ['es', 'en', 'ru'],
        timezone: 'Europe/Madrid',
        launchReady: true,
    },
    {
        id: 'md-chisinau',
        countryCode: 'MD',
        countryName: 'Moldova',
        cityCode: 'chisinau',
        cityName: 'Chișinău',
        currencyCode: 'MDL',
        defaultLocale: 'ro',
        supportedLocales: ['ro', 'ru', 'en'],
        timezone: 'Europe/Chisinau',
        launchReady: true,
    },
    {
        id: 'md-tiraspol',
        countryCode: 'MD',
        countryName: 'Moldova / Transnistria',
        cityCode: 'tiraspol',
        cityName: 'Tiraspol',
        currencyCode: 'RUB',
        defaultLocale: 'ru',
        supportedLocales: ['ru', 'ro', 'en'],
        timezone: 'Europe/Chisinau',
        launchReady: true,
    },
    {
        id: 'md-bender', countryCode: 'MD', countryName: 'Moldova / Transnistria', cityCode: 'bender', cityName: 'Bender', currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'ro', 'en'], timezone: 'Europe/Chisinau', launchReady: true,
    },
    {
        id: 'md-rybnitsa', countryCode: 'MD', countryName: 'Moldova / Transnistria', cityCode: 'rybnitsa', cityName: 'Rybnitsa', currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'ro', 'en'], timezone: 'Europe/Chisinau', launchReady: true,
    },
    {
        id: 'md-dubossary', countryCode: 'MD', countryName: 'Moldova / Transnistria', cityCode: 'dubossary', cityName: 'Dubossary', currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'ro', 'en'], timezone: 'Europe/Chisinau', launchReady: true,
    },
    {
        id: 'md-slobodzeya', countryCode: 'MD', countryName: 'Moldova / Transnistria', cityCode: 'slobodzeya', cityName: 'Slobodzeya', currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'ro', 'en'], timezone: 'Europe/Chisinau', launchReady: true,
    },
    {
        id: 'ru-samara', countryCode: 'RU', countryName: 'Russia', cityCode: 'samara', cityName: 'Samara', currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Europe/Samara', launchReady: true,
    },
    {
        id: 'ru-kaliningrad', countryCode: 'RU', countryName: 'Russia', cityCode: 'kaliningrad', cityName: 'Kaliningrad', currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Europe/Kaliningrad', launchReady: true,
    },
    {
        id: 'ru-saint-petersburg', countryCode: 'RU', countryName: 'Russia', cityCode: 'saint-petersburg', cityName: 'Saint Petersburg', currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Europe/Moscow', launchReady: true,
    },
    {
        id: 'ru-kazan', countryCode: 'RU', countryName: 'Russia', cityCode: 'kazan', cityName: 'Kazan', currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Europe/Moscow', launchReady: true,
    },
    {
        id: 'ru-novosibirsk', countryCode: 'RU', countryName: 'Russia', cityCode: 'novosibirsk', cityName: 'Novosibirsk', currencyCode: 'RUB', defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Asia/Novosibirsk', launchReady: true,
    },
    {
        id: 'es-barcelona', countryCode: 'ES', countryName: 'Spain', cityCode: 'barcelona', cityName: 'Barcelona', currencyCode: 'EUR', defaultLocale: 'es', supportedLocales: ['es', 'en', 'ru'], timezone: 'Europe/Madrid', launchReady: true,
    },
    {
        id: 'es-valencia', countryCode: 'ES', countryName: 'Spain', cityCode: 'valencia', cityName: 'Valencia', currencyCode: 'EUR', defaultLocale: 'es', supportedLocales: ['es', 'en', 'ru'], timezone: 'Europe/Madrid', launchReady: true,
    },
] as const

export function getMarketById(marketId: string) {
    return MARKET_REGISTRY.find((market) => market.id === marketId)
}
