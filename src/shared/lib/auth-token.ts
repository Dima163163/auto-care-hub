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

export function getAccessToken() {
    return _accessToken
}

export function setAccessToken(accessToken: string) {
    _accessToken = accessToken
}

export function clearAccessToken() {
    _accessToken = null
}
