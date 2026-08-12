import { describe, expect, it } from 'vitest'

import { createSchemaContractCheckResult } from './schema-contract-diagnostics.js'

const completeStatus = {
    missingTables: [],
    missingColumns: [],
    missingIndexes: [],
    missingConstraints: [],
    missingMigrations: [],
    aheadMigrations: [],
} as const

describe('schema contract diagnostics', () => {
    it('marks a complete contract as healthy', () => {
        expect(createSchemaContractCheckResult(completeStatus)).toEqual({
            ok: true,
            reasonCodes: [],
            status: completeStatus,
        })
    })

    it('returns bounded reason codes for an incomplete contract', () => {
        const status = {
            ...completeStatus,
            missingColumns: ['bookings.idempotency_key'],
            missingMigrations: ['RepairBookingIdempotencyKey1785430000000'],
        }

        expect(createSchemaContractCheckResult(status)).toEqual({
            ok: false,
            reasonCodes: ['missing_columns', 'pending_migrations'],
            status,
        })
    })
})

