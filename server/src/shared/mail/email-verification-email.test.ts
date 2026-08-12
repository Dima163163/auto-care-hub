import { describe, expect, it, vi } from 'vitest'

import type { Mailer } from './mailer'
import {
    createEmailVerificationEmail,
    createEmailVerificationUrl,
    sendEmailVerificationEmail,
} from './email-verification-email'

const input = {
    email: 'client@example.com',
    expiresAt: new Date('2026-06-12T12:00:00.000Z'),
    frontendOrigin: 'https://app.example.com',
    token: 'one-time-token',
}

describe('email verification email', () => {
    it('creates a frontend URL with an encoded token', () => {
        expect(
            createEmailVerificationUrl(
                input.frontendOrigin,
                'token with reserved?characters'
            )
        ).toBe(
            'https://app.example.com/verify-email?token=token+with+reserved%3Fcharacters'
        )
    })

    it('includes the verification link and expiry in text and HTML', () => {
        const message = createEmailVerificationEmail(input)

        expect(message.to).toBe(input.email)
        expect(message.text).toContain(
            'https://app.example.com/verify-email?token=one-time-token'
        )
        expect(message.html).toContain(
            'https://app.example.com/verify-email?token=one-time-token'
        )
        expect(message.text).toContain(input.expiresAt.toISOString())
    })

    it('sends the generated message through the mailer abstraction', async () => {
        const send = vi.fn<Mailer['send']>().mockResolvedValue()

        await sendEmailVerificationEmail({ send }, input)

        expect(send).toHaveBeenCalledOnce()
        expect(send).toHaveBeenCalledWith(
            expect.objectContaining({
                to: input.email,
            })
        )
    })
})
