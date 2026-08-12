export const DEFAULT_REVOKED_SESSION_RETENTION_DAYS = 7

export function getRevokedSessionRetentionCutoff(
    now = new Date(),
    retentionDays = DEFAULT_REVOKED_SESSION_RETENTION_DAYS,
) {
    if (!Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 90) {
        throw new Error('Revoked session retention is outside accepted bounds.')
    }

    return new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000)
}

export function isRevokedSessionReadyForCleanup(revokedAt: Date, cutoff: Date) {
    return revokedAt.getTime() < cutoff.getTime()
}
