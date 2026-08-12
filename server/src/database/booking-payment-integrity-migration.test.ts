import { describe, expect, it, vi } from 'vitest'

import { HardenBookingPaymentIntegrity1785490000000 } from './migrations/1785490000000-HardenBookingPaymentIntegrity.js'

describe('booking payment integrity migration', () => {
    it('preflights orphans and changes financial foreign keys to restrict', async () => {
        const query = vi.fn().mockResolvedValueOnce([{ count: '0' }]).mockResolvedValue(undefined)

        await new HardenBookingPaymentIntegrity1785490000000().up({ query } as never)

        expect(query).toHaveBeenCalledTimes(6)
        expect(query.mock.calls[0]?.[0]).toContain('LEFT JOIN "bookings"')
        expect(query.mock.calls[1]?.[0]).toContain('FK_booking_payments_booking')
        expect(query.mock.calls[1]?.[0]).toContain('ON DELETE RESTRICT')
        expect(query.mock.calls[3]?.[0]).toContain('ON DELETE RESTRICT')
        expect(query.mock.calls[5]?.[0]).toContain('ON DELETE RESTRICT')
    })

    it('stops before DDL when legacy orphan payments exist', async () => {
        const query = vi.fn().mockResolvedValueOnce([{ count: '2' }])

        await expect(new HardenBookingPaymentIntegrity1785490000000().up({ query } as never))
            .rejects.toThrow('2 orphan payment row(s) require reconciliation')
        expect(query).toHaveBeenCalledOnce()
    })

    it('restores the previous cascade semantics on an explicit rollback', async () => {
        const query = vi.fn().mockResolvedValue(undefined)

        await new HardenBookingPaymentIntegrity1785490000000().down({ query } as never)

        expect(query).toHaveBeenCalledTimes(5)
        expect(query.mock.calls[2]?.[0]).toContain('ON DELETE CASCADE')
        expect(query.mock.calls[4]?.[0]).toContain('ON DELETE CASCADE')
    })
})
