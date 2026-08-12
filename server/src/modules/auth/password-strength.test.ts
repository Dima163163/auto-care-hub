import { describe, expect, it } from 'vitest'

import { evaluatePasswordStrength } from './password-strength.js'

describe('password strength', () => {
    it('classifies short and single-pattern passwords as weak', () => {
        expect(evaluatePasswordStrength('password')).toBe('weak')
        expect(evaluatePasswordStrength('12345678')).toBe('weak')
    })

    it('classifies mixed passwords at the fair boundary', () => {
        expect(evaluatePasswordStrength('Password123')).toBe('fair')
        expect(evaluatePasswordStrength('Password123!')).toBe('strong')
    })

    it('recognizes long mixed passwords as strong', () => {
        expect(evaluatePasswordStrength('Correct-Horse-42!')).toBe('strong')
    })
})
