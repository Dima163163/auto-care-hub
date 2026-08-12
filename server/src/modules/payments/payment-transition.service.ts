import type { FastifyRequest } from 'fastify'
import type { EntityManager } from 'typeorm'

import { AppDataSource } from '../../database/data-source.js'
import { AuditAction, AuditLogEntity } from '../../entities/audit-log/audit-log.entity.js'
import { BookingEntity, BookingStatus } from '../../entities/booking/booking.entity.js'
import {
    BookingPaymentAttemptEntity,
    BookingPaymentAttemptStatus,
} from '../../entities/booking/booking-payment-attempt.entity.js'
import {
    BookingPaymentEntity,
    BookingPaymentStatus,
} from '../../entities/booking/booking-payment.entity.js'
import {
    BookingPaymentInvoiceEntity,
    BookingPaymentInvoiceStatus,
} from '../../entities/booking/booking-payment-invoice.entity.js'
import { recordAuditLog } from '../admin/audit-log.service.js'
import { enqueuePaymentStatusNotification } from '../outbox/payment-notification-outbox.service.js'
import { isPaymentTransitionAllowed } from './payment-state.js'
import { isPaymentAttemptTransitionAllowed } from './payment-attempt-state.js'
import { assertStripeObjectReference } from './stripe-object-reference.js'
import {
    assertPaymentTransitionIdentity,
    assertPaymentTransitionMetadata,
} from './payment-transition-input.js'
import { getPaymentInvoiceStatus } from './payment-invoice-state.js'
import {
    assertRefundLedgerDoesNotExceedProvider,
    assertRefundLedgerMatchesPayment,
    getRefundLedgerAggregateAmount,
    getSucceededRefundLedgerAmount,
    recordPaymentRefundLedger,
} from './payment-refund-ledger.service.js'

export type PaymentTransitionSource =
    | 'stripe_webhook'
    | 'stripe_reconciliation'
    | 'admin_refund'

type FinalPaymentStatus = Exclude<BookingPaymentStatus, BookingPaymentStatus.Pending>

export type ApplyPaymentTransitionInput = {
    paymentId: string
    bookingId?: string
    status: FinalPaymentStatus
    source: PaymentTransitionSource
    actorId?: string | null
    request?: FastifyRequest
    stripeEventId?: string
    stripeEventType?: string
    stripeSessionId?: string
    stripePaymentIntentId?: string
    stripeChargeId?: string
    refundId?: string
    refundAmount?: number
    refundEntries?: Array<{
        providerRefundId: string
        providerChargeId?: string
        amountMinor: number
        currency: string
        reason?: string
    }>
    reason?: string
    amount?: number
    currency?: string
}

export type PaymentTransitionResult = {
    changed: boolean
    payment: BookingPaymentEntity
    booking: BookingEntity
}

export function isPaymentDowngrade(
    current: BookingPaymentStatus,
    requested: FinalPaymentStatus,
) {
    return (
        current === BookingPaymentStatus.Refunded
        && requested !== BookingPaymentStatus.Refunded
    ) || (
        current === BookingPaymentStatus.PartiallyRefunded
        && requested !== BookingPaymentStatus.PartiallyRefunded
        && requested !== BookingPaymentStatus.Refunded
    ) || (
        current === BookingPaymentStatus.Paid
        && requested === BookingPaymentStatus.Failed
    )
}

export function getPaymentAuditAction(status: FinalPaymentStatus) {
    if (status === BookingPaymentStatus.Paid) return AuditAction.PaymentSucceeded
    if (status === BookingPaymentStatus.PartiallyRefunded) return AuditAction.PaymentPartiallyRefunded
    if (status === BookingPaymentStatus.Refunded) return AuditAction.PaymentRefunded
    return AuditAction.PaymentFailed
}

function getTransitionKey(paymentId: string, status: FinalPaymentStatus) {
    return `payment-transition:${paymentId}:${status}`
}

