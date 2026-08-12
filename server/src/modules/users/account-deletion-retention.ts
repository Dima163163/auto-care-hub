export const DEFAULT_ACCOUNT_DELETION_RETENTION_DAYS = 30
export const MAX_ACCOUNT_DELETION_RETENTION_DAYS = 365

export function normalizeAccountDeletionRetentionDays(value: number | undefined) {
    if (!Number.isFinite(value)) return DEFAULT_ACCOUNT_DELETION_RETENTION_DAYS

    return Math.min(
        MAX_ACCOUNT_DELETION_RETENTION_DAYS,
        Math.max(1, Math.trunc(value as number)),
    )
}

export function getAccountDeletionRetentionDeadline(
    requestedAt: Date,
    retentionDays = DEFAULT_ACCOUNT_DELETION_RETENTION_DAYS,
) {
    const deadline = new Date(requestedAt)
    deadline.setUTCDate(deadline.getUTCDate() + normalizeAccountDeletionRetentionDays(retentionDays))
    return deadline
}

export function getAccountDeletionRetentionCutoff(
    now = new Date(),
    retentionDays = DEFAULT_ACCOUNT_DELETION_RETENTION_DAYS,
) {
    return new Date(
        now.getTime() - normalizeAccountDeletionRetentionDays(retentionDays) * 24 * 60 * 60 * 1000,
    )
}

export function isAccountDeletionReady(
    requestedAt: Date,
    now = new Date(),
    retentionDays = DEFAULT_ACCOUNT_DELETION_RETENTION_DAYS,
) {
    return now.getTime() >= getAccountDeletionRetentionDeadline(requestedAt, retentionDays).getTime()
}
