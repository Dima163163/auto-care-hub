export const DEFAULT_SECURITY_EVENT_IP_RETENTION_DAYS = 30
export const MAX_SECURITY_EVENT_IP_RETENTION_DAYS = 365

export function normalizeSecurityEventIpRetentionDays(value: number, auditRetentionDays: number) {
    if (
        !Number.isSafeInteger(value) ||
        value < 1 ||
        value > MAX_SECURITY_EVENT_IP_RETENTION_DAYS ||
        value > auditRetentionDays
    ) {
        throw new Error(
            'Security event IP retention must be between one and 365 days and no longer than audit retention.',
        )
    }

    return value
}

export function getSecurityEventPrivacyCutoff(now: Date, retentionDays: number) {
    return new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1_000)
}

export function getPrivacyRedactedSecurityEventMetadata(now: Date) {
    return {
        privacyRedactedAt: now.toISOString(),
    }
}
