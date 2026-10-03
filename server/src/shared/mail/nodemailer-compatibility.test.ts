import nodemailer from 'nodemailer'
import { describe, expect, it } from 'vitest'

import { createEmailVerificationEmail } from './email-verification-email.js'
import { createPasswordResetEmail } from './password-reset-email.js'
import { createPasswordSetupEmail } from './password-setup-email.js'

const from = 'AutoCare Hub <no-reply@example.test>'
const input = {
    email: 'Recipient@Example.Test',
    expiresAt: new Date('2030-01-01T12:00:00Z'),
    frontendOrigin: 'https://autocare.example.test',
    token: 'synthetic-token-with-safe-url-characters',
}

describe.each(['ru', 'en'] as const)('Nodemailer template compatibility (%s)', (locale) => {
    it.each([
        { name: 'verification', createMessage: createEmailVerificationEmail, path: '/verify-email' },
        { name: 'password reset', createMessage: createPasswordResetEmail, path: '/password/reset' },
        { name: 'password setup', createMessage: createPasswordSetupEmail, path: '/password/setup' },
    ])('$name preserves recipient, localized content and token URL', async ({ createMessage, path }) => {
        // The real SDK composes the message offline; no SMTP recipient is contacted.
        const transporter = nodemailer.createTransport({ jsonTransport: true })
        const message = createMessage({ ...input, locale })
        const info = await transporter.sendMail({ from, ...message })
        const composed: unknown = JSON.parse(info.message)

        expect(info.envelope).toEqual({
            from: 'no-reply@example.test',
            to: ['recipient@example.test'],
        })
        expect(composed).toMatchObject({
            subject: message.subject,
            text: message.text,
            html: message.html,
        })
        const tokenUrl = `${input.frontendOrigin}${path}?token=${input.token}`
        expect(message.text).toContain(tokenUrl)
        expect(message.html).toContain(`href="${tokenUrl}"`)
    })
})

describe('Nodemailer MIME compatibility', () => {
    it('encodes a Russian verification email as multipart UTF-8', async () => {
        const transporter = nodemailer.createTransport({ streamTransport: true, buffer: true })
        const message = createEmailVerificationEmail({ ...input, locale: 'ru' })
        const info = await transporter.sendMail({ from, ...message })

        if (!Buffer.isBuffer(info.message)) {
            throw new Error('Buffered MIME transport did not return a Buffer.')
        }

        const mime = info.message.toString('utf8')
        expect(mime).toMatch(/^Subject: =\?UTF-8\?[BQ]\?/mi)
        expect(mime).toMatch(/^Content-Type: multipart\/alternative;/mi)
        expect(mime).toMatch(/^Content-Type: text\/plain; charset=utf-8/mi)
        expect(mime).toMatch(/^Content-Type: text\/html; charset=utf-8/mi)
    })
})
