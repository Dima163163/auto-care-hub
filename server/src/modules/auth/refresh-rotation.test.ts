import { describe, expect, it } from 'vitest'

import { getRefreshRotationDecision } from './refresh-rotation.js'

describe('refresh rotation decisions', () => {
    it('rotates only an existing active session', () => {
        expect(getRefreshRotationDecision({ sessionFound: true, expired: false, revoked: false })).toBe('rotate')
    })

    it('separates expiry from reuse or missing session', () => {
        expect(getRefreshRotationDecision({ sessionFound: true, expired: true, revoked: false })).toBe('expired')
        expect(getRefreshRotationDecision({ sessionFound: false, expired: false, revoked: false })).toBe('revoked_or_missing')
        expect(getRefreshRotationDecision({ sessionFound: true, expired: false, revoked: true })).toBe('revoked_or_missing')
    })
})
