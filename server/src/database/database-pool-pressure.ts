import type { DatabasePoolStats } from './database.js'

export type DatabasePoolPressureThresholds = {
    maxActiveRatio: number
    maxWaitingRequests: number
}

export type DatabasePoolPressureResult = {
    ok: boolean
    activeRatio: number
    reasons: Array<'active_ratio_exceeded' | 'waiting_requests_exceeded'>
}

export function evaluateDatabasePoolPressure(
    stats: DatabasePoolStats,
    thresholds: DatabasePoolPressureThresholds,
): DatabasePoolPressureResult {
    const activeRatio = stats.total > 0 ? stats.active / stats.total : 0
    const reasons: DatabasePoolPressureResult['reasons'] = []

    if (activeRatio > thresholds.maxActiveRatio) {
        reasons.push('active_ratio_exceeded')
    }
    if (stats.waiting > thresholds.maxWaitingRequests) {
        reasons.push('waiting_requests_exceeded')
    }

    return {
        ok: reasons.length === 0,
        activeRatio,
        reasons,
    }
}
