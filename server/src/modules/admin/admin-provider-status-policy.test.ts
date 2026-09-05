import { describe, expect, it } from 'vitest'

import { AutomotiveProviderStatus } from '../../entities/automotive/automotive.entity.js'
import { normalizeAdminProviderStatus, normalizeAdminProviderUuid } from './admin-provider-status-policy.js'

describe('admin provider status input policy', () => {
    it('normalizes provider UUIDs and statuses', () => {
        expect(normalizeAdminProviderUuid(' 00000000-0000-4000-8000-000000000001 ')).toBe('00000000-0000-4000-8000-000000000001')
        expect(normalizeAdminProviderStatus('  SUSPENDED ')).toBe(AutomotiveProviderStatus.Suspended)
    })

    it('rejects malformed provider identifiers and statuses', () => {
        expect(normalizeAdminProviderUuid('provider-1')).toBeNull()
        expect(normalizeAdminProviderStatus('archived')).toBeNull()
        expect(normalizeAdminProviderStatus(null)).toBeNull()
    })
})
