import { describe, expect, it } from 'vitest'
import { compare, hash } from 'bcryptjs'

import {
    assertPasswordPolicy,
    assertPasswordVerificationInput,
} from './password-policy.js'
import { changePasswordSchema, loginSchema } from './auth.schemas.js'

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

    it('rejects two distinct bcrypt-colliding inputs and Unicode beyond 72 UTF-8 bytes', async () => {
        const first = `${'a'.repeat(72)}x`
        const second = `${'a'.repeat(72)}y`
        const legacyHash = await hash(first, 4)
        expect(await compare(second, legacyHash)).toBe(true)
        expect(() => assertPasswordPolicy(first)).toThrow(/security policy/)
        expect(() => assertPasswordPolicy(second)).toThrow(/security policy/)
        expect(() => assertPasswordVerificationInput(first)).toThrow(/72 UTF-8 bytes/)
        expect(loginSchema.safeParse({ email: 'user@example.com', password: first }).success).toBe(false)
        expect(changePasswordSchema.safeParse({ oldPassword: first, newPassword: 'new-valid-secret-123' }).success).toBe(false)
        expect(() => assertPasswordPolicy(`${'Ж'.repeat(37)}-safe-password`)).toThrow(/security policy/)
        expect(assertPasswordPolicy(`${'Ж'.repeat(25)}-safe-password`)).toContain('safe-password')
    })
})
