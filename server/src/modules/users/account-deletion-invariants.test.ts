import { describe, expect, it } from 'vitest'

import {
    AUTOCARE_DELETION_INVARIANTS,
    checkAutoCareDeletionInvariants,
} from './account-deletion-invariants.js'
import { ANONYMIZED_REVIEW_TEXT } from './account-anonymization-policy.js'

const chatScopedInvariantNames = [
    'account-related attachment metadata is removed',
    'account-related service message bodies and offers are redacted',
    'account-related chat report descriptions are redacted',
    'account-related chat block reasons are redacted',
]

const detachedActorInvariantNames = [
    'audit log actors are redacted',
    'service request actor references are detached',
    'provider change reviewers are detached',
    'catalog gap reviewers are detached',
    'appeal deciders are detached',
    'chat report reviewers are detached',
    'guarantee claim resolvers are detached',
    'expert question answerers are detached',
]

describe('AutoCare account deletion chat scope', () => {
    it('keeps legacy cabinets private after owner deletion', () => {
        const invariant = AUTOCARE_DELETION_INVARIANTS.find(({ name }) => name === 'legacy cabinets are blocked and images removed')

        expect(invariant?.sql).toContain('"cabinets"')
        expect(invariant?.sql).toContain('"status" <> \'blocked\'')
        expect(invariant?.sql).toContain('cardinality("photos") > 0')
    })

    it('uses durable thread ownership instead of mutable subject text', () => {
        const invariants = AUTOCARE_DELETION_INVARIANTS.filter(({ name }) => chatScopedInvariantNames.includes(name))

        expect(invariants).toHaveLength(chatScopedInvariantNames.length)
        for (const invariant of invariants) {
            expect(invariant.sql).toContain('thread."clientId" = $1')
            expect(invariant.sql).toContain('thread."createdById" = $1')
            expect(invariant.sql).not.toContain('thread."subject" = $2')
        }
    })

    it('passes only the account id to chat-scoped checks', async () => {
        const calls: Array<{ sql: string; parameters: unknown[] }> = []
        const executor = {
            query: async (sql: string, parameters: unknown[] = []) => {
                calls.push({ sql, parameters })
                return [{ count: 0 }]
            },
        } as Parameters<typeof checkAutoCareDeletionInvariants>[0]

        await checkAutoCareDeletionInvariants(executor, 'user-42')

        for (const invariant of AUTOCARE_DELETION_INVARIANTS.filter(({ name }) => chatScopedInvariantNames.includes(name))) {
            const call = calls.find(({ sql }) => sql === invariant.sql)
            expect(call?.parameters).toEqual(['user-42'])
        }
    })

    it('keeps detached actor checks independent from redaction text parameters', () => {
        const invariants = AUTOCARE_DELETION_INVARIANTS.filter(({ name }) => detachedActorInvariantNames.includes(name))

        expect(invariants).toHaveLength(detachedActorInvariantNames.length)
        for (const invariant of invariants) {
            expect(invariant.sql).toContain('= $1')
            expect(invariant.sql).not.toContain('$2')
        }
    })

    it('binds anonymized thread checks to the redaction marker parameter', async () => {
        const calls: Array<{ sql: string; parameters: unknown[] }> = []
        const executor = {
            query: async (sql: string, parameters: unknown[] = []) => {
                calls.push({ sql, parameters })
                return [{ count: 0 }]
            },
        } as Parameters<typeof checkAutoCareDeletionInvariants>[0]

        await checkAutoCareDeletionInvariants(executor, 'user-42')

        const anonymizedChecks = AUTOCARE_DELETION_INVARIANTS.filter(({ parameterMode }) => parameterMode === 'anonymized')
        expect(anonymizedChecks.length).toBeGreaterThan(0)
        for (const invariant of anonymizedChecks) {
            expect(invariant.sql).toContain('thread."subject" = $1')
            expect(calls.find(({ sql }) => sql === invariant.sql)?.parameters).toEqual([ANONYMIZED_REVIEW_TEXT])
        }
    })
})
