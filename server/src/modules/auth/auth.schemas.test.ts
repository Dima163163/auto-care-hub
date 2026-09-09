import { describe, expect, it } from 'vitest'

import {
    completePasswordResetSchema,
    passwordResetTokenSchema,
    registerSchema,
    requestPasswordResetSchema,
} from './auth.schemas'

const validRegistration = {
    name: 'Client User',
    email: 'client@example.com',
    password: 'S3cure-password-123!',
    role: 'client' as const,
    termsAccepted: true,
    privacyAccepted: true,
}

describe('registration legal consent schema', () => {
    it('requires both legal confirmations', () => {
        expect(registerSchema.safeParse(validRegistration).success).toBe(true)
        expect(registerSchema.safeParse({ ...validRegistration, termsAccepted: false }).success).toBe(false)
        expect(registerSchema.safeParse({ ...validRegistration, privacyAccepted: false }).success).toBe(false)
    })
})

describe('password reset schemas', () => {
    it('accepts a valid reset request email', () => {
        expect(
            requestPasswordResetSchema.safeParse({
                email: 'client@example.com',
            }).success
        ).toBe(true)
    })

    it('rejects an invalid reset request email', () => {
        expect(
            requestPasswordResetSchema.safeParse({
                email: 'invalid-email',
            }).success
        ).toBe(false)
    })

    it('requires a sufficiently long reset token', () => {
        expect(
            passwordResetTokenSchema.safeParse({
                token: 'short-token',
            }).success
        ).toBe(false)
    })

    it('requires a password with at least 6 characters', () => {
        expect(
            completePasswordResetSchema.safeParse({
                token: 'a'.repeat(32),
                password: '12345',
            }).success
        ).toBe(false)
    })
})
