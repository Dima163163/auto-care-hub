import { useSyncExternalStore } from 'react'

const SESSION_EXPIRED_KEY = 'autocare-session-expired'

let logoutInProgress = false
let sessionExpiredInMemory = false
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
    if (typeof window === 'undefined') return
    sessionExpiredInMemory = true
    try {
        window.sessionStorage.setItem(SESSION_EXPIRED_KEY, '1')
    } catch {
        // The hint is optional; private browsing or storage policy can deny it.
    }
}

export function hasSessionExpired() {
    if (typeof window === 'undefined') return false
    if (sessionExpiredInMemory) return true
    try {
        return window.sessionStorage.getItem(SESSION_EXPIRED_KEY) === '1'
    } catch {
        return false
    }
}

export function clearSessionExpired() {
    sessionExpiredInMemory = false
    if (typeof window === 'undefined') return
    try {
        window.sessionStorage.removeItem(SESSION_EXPIRED_KEY)
    } catch {
        // In-memory state is already cleared.
    }
}
