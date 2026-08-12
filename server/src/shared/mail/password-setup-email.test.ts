import { describe, expect, it, vi } from 'vitest'

import type { Mailer } from './mailer'
import {
    createPasswordSetupEmail,
    createPasswordSetupUrl,
    sendPasswordSetupEmail,
} from './password-setup-email'

const input = {
    email: 'admin@example.com',
    expiresAt: new Date('2026-06-12T12:00:00.000Z'),
    frontendOrigin: 'https://app.example.com',
    token: 'one-time-token',
}

describe('password setup email', () => {
    it('creates a frontend URL with an encoded token', () => {
        expect(
            createPasswordSetupUrl(
                input.frontendOrigin,
                'token with reserved?characters'
            )
        ).toBe(
            'https://app.example.com/password/setup?token=token+with+reserved%3Fcharacters'
        )
    })

    it('includes the setup link and expiry in text and HTML', () => {
        const message = createPasswordSetupEmail(input)

        expect(message.to).toBe(input.email)
        expect(message.text).toContain(
            'https://app.example.com/password/setup?token=one-time-token'
        )
        expect(message.html).toContain(
            'https://app.example.com/password/setup?token=one-time-token'
        )
        expect(message.text).toContain(input.expiresAt.toISOString())
    })

    it('sends the generated message through the mailer abstraction', async () => {
        const send = vi.fn<Mailer['send']>().mockResolvedValue()

        await sendPasswordSetupEmail({ send }, input)

        expect(send).toHaveBeenCalledOnce()
        expect(send).toHaveBeenCalledWith(
            expect.objectContaining({
                to: input.email,
            })
        )
    })
})
