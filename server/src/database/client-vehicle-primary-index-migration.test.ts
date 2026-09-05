import { describe, expect, it, vi } from 'vitest'

import { AddClientVehiclePrimaryUniqueIndex1786320000000 } from './migrations/1786320000000-AddClientVehiclePrimaryUniqueIndex.js'

describe('client vehicle primary uniqueness migration', () => {
    it('creates a partial unique index for primary vehicles', async () => {
        const query = vi.fn()
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce(undefined)

        await new AddClientVehiclePrimaryUniqueIndex1786320000000().up({ query } as never)

        expect(query).toHaveBeenCalledTimes(2)
        const statement = String(query.mock.calls[1]?.[0])
        expect(statement).toContain('CREATE UNIQUE INDEX "UQ_client_vehicles_primary"')
        expect(statement).toContain('"client_vehicles" ("userId")')
        expect(statement).toContain('WHERE "isPrimary" = TRUE')
    })

    it('blocks rollout with a clear reconciliation error when duplicates exist', async () => {
        const query = vi.fn().mockResolvedValueOnce([{ count: '2' }])

        await expect(new AddClientVehiclePrimaryUniqueIndex1786320000000().up({ query } as never))
            .rejects.toThrow('1 duplicate key group(s) require reconciliation')
        expect(query).toHaveBeenCalledTimes(1)
    })

    it('rejects an invalid duplicate preflight result before DDL', async () => {
        const query = vi.fn().mockResolvedValueOnce([{ count: 'not-a-count' }])

        await expect(new AddClientVehiclePrimaryUniqueIndex1786320000000().up({ query } as never))
            .rejects.toThrow('duplicate preflight returned an invalid count')
        expect(query).toHaveBeenCalledTimes(1)
    })

    it('drops the index on rollback', async () => {
        const query = vi.fn().mockResolvedValue(undefined)

        await new AddClientVehiclePrimaryUniqueIndex1786320000000().down({ query } as never)

        expect(String(query.mock.calls[0]?.[0])).toContain('DROP INDEX IF EXISTS "public"."UQ_client_vehicles_primary"')
    })
})
