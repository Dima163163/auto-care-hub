export type HealthStatus = 'ok' | 'degraded'

export function getHealthStatus(hasRequiredFailure: boolean, hasOptionalDependencyFailure = false): HealthStatus {
    return hasRequiredFailure || hasOptionalDependencyFailure ? 'degraded' : 'ok'
}

export function getReadinessHttpStatus(hasRequiredFailure: boolean): 200 | 503 {
    return hasRequiredFailure ? 503 : 200
}
