import type { Mailer, MailMessage } from './mailer.js'
import { t } from '../i18n/i18n.js'
import type { SupportedLocale } from '../../config/i18n.js'
import { escapeHtml } from '../lib/escape-html.js'
import { normalizeEmailAddress } from './email-address-policy.js'
import { normalizeFrontendOrigin } from '../security/frontend-origin-policy.js'

type EmailVerificationEmailInput = {
    email: string
    expiresAt: Date
    frontendOrigin: string
    token: string
    locale?: SupportedLocale
}

export function createEmailVerificationUrl(
    frontendOrigin: string,
    token: string
) {
    const verificationUrl = new URL('/verify-email', normalizeFrontendOrigin(frontendOrigin, { allowHttpLoopback: true }))

    verificationUrl.searchParams.set('token', token)

    return verificationUrl.toString()
}

export function createEmailVerificationEmail(
    input: EmailVerificationEmailInput
): MailMessage {
    const { locale } = input
    const verificationUrl = createEmailVerificationUrl(
        input.frontendOrigin,
        input.token
    )
    const expiresAt = input.expiresAt.toISOString()

    return {
        to: normalizeEmailAddress(input.email),
        subject: t('emails.emailVerification.subject', {}, locale),
        text: [
            t('emails.emailVerification.title', {}, locale),
            t('emails.emailVerification.description', {}, locale),
            '',
            t('emails.emailVerification.button', {}, locale) + ':',
            verificationUrl,
            '',
            t('emails.emailVerification.expiry', { expiry: expiresAt }, locale),
            '',
            t('emails.common.footer', {}, locale)
        ].join('\n'),
        html: [
            `<h2>${escapeHtml(t('emails.emailVerification.title', {}, locale))}</h2>`,
            `<p>${escapeHtml(t('emails.emailVerification.description', {}, locale))}</p>`,
            `<p><a href="${escapeHtml(verificationUrl)}">${escapeHtml(t('emails.emailVerification.button', {}, locale))}</a></p>`,
            `<p><small>${escapeHtml(t('emails.emailVerification.expiry', { expiry: expiresAt }, locale))}</small></p>`,
            `<p><small>${escapeHtml(t('emails.common.footer', {}, locale))}</small></p>`,
        ].join(''),
    }
}

export async function sendEmailVerificationEmail(
    mailer: Mailer,
    input: EmailVerificationEmailInput
) {
    await mailer.send(createEmailVerificationEmail(input))
}
