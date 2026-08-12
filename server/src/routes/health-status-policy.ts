export type HealthStatus = 'ok' | 'degraded'

export function getHealthStatus(hasFailure: boolean): HealthStatus {
    return hasFailure ? 'degraded' : 'ok'
}
