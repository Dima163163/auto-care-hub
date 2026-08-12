import { describe, expect, it } from 'vitest'

import { isUserSessionActive, isUserSessionExpired } from './session-lifecycle.js'

describe('user session lifecycle', () => {
    const now = new Date('2026-01-01T00:00:00.000Z')

    it('treats the expiry instant as expired', () => {
        expect(isUserSessionExpired(now, now)).toBe(true)
        expect(isUserSessionActive(now, now)).toBe(false)
    })

    it('keeps a future expiry active', () => {
        const future = new Date('2026-01-01T00:00:01.000Z')
        expect(isUserSessionExpired(future, now)).toBe(false)
        expect(isUserSessionActive(future, now)).toBe(true)
    })
})
