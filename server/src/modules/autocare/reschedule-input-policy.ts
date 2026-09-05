const MAX_REASON_LENGTH = 1_000
const datetimeWithOffsetPattern = /(?:Z|[+-]\d{2}:\d{2})$/

export type NormalizedAutoCareRescheduleInput = {
    proposedAt: Date
    reason: string | null
}

export type NormalizedAutoCareReason =
    | { valid: true; value: string | null }
    | { valid: false }

function normalizeReason(value: unknown): NormalizedAutoCareReason {
    if (value === undefined || value === null) return { valid: true, value: null }
    if (typeof value !== 'string') return { valid: false }
    const reason = value.normalize('NFKC').trim()
    return reason.length <= MAX_REASON_LENGTH ? { valid: true, value: reason || null } : { valid: false }
}

/**
 * Reschedule routes validate this payload with Zod, but transition services are
 * also callable from jobs and tests. Require an offset-aware datetime before
 * converting it to a Date and normalize the user-visible reason at the same
 * persistence boundary.
 */
export function normalizeAutoCareRescheduleInput(input: unknown): NormalizedAutoCareRescheduleInput | null {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null
    const value = input as Record<string, unknown>
    if (typeof value.proposedAt !== 'string') return null
    const proposedAtText = value.proposedAt.normalize('NFKC').trim()
    if (!datetimeWithOffsetPattern.test(proposedAtText)) return null
    const proposedAtMs = Date.parse(proposedAtText)
    if (!Number.isFinite(proposedAtMs)) return null
    const reason = normalizeReason(value.reason)
    if (!reason.valid) return null
    return { proposedAt: new Date(proposedAtMs), reason: reason.value }
}

export function normalizeAutoCareRescheduleReason(value: unknown): NormalizedAutoCareReason {
    return normalizeReason(value)
}

/** Request transition notes share the same bounded, normalized text contract. */
export function normalizeAutoCareRequestTransitionReason(value: unknown): NormalizedAutoCareReason {
    return normalizeReason(value)
}
