import { z } from 'zod'
import { passwordSchema } from './password-policy.js'

export const registerSchema = z.object({
    name: z.string().trim().min(2, 'Name must contain at least 2 characters.').max(120),
    email: z.string().trim().email('Enter a valid email.').max(320),
    password: passwordSchema,
    role: z.enum(['client', 'owner']),
})

export const loginSchema = z.object({
    email: z.string().trim().email('Enter a valid email.').max(320),
    password: z.string().min(1, 'Password is required.'),
})

export const passwordSetupTokenSchema = z.object({
    token: z.string().min(32, 'Password setup token is required.'),
})

export const completePasswordSetupSchema = passwordSetupTokenSchema.extend({
    password: passwordSchema,
})

export const requestPasswordResetSchema = z.object({
    email: z.string().trim().email('Enter a valid email.').max(320),
})

export const passwordResetTokenSchema = z.object({
    token: z.string().min(32, 'Password reset token is required.'),
})

export const completePasswordResetSchema = passwordResetTokenSchema.extend({
    password: passwordSchema,
})

export const emailVerificationTokenSchema = z.object({
    token: z.string().min(32, 'Email verification token is required.'),
})

export const changePasswordSchema = z.object({
    oldPassword: z.string().min(1, 'Old password is required.'),
    newPassword: passwordSchema,
})
