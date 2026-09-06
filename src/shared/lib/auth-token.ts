/**
 * In-memory access token storage.
 * 
 * Moving the access token away from localStorage to an in-memory variable
 * protects the application against token theft via XSS.
 * 
 * Although a successful XSS could still make requests on behalf of the user
 * while the tab is open, it cannot "steal" the token to use it from a 
 * separate environment for an extended period.
 * 
 * The refresh token remains in an httpOnly cookie, which is inaccessible to JS.
 */

let _accessToken: string | null = null
let _authGeneration = 0
const AUTH_SESSION_HINT_KEY = 'autocare-auth-session'

function getBrowserStorage() {
    if (typeof window === 'undefined') return null

    try {
        return window.localStorage
    } catch {
        return null
    }
}

function setAuthSessionHint() {
    try {
        getBrowserStorage()?.setItem(AUTH_SESSION_HINT_KEY, '1')
    } catch {
        // Storage can be unavailable in privacy-restricted browser contexts.
    }
}

function clearAuthSessionHint() {
    try {
        getBrowserStorage()?.removeItem(AUTH_SESSION_HINT_KEY)
    } catch {
        // Storage can be unavailable in privacy-restricted browser contexts.
    }
}

/**
 * Indicates that this browser has an httpOnly refresh session to restore.
 * The hint contains no credential and lets public /auth/me requests avoid
 * probing /auth/refresh for every anonymous page load.
 */
export function hasAuthSessionHint() {
    return getBrowserStorage()?.getItem(AUTH_SESSION_HINT_KEY) === '1'
}

export function getAccessToken() {
    return _accessToken
}

/**
 * Changes only when local credentials are invalidated. A refresh may finish
 * after logout or account switching; callers use this generation to prevent
 * that late response from restoring the old identity.
 */
export function getAuthGeneration() {
    return _authGeneration
}

export function setAccessToken(accessToken: string) {
    _accessToken = accessToken
    setAuthSessionHint()
}

export function clearAccessToken() {
    _accessToken = null
    _authGeneration += 1
    clearAuthSessionHint()
}
