export const MIN_SECURITY_MITIGATION_TTL_MS = 60_000
export const MAX_SECURITY_MITIGATION_TTL_MS = 24 * 60 * 60 * 1_000

export type SecurityMitigationState = 'active' | 'expired' | 'revoked'

export function assertSecurityMitigationTtl(ttlMs: number) {
    if (
        !Number.isSafeInteger(ttlMs)
        || ttlMs < MIN_SECURITY_MITIGATION_TTL_MS
        || ttlMs > MAX_SECURITY_MITIGATION_TTL_MS
    ) {
        throw new Error(
            `Security mitigation TTL must be between ${MIN_SECURITY_MITIGATION_TTL_MS} and ${MAX_SECURITY_MITIGATION_TTL_MS} milliseconds.`,
        )
    }

    return ttlMs
}

export function getSecurityMitigationState(
    expiresAt: Date | string,
    revokedAt: Date | string | null,
    now = Date.now(),
): SecurityMitigationState {
    if (revokedAt !== null) return 'revoked'

    const expiry = expiresAt instanceof Date ? expiresAt.getTime() : new Date(expiresAt).getTime()
    return expiry > now ? 'active' : 'expired'
}

export function getExtendedSecurityMitigationExpiry(
    expiresAt: Date | string,
    extensionMs: number,
    now = Date.now(),
) {
    const boundedExtensionMs = assertSecurityMitigationTtl(extensionMs)
    const currentExpiry = expiresAt instanceof Date
        ? expiresAt.getTime()
        : new Date(expiresAt).getTime()
    const maximumExpiry = now + MAX_SECURITY_MITIGATION_TTL_MS
    const nextExpiry = currentExpiry + boundedExtensionMs

    if (
        !Number.isFinite(currentExpiry)
        || currentExpiry <= now
        || !Number.isSafeInteger(nextExpiry)
        || nextExpiry > maximumExpiry
    ) {
        return null
    }

    return new Date(nextExpiry)
}
