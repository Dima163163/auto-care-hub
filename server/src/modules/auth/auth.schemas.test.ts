import { describe, expect, it } from 'vitest'

import {
    completePasswordResetSchema,
    passwordResetTokenSchema,
    requestPasswordResetSchema,
} from './auth.schemas'

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
