import { describe, expect, it, vi } from 'vitest'

import { CreateBookingPaymentDisputes1785520000000 } from './migrations/1785520000000-CreateBookingPaymentDisputes.js'

describe('payment dispute migration', () => {
    it('creates restricted, unique dispute records', async () => {
        const query = vi.fn().mockResolvedValue(undefined)

        await new CreateBookingPaymentDisputes1785520000000().up({ query } as never)

        expect(query).toHaveBeenCalledTimes(4)
        expect(query.mock.calls[1]?.[0]).toContain('CHK_booking_payment_disputes_amount')
        expect(query.mock.calls[1]?.[0]).toContain('FK_booking_payment_disputes_payment')
        expect(query.mock.calls[1]?.[0]).toContain('FK_booking_payment_disputes_booking')
        expect(query.mock.calls[1]?.[0]).toContain('ON DELETE RESTRICT')
        expect(query.mock.calls[2]?.[0]).toContain('UQ_booking_payment_disputes_provider_id')
        expect(query.mock.calls[3]?.[0]).toContain('IDX_booking_payment_disputes_payment_created')
    })

    it('removes only dispute objects on rollback', async () => {
        const query = vi.fn().mockResolvedValue(undefined)

        await new CreateBookingPaymentDisputes1785520000000().down({ query } as never)

        expect(query).toHaveBeenCalledTimes(4)
        expect(query.mock.calls[0]?.[0]).toContain('IDX_booking_payment_disputes_payment_created')
        expect(query.mock.calls[1]?.[0]).toContain('UQ_booking_payment_disputes_provider_id')
        expect(query.mock.calls[2]?.[0]).toContain('DROP TABLE "booking_payment_disputes"')
        expect(query.mock.calls[3]?.[0]).toContain('DROP TYPE')
    })
})
