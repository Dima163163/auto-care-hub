import type { EntityManager } from 'typeorm'

import { NotificationCategory } from '../../entities/notification/notification.entity.js'
import { BookingPaymentStatus } from '../../entities/booking/booking-payment.entity.js'
import {
    enqueueNotification,
} from './notification-outbox.service.js'
import { logError } from '../../shared/observability/logger.js'

export type PaymentNotificationInput = {
    bookingId: string
    paymentId: string
    userId: string
    status: BookingPaymentStatus.Paid
        | BookingPaymentStatus.Failed
        | BookingPaymentStatus.PartiallyRefunded
        | BookingPaymentStatus.Refunded
    source: 'stripe_webhook' | 'stripe_reconciliation' | 'admin_refund'
    stripeEventId?: string
    stripeSessionId?: string
}

export async function enqueuePaymentStatusNotification(
    input: PaymentNotificationInput,
    manager?: EntityManager,
) {
    const templateKey = input.status === BookingPaymentStatus.Paid
        ? 'payment.completed'
        : input.status === BookingPaymentStatus.PartiallyRefunded
            ? 'payment.partially_refunded'
            : input.status === BookingPaymentStatus.Refunded
            ? 'payment.refunded'
            : 'payment.failed'

    await enqueueNotification({
        userId: input.userId,
        category: NotificationCategory.Booking,
        template: {
            key: templateKey,
        },
        metadata: {
            bookingId: input.bookingId,
            paymentId: input.paymentId,
            status: input.status,
            source: input.source,
            stripeEventId: input.stripeEventId ?? null,
            stripeSessionId: input.stripeSessionId ?? null,
        },
    }, `notification:payment:${input.paymentId}:${input.status}`, manager)
}

export async function enqueuePaymentStatusNotificationSafely(
    input: PaymentNotificationInput,
) {
    try {
        await enqueuePaymentStatusNotification(input)
    } catch (error) {
        logError('Failed to enqueue payment status notification', error, {
            paymentId: input.paymentId,
            status: input.status,
            userId: input.userId,
        })
    }
}
