type PolicyOptions = { nonce: string; apiOrigin: string; frontendOrigin: string; development: boolean }
function connectionOrigins(value: string) {
    const origin = new URL(value)
    if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password) throw new Error('CSP connection origin must be an HTTP(S) origin without credentials.')
    const websocket = new URL(origin.origin)
    websocket.protocol = origin.protocol === 'https:' ? 'wss:' : 'ws:'
    return [origin.origin, websocket.origin]
}
export function createContentSecurityPolicy({ nonce, apiOrigin, frontendOrigin, development }: PolicyOptions) {
    if (!/^[A-Za-z0-9+/=_-]{20,128}$/.test(nonce)) throw new Error('Invalid CSP nonce.')
    const connections = [...new Set([...connectionOrigins(apiOrigin), ...connectionOrigins(frontendOrigin)])]
    return [
        "default-src 'self'",
        `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ''}`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data: blob: https:",
        `connect-src 'self' ${connections.join(' ')}`,
        "worker-src 'self'",
        "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'",
    ].join('; ')
}
