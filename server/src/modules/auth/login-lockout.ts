export const LOGIN_LOCK_THRESHOLD = 5
export const LOGIN_LOCK_BASE_MS = 60 * 1000
export const LOGIN_LOCK_MAX_MS = 15 * 60 * 1000

export function getLoginLockDurationMs(failedAttempts: number) {
    if (!Number.isInteger(failedAttempts) || failedAttempts < LOGIN_LOCK_THRESHOLD) {
        return 0
    }

    return Math.min(
        LOGIN_LOCK_BASE_MS * 2 ** (failedAttempts - LOGIN_LOCK_THRESHOLD),
        LOGIN_LOCK_MAX_MS,
    )
}

export function isLoginLocked(lockedUntil: Date | null | undefined, now = new Date()) {
    return Boolean(lockedUntil && lockedUntil > now)
}
