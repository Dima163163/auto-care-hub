import { describe, expect, it, vi } from 'vitest'

import { AddRefreshTokenReuseSecurityEvent1785460000000 } from './migrations/1785460000000-AddRefreshTokenReuseSecurityEvent.js'
import { AddSecurityEventContext1785560000000 } from './migrations/1785560000000-AddSecurityEventContext.js'
import { AddMutationBurstSecurityEvent1785570000000 } from './migrations/1785570000000-AddMutationBurstSecurityEvent.js'
import { AddSecurityEventActionAssignee1785600000000 } from './migrations/1785600000000-AddSecurityEventActionAssignee.js'

describe('refresh-token security event migration', () => {
    it('expands the append-only type constraint without rewriting existing rows', async () => {
        const query = vi.fn().mockResolvedValue(undefined)

        await new AddRefreshTokenReuseSecurityEvent1785460000000().up({ query } as never)

        expect(query).toHaveBeenCalledTimes(2)
        expect(query.mock.calls[0]?.[0]).toContain('DROP CONSTRAINT')
        expect(query.mock.calls[1]?.[0]).toContain('refresh_token_reuse')
        expect(query.mock.calls[1]?.[0]).not.toContain('DELETE FROM')
    })

    it('adds bounded investigation context with safe defaults and indexes', async () => {
        const query = vi.fn().mockResolvedValue(undefined)

        await new AddSecurityEventContext1785560000000().up({ query } as never)

        expect(query).toHaveBeenCalledTimes(4)
        expect(query.mock.calls[0]?.[0]).toContain('actor_role')
        expect(query.mock.calls[0]?.[0]).toContain("DEFAULT 'unknown'")
        expect(query.mock.calls[1]?.[0]).toContain('CHK_security_events_request_size')
        expect(query.mock.calls[2]?.[0]).toContain('IDX_security_events_auth_outcome_created_at_id')
        expect(query.mock.calls[3]?.[0]).toContain('IDX_security_events_rate_limit_created_at_id')
    })

    it('adds mutation-burst events to the bounded type allowlist', async () => {
        const query = vi.fn().mockResolvedValue(undefined)

        await new AddMutationBurstSecurityEvent1785570000000().up({ query } as never)

        expect(query).toHaveBeenCalledTimes(2)
        expect(query.mock.calls[1]?.[0]).toContain('mutation_burst')
        expect(query.mock.calls[1]?.[0]).not.toContain('DELETE FROM')
    })

    it('adds an indexed nullable super-admin assignee to investigation actions', async () => {
        const query = vi.fn().mockResolvedValue(undefined)

        await new AddSecurityEventActionAssignee1785600000000().up({ query } as never)

        expect(query).toHaveBeenCalledTimes(2)
        expect(query.mock.calls[0]?.[0]).toContain('assignee_id')
        expect(query.mock.calls[0]?.[0]).toContain('FK_security_event_actions_assignee')
        expect(query.mock.calls[1]?.[0]).toContain('IDX_security_event_actions_assignee_created_at')
    })
})
