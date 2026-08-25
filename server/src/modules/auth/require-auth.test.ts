import { describe, expect, it, vi } from 'vitest'

import { AppError } from '../../shared/errors/app-error.js'
import { parseBearerToken } from './bearer-token.js'
import { assertAccessSessionActive } from './require-auth.js'

const sessionMocks = vi.hoisted(() => ({
    findUserSession: vi.fn(),
}))

vi.mock('./session.service.js', () => sessionMocks)

describe('parseBearerToken', () => {
    it.each([
        ['missing header', undefined],
        ['basic authentication', 'Basic credentials'],
        ['missing token', 'Bearer'],
        ['multiple tokens', 'Bearer access-token extra'],
        ['token in the scheme position', 'access-token Bearer'],
    ])('rejects %s', (_label, header) => {
        expect(() => parseBearerToken(header)).toThrow(AppError)
    })

    it('accepts a case-insensitive scheme with surrounding whitespace', () => {
        expect(parseBearerToken('  bearer\taccess-token  ')).toBe('access-token')
    })
})

describe('assertAccessSessionActive', () => {
    it('rejects a token bound to a revoked or missing session', async () => {
        sessionMocks.findUserSession.mockResolvedValueOnce(null)

        await expect(assertAccessSessionActive('user-id', 'session-id')).rejects.toMatchObject({
            statusCode: 401,
        })
    })

    it('accepts an active persisted session and legacy sessionless tokens', async () => {
        sessionMocks.findUserSession.mockResolvedValueOnce({
            expiresAt: new Date(Date.now() + 60_000),
        })

        await expect(assertAccessSessionActive('user-id', 'session-id')).resolves.toBeUndefined()
        await expect(assertAccessSessionActive('user-id', undefined)).resolves.toBeUndefined()
    })
})
