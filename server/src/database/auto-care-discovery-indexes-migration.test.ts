import { describe, expect, it, vi } from 'vitest'

import { OptimizeAutoCareDiscoveryIndexes1786150000000 } from './migrations/1786150000000-OptimizeAutoCareDiscoveryIndexes.js'

describe('AutoCare discovery indexes migration', () => {
    it('adds indexes matching the portable market/radius discovery query', async () => {
        const query = vi.fn().mockResolvedValue(undefined)

        await new OptimizeAutoCareDiscoveryIndexes1786150000000().up({ query } as never)

        const statements = query.mock.calls.map(([sql]) => String(sql))
        expect(statements.some((sql) => sql.includes('IDX_autocare_locations_market_latitude_longitude'))).toBe(true)
        expect(statements.some((sql) => sql.includes('IDX_autocare_offerings_discovery_active'))).toBe(true)
        expect(statements.some((sql) => sql.includes('IDX_autocare_providers_discovery_active_rating'))).toBe(true)
        expect(statements.every((sql) => sql.includes('CREATE INDEX'))).toBe(true)
    })
})
