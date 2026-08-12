import type { Mailer, MailMessage } from './mailer.js'
import { t } from '../i18n/i18n.js'
import type { SupportedLocale } from '../../config/i18n.js'
import { escapeHtml } from '../lib/escape-html.js'
import { normalizeEmailAddress } from './email-address-policy.js'
import { normalizeFrontendOrigin } from '../security/frontend-origin-policy.js'

type PasswordResetEmailInput = {
    email: string
    expiresAt: Date
    frontendOrigin: string
    token: string
    locale?: SupportedLocale
}

export function createPasswordResetUrl(
    frontendOrigin: string,
    token: string
) {
    const passwordResetUrl = new URL('/password/reset', normalizeFrontendOrigin(frontendOrigin, { allowHttpLoopback: true }))

    passwordResetUrl.searchParams.set('token', token)

    return passwordResetUrl.toString()
}

export function createPasswordResetEmail(
    input: PasswordResetEmailInput
): MailMessage {
    const { locale } = input
    const passwordResetUrl = createPasswordResetUrl(
        input.frontendOrigin,
        input.token
    )
    const expiresAt = input.expiresAt.toISOString()

    return {
        to: normalizeEmailAddress(input.email),
        subject: t('emails.passwordReset.subject', {}, locale),
        text: [
            t('emails.passwordReset.title', {}, locale),
            t('emails.passwordReset.description', {}, locale),
            '',
            t('emails.passwordReset.button', {}, locale) + ':',
            passwordResetUrl,
            '',
            t('emails.passwordReset.expiry', { expiry: expiresAt }, locale),
            '',
            t('emails.common.footer', {}, locale)
        ].join('\n'),
        html: [
            `<h2>${escapeHtml(t('emails.passwordReset.title', {}, locale))}</h2>`,
            `<p>${escapeHtml(t('emails.passwordReset.description', {}, locale))}</p>`,
            `<p><a href="${escapeHtml(passwordResetUrl)}">${escapeHtml(t('emails.passwordReset.button', {}, locale))}</a></p>`,
            `<p><small>${escapeHtml(t('emails.passwordReset.expiry', { expiry: expiresAt }, locale))}</small></p>`,
            `<p><small>${escapeHtml(t('emails.common.footer', {}, locale))}</small></p>`,
        ].join(''),
    }
}

export async function sendPasswordResetEmail(
    mailer: Mailer,
    input: PasswordResetEmailInput
) {
    await mailer.send(createPasswordResetEmail(input))
}
