import { normalizeAutoCareMediaReferences } from './private-reference-policy.js'
import { normalizeAutoCareRequestUuid } from './request-input-policy.js'

export type NormalizedAutoCareGuaranteeClaimInput = {
    requestId: string
    claimType: 'price' | 'quality' | 'warranty' | 'no_show' | 'safety'
    summary: string
    evidenceUrls: string[]
}

const allowedKeys = new Set(['requestId', 'claimType', 'summary', 'evidenceUrls'])
const claimTypes = new Set<NormalizedAutoCareGuaranteeClaimInput['claimType']>(['price', 'quality', 'warranty', 'no_show', 'safety'])

function normalizeText(value: unknown, minLength: number, maxLength: number) {
    if (typeof value !== 'string') return null
    const normalized = value.normalize('NFKC').trim()
    return normalized.length >= minLength && normalized.length <= maxLength ? normalized : null
}

export function normalizeAutoCareGuaranteeClaimInput(input: unknown): NormalizedAutoCareGuaranteeClaimInput | null {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null
    const value = input as Record<string, unknown>
    if (Object.keys(value).some((key) => !allowedKeys.has(key))) return null

    const requestId = normalizeAutoCareRequestUuid(value.requestId)
    const claimType = normalizeText(value.claimType, 1, 32)?.toLowerCase() as NormalizedAutoCareGuaranteeClaimInput['claimType'] | null
    const summary = normalizeText(value.summary, 10, 4_000)
    const evidenceInput = value.evidenceUrls === undefined || value.evidenceUrls === null ? [] : value.evidenceUrls
    const evidenceUrls = normalizeAutoCareMediaReferences(Array.isArray(evidenceInput) ? evidenceInput : null, ['claims'], 20)
    if (!requestId || !claimType || !claimTypes.has(claimType) || !summary || !evidenceUrls) return null
    return { requestId, claimType, summary, evidenceUrls }
}
