import { afterEach, describe, expect, it } from 'vitest'

import { clearSessionExpired, hasSessionExpired, markSessionExpired } from './auth-session-state'

describe('auth session state', () => {
    afterEach(() => {
        window.sessionStorage.clear()
    })

    it('marks and clears an expired authenticated session per tab', () => {
        expect(hasSessionExpired()).toBe(false)

        markSessionExpired()
        expect(hasSessionExpired()).toBe(true)

        clearSessionExpired()
        expect(hasSessionExpired()).toBe(false)
    })
})
