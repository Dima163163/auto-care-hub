import { describe, expect, it } from 'vitest'

import {
    assertPasswordPolicy,
    assertPasswordVerificationInput,
} from './password-policy.js'

describe('password policy', () => {
    it('accepts a strong password and bounded login input', () => {
        expect(assertPasswordPolicy('Long-enough-password-42')).toBe('Long-enough-password-42')
        expect(assertPasswordVerificationInput('short')).toBe('short')
    })

    it('rejects common, short, and oversized password candidates', () => {
        expect(() => assertPasswordPolicy('password')).toThrow(/security policy/)
        expect(() => assertPasswordPolicy('short')).toThrow(/security policy/)
        expect(() => assertPasswordVerificationInput('x'.repeat(129))).toThrow(/bounds/)
    })
})
