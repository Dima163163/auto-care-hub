export type AutoCareResultSort = 'recommended' | 'price_asc' | 'rating_desc' | 'distance_asc'
export type AutoCareResultPriceType = 'fixed' | 'from' | 'range' | 'quote_required'

export type AutoCareResultFilters = {
    serviceId: string
    providerName: string
    marketId: string
    zoneId: string
    radiusKm: number
    sort: AutoCareResultSort
    minPrice: string
    maxPrice: string
    minRating: string
    priceType: AutoCareResultPriceType | ''
    availableToday: boolean
    verifiedOnly: boolean
    warrantyOnly: boolean
    hasBonus: boolean
    inclusion: string
    brandId: string
    vehicleModel: string
    vehicleYear: string
}

const SORTS = new Set<AutoCareResultSort>(['recommended', 'price_asc', 'rating_desc', 'distance_asc'])
const PRICE_TYPES = new Set<AutoCareResultPriceType>(['fixed', 'from', 'range', 'quote_required'])

function positiveNumber(value: string | null, fallback: string, maximum = Number.POSITIVE_INFINITY) {
    if (!value) return fallback
    const numberValue = Number(value)
    return Number.isFinite(numberValue) && numberValue >= 0 && numberValue <= maximum ? value : fallback
}

export function getAutoCareResultFilters(params: URLSearchParams): AutoCareResultFilters {
    const sort = params.get('sort')
    const priceType = params.get('priceType')
    const radiusValue = Number(params.get('radius') ?? 25)

    return {
        // An omitted service means “all services”. Keep this empty instead of
        // silently narrowing the first page to oil change.
        serviceId: params.get('service') ?? '',
        providerName: params.get('provider') ?? '',
        marketId: params.get('market') ?? 'ru-moscow',
        zoneId: params.get('zone') ?? '',
        radiusKm: Number.isFinite(radiusValue) && radiusValue > 0 ? radiusValue : 25,
        sort: sort && SORTS.has(sort as AutoCareResultSort) ? sort as AutoCareResultSort : 'recommended',
        minPrice: positiveNumber(params.get('minPrice'), ''),
        maxPrice: positiveNumber(params.get('maxPrice'), ''),
        minRating: positiveNumber(params.get('minRating'), '', 5),
        priceType: priceType && PRICE_TYPES.has(priceType as AutoCareResultPriceType) ? priceType as AutoCareResultPriceType : '',
        availableToday: params.get('availableToday') === 'true',
        verifiedOnly: params.get('verifiedOnly') === 'true',
        warrantyOnly: params.get('warrantyOnly') === 'true',
        hasBonus: params.get('hasBonus') === 'true',
        inclusion: params.get('inclusion') ?? '',
        brandId: params.get('brand') ?? '',
        vehicleModel: params.get('vehicleModel') ?? '',
        vehicleYear: positiveNumber(params.get('vehicleYear'), '', new Date().getFullYear()),
    }
}

export type AutoCareResultFilterPatch = Partial<Pick<AutoCareResultFilters, 'serviceId' | 'providerName' | 'marketId' | 'zoneId' | 'radiusKm' | 'sort' | 'minPrice' | 'maxPrice' | 'minRating' | 'priceType' | 'availableToday' | 'verifiedOnly' | 'warrantyOnly' | 'hasBonus' | 'inclusion' | 'brandId' | 'vehicleModel' | 'vehicleYear'>>

export function writeAutoCareResultFilters(params: URLSearchParams, patch: AutoCareResultFilterPatch) {
    const next = new URLSearchParams(params)
    const keys: Array<keyof AutoCareResultFilterPatch> = ['serviceId', 'providerName', 'marketId', 'zoneId', 'radiusKm', 'sort', 'minPrice', 'maxPrice', 'minRating', 'priceType', 'availableToday', 'verifiedOnly', 'warrantyOnly', 'hasBonus', 'inclusion', 'brandId', 'vehicleModel', 'vehicleYear']

    keys.forEach((key) => {
        const value = patch[key]
        if (value === undefined) return
        const urlKey = key === 'serviceId' ? 'service' : key === 'providerName' ? 'provider' : key === 'marketId' ? 'market' : key === 'radiusKm' ? 'radius' : key === 'brandId' ? 'brand' : key
        if (typeof value === 'boolean') {
            if (value) next.set(urlKey, 'true')
            else next.delete(urlKey)
        } else if (value === '' || value === null) {
            next.delete(urlKey)
        } else if (key === 'radiusKm' && value === 25) {
            next.delete(urlKey)
        } else if (key === 'sort' && value === 'recommended') {
            next.delete(urlKey)
        } else {
            next.set(urlKey, String(value))
        }
    })

    return next
}
