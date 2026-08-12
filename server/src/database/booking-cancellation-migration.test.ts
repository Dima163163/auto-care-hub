import { describe, expect, it, vi } from 'vitest'

import { AddBookingCancellationReason1781371000000 } from './migrations/1781371000000-AddBookingCancellationReason.js'

describe('booking cancellation reason migration', () => {
    it('is safe when the initial schema already contains the column', async () => {
        const query = vi.fn().mockResolvedValue(undefined)

        await new AddBookingCancellationReason1781371000000().up({ query } as never)

        expect(query).toHaveBeenCalledWith(
            'ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "cancellationReason" text',
        )
    })

    it('uses an idempotent rollback statement', async () => {
        const query = vi.fn().mockResolvedValue(undefined)

        await new AddBookingCancellationReason1781371000000().down({ query } as never)

        expect(query).toHaveBeenCalledWith(
            'ALTER TABLE "bookings" DROP COLUMN IF EXISTS "cancellationReason"',
        )
    })
})
