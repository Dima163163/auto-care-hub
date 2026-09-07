import { describe, expect, it } from 'vitest'

import { summarizePostgresTransitionResults } from './smoke-autocare-postgres-transition.js'

describe('PostgreSQL transition smoke report', () => {
    it('accepts one committed winner and one conflict', () => {
        expect(summarizePostgresTransitionResults(['committed', 'conflict'], 'committed')).toMatchObject({
            schemaVersion: 1,
            status: 'pass',
            processCount: 2,
            committedCount: 1,
            conflictCount: 1,
            finalState: 'committed',
        })
    })

    it('rejects an ambiguous transition result', () => {
        expect(() => summarizePostgresTransitionResults(['committed', 'committed'], 'committed')).toThrow(/exactly one committed winner/)
        expect(() => summarizePostgresTransitionResults(['committed', 'conflict'], 'pending')).toThrow(/exactly one committed winner/)
    })
})
