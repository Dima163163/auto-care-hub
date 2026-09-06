import { useSyncExternalStore } from 'react'

const SESSION_EXPIRED_KEY = 'autocare-session-expired'

let logoutInProgress = false
const logoutListeners = new Set<() => void>()

function notifyLogoutListeners() {
    logoutListeners.forEach((listener) => listener())
}

/**
 * Marks the short transition in which a protected tree is being replaced by
 * the public shell. RequireAuth uses this to avoid racing a logout cleanup
 * with its normal unauthenticated redirect.
 */
export function beginLogout() {
    if (logoutInProgress) return

    logoutInProgress = true
    notifyLogoutListeners()
}

export function endLogout() {
    if (!logoutInProgress) return

    logoutInProgress = false
    notifyLogoutListeners()
}

export function useLogoutInProgress() {
    return useSyncExternalStore(
        (listener) => {
            logoutListeners.add(listener)
            return () => logoutListeners.delete(listener)
        },
        () => logoutInProgress,
        () => false,
    )
}

/**
 * A short-lived, tab-scoped signal used when an authenticated API request
 * cannot be refreshed. It lets protected routes explain why the user was
 * sent to sign-in instead of presenting a generic permission error.
 */
export function markSessionExpired() {
    if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(SESSION_EXPIRED_KEY, '1')
    }
}

export function hasSessionExpired() {
    return typeof window !== 'undefined'
        && window.sessionStorage.getItem(SESSION_EXPIRED_KEY) === '1'
}

export function clearSessionExpired() {
    if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(SESSION_EXPIRED_KEY)
    }
}
