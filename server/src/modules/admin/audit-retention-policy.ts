export const MAX_AUDIT_LOG_RETENTION_DAYS = 3_650

export function normalizeAuditLogRetentionDays(value: number) {
    if (!Number.isSafeInteger(value) || value < 1 || value > MAX_AUDIT_LOG_RETENTION_DAYS) {
        throw new Error('Audit log retention days are outside accepted bounds.')
    }

    return value
}
