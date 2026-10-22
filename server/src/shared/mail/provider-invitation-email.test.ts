import { describe, expect, it } from 'vitest'

import { createProviderInvitationEmail, createProviderInvitationUrl } from './provider-invitation-email.js'

describe('provider invitation email', () => {
    const input = {
        email: 'staff@example.test',
        expiresAt: new Date('2026-10-30T12:00:00.000Z'),
        frontendOrigin: 'https://app.example.test',
        token: 'secret-token-with?reserved=characters',
    }

    it('links to the existing acceptance page with an encoded token', () => {
        expect(createProviderInvitationUrl(input.frontendOrigin, input.token))
            .toBe('https://app.example.test/owner/invitations/accept?token=secret-token-with%3Freserved%3Dcharacters')
        const message = createProviderInvitationEmail(input)
        expect(message.to).toBe(input.email)
        expect(message.text).toContain('token=secret-token-with%3Freserved%3Dcharacters')
        expect(message.html).toContain('token=secret-token-with%3Freserved%3Dcharacters')
        expect(message.text).toContain(input.expiresAt.toISOString())
        expect(message.text).toContain('register with this email address')
    })

    it('rejects an untrusted frontend origin', () => {
        expect(() => createProviderInvitationEmail({ ...input, frontendOrigin: 'https://evil.example/path' })).toThrow()
    })
})
