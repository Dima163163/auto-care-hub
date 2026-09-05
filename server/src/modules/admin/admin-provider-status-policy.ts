import { AutomotiveProviderStatus } from '../../entities/automotive/automotive.entity.js'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const statuses = new Set<AutomotiveProviderStatus>(Object.values(AutomotiveProviderStatus))

export function normalizeAdminProviderUuid(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const normalized = value.normalize('NFKC').trim().toLowerCase()
    return uuidPattern.test(normalized) ? normalized : null
}

export function normalizeAdminProviderStatus(value: unknown): AutomotiveProviderStatus | null {
    if (typeof value !== 'string') return null
    const normalized = value.normalize('NFKC').trim().toLowerCase()
    return statuses.has(normalized as AutomotiveProviderStatus)
        ? normalized as AutomotiveProviderStatus
        : null
}
