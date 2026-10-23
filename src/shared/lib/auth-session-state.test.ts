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

    it('preserves the in-memory expiry signal when sessionStorage is denied', () => {
        const descriptor = Object.getOwnPropertyDescriptor(window, 'sessionStorage')
        Object.defineProperty(window, 'sessionStorage', {
            configurable: true,
            get() { throw new DOMException('Storage denied', 'SecurityError') },
        })
        try {
            expect(hasSessionExpired()).toBe(false)
            expect(() => markSessionExpired()).not.toThrow()
            expect(hasSessionExpired()).toBe(true)
            expect(() => clearSessionExpired()).not.toThrow()
            expect(hasSessionExpired()).toBe(false)
        } finally {
            if (descriptor) Object.defineProperty(window, 'sessionStorage', descriptor)
        }
    })
})
