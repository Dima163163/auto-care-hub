import { AppDataSource } from '../database/data-source.js'

const DEFAULT_RADII_KM = [5, 25, 100, 500] as const

type MarketRow = {
    id: string
    cityCode: string
    cityName: string
    countryCode: string
    centerLatitude: number | string | null
    centerLongitude: number | string | null
}

type DensityRow = {
    providers: number | string
    locations: number | string
    activeOffers: number | string
}

type CategoryDensityRow = {
    serviceSlug: string
    providers: number | string
    activeOffers: number | string
}

function parsePositiveNumber(name: string, fallback: number, maximum: number) {
    const value = Number(process.env[name] ?? fallback)
    if (!Number.isFinite(value) || value <= 0 || value > maximum) {
        throw new Error(`${name} must be a positive number no greater than ${maximum}.`)
    }
    return value
}

function parseRadii() {
    const raw = process.env.DISCOVERY_DENSITY_RADII_KM
    const values = (raw ? raw.split(',') : [...DEFAULT_RADII_KM.map(String)])
        .map((value) => Number(value.trim()))
    if (values.length === 0 || values.some((value) => !Number.isFinite(value) || value <= 0 || value > 500)) {
        throw new Error('DISCOVERY_DENSITY_RADII_KM must contain positive radiuses up to 500 km.')
    }
    return [...new Set(values)].sort((left, right) => left - right)
}

async function findMarket(value?: string) {
    const rows = await AppDataSource.query<MarketRow[]>(
        `SELECT "id", "cityCode", "cityName", "countryCode", "centerLatitude", "centerLongitude"
         FROM "autocare_markets"
         WHERE ($1::text IS NULL OR "cityCode" = $1 OR "id"::text = $1)
         ORDER BY "launchReady" DESC, "cityName" ASC
         LIMIT 1`,
        [value ?? null],
    )
    return rows[0] ?? null
}

function distanceExpression() {
    return `6371 * acos(least(1, greatest(-1,
        cos(radians($2)) * cos(radians(location."latitude")) *
        cos(radians(location."longitude") - radians($3)) +
        sin(radians($2)) * sin(radians(location."latitude"))
    )))`
}

async function readDensity(market: MarketRow, radiusKm: number) {
    const latitude = Number(market.centerLatitude)
    const longitude = Number(market.centerLongitude)
    const distance = distanceExpression()
    const [totals, categories] = await Promise.all([
        AppDataSource.query<DensityRow[]>(
            `SELECT COUNT(DISTINCT provider.id)::int AS "providers",
                    COUNT(DISTINCT location.id)::int AS "locations",
                    COUNT(DISTINCT offer.id)::int AS "activeOffers"
             FROM "autocare_service_locations" location
             INNER JOIN "autocare_providers" provider
               ON provider."id" = location."providerId" AND provider."status" = 'active'
             INNER JOIN "autocare_service_offerings" offer
               ON offer."locationId" = location."id" AND offer."active" = true
             WHERE location."marketId" = $1
               AND location."latitude" IS NOT NULL
               AND location."longitude" IS NOT NULL
               AND ${distance} <= $4`,
            [market.id, latitude, longitude, radiusKm],
        ),
        AppDataSource.query<CategoryDensityRow[]>(
            `SELECT definition."slug" AS "serviceSlug",
                    COUNT(DISTINCT provider.id)::int AS "providers",
                    COUNT(DISTINCT offer.id)::int AS "activeOffers"
             FROM "autocare_service_locations" location
             INNER JOIN "autocare_providers" provider
               ON provider."id" = location."providerId" AND provider."status" = 'active'
             INNER JOIN "autocare_service_offerings" offer
               ON offer."locationId" = location."id" AND offer."active" = true
             INNER JOIN "autocare_service_definitions" definition
               ON definition."id" = offer."definitionId" AND definition."active" = true
             WHERE location."marketId" = $1
               AND location."latitude" IS NOT NULL
               AND location."longitude" IS NOT NULL
               AND ${distance} <= $4
             GROUP BY definition."slug"
             ORDER BY definition."slug" ASC`,
            [market.id, latitude, longitude, radiusKm],
        ),
    ])
    const total = totals[0]
    return {
        radiusKm,
        providers: Number(total?.providers ?? 0),
        locations: Number(total?.locations ?? 0),
        activeOffers: Number(total?.activeOffers ?? 0),
        categories: categories.map((category) => ({
            serviceSlug: category.serviceSlug,
            providers: Number(category.providers),
            activeOffers: Number(category.activeOffers),
        })),
    }
}

async function run() {
    const radii = parseRadii()
    const checkRadiusKm = parsePositiveNumber('DISCOVERY_DENSITY_CHECK_RADIUS_KM', 25, 500)
    const minimumProviders = parsePositiveNumber('DISCOVERY_DENSITY_MIN_PROVIDERS', 1, 1_000_000)
    const minimumOffers = parsePositiveNumber('DISCOVERY_DENSITY_MIN_OFFERS', 1, 1_000_000)
    if (!radii.includes(checkRadiusKm)) radii.push(checkRadiusKm)
    radii.sort((left, right) => left - right)

    await AppDataSource.initialize()
    try {
        const market = await findMarket(process.env.DISCOVERY_DENSITY_MARKET?.trim() || undefined)
        if (!market) throw new Error('No database market matched DISCOVERY_DENSITY_MARKET.')
        const latitude = Number(market.centerLatitude)
        const longitude = Number(market.centerLongitude)
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            throw new Error(`Market ${market.cityCode} has no usable center coordinates.`)
        }

        const density = await Promise.all(radii.map((radiusKm) => readDensity(market, radiusKm)))
        const selected = density.find((item) => item.radiusKm === checkRadiusKm)!
        const passed = selected.providers >= minimumProviders && selected.activeOffers >= minimumOffers
        const report = {
            status: 'completed',
            market: {
                id: market.id,
                cityCode: market.cityCode,
                cityName: market.cityName,
                countryCode: market.countryCode,
                center: { latitude, longitude },
            },
            check: { radiusKm: checkRadiusKm, minimumProviders, minimumOffers, passed },
            density,
        }
        console.info(JSON.stringify(report))
        if (!passed) process.exitCode = 1
    } finally {
        await AppDataSource.destroy()
    }
}

void run().catch((error: unknown) => {
    console.error('Discovery supply-density check failed.', error)
    process.exitCode = 1
})
