const SESSION_EXPIRED_KEY = 'autocare-session-expired'

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
