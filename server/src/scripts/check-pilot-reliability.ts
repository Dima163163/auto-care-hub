import { In } from 'typeorm'

import { AppDataSource } from '../database/data-source.js'
import {
    AutomotiveProviderEntity,
    AutomotiveServiceDefinitionEntity,
    AutomotiveServiceLocationEntity,
    AutomotiveServiceOfferingEntity,
    ServiceMessageEntity,
    ServiceRequestEntity,
} from '../entities/index.js'
import { buildQualityMetrics } from '../modules/autocare/quality-metrics.js'
import { evaluatePilotReliability, formatPilotReliabilityReport, type PilotReliabilityThresholds } from './pilot-reliability-policy.js'

function numberEnv(name: string, fallback: number): number {
    const value = Number(process.env[name] ?? fallback)
    if (!Number.isFinite(value) || value < 0) throw new Error(`${name} must be a non-negative number.`)
    return value
}

function getThresholds(): PilotReliabilityThresholds {
    return {
        minResponseSamples: numberEnv('PILOT_MIN_RESPONSE_SAMPLES', 5),
        maxP95ResponseMinutes: numberEnv('PILOT_MAX_P95_RESPONSE_MINUTES', 30),
        minConfirmationSamples: numberEnv('PILOT_MIN_CONFIRMATION_SAMPLES', 5),
        minConfirmationReliabilityPercent: numberEnv('PILOT_MIN_CONFIRMATION_RELIABILITY_PERCENT', 95),
    }
}

async function run() {
    const thresholds = getThresholds()
    await AppDataSource.initialize()
    try {
        const [providers, definitions, locations, offers, requests] = await Promise.all([
            AppDataSource.getRepository(AutomotiveProviderEntity).find({ select: { id: true, status: true } }),
            AppDataSource.getRepository(AutomotiveServiceDefinitionEntity).find({ select: { id: true, active: true } }),
            AppDataSource.getRepository(AutomotiveServiceLocationEntity).find({ select: { id: true, providerId: true, marketId: true } }),
            AppDataSource.getRepository(AutomotiveServiceOfferingEntity).find({ select: { locationId: true, definitionId: true, active: true, description: true, priceFromMinor: true, priceToMinor: true, currencyCode: true } }),
            AppDataSource.getRepository(ServiceRequestEntity).find({ select: { id: true, providerId: true, status: true, createdAt: true, clientConfirmedAt: true, providerConfirmedAt: true } }),
        ])
        const requestIds = requests.map((request) => request.id)
        const messages = requestIds.length === 0
            ? []
            : await AppDataSource.getRepository(ServiceMessageEntity).find({ where: { requestId: In(requestIds) }, select: { requestId: true, senderId: true, createdAt: true }, order: { createdAt: 'ASC' } })
        const providerIds = new Set(providers.map((provider) => provider.id))
        const quality = buildQualityMetrics({
            providers,
            definitions,
            locations,
            offers,
            requests,
            messages: messages.filter((message) => providerIds.has(message.senderId)),
        })
        const checks = evaluatePilotReliability(quality.reliability, thresholds)
        const report = { generatedAt: new Date().toISOString(), reliability: quality.reliability, checks }
        console.log(process.argv.includes('--json') ? JSON.stringify(report) : formatPilotReliabilityReport(report))
        if (checks.some((check) => check.status === 'blocked')) process.exitCode = 1
    } finally {
        await AppDataSource.destroy()
    }
}

run().catch((error: unknown) => {
    console.error('[pilot-reliability] failed', error instanceof Error ? error.message : error)
    process.exitCode = 1
})
