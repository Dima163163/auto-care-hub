import { describe, expect, it, vi } from 'vitest'

import { AddAutoCareBonusRefund1786200000000 } from './migrations/1786200000000-AddAutoCareBonusRefund.js'

describe('AutoCare bonus refund migration', () => {
    it('adds the immutable refund ledger type without rebuilding existing entries', async () => {
        const query = vi.fn().mockResolvedValue(undefined)

        await new AddAutoCareBonusRefund1786200000000().up({ query } as never)

        expect(query).toHaveBeenCalledWith(
            `ALTER TYPE "public"."autocare_bonus_ledger_type" ADD VALUE IF NOT EXISTS 'refund'`,
        )
    })

    it('keeps the migration forward-only because PostgreSQL enum values cannot be safely removed', async () => {
        const query = vi.fn()

        await new AddAutoCareBonusRefund1786200000000().down({ query } as never)

        expect(query).not.toHaveBeenCalled()
    })
})
