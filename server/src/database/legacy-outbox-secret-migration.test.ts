import { describe, expect, it, vi } from 'vitest'

import { RedactLegacyOutboxTokenPayloads1785470000000 } from './migrations/1785470000000-RedactLegacyOutboxTokenPayloads.js'

describe('legacy outbox token redaction migration', () => {
    it('redacts legacy auth tokens and blocks undelivered events from retrying', async () => {
        const query = vi.fn().mockResolvedValue(undefined)

        await new RedactLegacyOutboxTokenPayloads1785470000000().up({ query } as never)

        expect(query).toHaveBeenCalledTimes(1)
        const sql = query.mock.calls[0]?.[0] as string
        expect(sql).toContain('"payload" = "payload" - \'token\'')
        expect(sql).toContain("'dead_letter'::\"public\".\"outbox_event_status\"")
        expect(sql).toContain("'Legacy auth token payload redacted by migration 1785470000000.'")
        expect(sql).toContain("'email_verification'")
        expect(sql).not.toContain('DELETE FROM')
    })

    it('does not attempt an unsafe rollback', async () => {
        const query = vi.fn()

        await new RedactLegacyOutboxTokenPayloads1785470000000().down({ query } as never)

        expect(query).not.toHaveBeenCalled()
    })
})
