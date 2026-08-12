import '@fastify/cookie'
import { createHash, randomBytes } from 'node:crypto'
import type { FastifyReply, FastifyRequest } from 'fastify'

import { env } from '../../config/env.js'
import { tokensMatch } from '../../shared/security/csrf-token.js'
import type { OAuthProvider } from './oauth.types.js'

const TEN_MINUTES_IN_SECONDS = 10 * 60
const OAUTH_STATE_PATTERN = /^[a-f0-9]{64}$/
export const MAX_OAUTH_STATE_COOKIE_LENGTH = 80

export type OAuthStateValidationResult = 'valid' | 'missing' | 'malformed' | 'mismatch'

export function generateOAuthState() {
    return randomBytes(32).toString('hex')
}

export function hashOAuthState(state: string) {
    return createHash('sha256').update(state).digest('hex')
}

function getOAuthStateCookieOptions() {
    return {
        path: '/',
        httpOnly: true,
        secure: env.nodeEnv === 'production',
        sameSite: 'lax' as const,
        maxAge: TEN_MINUTES_IN_SECONDS,
    }
}

export function setOAuthStateCookie(
    reply: FastifyReply,
    provider: OAuthProvider,
    state: string
) {
    reply.setCookie(
        env.oauth.stateCookieName,
        `${provider}:${state}`,
        getOAuthStateCookieOptions()
    )
}

export function clearOAuthStateCookie(reply: FastifyReply) {
    reply.clearCookie(env.oauth.stateCookieName, {
        path: '/',
        secure: env.nodeEnv === 'production',
        sameSite: 'lax',
    })
}

export function getOAuthStateValidationResult(
    cookieValue: string | undefined,
    provider: OAuthProvider,
    state: string | undefined,
): OAuthStateValidationResult {
    if (!cookieValue || !state) return 'missing'
    if (cookieValue.length > MAX_OAUTH_STATE_COOKIE_LENGTH) return 'malformed'
    if (!OAUTH_STATE_PATTERN.test(state)) return 'malformed'
    return tokensMatch(cookieValue, `${provider}:${state}`) ? 'valid' : 'mismatch'
}

export function isOAuthStateValid(
    request: Pick<FastifyRequest, 'cookies'>,
    provider: OAuthProvider,
    state: string | undefined
) {
    return getOAuthStateValidationResult(
        request.cookies[env.oauth.stateCookieName],
        provider,
        state,
    ) === 'valid'
}
