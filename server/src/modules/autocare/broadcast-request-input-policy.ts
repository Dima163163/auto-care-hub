import type { AutoCareRequestSnapshot } from './autocare.types.js'
import { normalizeAutoCareMediaReferences } from './private-reference-policy.js'
import { normalizeAutoCarePublicServiceId } from './public-provider-input-policy.js'
import { normalizeAutoCareVehicleSnapshot } from './request-input-policy.js'

export type NormalizedAutoCareBroadcastRequestInput = {
    serviceDefinitionId: string
    marketId: string | null
    issueDescription: string
    vehicleSnapshot: AutoCareRequestSnapshot | null
    photoUrls: string[]
    preferredAt: string | null
    maxProviders: number
}

const allowedKeys = new Set(['serviceDefinitionId', 'marketId', 'issueDescription', 'vehicleSnapshot', 'photoUrls', 'preferredAt', 'maxProviders'])

function normalizeText(value: unknown, minLength: number, maxLength: number) {
    if (typeof value !== 'string') return null
    const normalized = value.normalize('NFKC').trim()
    return normalized.length >= minLength && normalized.length <= maxLength ? normalized : null
}

function normalizePreferredAt(value: unknown): string | null | undefined {
    if (value === undefined) return null
    if (value === null) return null
    if (typeof value !== 'string') return undefined
    const normalized = value.normalize('NFKC').trim()
    if (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(normalized)) return undefined
    const timestamp = Date.parse(normalized)
    return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : undefined
}

export function normalizeAutoCareBroadcastRequestInput(input: unknown): NormalizedAutoCareBroadcastRequestInput | null {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null
    const value = input as Record<string, unknown>
    if (Object.keys(value).some((key) => !allowedKeys.has(key))) return null

    const serviceDefinitionId = normalizeAutoCarePublicServiceId(value.serviceDefinitionId)
    const marketId = value.marketId === undefined || value.marketId === null ? null : normalizeAutoCarePublicServiceId(value.marketId)
    const issueDescription = normalizeText(value.issueDescription, 10, 4_000)
    const vehicleSnapshot = normalizeAutoCareVehicleSnapshot(value.vehicleSnapshot)
    const photoInput = value.photoUrls === undefined || value.photoUrls === null ? [] : value.photoUrls
    const photoUrls = normalizeAutoCareMediaReferences(Array.isArray(photoInput) ? photoInput : null, ['requests', 'broadcasts'], 12)
    const preferredAt = normalizePreferredAt(value.preferredAt)
    const maxProviders: unknown = value.maxProviders === undefined ? 5 : value.maxProviders

    if (!serviceDefinitionId || (value.marketId !== undefined && value.marketId !== null && !marketId) || !issueDescription) return null
    if (value.vehicleSnapshot !== undefined && value.vehicleSnapshot !== null && !vehicleSnapshot) return null
    if (!photoUrls || preferredAt === undefined || typeof maxProviders !== 'number' || !Number.isSafeInteger(maxProviders) || maxProviders < 1 || maxProviders > 10) return null

    return { serviceDefinitionId, marketId, issueDescription, vehicleSnapshot, photoUrls, preferredAt, maxProviders }
}
