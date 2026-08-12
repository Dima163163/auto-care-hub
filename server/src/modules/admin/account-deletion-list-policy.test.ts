import { describe, expect, it } from 'vitest'

import { getAdminDeletionListLimit, MAX_ADMIN_DELETION_LIST } from './account-deletion-list-policy.js'

describe('admin deletion list policy', () => {
    it('keeps compatibility lists bounded', () => {
        expect(getAdminDeletionListLimit()).toBe(MAX_ADMIN_DELETION_LIST)
        expect(getAdminDeletionListLimit()).toBe(200)
    })
})
