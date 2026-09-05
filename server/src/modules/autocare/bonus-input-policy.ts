import type {
    GrantAutoCareBonusInput,
    RedeemAutoCareBonusInput,
} from './autocare.types.js'
import { normalizeProviderMembershipUuid } from './provider-membership-policy.js'

const MAX_PROGRAM_NAME_LENGTH = 120
const MAX_PROGRAM_EARN_PERCENT = 100
const MAX_PROGRAM_POINTS_PER_VISIT = 1_000_000
const MAX_PROGRAM_EXPIRY_DAYS = 3_650
const MAX_REDEMPTION_POINTS = 1_000_000
const MAX_GRANT_POINTS = 100_000

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]) {
    const allowedKeys = new Set(allowed)
    return Object.keys(value).every((key) => allowedKeys.has(key))
}

function normalizeBoundedText(value: unknown, min: number, max: number) {
    if (typeof value !== 'string') return null
    const normalized = value.normalize('NFKC').trim()
    return normalized.length >= min && normalized.length <= max ? normalized : null
}

function normalizePositiveInteger(value: unknown, max: number) {
    return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= max ? value : null
}

export function normalizeAutoCareBonusProviderUuid(value: unknown) {
    return normalizeProviderMembershipUuid(value)
}

export type NormalizedOwnerAutoCareBonusProgramInput = {
    name: string
    earnPercent: number
    maxEarnPointsPerVisit: number | null
    expiresAfterDays: number | null
    active: boolean
}

export function normalizeOwnerAutoCareBonusProgramInput(input: unknown): NormalizedOwnerAutoCareBonusProgramInput | null {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null
    const value = input as Record<string, unknown>
    if (!hasOnlyKeys(value, ['name', 'earnPercent', 'maxEarnPointsPerVisit', 'expiresAfterDays', 'active'])) return null
    const name = normalizeBoundedText(value.name, 2, MAX_PROGRAM_NAME_LENGTH)
    if (!name || typeof value.earnPercent !== 'number' || !Number.isFinite(value.earnPercent) || value.earnPercent < 0 || value.earnPercent > MAX_PROGRAM_EARN_PERCENT) return null
    const maxEarnPointsPerVisit = value.maxEarnPointsPerVisit === undefined || value.maxEarnPointsPerVisit === null
        ? null
        : normalizePositiveInteger(value.maxEarnPointsPerVisit, MAX_PROGRAM_POINTS_PER_VISIT)
    if (value.maxEarnPointsPerVisit !== undefined && value.maxEarnPointsPerVisit !== null && maxEarnPointsPerVisit === null) return null
    const expiresAfterDays = value.expiresAfterDays === undefined || value.expiresAfterDays === null
        ? null
        : normalizePositiveInteger(value.expiresAfterDays, MAX_PROGRAM_EXPIRY_DAYS)
    if (value.expiresAfterDays !== undefined && value.expiresAfterDays !== null && expiresAfterDays === null) return null
    if (value.active !== undefined && typeof value.active !== 'boolean') return null
    return {
        name,
        earnPercent: value.earnPercent,
        maxEarnPointsPerVisit,
        expiresAfterDays,
        active: value.active ?? true,
    }
}

export function normalizeRedeemAutoCareBonusInput(input: unknown): RedeemAutoCareBonusInput | null {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null
    const value = input as Record<string, unknown>
    if (!hasOnlyKeys(value, ['providerId', 'requestId', 'points'])) return null
    const providerId = normalizeAutoCareBonusProviderUuid(value.providerId)
    const requestId = normalizeAutoCareBonusProviderUuid(value.requestId)
    const points = normalizePositiveInteger(value.points, MAX_REDEMPTION_POINTS)
    if (!providerId || !requestId || points === null) return null
    return { providerId, requestId, points }
}

export function normalizeGrantAutoCareBonusInput(input: unknown): GrantAutoCareBonusInput | null {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null
    const value = input as Record<string, unknown>
    if (!hasOnlyKeys(value, ['providerId', 'clientId', 'points', 'reason'])) return null
    const providerId = normalizeAutoCareBonusProviderUuid(value.providerId)
    const clientId = normalizeAutoCareBonusProviderUuid(value.clientId)
    const points = normalizePositiveInteger(value.points, MAX_GRANT_POINTS)
    const reason = normalizeBoundedText(value.reason, 10, 500)
    if (!providerId || !clientId || points === null || !reason) return null
    return { providerId, clientId, points, reason }
}
