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
        cityCode: 'MOW',
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
        cityCode: 'MAD',
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
        cityCode: 'KIV',
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
        cityCode: 'TIR',
        cityName: 'Tiraspol',
        currencyCode: 'RUB',
        defaultLocale: 'ru',
        supportedLocales: ['ru', 'ro', 'en'],
        timezone: 'Europe/Chisinau',
        launchReady: true,
    },
] as const

export function getMarketById(marketId: string) {
    return MARKET_REGISTRY.find((market) => market.id === marketId)
}
