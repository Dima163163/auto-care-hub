import { describe, expect, it, vi } from 'vitest'

import { CreateAutoCareCatalogGapRequests1786100000000 } from './migrations/1786100000000-CreateAutoCareCatalogGapRequests.js'

describe('AutoCare catalog gap migration', () => {
    it('creates a deduplicated admin review queue', async () => {
        const query = vi.fn().mockResolvedValue(undefined)
        await new CreateAutoCareCatalogGapRequests1786100000000().up({ query } as never)
        const statements = query.mock.calls.map(([sql]) => String(sql))
        expect(statements.some((sql) => sql.includes('autocare_catalog_gap_requests'))).toBe(true)
        expect(statements.some((sql) => sql.includes('UQ_autocare_catalog_gap_requests_pending_slug'))).toBe(true)
        expect(statements.some((sql) => sql.includes('CHK_autocare_catalog_gap_requests_rationale'))).toBe(true)
    })
})
