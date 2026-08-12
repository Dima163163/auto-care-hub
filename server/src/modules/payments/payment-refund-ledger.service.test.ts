import { describe, expect, it, vi } from 'vitest'

import { BookingPaymentEntity, BookingPaymentStatus } from '../../entities/booking/booking-payment.entity.js'
import {
    assertRefundLedgerEntry,
    assertRefundLedgerDoesNotExceedProvider,
    assertRefundLedgerMatchesPayment,
    getRefundLedgerAggregateAmount,
    recordPaymentRefundLedger,
} from './payment-refund-ledger.service.js'

function payment(overrides: Partial<BookingPaymentEntity> = {}) {
    return {
        id: 'payment-1',
        bookingId: 'booking-1',
        grossAmount: 25,
        currency: 'rub',
        ...overrides,
    } as BookingPaymentEntity
}

describe('payment refund ledger guards', () => {
    it('accepts a bounded provider refund in the payment currency', () => {
        expect(assertRefundLedgerEntry({
            payment: payment(),
            providerRefundId: 're_123',
            amountMinor: 2500,
            currency: 'RUB',
        })).toBeUndefined()
    })

    it('rejects mismatched currency, invalid amount, and oversized reason', () => {
        expect(() => assertRefundLedgerEntry({
            payment: payment(),
            providerRefundId: 're_123',
            amountMinor: 2500,
            currency: 'EUR',
        })).toThrow(/currency/)
        expect(() => assertRefundLedgerEntry({
            payment: payment(),
            providerRefundId: 're_123',
            amountMinor: 2501,
            currency: 'rub',
        })).toThrow(/bounds/)
        expect(() => assertRefundLedgerEntry({
            payment: payment(),
            providerRefundId: 're_123',
            amountMinor: 1,
            currency: 'rub',
            reason: 'x'.repeat(256),
        })).toThrow(/long/)
    })

    it('keeps the larger value while migrating from the aggregate column', () => {
        expect(getRefundLedgerAggregateAmount(2500, 0, 2500)).toBe(2500)
        expect(getRefundLedgerAggregateAmount(2500, 1250, 2500)).toBe(2500)
        expect(getRefundLedgerAggregateAmount(0, 1250, 2500)).toBe(1250)
        expect(() => getRefundLedgerAggregateAmount(2501, 0, 2500)).toThrow(/bounds/)
    })

    it('rejects a stale provider aggregate below the recorded ledger', () => {
        expect(assertRefundLedgerDoesNotExceedProvider(2500, 3000)).toBeUndefined()
        expect(assertRefundLedgerDoesNotExceedProvider(2500, undefined)).toBeUndefined()
        expect(() => assertRefundLedgerDoesNotExceedProvider(3001, 3000)).toThrow(/exceeds/)
    })

    it('requires complete local evidence before a payment becomes fully refunded', () => {
        expect(() => assertRefundLedgerMatchesPayment({
            status: BookingPaymentStatus.Refunded,
            paymentAmountMinor: 10_000,
            legacyRefundedAmountMinor: 5_000,
            ledgerRefundedAmountMinor: 4_999,
        })).toThrow('complete local refund ledger')

        expect(() => assertRefundLedgerMatchesPayment({
            status: BookingPaymentStatus.Refunded,
            paymentAmountMinor: 10_000,
            legacyRefundedAmountMinor: 10_000,
            ledgerRefundedAmountMinor: 0,
        })).not.toThrow()
    })

    it('does not require a full ledger while the payment is partially refunded', () => {
        expect(() => assertRefundLedgerMatchesPayment({
            status: BookingPaymentStatus.PartiallyRefunded,
            paymentAmountMinor: 10_000,
            legacyRefundedAmountMinor: 5_000,
            ledgerRefundedAmountMinor: 0,
        })).not.toThrow()
    })

    it('reuses an existing provider refund and rejects rebinding it', async () => {
        const existing = {
            id: 'refund-1',
            paymentId: 'payment-1',
            amountMinor: 2500,
            currency: 'rub',
        }
        const repository = {
            findOne: vi.fn().mockResolvedValue(existing),
            create: vi.fn(),
            save: vi.fn(),
        }
        const manager = { getRepository: vi.fn().mockReturnValue(repository) } as never

        await expect(recordPaymentRefundLedger(manager, {
            payment: payment(),
            providerRefundId: 're_123',
            amountMinor: 2500,
            currency: 'rub',
        })).resolves.toEqual({ refund: existing, created: false })
        expect(repository.save).not.toHaveBeenCalled()

        await expect(recordPaymentRefundLedger(manager, {
            payment: payment({ id: 'payment-2' }),
            providerRefundId: 're_123',
            amountMinor: 2500,
            currency: 'rub',
        })).rejects.toThrow(/different ledger entry/)
    })
})
