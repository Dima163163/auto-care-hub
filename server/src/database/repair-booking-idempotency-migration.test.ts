import { describe, expect, it, vi } from 'vitest'

import { RepairBookingIdempotencyKey1785430000000 } from './migrations/1785430000000-RepairBookingIdempotencyKey.js'

describe('booking idempotency repair migration', () => {
    it('creates the missing column and index', async () => {
        const query = vi.fn()
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce(undefined)
            .mockResolvedValueOnce([])
        await new RepairBookingIdempotencyKey1785430000000().up({ query } as never)

        expect(query).toHaveBeenCalledTimes(4)
        expect(query.mock.calls[1]?.[0]).toContain('ADD "idempotency_key"')
        expect(query.mock.calls[3]?.[0]).toContain('CREATE UNIQUE INDEX')
    })

    it('does not repeat DDL when the schema is already complete', async () => {
        const query = vi.fn()
            .mockResolvedValueOnce([{ '?column?': 1 }])
            .mockResolvedValueOnce([{
                indisunique: true,
                columns: ['clientId', 'idempotency_key'],
            }])
        await new RepairBookingIdempotencyKey1785430000000().up({ query } as never)

        expect(query).toHaveBeenCalledTimes(2)
    })

    it('rebuilds a same-named index with the wrong uniqueness or columns', async () => {
        const query = vi.fn()
            .mockResolvedValueOnce([{ '?column?': 1 }])
            .mockResolvedValueOnce([{
                indisunique: false,
                columns: ['clientId'],
            }])
            .mockResolvedValueOnce(undefined)
            .mockResolvedValueOnce(undefined)

        await new RepairBookingIdempotencyKey1785430000000().up({ query } as never)

        expect(query).toHaveBeenCalledTimes(4)
        expect(query.mock.calls[2]?.[0]).toContain('DROP INDEX')
        expect(query.mock.calls[3]?.[0]).toContain('CREATE UNIQUE INDEX')
    })
})
