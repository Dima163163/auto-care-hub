import { describe, expect, it } from 'vitest'

import { getAdminLegacyListLimit, MAX_ADMIN_LEGACY_LIST } from './admin-list-policy.js'

describe('admin legacy list policy', () => {
    it('returns the finite compatibility list bound', () => {
        expect(getAdminLegacyListLimit()).toBe(MAX_ADMIN_LEGACY_LIST)
        expect(getAdminLegacyListLimit()).toBe(200)
    })
})
