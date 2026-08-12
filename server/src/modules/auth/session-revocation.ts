export const SESSION_REVOCATION_REASONS = [
    'manual',
    'all_sessions',
    'refresh_reuse',
    'account_locked',
] as const

export type SessionRevocationReason = (typeof SESSION_REVOCATION_REASONS)[number]

export function normalizeSessionRevocationReason(reason: unknown): SessionRevocationReason {
    if (typeof reason === 'string' && SESSION_REVOCATION_REASONS.includes(reason as SessionRevocationReason)) {
        return reason as SessionRevocationReason
    }

    return 'manual'
}

export function getSessionRevocationMetadata(
    reason: unknown,
    revokedAt = new Date(),
) {
    return {
        revokedAt,
        revocationReason: normalizeSessionRevocationReason(reason),
    }
}
