import { describe, expect, it, vi } from 'vitest'

import { CreateBookingPaymentRefunds1785510000000 } from './migrations/1785510000000-CreateBookingPaymentRefunds.js'

describe('payment refund ledger migration', () => {
    it('creates bounded refund records with restricted financial references', async () => {
        const query = vi.fn().mockResolvedValue(undefined)

        await new CreateBookingPaymentRefunds1785510000000().up({ query } as never)

        expect(query).toHaveBeenCalledTimes(4)
        expect(query.mock.calls[1]?.[0]).toContain('CHK_booking_payment_refunds_amount')
        expect(query.mock.calls[1]?.[0]).toContain('FK_booking_payment_refunds_payment')
        expect(query.mock.calls[1]?.[0]).toContain('FK_booking_payment_refunds_booking')
        expect(query.mock.calls[1]?.[0]).toContain('ON DELETE RESTRICT')
        expect(query.mock.calls[2]?.[0]).toContain('UQ_booking_payment_refunds_provider_id')
        expect(query.mock.calls[3]?.[0]).toContain('IDX_booking_payment_refunds_payment_created')
    })

    it('removes only the ledger objects on rollback', async () => {
        const query = vi.fn().mockResolvedValue(undefined)

        await new CreateBookingPaymentRefunds1785510000000().down({ query } as never)

        expect(query).toHaveBeenCalledTimes(4)
        expect(query.mock.calls[0]?.[0]).toContain('IDX_booking_payment_refunds_payment_created')
        expect(query.mock.calls[1]?.[0]).toContain('UQ_booking_payment_refunds_provider_id')
        expect(query.mock.calls[2]?.[0]).toContain('DROP TABLE "booking_payment_refunds"')
        expect(query.mock.calls[3]?.[0]).toContain('DROP TYPE')
    })
})
