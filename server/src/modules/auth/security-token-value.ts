import { createHash, randomBytes } from 'node:crypto'

const SECURITY_TOKEN_BYTES = 32
export const MAX_SECURITY_TOKEN_INPUT_LENGTH = 512

export function assertSecurityTokenInput(token: string) {
    if (
        token.length < 32
        || token.length > MAX_SECURITY_TOKEN_INPUT_LENGTH
        || !/^[A-Za-z0-9_-]+$/.test(token)
    ) {
        throw new Error('Security token input is invalid.')
    }

    return token
}

export function createSecurityTokenValue() {
    return randomBytes(SECURITY_TOKEN_BYTES).toString('base64url')
}

export function hashSecurityTokenValue(token: string) {
    return createHash('sha256').update(token).digest('hex')
}

export function isSecurityTokenExpired(expiresAt: Date, now = new Date()) {
    return expiresAt.getTime() <= now.getTime()
}