async function recordPaymentAuditOnce(
    manager: EntityManager,
    input: ApplyPaymentTransitionInput,
    payment: BookingPaymentEntity,
    previousStatus: BookingPaymentStatus,
) {
    const transitionKey = getTransitionKey(payment.id, input.status)
    const auditRepository = manager.getRepository(AuditLogEntity)
    const existing = await auditRepository
        .createQueryBuilder('audit')
        .where('audit.action = :action', { action: getPaymentAuditAction(input.status) })
        .andWhere('audit.targetId = :targetId', { targetId: payment.id })
        .andWhere('audit.metadata @> CAST(:metadata AS jsonb)', {
            metadata: JSON.stringify({ transitionKey }),
        })
        .getOne()

    if (existing) return existing

    return recordAuditLog({
        actorId: input.actorId ?? null,
        action: getPaymentAuditAction(input.status),
        targetId: payment.id,
        targetType: 'booking_payment',
        metadata: {
            bookingId: payment.bookingId,
            paymentId: payment.id,
            fromStatus: previousStatus,
            toStatus: input.status,
            source: input.source,
            transitionKey,
            stripeEventId: input.stripeEventId ?? null,
            stripeEventType: input.stripeEventType ?? null,
            stripeSessionId: input.stripeSessionId ?? null,
            stripePaymentIntentId: input.stripePaymentIntentId ?? null,
            stripeChargeId: input.stripeChargeId ?? null,
            refundId: input.refundId ?? null,
            reason: input.reason ?? null,
            amount: input.amount ?? null,
            currency: input.currency ?? null,
            status: input.status,
        },
        request: input.request,
        manager,
    })
}

async function syncPaymentInvoice(
    manager: EntityManager,
    payment: BookingPaymentEntity,
    status: FinalPaymentStatus,
) {
    const invoiceStatus = getPaymentInvoiceStatus(status)
    if (!invoiceStatus) return

    const repository = manager.getRepository(BookingPaymentInvoiceEntity)
    const invoice = await repository.findOne({
        where: { paymentId: payment.id },
        lock: { mode: 'pessimistic_write' },
    })

    if (!invoice && invoiceStatus === BookingPaymentInvoiceStatus.Void) return

    if (invoice) {
        invoice.status = invoiceStatus
        await repository.save(invoice)
        return
    }

    await repository.save(repository.create({
        paymentId: payment.id,
        bookingId: payment.bookingId,
        invoiceId: `inv_${payment.id}`,
        amount: payment.grossAmount,
        currency: payment.currency,
        status: invoiceStatus,
        issuedAt: new Date(),
    }))
}

