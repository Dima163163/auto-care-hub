import type { Mailer, MailMessage } from './mailer.js'
import { t } from '../i18n/i18n.js'
import type { SupportedLocale } from '../../config/i18n.js'
import { escapeHtml } from '../lib/escape-html.js'
import { normalizeEmailAddress } from './email-address-policy.js'
import { normalizeFrontendOrigin } from '../security/frontend-origin-policy.js'

type PasswordSetupEmailInput = {
    email: string
    expiresAt: Date
    frontendOrigin: string
    token: string
    locale?: SupportedLocale
}

export function createPasswordSetupUrl(
    frontendOrigin: string,
    token: string
) {
    const passwordSetupUrl = new URL('/password/setup', normalizeFrontendOrigin(frontendOrigin, { allowHttpLoopback: true }))

    passwordSetupUrl.searchParams.set('token', token)

    return passwordSetupUrl.toString()
}

export function createPasswordSetupEmail(
    input: PasswordSetupEmailInput
): MailMessage {
    const { locale } = input
    const passwordSetupUrl = createPasswordSetupUrl(
        input.frontendOrigin,
        input.token
    )
    const expiresAt = input.expiresAt.toISOString()

    return {
        to: normalizeEmailAddress(input.email),
        subject: t('emails.passwordSetup.subject', {}, locale),
        text: [
            t('emails.passwordSetup.title', {}, locale),
            t('emails.passwordSetup.description', {}, locale),
            '',
            t('emails.passwordSetup.button', {}, locale) + ':',
            passwordSetupUrl,
            '',
            t('emails.passwordSetup.expiry', { expiry: expiresAt }, locale),
            '',
            t('emails.common.footer', {}, locale)
        ].join('\n'),
        html: [
            `<h2>${escapeHtml(t('emails.passwordSetup.title', {}, locale))}</h2>`,
            `<p>${escapeHtml(t('emails.passwordSetup.description', {}, locale))}</p>`,
            `<p><a href="${escapeHtml(passwordSetupUrl)}">${escapeHtml(t('emails.passwordSetup.button', {}, locale))}</a></p>`,
            `<p><small>${escapeHtml(t('emails.passwordSetup.expiry', { expiry: expiresAt }, locale))}</small></p>`,
            `<p><small>${escapeHtml(t('emails.common.footer', {}, locale))}</small></p>`,
        ].join(''),
    }
}

export async function sendPasswordSetupEmail(
    mailer: Mailer,
    input: PasswordSetupEmailInput
) {
    await mailer.send(createPasswordSetupEmail(input))
}
