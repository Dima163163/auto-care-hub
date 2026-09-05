export const AUTOCARE_MODERATION_EVIDENCE_KINDS = [
    'provider_cover',
    'provider_gallery',
    'provider_document',
    // Kept for evidence rows created before provider_document was introduced.
    'registration_document',
    'review',
] as const

export type AutoCareModerationEvidenceKind = (typeof AUTOCARE_MODERATION_EVIDENCE_KINDS)[number]
export type AutoCareModerationDecision = 'approved' | 'rejected'
export type AutoCareModerationEvidenceStatus = 'pending' | 'approved' | 'rejected'

const AUTOCARE_MODERATION_DECISIONS = new Set<AutoCareModerationDecision>(['approved', 'rejected'])
const AUTOCARE_MODERATION_STATUSES = new Set<AutoCareModerationEvidenceStatus>(['pending', 'approved', 'rejected'])
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type NormalizedAutoCareModerationEvidenceDecision = {
    status: AutoCareModerationDecision
    reason: string
}

export function isAutoCareModerationEvidenceKind(value: string): value is AutoCareModerationEvidenceKind {
    return AUTOCARE_MODERATION_EVIDENCE_KINDS.includes(value as AutoCareModerationEvidenceKind)
}

export function canDecideAutoCareModerationEvidence(status: string, next: AutoCareModerationDecision) {
    return status === 'pending' && (next === 'approved' || next === 'rejected')
}

export function normalizeAutoCareModerationEvidenceStatus(value: unknown): AutoCareModerationEvidenceStatus | null {
    if (typeof value !== 'string') return null
    const normalized = value.normalize('NFKC').trim().toLowerCase()
    return AUTOCARE_MODERATION_STATUSES.has(normalized as AutoCareModerationEvidenceStatus)
        ? normalized as AutoCareModerationEvidenceStatus
        : null
}

export function normalizeAutoCareModerationEvidenceUuid(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const normalized = value.trim().toLowerCase()
    return uuidPattern.test(normalized) ? normalized : null
}

/**
 * The admin route validates this payload with Zod, but moderation decisions
 * are also invoked from jobs and service-level callers. Normalize at the
 * persistence boundary so an untrusted direct call cannot save unknown
 * fields, non-string reasons, or a visually deceptive Unicode variant.
 */
export function normalizeAutoCareModerationEvidenceDecision(input: unknown): NormalizedAutoCareModerationEvidenceDecision | null {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null
    const value = input as Record<string, unknown>
    if (Object.keys(value).some((key) => key !== 'status' && key !== 'reason')) return null
    if (typeof value.status !== 'string' || !AUTOCARE_MODERATION_DECISIONS.has(value.status as AutoCareModerationDecision)) return null
    if (typeof value.reason !== 'string') return null
    const reason = value.reason.normalize('NFKC').trim()
    if (reason.length < 1 || reason.length > 2_000) return null
    return { status: value.status as AutoCareModerationDecision, reason }
}

/**
 * Trust evidence predates the moderation queue and used `verified`, while
 * queue decisions use the more explicit `approved` status. Both are durable
 * positive decisions; pending and rejected rows must never affect trust.
 */
export function isApprovedAutoCareEvidenceStatus(status: string) {
    return status === 'verified' || status === 'approved'
}
