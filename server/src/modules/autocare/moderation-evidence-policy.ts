export const AUTOCARE_MODERATION_EVIDENCE_KINDS = [
    'provider_cover',
    'provider_gallery',
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
