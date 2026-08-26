import { AppDataSource } from '../database/data-source.js'
import { getAutoCareDiscovery, getAutoCareMarkets } from '../modules/autocare/autocare.service.js'
import { clearDiscoveryCache } from '../modules/autocare/discovery-cache.js'
import { isDiscoveryBenchmarkWithinBudgets, runConcurrentDiscoveryBenchmark } from '../modules/autocare/discovery-benchmark.js'

function readPositiveInteger(name: string, fallback: number, maximum: number) {
    const rawValue = process.env[name]
    if (!rawValue) return fallback
    const value = Number(rawValue)
    if (!Number.isInteger(value) || value < 1 || value > maximum) {
        throw new Error(`${name} must be an integer from 1 to ${maximum}.`)
    }
    return value
}

function readPercentage(name: string, fallback: number) {
    const rawValue = process.env[name]
    if (!rawValue) return fallback
    const value = Number(rawValue)
    if (!Number.isFinite(value) || value < 0 || value > 100) {
        throw new Error(`${name} must be a percentage from 0 to 100.`)
    }
    return value
}

function getHttpBenchmarkUrl(baseUrl: string, marketId: string | undefined, radiusKm: number, sort: 'recommended' | 'distance_asc') {
    const url = new URL('/v1/discovery/providers', baseUrl)
    if (marketId) url.searchParams.set('marketId', marketId)
    url.searchParams.set('radiusKm', String(radiusKm))
    url.searchParams.set('sort', sort)
    url.searchParams.set('limit', '20')
    return url
}

async function runHttpBenchmark(input: {
    baseUrl: string
    marketId?: string
    radiuses: number[]
    iterations: number
    concurrency: number
    p95BudgetMs: number
    p99BudgetMs: number
    maxFailureRatePercent: number
}) {
    const parsedBaseUrl = new URL(input.baseUrl)
    if (parsedBaseUrl.protocol !== 'http:' && parsedBaseUrl.protocol !== 'https:') {
        throw new Error('BENCHMARK_DISCOVERY_BASE_URL must use http or https.')
    }
    const summary = await runConcurrentDiscoveryBenchmark({
        iterations: input.iterations,
        concurrency: input.concurrency,
        task: async (index) => {
            const url = getHttpBenchmarkUrl(input.baseUrl, input.marketId, input.radiuses[index % input.radiuses.length]!, index % 2 === 0 ? 'recommended' : 'distance_asc')
            const response = await fetch(url)
            if (!response.ok) throw new Error(`Discovery request returned HTTP ${response.status}.`)
            await response.arrayBuffer()
        },
    })
    const passed = isDiscoveryBenchmarkWithinBudgets(summary, {
        p95Ms: input.p95BudgetMs,
        p99Ms: input.p99BudgetMs,
        maxFailureRatePercent: input.maxFailureRatePercent,
    })
    console.info(JSON.stringify({
        strategy: 'http-discovery-route',
        baseUrl: parsedBaseUrl.origin,
        market: input.marketId ?? null,
        concurrency: input.concurrency,
        radiuses: input.radiuses,
        p95BudgetMs: input.p95BudgetMs,
        p99BudgetMs: input.p99BudgetMs,
        maxFailureRatePercent: input.maxFailureRatePercent,
        cache: 'included',
        passed,
        ...summary,
    }))
    if (!passed) process.exitCode = 1
}

async function run() {
    const iterations = readPositiveInteger('BENCHMARK_DISCOVERY_ITERATIONS', 40, 500)
    const concurrency = readPositiveInteger('BENCHMARK_DISCOVERY_CONCURRENCY', 8, 64)
    const p95BudgetMs = readPositiveInteger('BENCHMARK_DISCOVERY_P95_BUDGET_MS', 350, 10_000)
    const p99BudgetMs = readPositiveInteger('BENCHMARK_DISCOVERY_P99_BUDGET_MS', 700, 20_000)
    const maxFailureRatePercent = readPercentage('BENCHMARK_DISCOVERY_MAX_FAILURE_RATE_PERCENT', 0)
    const radiuses = (process.env.BENCHMARK_DISCOVERY_RADII_KM ?? '5,25,100,500')
        .split(',')
        .map((value) => Number(value.trim()))
    if (radiuses.length === 0 || radiuses.some((value) => !Number.isFinite(value) || value <= 0 || value > 500)) {
        throw new Error('BENCHMARK_DISCOVERY_RADII_KM must contain positive radiuses up to 500 km.')
    }
    const marketId = process.env.BENCHMARK_DISCOVERY_MARKET?.trim()
    const baseUrl = process.env.BENCHMARK_DISCOVERY_BASE_URL?.trim()

    if (baseUrl) {
        await runHttpBenchmark({ baseUrl, marketId, radiuses, iterations, concurrency, p95BudgetMs, p99BudgetMs, maxFailureRatePercent })
        return
    }

    await AppDataSource.initialize()
    try {
        const markets = await getAutoCareMarkets()
        const market = marketId
            ? markets.find((item) => item.id === marketId || item.cityCode === marketId)
            : markets.find((item) => item.launchReady) ?? markets[0]
        if (!market) throw new Error('No market is available for discovery benchmark.')

        const summary = await runConcurrentDiscoveryBenchmark({
            iterations,
            concurrency,
            task: async (index) => {
                // Do not let the short-lived application cache hide database
                // pressure in this release benchmark. Cache behaviour is
                // measured separately through the route integration contract.
                clearDiscoveryCache()
                await getAutoCareDiscovery({
                    marketId: market.cityCode,
                    radiusKm: radiuses[index % radiuses.length]!,
                    sort: index % 2 === 0 ? 'recommended' : 'distance_asc',
                    limit: 20,
                })
            },
        })

        const passed = isDiscoveryBenchmarkWithinBudgets(summary, { p95Ms: p95BudgetMs, p99Ms: p99BudgetMs, maxFailureRatePercent })
        console.info(JSON.stringify({ strategy: 'portable-sql-bbox-exact-distance', market: market.cityCode, concurrency, radiuses, p95BudgetMs, p99BudgetMs, maxFailureRatePercent, cache: 'bypassed', passed, ...summary }))
        if (!passed) process.exitCode = 1
    } finally {
        await AppDataSource.destroy()
    }
}

void run().catch((error: unknown) => {
    console.error('AutoCare discovery benchmark failed.', error)
    process.exitCode = 1
})
