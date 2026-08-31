import { describe, expect, it, vi } from 'vitest'

import { AllowSecurityEventUserDetachment1786270000000 } from './migrations/1786270000000-AllowSecurityEventUserDetachment.js'

describe('security event user detachment migration', () => {
    it('allows only privacy-redacted user detachment', async () => {
        const query = vi.fn().mockResolvedValue(undefined)

        await new AllowSecurityEventUserDetachment1786270000000().up({ query } as never)

        const sql = query.mock.calls[0]?.[0] as string
        expect(sql).toContain("app.security_event_privacy_cleanup")
        expect(sql).toContain('NEW.user_id IS NULL OR NEW.user_id IS NOT DISTINCT FROM OLD.user_id')
        expect(sql).toContain("NEW.metadata ? 'privacyRedactedAt'")
        expect(sql).toContain('NEW.ip_address IS NULL')
        expect(sql).toContain('NEW.user_agent IS NULL')
    })
})
