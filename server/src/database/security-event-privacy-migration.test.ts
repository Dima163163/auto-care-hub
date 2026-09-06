import { describe, expect, it, vi } from 'vitest'

import { AddSecurityEventPrivacyCleanup1785590000000 } from './migrations/1785590000000-AddSecurityEventPrivacyCleanup.js'

describe('security event privacy migration', () => {
    it('allows only the bounded privacy cleanup mutation path', async () => {
        const query = vi.fn().mockResolvedValue(undefined)

        await new AddSecurityEventPrivacyCleanup1785590000000().up({ query } as never)

        expect(query).toHaveBeenCalledTimes(1)
        expect(query.mock.calls[0]?.[0]).toContain("app.security_event_privacy_cleanup")
        expect(query.mock.calls[0]?.[0]).toContain("NEW.metadata ? 'privacyRedactedAt'")
        expect(query.mock.calls[0]?.[0]).toContain("NEW.ip_address IS NULL")
        expect(query.mock.calls[0]?.[0]).toContain('NEW.user_id IS NOT DISTINCT FROM OLD.user_id')
    })

    it('restores append-only security events on rollback', async () => {
        const query = vi.fn().mockResolvedValue(undefined)

        await new AddSecurityEventPrivacyCleanup1785590000000().down({ query } as never)

        expect(query).toHaveBeenCalledTimes(1)
        expect(query.mock.calls[0]?.[0]).not.toContain('app.security_event_privacy_cleanup')
    })
})
