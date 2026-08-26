import { performance } from 'node:perf_hooks'

import { AppDataSource } from '../database/data-source.js'
import { getAutoCareMarkets } from '../modules/autocare/autocare.service.js'
import { summarizeDiscoveryBenchmark } from '../modules/autocare/discovery-benchmark.js'

const RADII_KM = [5, 25, 100, 500] as const
const DEFAULT_ITERATIONS = 5
type QueryParam = string | number

function readIterations() {
    const value = Number(process.env.BENCHMARK_DISCOVERY_GEOSPATIAL_ITERATIONS ?? DEFAULT_ITERATIONS)
    if (!Number.isSafeInteger(value) || value < 1 || value > 50) throw new Error('BENCHMARK_DISCOVERY_GEOSPATIAL_ITERATIONS must be an integer from 1 to 50.')
    return value
}

function getBoundingBox(latitude: number, longitude: number, radiusKm: number) {
    const latDelta = radiusKm / 111
    const longitudeDelta = radiusKm / (111 * Math.max(0.01, Math.cos((latitude * Math.PI) / 180)))
    return {
        minLatitude: latitude - latDelta,
        maxLatitude: latitude + latDelta,
        minLongitude: longitude - longitudeDelta,
        maxLongitude: longitude + longitudeDelta,
    }
}

function getMarketId() {
    const value = process.env.BENCHMARK_DISCOVERY_MARKET?.trim()
    return value || undefined
}

async function hasPostgis() {
    const rows = await AppDataSource.query<{ version: string }[]>('SELECT extversion AS version FROM pg_extension WHERE extname = $1', ['postgis'])
    return rows[0]?.version ?? null
}

async function findGeographyGistIndex() {
    const rows = await AppDataSource.query<{ indexname: string; indexdef: string }[]>(
        `SELECT indexname, indexdef
         FROM pg_indexes
         WHERE schemaname = current_schema() AND tablename = $1`,
        ['autocare_service_locations'],
    )
    return rows.find((row) => /\bUSING\s+gist\b/i.test(row.indexdef) && /geography|st_makepoint|st_setsrid/i.test(row.indexdef)) ?? null
}

async function benchmarkQuery(sql: string, params: QueryParam[], iterations: number) {
    const samples = []
    for (let index = 0; index < iterations; index += 1) {
        const startedAt = performance.now()
        await AppDataSource.query(sql, params)
        samples.push({ durationMs: performance.now() - startedAt, ok: true })
    }
    return summarizeDiscoveryBenchmark(samples)
}

async function readCount(sql: string, params: QueryParam[]) {
    const rows = await AppDataSource.query<Array<{ count?: number | string }>>(sql, params)
    return Number(rows[0]?.count ?? 0)
}

async function explainUsesIndex(sql: string, params: QueryParam[]) {
    const rows = await AppDataSource.query<Array<{ 'QUERY PLAN'?: unknown }>>(`EXPLAIN (FORMAT JSON) ${sql}`, params)
    const planText = JSON.stringify(rows[0]?.['QUERY PLAN'] ?? '')
    return /\b(?:Index Scan|Bitmap Index Scan|Index Only Scan)\b/i.test(planText)
}

async function run() {
    const iterations = readIterations()
    await AppDataSource.initialize()
    try {
        const postgisVersion = await hasPostgis()
        if (!postgisVersion) {
            console.info(JSON.stringify({ status: 'skipped', reason: 'PostGIS extension is not installed on this PostgreSQL instance.', strategy: 'portable-sql-vs-postgis-gist', postgis: null }))
            return
        }
        const gistIndex = await findGeographyGistIndex()
        if (!gistIndex) {
            console.info(JSON.stringify({ status: 'skipped', reason: 'PostGIS is installed but no geography GiST index was found on autocare_service_locations.', strategy: 'portable-sql-vs-postgis-gist', postgisVersion, gistIndex: null }))
            return
        }

        const markets = await getAutoCareMarkets()
        const marketValue = getMarketId()
        const market = marketValue
            ? markets.find((item) => item.id === marketValue || item.cityCode === marketValue)
            : markets.find((item) => item.launchReady) ?? markets[0]
        if (!market?.centerLatitude || !market.centerLongitude) throw new Error('Selected benchmark market has no center coordinates.')

        const nativeResults = []
        const postgisResults = []
        const postgisIndexPlans = []
        const parity = []
        const nativeDistance = '6371 * acos(least(1, greatest(-1, cos(radians($2)) * cos(radians("latitude")) * cos(radians("longitude") - radians($3)) + sin(radians($2)) * sin(radians("latitude")))))'
        for (const radiusKm of RADII_KM) {
            const box = getBoundingBox(Number(market.centerLatitude), Number(market.centerLongitude), radiusKm)
            const nativeSql = `
                SELECT count(*)::int AS "count"
                FROM "autocare_service_locations"
                WHERE "marketId" = $1
                  AND "latitude" IS NOT NULL AND "longitude" IS NOT NULL
                  AND "latitude" BETWEEN $4 AND $5
                  AND "longitude" BETWEEN $6 AND $7
                  AND ${nativeDistance} <= $8
            `
            const nativeParams = [market.id, Number(market.centerLatitude), Number(market.centerLongitude), box.minLatitude, box.maxLatitude, box.minLongitude, box.maxLongitude, radiusKm]
            const native = await benchmarkQuery(nativeSql, nativeParams, iterations)
            const postgisSql = `
                SELECT count(*)::int AS "count"
                FROM "autocare_service_locations"
                WHERE "marketId" = $1
                  AND "latitude" IS NOT NULL AND "longitude" IS NOT NULL
                  AND ST_DWithin(
                    ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography,
                    ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography,
                    $4 * 1000
                  )
            `
            const postgisParams = [market.id, Number(market.centerLatitude), Number(market.centerLongitude), radiusKm]
            const postgis = await benchmarkQuery(postgisSql, postgisParams, iterations)
            const [nativeCount, postgisCount] = await Promise.all([
                readCount(nativeSql, nativeParams),
                readCount(postgisSql, postgisParams),
            ])
            postgisIndexPlans.push({ radiusKm, usesIndex: await explainUsesIndex(postgisSql, postgisParams) })
            parity.push({ radiusKm, nativeCount, postgisCount, matches: nativeCount === postgisCount })
            nativeResults.push({ radiusKm, count: nativeCount, ...native })
            postgisResults.push({ radiusKm, count: postgisCount, ...postgis })
        }
        const passed = parity.every((item) => item.matches) && postgisIndexPlans.every((item) => item.usesIndex)
        console.info(JSON.stringify({ status: 'completed', strategy: 'portable-sql-vs-postgis-gist', postgisVersion, gistIndex: gistIndex.indexname, postgisIndexPlans, parity, passed, market: market.cityCode, iterations, native: nativeResults, postgis: postgisResults }))
        if (!passed) process.exitCode = 1
    } finally {
        await AppDataSource.destroy()
    }
}

void run().catch((error: unknown) => {
    console.error('Geospatial discovery benchmark failed.', error)
    process.exitCode = 1
})
