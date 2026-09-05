import { In } from 'typeorm'

import { AppDataSource } from '../database/data-source.js'
import {
    AutomotiveProviderEntity,
    AutomotiveProviderMembershipEntity,
    AutomotiveProviderMembershipStatus,
    AutomotiveServiceDefinitionEntity,
    AutomotiveServiceLocationEntity,
    AutomotiveServiceOfferingEntity,
    ServiceMessageEntity,
    ServiceRequestEntity,
} from '../entities/index.js'
import { buildQualityMetrics } from '../modules/autocare/quality-metrics.js'
import { evaluatePilotQuality, formatPilotQualityReport, type PilotQualityThresholds } from './pilot-quality-policy.js'

function numberEnv(name: string, fallback: number): number {
    const value = Number(process.env[name] ?? fallback)
    if (!Number.isFinite(value) || value < 0) throw new Error(`${name} must be a non-negative number.`)
    return value
}

function getThresholds(): PilotQualityThresholds {
    const marketId = String(process.env.PILOT_MARKET_ID ?? '').trim()
    return {
        marketId: marketId || undefined,
        minActiveProviders: numberEnv('PILOT_MIN_ACTIVE_PROVIDERS', 2),
        minActiveOffers: numberEnv('PILOT_MIN_ACTIVE_OFFERS', 8),
        minOfferCoveragePercent: numberEnv('PILOT_MIN_OFFER_COVERAGE_PERCENT', 80),
        minPriceCoveragePercent: numberEnv('PILOT_MIN_PRICE_COVERAGE_PERCENT', 95),
        minMarketProviders: numberEnv('PILOT_MIN_MARKET_PROVIDERS', 2),
        minMarketOffers: numberEnv('PILOT_MIN_MARKET_OFFERS', 8),
    }
}

async function run() {
    const thresholds = getThresholds()
    await AppDataSource.initialize()
    try {
        const [providers, memberships, definitions, locations, offers, requests] = await Promise.all([
            AppDataSource.getRepository(AutomotiveProviderEntity).find({ select: { id: true, ownerId: true, status: true } }),
            AppDataSource.getRepository(AutomotiveProviderMembershipEntity).find({ where: { status: AutomotiveProviderMembershipStatus.Active }, select: { providerId: true, userId: true, locationId: true, status: true } }),
            AppDataSource.getRepository(AutomotiveServiceDefinitionEntity).find({ select: { id: true, active: true } }),
            AppDataSource.getRepository(AutomotiveServiceLocationEntity).find({ select: { id: true, providerId: true, marketId: true } }),
            AppDataSource.getRepository(AutomotiveServiceOfferingEntity).find({ select: { locationId: true, definitionId: true, active: true, description: true, priceFromMinor: true, priceToMinor: true, currencyCode: true } }),
            AppDataSource.getRepository(ServiceRequestEntity).find({ select: { id: true, clientId: true, providerId: true, locationId: true, status: true, createdAt: true, clientConfirmedAt: true, providerConfirmedAt: true } }),
        ])
        const requestIds = requests.map((request) => request.id)
        const messages = requestIds.length === 0
            ? []
            : await AppDataSource.getRepository(ServiceMessageEntity).find({ where: { requestId: In(requestIds) }, select: { requestId: true, senderId: true, kind: true, createdAt: true }, order: { createdAt: 'ASC' } })
        const quality = buildQualityMetrics({
            providers,
            providerMemberships: memberships,
            definitions,
            locations,
            offers,
            requests,
            messages,
        })
        const report = {
            generatedAt: new Date().toISOString(),
            marketId: thresholds.marketId,
            ...quality,
            checks: evaluatePilotQuality(quality, thresholds),
        }
        console.log(process.argv.includes('--json') ? JSON.stringify(report) : formatPilotQualityReport(report))
        if (report.checks.some((check) => check.status === 'blocked')) process.exitCode = 1
    } finally {
        await AppDataSource.destroy()
    }
}

run().catch((error: unknown) => {
    console.error('[pilot-quality] failed', error instanceof Error ? error.message : error)
    process.exitCode = 1
})
