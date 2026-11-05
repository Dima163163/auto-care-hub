export function serializeEstimateSnapshot(value: unknown): string {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('Encrypted autocare_service_requests.estimateSnapshot is invalid.')
    }
    const serialized = JSON.stringify(value)
    if (typeof serialized !== 'string') throw new Error('Encrypted autocare_service_requests.estimateSnapshot is invalid.')
    return serialized
}
