import type { AutoCareCatalogQualityMetrics, AutoCareSupplyQualityMetrics } from '../modules/autocare/quality-metrics.js'

export type PilotQualityThresholds = {
    marketId?: string
    minActiveProviders: number
    minActiveOffers: number
    minOfferCoveragePercent: number
    minPriceCoveragePercent: number
    minMarketProviders: number
    minMarketOffers: number
}

export type PilotQualityCheck = {
    name: string
    status: 'pass' | 'blocked'
    actual: number
    expected: string
    detail: string
}

export type PilotQualityReport = {
    generatedAt: string
    marketId?: string
    catalog: AutoCareCatalogQualityMetrics
    supply: AutoCareSupplyQualityMetrics
    checks: PilotQualityCheck[]
}

function checkAtLeast(name: string, actual: number, expected: number, unit: string): PilotQualityCheck {
    const status = actual >= expected ? 'pass' : 'blocked'
    return {
        name,
        status,
        actual,
        expected: `>= ${expected}${unit}`,
        detail: status === 'pass' ? `${actual}${unit} meets the pilot threshold.` : `${actual}${unit} is below the pilot threshold.`,
    }
}

export function evaluatePilotQuality(
    input: { catalog: AutoCareCatalogQualityMetrics; supply: AutoCareSupplyQualityMetrics },
    thresholds: PilotQualityThresholds,
): PilotQualityCheck[] {
    const checks: PilotQualityCheck[] = [
        checkAtLeast('Active providers', input.catalog.providersWithOffers, thresholds.minActiveProviders, ''),
        checkAtLeast('Active offers', input.catalog.activeOffers, thresholds.minActiveOffers, ''),
        checkAtLeast('Provider offer coverage', input.catalog.offerCoveragePercent, thresholds.minOfferCoveragePercent, '%'),
        checkAtLeast('Offer price coverage', input.catalog.priceCoveragePercent, thresholds.minPriceCoveragePercent, '%'),
    ]

    if (thresholds.marketId) {
        const market = input.supply.markets.find((item) => item.marketId === thresholds.marketId)
        checks.push(
            checkAtLeast(`${thresholds.marketId} providers`, market?.providers ?? 0, thresholds.minMarketProviders, ''),
            checkAtLeast(`${thresholds.marketId} active offers`, market?.activeOffers ?? 0, thresholds.minMarketOffers, ''),
        )
    }

    return checks
}

export function formatPilotQualityReport(report: PilotQualityReport): string {
    const lines = [
        'AutoCare pilot catalog/price/supply preflight',
        `Generated: ${report.generatedAt}`,
        report.marketId ? `Market: ${report.marketId}` : 'Market: all markets',
        `Catalog: ${report.catalog.activeDefinitions} definitions, ${report.catalog.activeOffers} active offers, ${report.catalog.priceCoveragePercent}% priced`,
        `Supply: ${report.supply.activeMarkets} markets, ${report.supply.averageLocationsPerProvider} locations/provider`,
        ...report.checks.map((check) => `[${check.status.toUpperCase()}] ${check.name}: ${check.actual} ${check.expected}`),
    ]
    const blocked = report.checks.filter((check) => check.status === 'blocked').length
    lines.push(`Result: ${blocked === 0 ? 'pilot preflight passed' : `blocked by ${blocked} quality gate(s)`}.`)
    return lines.join('\n')
}
