import type { SupportedLocale } from '../../config/i18n.js'
import { t } from '../i18n/i18n.js'
import { escapeHtml } from '../lib/escape-html.js'
import { normalizeFrontendOrigin } from '../security/frontend-origin-policy.js'
import { normalizeEmailAddress } from './email-address-policy.js'
import type { MailMessage, Mailer } from './mailer.js'

export type AutoCareVisitReminderEmailInput = {
    toEmail: string
    recipientName: string
    requestId: string
    providerName: string
    serviceTitle: string
    date: string
    startTime: string
    frontendOrigin: string
    locale?: SupportedLocale
}

export function createAutoCareVisitReminderEmail(
    input: AutoCareVisitReminderEmailInput,
): MailMessage {
    const locale = input.locale
    const actionLink = new URL(
        `/profile/bookings?request=${encodeURIComponent(input.requestId)}`,
        normalizeFrontendOrigin(input.frontendOrigin, { allowHttpLoopback: true }),
    ).toString()
    const detailLines = [
        [t('emails.autocare.reminder.details.provider', {}, locale), input.providerName],
        [t('emails.autocare.reminder.details.service', {}, locale), input.serviceTitle],
        [t('emails.autocare.reminder.details.date', {}, locale), input.date],
        [t('emails.autocare.reminder.details.time', {}, locale), input.startTime],
    ] as const

    return {
        to: normalizeEmailAddress(input.toEmail),
        subject: t('emails.autocare.reminder.subject', {}, locale),
        text: [
            t('emails.common.hello', { name: input.recipientName }, locale),
            t('emails.autocare.reminder.title', {}, locale),
            t('emails.autocare.reminder.description', {}, locale),
            '',
            t('emails.autocare.reminder.details.header', {}, locale),
            ...detailLines.map(([label, value]) => `- ${label} ${value}`),
            '',
            `${t('emails.common.viewDetails', {}, locale)}: ${actionLink}`,
            '',
            t('emails.common.footer', {}, locale),
        ].join('\n'),
        html: [
            `<p>${escapeHtml(t('emails.common.hello', { name: input.recipientName }, locale))}</p>`,
            `<h2>${escapeHtml(t('emails.autocare.reminder.title', {}, locale))}</h2>`,
            `<p>${escapeHtml(t('emails.autocare.reminder.description', {}, locale))}</p>`,
            `<h3>${escapeHtml(t('emails.autocare.reminder.details.header', {}, locale))}</h3>`,
            '<ul>',
            ...detailLines.map(([label, value]) => `<li><strong>${escapeHtml(label)}</strong> ${escapeHtml(value)}</li>`),
            '</ul>',
            `<p><a href="${escapeHtml(actionLink)}">${escapeHtml(t('emails.common.viewDetails', {}, locale))}</a></p>`,
            `<p><small>${escapeHtml(t('emails.common.footer', {}, locale))}</small></p>`,
        ].join(''),
    }
}

export async function sendAutoCareVisitReminderEmail(
    mailer: Mailer,
    input: AutoCareVisitReminderEmailInput,
) {
    await mailer.send(createAutoCareVisitReminderEmail(input))
}
