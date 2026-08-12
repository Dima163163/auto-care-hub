import type { EntityManager } from 'typeorm'

import { BookingPaymentRefundEntity, BookingPaymentRefundStatus } from '../../entities/booking/booking-payment-refund.entity.js'
import { BookingPaymentEntity, BookingPaymentStatus } from '../../entities/booking/booking-payment.entity.js'
import { normalizePaymentCurrency } from './payment-input.js'

type RefundLedgerInput = {
    payment: BookingPaymentEntity
    providerRefundId: string
    providerChargeId?: string
    amountMinor: number
    currency: string
    reason?: string
    status?: BookingPaymentRefundStatus
}

export function assertRefundLedgerEntry(input: RefundLedgerInput) {
    const providerRefundId = input.providerRefundId.trim()
    if (providerRefundId.length < 1 || providerRefundId.length > 255) {
        throw new Error('Refund provider id is invalid.')
    }
    if (
        !Number.isSafeInteger(input.amountMinor)
        || input.amountMinor < 1
        || input.amountMinor > input.payment.grossAmount * 100
    ) {
        throw new Error('Refund ledger amount is outside the payment bounds.')
    }
    if (normalizePaymentCurrency(input.currency) !== normalizePaymentCurrency(input.payment.currency)) {
        throw new Error('Refund ledger currency does not match the stored payment.')
    }
    if (input.reason !== undefined && input.reason.trim().length > 255) {
        throw new Error('Refund ledger reason is too long.')
    }
}

export function getRefundLedgerAggregateAmount(
    legacyRefundedAmountMinor: number,
    ledgerRefundedAmountMinor: number,
    paymentAmountMinor: number,
) {
    if (
        !Number.isSafeInteger(legacyRefundedAmountMinor)
        || !Number.isSafeInteger(ledgerRefundedAmountMinor)
        || !Number.isSafeInteger(paymentAmountMinor)
        || legacyRefundedAmountMinor < 0
        || ledgerRefundedAmountMinor < 0
        || paymentAmountMinor < 1
        || legacyRefundedAmountMinor > paymentAmountMinor
        || ledgerRefundedAmountMinor > paymentAmountMinor
    ) {
        throw new Error('Refund aggregate is outside the payment bounds.')
    }

    return Math.max(legacyRefundedAmountMinor, ledgerRefundedAmountMinor)
}

export function assertRefundLedgerDoesNotExceedProvider(
    ledgerRefundedAmountMinor: number,
    providerRefundedAmountMinor: number | undefined,
) {
    if (providerRefundedAmountMinor === undefined) return
    if (
        !Number.isSafeInteger(ledgerRefundedAmountMinor)
        || !Number.isSafeInteger(providerRefundedAmountMinor)
        || ledgerRefundedAmountMinor < 0
        || providerRefundedAmountMinor < 0
    ) {
        throw new Error('Refund provider aggregate is invalid.')
    }
    if (ledgerRefundedAmountMinor > providerRefundedAmountMinor) {
        throw new Error('Refund ledger exceeds the provider cumulative refund amount.')
    }
}

export function assertRefundLedgerMatchesPayment(input: {
    status: BookingPaymentStatus
    paymentAmountMinor: number
    legacyRefundedAmountMinor: number
    ledgerRefundedAmountMinor: number
}) {
    if (input.status !== BookingPaymentStatus.Refunded) return

    const aggregateAmount = getRefundLedgerAggregateAmount(
        input.legacyRefundedAmountMinor,
        input.ledgerRefundedAmountMinor,
        input.paymentAmountMinor,
    )
    if (aggregateAmount !== input.paymentAmountMinor) {
        throw new Error('Final refund status requires a complete local refund ledger.')
    }
}

export async function getSucceededRefundLedgerAmount(
    manager: EntityManager,
    paymentId: string,
) {
    const result = await manager.getRepository(BookingPaymentRefundEntity)
        .createQueryBuilder('refund')
        .select('COALESCE(SUM(refund.amountMinor), 0)', 'total')
        .where('refund.paymentId = :paymentId', { paymentId })
        .andWhere('refund.status = :status', { status: BookingPaymentRefundStatus.Succeeded })
        .getRawOne<{ total: string | number }>()

    const total = Number(result?.total ?? 0)
    if (!Number.isSafeInteger(total) || total < 0) {
        throw new Error('Refund ledger aggregate is invalid.')
    }

    return total
}

export async function recordPaymentRefundLedger(
    manager: EntityManager,
    input: RefundLedgerInput,
) {
    assertRefundLedgerEntry(input)

    const repository = manager.getRepository(BookingPaymentRefundEntity)
    const existing = await repository.findOne({
        where: { providerRefundId: input.providerRefundId.trim() },
        lock: { mode: 'pessimistic_write' },
    })

    if (existing) {
        if (
            existing.paymentId !== input.payment.id
            || existing.amountMinor !== input.amountMinor
            || normalizePaymentCurrency(existing.currency) !== normalizePaymentCurrency(input.currency)
        ) {
            throw new Error('Refund provider id is already linked to a different ledger entry.')
        }

        return { refund: existing, created: false }
    }

    const refund = repository.create({
        paymentId: input.payment.id,
        bookingId: input.payment.bookingId,
        providerRefundId: input.providerRefundId.trim(),
        providerChargeId: input.providerChargeId ?? null,
        amountMinor: input.amountMinor,
        currency: normalizePaymentCurrency(input.currency),
        reason: input.reason?.trim() || null,
        status: input.status ?? BookingPaymentRefundStatus.Succeeded,
    })

    return { refund: await repository.save(refund), created: true }
}
