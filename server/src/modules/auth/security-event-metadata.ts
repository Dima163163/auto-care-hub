export const MAX_SECURITY_EVENT_IP_LENGTH = 64
export const MAX_SECURITY_EVENT_TIMESTAMP_LENGTH = 64

type SecurityEventMetadataInput = {
    failedLoginAttempts?: number
    lockedUntil?: string | null
    ipAddress?: string | null
}

export function normalizeSecurityEventMetadata(input: SecurityEventMetadataInput) {
    return {
        failedLoginAttempts: Number.isSafeInteger(input.failedLoginAttempts)
            ? input.failedLoginAttempts
            : undefined,
        lockedUntil: input.lockedUntil == null
            ? null
            : input.lockedUntil.slice(0, MAX_SECURITY_EVENT_TIMESTAMP_LENGTH),
        ipAddress: input.ipAddress == null
            ? null
            : input.ipAddress.trim().slice(0, MAX_SECURITY_EVENT_IP_LENGTH),
    }
}