async function applyPaymentTransitionInTransaction(
    manager: EntityManager,
    input: ApplyPaymentTransitionInput,
): Promise<PaymentTransitionResult | null> {
    const payment = await manager.getRepository(BookingPaymentEntity).findOne({
        where: { id: input.paymentId },
        lock: { mode: 'pessimistic_write' },
    })

    if (!payment || (input.bookingId && payment.bookingId !== input.bookingId)) {
        return null
    }

    assertPaymentTransitionIdentity({
        requestedPaymentId: input.paymentId,
        requestedBookingId: input.bookingId,
        storedPaymentId: payment.id,
        storedBookingId: payment.bookingId,
    })

    if (input.stripeSessionId && payment.stripeSessionId) {
        assertStripeObjectReference({
            objectId: input.stripeSessionId,
            referencedId: payment.stripeSessionId,
            label: 'Stripe checkout session',
        })
    }
    if (input.stripePaymentIntentId && payment.stripePaymentIntentId) {
        assertStripeObjectReference({
            objectId: input.stripePaymentIntentId,
            referencedId: payment.stripePaymentIntentId,
            label: 'Stripe payment intent',
        })
    }

    const booking = await manager.getRepository(BookingEntity).findOne({
        where: { id: payment.bookingId },
        lock: { mode: 'pessimistic_write' },
    })

    if (!booking) {
        throw new Error(`Booking ${payment.bookingId} for payment ${payment.id} was not found.`)
    }

    const isRefundTransition = (
        input.status === BookingPaymentStatus.PartiallyRefunded
        || input.status === BookingPaymentStatus.Refunded
    )

    if (isRefundTransition) {
        const refundEntries = input.refundEntries ?? (
            input.refundId && input.refundAmount !== undefined
                ? [{
                    providerRefundId: input.refundId,
                    providerChargeId: input.stripeChargeId,
                    amountMinor: input.refundAmount,
                    currency: input.currency ?? payment.currency,
                    reason: input.reason,
                }]
                : []
        )
        for (const refundEntry of refundEntries) {
            await recordPaymentRefundLedger(manager, {
                payment,
                providerRefundId: refundEntry.providerRefundId,
                providerChargeId: refundEntry.providerChargeId ?? input.stripeChargeId,
                amountMinor: refundEntry.amountMinor,
                currency: refundEntry.currency,
                reason: refundEntry.reason ?? input.reason,
            })
        }
    }

    const ledgerRefundedAmount = isRefundTransition
        ? await getSucceededRefundLedgerAmount(manager, payment.id)
        : 0
    if (isRefundTransition) {
        assertRefundLedgerDoesNotExceedProvider(ledgerRefundedAmount, input.amount)
    }
    const paymentAmountMinor = payment.grossAmount * 100
    const legacyRefundedAmount = payment.refundedAmountMinor ?? 0
    const ledgerAggregateAmount = isRefundTransition
        ? getRefundLedgerAggregateAmount(
            legacyRefundedAmount,
            ledgerRefundedAmount,
            paymentAmountMinor,
        )
        : 0
    if (isRefundTransition) {
        assertRefundLedgerMatchesPayment({
            status: input.status,
            paymentAmountMinor,
            legacyRefundedAmountMinor: legacyRefundedAmount,
            ledgerRefundedAmountMinor: ledgerRefundedAmount,
        })
    }
    const transitionAmount = isRefundTransition
        ? Math.max(ledgerAggregateAmount, input.amount ?? 0)
        : input.amount

    assertPaymentTransitionMetadata({
        status: input.status,
        amount: transitionAmount,
        currency: input.currency,
        expectedCurrency: payment.currency,
        expectedAmount: payment.grossAmount,
        alreadyRefundedAmount: legacyRefundedAmount,
    })

    if (!isPaymentTransitionAllowed(payment.status, input.status)) {
        return { changed: false, payment, booking }
    }

    const previousStatus = payment.status
    const statusChanged = payment.status !== input.status
    const refundAmountChanged = isRefundTransition && transitionAmount !== payment.refundedAmountMinor
    payment.status = input.status

    if (refundAmountChanged) {
        payment.refundedAmountMinor = transitionAmount ?? payment.refundedAmountMinor
    }

    if (input.stripeSessionId && !payment.stripeSessionId) {
        payment.stripeSessionId = input.stripeSessionId
    }
    if (input.stripePaymentIntentId && !payment.stripePaymentIntentId) {
        payment.stripePaymentIntentId = input.stripePaymentIntentId
    }

    if (statusChanged || refundAmountChanged || input.stripePaymentIntentId || input.stripeSessionId) {
        await manager.getRepository(BookingPaymentEntity).save(payment)
    }

    if (
        input.status === BookingPaymentStatus.Paid
        && booking.status === BookingStatus.Pending
    ) {
        booking.status = BookingStatus.Confirmed
        await manager.getRepository(BookingEntity).save(booking)
    }

    if (input.stripeSessionId) {
        const attemptRepository = manager.getRepository(BookingPaymentAttemptEntity)
        let attempt = await attemptRepository.findOne({
            where: {
                paymentId: payment.id,
                stripeSessionId: input.stripeSessionId,
            },
            lock: { mode: 'pessimistic_write' },
        })

        if (!attempt) {
            attempt = await attemptRepository
                .createQueryBuilder('attempt')
                .where('attempt.paymentId = :paymentId', { paymentId: payment.id })
                .andWhere('attempt.status IN (:...statuses)', {
                    statuses: [
                        BookingPaymentAttemptStatus.Creating,
                        BookingPaymentAttemptStatus.Created,
                    ],
                })
                .orderBy('attempt.attemptNumber', 'DESC')
                .setLock('pessimistic_write')
                .getOne()
        }

        if (attempt) {
            const nextAttemptStatus = input.status === BookingPaymentStatus.Paid
                ? BookingPaymentAttemptStatus.Paid
                : input.stripeEventType === 'checkout.session.expired'
                    ? BookingPaymentAttemptStatus.Expired
                    : BookingPaymentAttemptStatus.Failed
            if (isPaymentAttemptTransitionAllowed(attempt.status, nextAttemptStatus)) {
                attempt.status = nextAttemptStatus
                attempt.stripeSessionId = attempt.stripeSessionId ?? input.stripeSessionId
                await attemptRepository.save(attempt)
            }
        }
    }

    await syncPaymentInvoice(manager, payment, input.status)
    await recordPaymentAuditOnce(manager, input, payment, previousStatus)
    await enqueuePaymentStatusNotification({
        bookingId: booking.id,
        paymentId: payment.id,
        userId: booking.clientId,
        status: input.status,
        source: input.source,
        stripeEventId: input.stripeEventId,
        stripeSessionId: input.stripeSessionId ?? payment.stripeSessionId ?? undefined,
    }, manager)

    return { changed: statusChanged || refundAmountChanged, payment, booking }
}

export async function applyPaymentTransition(input: ApplyPaymentTransitionInput) {
    return AppDataSource.transaction((manager) =>
        applyPaymentTransitionInTransaction(manager, input)
    )
}
