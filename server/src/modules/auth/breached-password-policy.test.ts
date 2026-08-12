import { describe, expect, it } from 'vitest'

import { buildBreachedPasswordLookupRequest } from './breached-password.js'
import {
    getBreachedPasswordClientPolicy,
    resolveBreachedPasswordCheckMode,
} from './breached-password-policy.js'
import { assertPasswordSecurityPolicy } from './password-policy.js'

describe('breached password check policy', () => {
    it('defaults production to shadow mode and development to off', () => {
        expect(resolveBreachedPasswordCheckMode({ nodeEnv: 'production' })).toBe('shadow')
        expect(resolveBreachedPasswordCheckMode({ nodeEnv: 'development' })).toBe('off')
    })

    it('exposes bounded timeout and explicit failure behavior', () => {
        expect(getBreachedPasswordClientPolicy('enforce')).toEqual({ mode: 'enforce', timeoutMs: 3_000, failClosed: true })
        expect(getBreachedPasswordClientPolicy('off').timeoutMs).toBe(0)
    })

    it('rejects a breached password in enforce mode with a stable error code', async () => {
        const password = 'A different strong password 42!'
        const fetchImpl = async () => {
            const { suffix } = buildBreachedPasswordLookupRequest(password)
            return new Response(`${suffix}:1\n`, { status: 200 })
        }

        await expect(assertPasswordSecurityPolicy(password, {
            mode: 'enforce',
            fetchImpl,
        })).rejects.toMatchObject({ code: 'BREACHED_PASSWORD', statusCode: 400 })
    })

    it('fails closed when the provider is unavailable in enforce mode', async () => {
        await expect(assertPasswordSecurityPolicy('A different strong password 42!', {
            mode: 'enforce',
            fetchImpl: async () => new Response('down', { status: 503 }),
        })).rejects.toMatchObject({ code: 'INTERNAL_SERVER_ERROR', statusCode: 503 })
    })

    it('keeps shadow mode available when the provider is unavailable', async () => {
        await expect(assertPasswordSecurityPolicy('A different strong password 42!', {
            mode: 'shadow',
            fetchImpl: async () => new Response('down', { status: 503 }),
        })).resolves.toBe('A different strong password 42!')
    })
})
