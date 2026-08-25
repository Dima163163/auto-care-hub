import { AppDataSource } from '../database/data-source.js'
import { getAutoCareDiscovery, getAutoCareMarkets } from '../modules/autocare/autocare.service.js'
import { isDiscoveryBenchmarkWithinBudget, summarizeDiscoveryBenchmark } from '../modules/autocare/discovery-benchmark.js'

function readPositiveInteger(name: string, fallback: number, maximum: number) {
    const rawValue = process.env[name]
    if (!rawValue) return fallback
    const value = Number(rawValue)
    if (!Number.isInteger(value) || value < 1 || value > maximum) {
        throw new Error(`${name} must be an integer from 1 to ${maximum}.`)
    }
    return value
}

async function run() {
    const iterations = readPositiveInteger('BENCHMARK_DISCOVERY_ITERATIONS', 40, 500)
    const p95BudgetMs = readPositiveInteger('BENCHMARK_DISCOVERY_P95_BUDGET_MS', 350, 10_000)
    const marketId = process.env.BENCHMARK_DISCOVERY_MARKET?.trim()

    await AppDataSource.initialize()
    try {
        const markets = await getAutoCareMarkets()
        const market = marketId
            ? markets.find((item) => item.id === marketId || item.cityCode === marketId)
            : markets.find((item) => item.launchReady) ?? markets[0]
        if (!market) throw new Error('No market is available for discovery benchmark.')

        const samples = []
        for (let index = 0; index < iterations; index += 1) {
            const startedAt = performance.now()
            await getAutoCareDiscovery({
                marketId: market.cityCode,
                radiusKm: 25,
                sort: index % 2 === 0 ? 'recommended' : 'distance_asc',
                limit: 20,
            })
            samples.push({ durationMs: performance.now() - startedAt })
        }

        const summary = summarizeDiscoveryBenchmark(samples)
        const passed = isDiscoveryBenchmarkWithinBudget(summary, p95BudgetMs)
        console.info(JSON.stringify({ strategy: 'portable-sql-bbox-exact-distance', market: market.cityCode, p95BudgetMs, passed, ...summary }))
        if (!passed) process.exitCode = 1
    } finally {
        await AppDataSource.destroy()
    }
}

void run().catch((error: unknown) => {
    console.error('AutoCare discovery benchmark failed.', error)
    process.exitCode = 1
})
