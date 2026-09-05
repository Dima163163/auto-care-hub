import type { AutoCareTrustPolicy } from '../autocare/trust-score.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const policyKeys = new Set([
    'policyVersion',
    'trustedMinimumRating',
    'trustedMinimumReviews',
    'trustedMinimumCompletedVisits',
    'trustedMaxNoShowRate',
    'trustedMaxComplaintRate',
    'trustedMaxResponseTimeMinutes',
    'reassessmentIntervalHours',
    'rollout',
])
const rolloutKeys = new Set(['enabled', 'marketIds', 'percentage'])

export type NormalizedSuperAdminTrustPolicyInput = AutoCareTrustPolicy & {
    rollout: { enabled: boolean; marketIds: string[]; percentage: number }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false
    const prototype = Object.getPrototypeOf(value)
    return prototype === Object.prototype || prototype === null
}

function isBoundedNumber(value: unknown, min: number, max: number): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}

function isBoundedInteger(value: unknown, min: number, max: number): value is number {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max
}

export function normalizeSuperAdminTrustPolicyUuid(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const normalized = value.normalize('NFKC').trim().toLowerCase()
    return UUID_PATTERN.test(normalized) ? normalized : null
}

export function normalizeSuperAdminTrustPolicyInput(input: unknown): NormalizedSuperAdminTrustPolicyInput | null {
    if (!isRecord(input) || Object.keys(input).some((key) => !policyKeys.has(key))) return null
    const policyVersion = typeof input.policyVersion === 'string'
        ? input.policyVersion.normalize('NFKC').trim()
        : null
    if (!policyVersion || !/^autocare-trust-v[0-9]+$/.test(policyVersion)) return null
    if (!isBoundedNumber(input.trustedMinimumRating, 0, 5)) return null
    if (!isBoundedInteger(input.trustedMinimumReviews, 0, 10_000)) return null
    if (!isBoundedInteger(input.trustedMinimumCompletedVisits, 0, 100_000)) return null
    if (!isBoundedNumber(input.trustedMaxNoShowRate, 0, 1)) return null
    if (!isBoundedNumber(input.trustedMaxComplaintRate, 0, 1)) return null
    if (!isBoundedInteger(input.trustedMaxResponseTimeMinutes, 1, 10_080)) return null
    if (!isBoundedInteger(input.reassessmentIntervalHours, 1, 720)) return null
    if (!isRecord(input.rollout) || Object.keys(input.rollout).some((key) => !rolloutKeys.has(key))) return null

    const rollout = input.rollout
    if (typeof rollout.enabled !== 'boolean' || !isBoundedInteger(rollout.percentage, 0, 100)) return null
    if (!Array.isArray(rollout.marketIds) || rollout.marketIds.length > 500) return null
    const marketIds: string[] = []
    for (const marketId of rollout.marketIds) {
        const normalizedId = normalizeSuperAdminTrustPolicyUuid(marketId)
        if (!normalizedId || marketIds.includes(normalizedId)) continue
        marketIds.push(normalizedId)
    }
    if (marketIds.length !== rollout.marketIds.length) return null

    return {
        policyVersion,
        trustedMinimumRating: input.trustedMinimumRating,
        trustedMinimumReviews: input.trustedMinimumReviews,
        trustedMinimumCompletedVisits: input.trustedMinimumCompletedVisits,
        trustedMaxNoShowRate: input.trustedMaxNoShowRate,
        trustedMaxComplaintRate: input.trustedMaxComplaintRate,
        trustedMaxResponseTimeMinutes: input.trustedMaxResponseTimeMinutes,
        reassessmentIntervalHours: input.reassessmentIntervalHours,
        rollout: {
            enabled: rollout.enabled,
            marketIds,
            percentage: rollout.percentage,
        },
    }
}
