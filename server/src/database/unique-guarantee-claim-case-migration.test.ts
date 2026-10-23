import { describe, expect, it, vi } from 'vitest'

import { UniqueGuaranteeClaimCase1786430000000 } from './migrations/1786430000000-UniqueGuaranteeClaimCase.js'

describe('guarantee claim case migration', () => {
    it('preserves duplicate records and gives only the first claim a unique request key', async () => {
        const query = vi.fn().mockResolvedValue([])
        await new UniqueGuaranteeClaimCase1786430000000().up({ query } as never)

        expect(query).toHaveBeenCalledTimes(3)
        expect(query.mock.calls[1]?.[0]).toContain('ROW_NUMBER() OVER (PARTITION BY "requestId"')
        expect(query.mock.calls[1]?.[0]).toContain('ranked.ordinal = 1')
        expect(query.mock.calls[2]?.[0]).toContain('CREATE UNIQUE INDEX')
    })

    it('removes the added index and key on rollback', async () => {
        const query = vi.fn().mockResolvedValue([])
        await new UniqueGuaranteeClaimCase1786430000000().down({ query } as never)
        expect(query).toHaveBeenCalledTimes(2)
    })
})
