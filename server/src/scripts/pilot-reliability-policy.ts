import type { AutoCareReliabilityQualityMetrics } from '../modules/autocare/quality-metrics.js'

export type PilotReliabilityThresholds = {
    minResponseSamples: number
    maxP95ResponseMinutes: number
    minConfirmationSamples: number
    minConfirmationReliabilityPercent: number
}

export type PilotReliabilityCheck = {
    name: string
    status: 'pass' | 'blocked'
    actual: number | null
    expected: string
    detail: string
}

function atLeast(name: string, actual: number, expected: number, unit = ''): PilotReliabilityCheck {
    const status = actual >= expected ? 'pass' : 'blocked'
    return {
        name,
        status,
        actual,
        expected: `>= ${expected}${unit}`,
        detail: status === 'pass' ? `${actual}${unit} meets the pilot SLO.` : `${actual}${unit} is below the pilot SLO.`,
    }
}

function atMost(name: string, actual: number | null, expected: number, unit = ''): PilotReliabilityCheck {
    const status = actual !== null && actual <= expected ? 'pass' : 'blocked'
    return {
        name,
        status,
        actual,
        expected: `<= ${expected}${unit}`,
        detail: status === 'pass' ? `${actual}${unit} meets the pilot SLO.` : `No reliable value at or below ${expected}${unit} was observed.`,
    }
}

export function evaluatePilotReliability(
    reliability: AutoCareReliabilityQualityMetrics,
    thresholds: PilotReliabilityThresholds,
): PilotReliabilityCheck[] {
    return [
        atLeast('Provider response samples', reliability.responseSamples, thresholds.minResponseSamples),
        atMost('Provider response p95', reliability.p95ResponseMinutes, thresholds.maxP95ResponseMinutes, ' minutes'),
        atLeast('Booking confirmation samples', reliability.confirmationSamples, thresholds.minConfirmationSamples),
        atLeast('Booking confirmation reliability', reliability.confirmationReliabilityPercent, thresholds.minConfirmationReliabilityPercent, '%'),
    ]
}

export function formatPilotReliabilityReport(input: {
    generatedAt: string
    reliability: AutoCareReliabilityQualityMetrics
    checks: PilotReliabilityCheck[]
}): string {
    const lines = [
        'AutoCare pilot response/booking reliability preflight',
        `Generated: ${input.generatedAt}`,
        `Response: ${input.reliability.responseSamples} samples, p95 ${input.reliability.p95ResponseMinutes ?? 'n/a'} minutes`,
        `Booking: ${input.reliability.confirmationSamples} samples, ${input.reliability.confirmationReliabilityPercent}% confirmed`,
        ...input.checks.map((check) => `[${check.status.toUpperCase()}] ${check.name}: ${check.actual ?? 'n/a'} ${check.expected}`),
    ]
    const blocked = input.checks.filter((check) => check.status === 'blocked').length
    lines.push(`Result: ${blocked === 0 ? 'reliability preflight passed' : `blocked by ${blocked} reliability gate(s)`}.`)
    return lines.join('\n')
}
