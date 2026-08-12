import { describe, expect, it } from 'vitest'

import { getAccountScopedStorageKey } from './get-account-scoped-storage-key'

describe('getAccountScopedStorageKey', () => {
    it('adds the account identity before resource segments', () => {
        expect(getAccountScopedStorageKey(
            'autocare-hub:owner-cabinet-edit:v2',
            'owner-1',
            'cabinet-1',
        )).toBe('autocare-hub:owner-cabinet-edit:v2:owner-1:cabinet-1')
    })

    it('does not create an anonymous storage key', () => {
        expect(getAccountScopedStorageKey('autocare-hub:draft:v2', null)).toBeNull()
    })
})
