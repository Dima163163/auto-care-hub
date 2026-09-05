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
}

export function clearAccessToken() {
    _accessToken = null
    _authGeneration += 1
}
