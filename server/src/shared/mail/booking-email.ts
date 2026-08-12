import type { Mailer, MailMessage } from './mailer.js'
import { t } from '../i18n/i18n.js'
import type { SupportedLocale } from '../../config/i18n.js'
import { escapeHtml } from '../lib/escape-html.js'
import { normalizeEmailAddress } from './email-address-policy.js'
import { normalizeFrontendOrigin } from '../security/frontend-origin-policy.js'

type BookingEmailInput = {
    toEmail: string
    recipientName: string
    bookingDetails: {
        date: string
        startTime: string
        endTime: string
        cabinetTitle: string
        serviceTitle: string
    }
    status: 'created' | 'confirmed' | 'cancelled'
    isForOwner: boolean
    frontendOrigin: string
    locale?: SupportedLocale
}

export function createBookingEmail(input: BookingEmailInput): MailMessage {
    const toEmail = normalizeEmailAddress(input.toEmail)
    const frontendOrigin = normalizeFrontendOrigin(input.frontendOrigin, { allowHttpLoopback: true })
    const { recipientName, bookingDetails, status, isForOwner, locale } = input
    
    let subject = ''
    let title = ''
    let description = ''
    let actionLink = frontendOrigin
    
    if (status === 'created') {
        if (isForOwner) {
            subject = t('emails.booking.subject.createdOwner', {}, locale)
            title = t('emails.booking.title.createdOwner', {}, locale)
            description = t('emails.booking.description.createdOwner', {}, locale)
            actionLink = new URL('/owner/dashboard/bookings', frontendOrigin).toString()
        } else {
            subject = t('emails.booking.subject.created', {}, locale)
            title = t('emails.booking.title.created', {}, locale)
            description = t('emails.booking.description.created', {}, locale)
            actionLink = new URL('/profile/bookings', frontendOrigin).toString()
        }
    } else if (status === 'confirmed') {
        subject = t('emails.booking.subject.confirmed', {}, locale)
        title = t('emails.booking.title.confirmed', {}, locale)
        description = t('emails.booking.description.confirmed', {}, locale)
        actionLink = new URL('/profile/bookings', frontendOrigin).toString()
    } else if (status === 'cancelled') {
        subject = t('emails.booking.subject.cancelled', {}, locale)
        title = t('emails.booking.title.cancelled', {}, locale)
        description = t('emails.booking.description.cancelled', {}, locale)
        actionLink = isForOwner 
            ? new URL('/owner/dashboard/bookings', frontendOrigin).toString() 
            : new URL('/profile/bookings', frontendOrigin).toString()
    }

    const { date, startTime, endTime, cabinetTitle, serviceTitle } = bookingDetails

    return {
        to: toEmail,
        subject,
        text: [
            t('emails.common.hello', { name: recipientName }, locale),
            title,
            description,
            '',
            t('emails.booking.details.header', {}, locale),
            `- ${t('emails.booking.details.cabinet', {}, locale)} ${cabinetTitle}`,
            `- ${t('emails.booking.details.service', {}, locale)} ${serviceTitle}`,
            `- ${t('emails.booking.details.date', {}, locale)} ${date}`,
            `- ${t('emails.booking.details.time', {}, locale)} ${startTime} - ${endTime}`,
            '',
            `${t('emails.common.viewDetails', {}, locale)}: ${actionLink}`,
            '',
            t('emails.common.footer', {}, locale)
        ].join('\n'),
        html: [
            `<p>${escapeHtml(t('emails.common.hello', { name: recipientName }, locale))}</p>`,
            `<h2>${escapeHtml(title)}</h2>`,
            `<p>${escapeHtml(description)}</p>`,
            `<h3>${escapeHtml(t('emails.booking.details.header', {}, locale))}</h3>`,
            `<ul>`,
            `<li><strong>${escapeHtml(t('emails.booking.details.cabinet', {}, locale))}</strong> ${escapeHtml(cabinetTitle)}</li>`,
            `<li><strong>${escapeHtml(t('emails.booking.details.service', {}, locale))}</strong> ${escapeHtml(serviceTitle)}</li>`,
            `<li><strong>${escapeHtml(t('emails.booking.details.date', {}, locale))}</strong> ${escapeHtml(date)}</li>`,
            `<li><strong>${escapeHtml(t('emails.booking.details.time', {}, locale))}</strong> ${escapeHtml(startTime)} - ${escapeHtml(endTime)}</li>`,
            `</ul>`,
            `<p><a href="${escapeHtml(actionLink)}">${escapeHtml(t('emails.common.viewDetails', {}, locale))}</a></p>`,
            `<p><small>${escapeHtml(t('emails.common.footer', {}, locale))}</small></p>`,
        ].join(''),
    }
}

export async function sendBookingEmail(
    mailer: Mailer,
    input: BookingEmailInput
) {
    await mailer.send(createBookingEmail(input))
}
