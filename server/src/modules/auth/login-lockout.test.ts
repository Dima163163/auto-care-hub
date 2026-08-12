import { describe, expect, it } from 'vitest'

import {
    getLoginLockDurationMs,
    isLoginLocked,
    LOGIN_LOCK_MAX_MS,
    LOGIN_LOCK_THRESHOLD,
} from './login-lockout.js'

describe('login lockout policy', () => {
    it('does not lock before the threshold', () => {
        expect(getLoginLockDurationMs(LOGIN_LOCK_THRESHOLD - 1)).toBe(0)
    })

    it('uses bounded exponential backoff', () => {
        expect(getLoginLockDurationMs(LOGIN_LOCK_THRESHOLD)).toBe(60_000)
        expect(getLoginLockDurationMs(100)).toBe(LOGIN_LOCK_MAX_MS)
    })

    it('checks the lock boundary against the current time', () => {
        const now = new Date('2026-07-28T12:00:00.000Z')
        expect(isLoginLocked(new Date(now.getTime() + 1), now)).toBe(true)
        expect(isLoginLocked(now, now)).toBe(false)
        expect(isLoginLocked(null, now)).toBe(false)
    })
})
