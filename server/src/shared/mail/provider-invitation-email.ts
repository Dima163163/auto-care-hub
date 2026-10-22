import type { MailMessage } from './mailer.js'
import { escapeHtml } from '../lib/escape-html.js'
import { normalizeEmailAddress } from './email-address-policy.js'
import { normalizeFrontendOrigin } from '../security/frontend-origin-policy.js'

type ProviderInvitationEmailInput = {
    email: string
    expiresAt: Date
    frontendOrigin: string
    token: string
}

export function createProviderInvitationUrl(frontendOrigin: string, token: string) {
    const url = new URL('/owner/invitations/accept', normalizeFrontendOrigin(frontendOrigin, { allowHttpLoopback: true }))
    url.searchParams.set('token', token)
    return url.toString()
}

export function createProviderInvitationEmail(input: ProviderInvitationEmailInput): MailMessage {
    const url = createProviderInvitationUrl(input.frontendOrigin, input.token)
    const expiresAt = input.expiresAt.toISOString()
    const description = 'Sign in or register with this email address, then accept the service team invitation. / Войдите или зарегистрируйтесь с этим адресом и примите приглашение в команду сервиса.'
    return {
        to: normalizeEmailAddress(input.email),
        subject: 'Service team invitation / Приглашение в команду сервиса',
        text: [description, '', url, '', `Expires / Действует до: ${expiresAt}`].join('\n'),
        html: `<p>${escapeHtml(description)}</p><p><a href="${escapeHtml(url)}">Accept invitation / Принять приглашение</a></p><p>${escapeHtml(`Expires / Действует до: ${expiresAt}`)}</p>`,
    }
}
