import { AutomotiveCatalogGapRequestStatus } from '../../entities/automotive/catalog-gap-request.entity.js'
import { AutomotivePriceType } from '../../entities/automotive/automotive.entity.js'

const statuses = new Set<AutomotiveCatalogGapRequestStatus>(Object.values(AutomotiveCatalogGapRequestStatus))
const decisionStatuses = new Set<AutomotiveCatalogGapRequestStatus>([
    AutomotiveCatalogGapRequestStatus.Approved,
    AutomotiveCatalogGapRequestStatus.Rejected,
])
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const priceTypes = new Set<AutomotivePriceType>(Object.values(AutomotivePriceType))

export function normalizeCatalogGapRequestUuid(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const normalized = value.trim().toLowerCase()
    return uuidPattern.test(normalized) ? normalized : null
}

type NormalizedServiceDefinitionUpdate = {
    categorySlug: string
    labels: Record<string, string>
    priceType: AutomotivePriceType
    comparisonAttributes: string[]
    active: boolean
}

export type NormalizedCatalogGapRequestInput = {
    providerId: string | null
    proposedSlug: string
    categorySlug: string
    labels: Record<string, string>
    priceType: AutomotivePriceType
    comparisonAttributes: string[]
    rationale: string
}

export function normalizeCatalogGapRequestInput(input: unknown): NormalizedCatalogGapRequestInput | null {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null
    const value = input as Record<string, unknown>
    const allowedKeys = new Set(['providerId', 'proposedSlug', 'categorySlug', 'labels', 'priceType', 'comparisonAttributes', 'rationale'])
    if (Object.keys(value).some((key) => !allowedKeys.has(key))) return null
    const providerId = value.providerId === undefined || value.providerId === null ? null : normalizeCatalogGapRequestUuid(value.providerId)
    if (value.providerId !== undefined && value.providerId !== null && !providerId) return null
    if (typeof value.proposedSlug !== 'string' || typeof value.categorySlug !== 'string' || typeof value.priceType !== 'string' || typeof value.rationale !== 'string') return null
    const proposedSlug = value.proposedSlug.normalize('NFKC').trim().toLowerCase()
    const categorySlug = value.categorySlug.normalize('NFKC').trim()
    const priceType = value.priceType.normalize('NFKC').trim().toLowerCase()
    const rationale = value.rationale.normalize('NFKC').trim()
    if (!/^[a-z0-9][a-z0-9_-]{1,119}$/.test(proposedSlug) || categorySlug.length < 2 || categorySlug.length > 80 || !priceTypes.has(priceType as AutomotivePriceType) || rationale.length < 10 || rationale.length > 2_000) return null
    if (!value.labels || typeof value.labels !== 'object' || Array.isArray(value.labels)) return null
    const labels: Record<string, string> = {}
    for (const [rawKey, rawLabel] of Object.entries(value.labels as Record<string, unknown>)) {
        const key = rawKey.normalize('NFKC').trim().toLowerCase()
        if (key.length < 2 || key.length > 16 || typeof rawLabel !== 'string') return null
        const label = rawLabel.normalize('NFKC').trim()
        if (label.length < 1 || label.length > 160 || Object.prototype.hasOwnProperty.call(labels, key)) return null
        labels[key] = label
    }
    if (Object.keys(labels).length === 0) return null
    if (!Array.isArray(value.comparisonAttributes) || value.comparisonAttributes.length > 30) return null
    const comparisonAttributes: string[] = []
    for (const rawAttribute of value.comparisonAttributes) {
        if (typeof rawAttribute !== 'string') return null
        const attribute = rawAttribute.normalize('NFKC').trim()
        if (attribute.length < 1 || attribute.length > 80) return null
        if (!comparisonAttributes.includes(attribute)) comparisonAttributes.push(attribute)
    }
    return { providerId, proposedSlug, categorySlug, labels, priceType: priceType as AutomotivePriceType, comparisonAttributes, rationale }
}

export function normalizeAdminServiceDefinitionUpdate(input: unknown): NormalizedServiceDefinitionUpdate | null {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null
    const value = input as Record<string, unknown>
    const allowedKeys = new Set(['categorySlug', 'labels', 'priceType', 'comparisonAttributes', 'active'])
    if (Object.keys(value).some((key) => !allowedKeys.has(key))) return null
    if (typeof value.categorySlug !== 'string' || typeof value.priceType !== 'string' || typeof value.active !== 'boolean') return null
    const categorySlug = value.categorySlug.normalize('NFKC').trim()
    const priceType = value.priceType.normalize('NFKC').trim().toLowerCase()
    if (categorySlug.length < 2 || categorySlug.length > 80 || !priceTypes.has(priceType as AutomotivePriceType)) return null
    if (!value.labels || typeof value.labels !== 'object' || Array.isArray(value.labels)) return null
    const labels: Record<string, string> = {}
    for (const [rawKey, rawLabel] of Object.entries(value.labels as Record<string, unknown>)) {
        const key = rawKey.normalize('NFKC').trim().toLowerCase()
        if (key.length < 2 || key.length > 16 || typeof rawLabel !== 'string') return null
        const label = rawLabel.normalize('NFKC').trim()
        if (label.length < 1 || label.length > 160 || key in labels) return null
        labels[key] = label
    }
    if (Object.keys(labels).length === 0) return null
    if (!Array.isArray(value.comparisonAttributes) || value.comparisonAttributes.length > 30) return null
    const comparisonAttributes: string[] = []
    for (const rawAttribute of value.comparisonAttributes) {
        if (typeof rawAttribute !== 'string') return null
        const attribute = rawAttribute.normalize('NFKC').trim()
        if (attribute.length < 1 || attribute.length > 80 || comparisonAttributes.includes(attribute)) {
            if (attribute.length < 1 || attribute.length > 80) return null
            continue
        }
        comparisonAttributes.push(attribute)
    }
    return { categorySlug, labels, priceType: priceType as AutomotivePriceType, comparisonAttributes, active: value.active }
}

export function normalizeCatalogGapRequestStatus(value: unknown): AutomotiveCatalogGapRequestStatus | null {
    if (typeof value !== 'string') return null
    const normalized = value.normalize('NFKC').trim().toLowerCase()
    return statuses.has(normalized as AutomotiveCatalogGapRequestStatus)
        ? normalized as AutomotiveCatalogGapRequestStatus
        : null
}

export function normalizeCatalogGapRequestDecision(
    status: unknown,
    reason: unknown,
): { status: AutomotiveCatalogGapRequestStatus.Approved | AutomotiveCatalogGapRequestStatus.Rejected; reason: string | null } | null {
    const normalizedStatus = typeof status === 'string' ? status.normalize('NFKC').trim().toLowerCase() : null
    if (!normalizedStatus || !decisionStatuses.has(normalizedStatus as AutomotiveCatalogGapRequestStatus)) return null
    if (reason !== undefined && reason !== null && typeof reason !== 'string') return null
    const normalizedReason = typeof reason === 'string' ? reason.normalize('NFKC').trim() : null
    if (normalizedReason && normalizedReason.length > 2_000) return null
    if (normalizedStatus === AutomotiveCatalogGapRequestStatus.Rejected && !normalizedReason) return null
    return {
        status: normalizedStatus as AutomotiveCatalogGapRequestStatus.Approved | AutomotiveCatalogGapRequestStatus.Rejected,
        reason: normalizedReason || null,
    }
}
