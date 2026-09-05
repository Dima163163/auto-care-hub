import type { AutoCareRequestSnapshot } from './autocare.types.js'
import { normalizeAutoCareVehicleSnapshot } from './request-input-policy.js'

export type NormalizedAutoCareExpertQuestionInput = {
    symptoms: string
    categorySlug: string | null
    vehicleSnapshot: AutoCareRequestSnapshot | null
}

const allowedKeys = new Set(['symptoms', 'categorySlug', 'vehicleSnapshot'])

function normalizeText(value: unknown, minLength: number, maxLength: number) {
    if (typeof value !== 'string') return null
    const normalized = value.normalize('NFKC').trim()
    return normalized.length >= minLength && normalized.length <= maxLength ? normalized : null
}

/**
 * Expert questions can be created by jobs and internal callers as well as the
 * HTTP route. Keep the persisted text and JSONB snapshot canonical at this
 * boundary instead of trusting only route-level Zod validation.
 */
export function normalizeAutoCareExpertQuestionInput(input: unknown): NormalizedAutoCareExpertQuestionInput | null {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null
    const value = input as Record<string, unknown>
    if (Object.keys(value).some((key) => !allowedKeys.has(key))) return null

    const symptoms = normalizeText(value.symptoms, 10, 4_000)
    if (!symptoms) return null

    let categorySlug: string | null = null
    if (value.categorySlug !== undefined && value.categorySlug !== null) {
        categorySlug = normalizeText(value.categorySlug, 1, 120)
        if (!categorySlug) return null
    }

    const vehicleSnapshot = normalizeAutoCareVehicleSnapshot(value.vehicleSnapshot)
    if (value.vehicleSnapshot !== undefined && value.vehicleSnapshot !== null && !vehicleSnapshot) return null

    return { symptoms, categorySlug, vehicleSnapshot }
}
