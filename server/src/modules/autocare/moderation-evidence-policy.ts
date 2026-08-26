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

export function isAutoCareModerationEvidenceKind(value: string): value is AutoCareModerationEvidenceKind {
    return AUTOCARE_MODERATION_EVIDENCE_KINDS.includes(value as AutoCareModerationEvidenceKind)
}

export function canDecideAutoCareModerationEvidence(status: string, next: AutoCareModerationDecision) {
    return status === 'pending' && (next === 'approved' || next === 'rejected')
}

/**
 * Trust evidence predates the moderation queue and used `verified`, while
 * queue decisions use the more explicit `approved` status. Both are durable
 * positive decisions; pending and rejected rows must never affect trust.
 */
export function isApprovedAutoCareEvidenceStatus(status: string) {
    return status === 'verified' || status === 'approved'
}
