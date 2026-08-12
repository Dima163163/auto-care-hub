import type { SupportedLocale } from '../../config/i18n.js'
import { logError } from '../../shared/observability/logger.js'
import { enqueueOutboxEvent } from './outbox.service.js'

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

export async function enqueueBookingEmail(
    bookingId: string,
    input: BookingEmailInput,
    manager?: Parameters<typeof enqueueOutboxEvent>[1],
) {
    return enqueueOutboxEvent({
        type: 'email.send',
        idempotencyKey: `email:booking:${bookingId}:${input.status}:${input.isForOwner ? 'owner' : 'client'}`,
        payload: {
            template: 'booking',
            bookingId,
            ...input,
            locale: input.locale ?? null,
        },
    }, manager)
}

export async function enqueueBookingEmailSafely(
    bookingId: string,
    input: BookingEmailInput,
) {
    try {
        await enqueueBookingEmail(bookingId, input)
    } catch (error) {
        logError('Failed to enqueue booking email', error, {
            bookingId,
            recipient: input.isForOwner ? 'owner' : 'client',
            status: input.status,
        })
    }
}
