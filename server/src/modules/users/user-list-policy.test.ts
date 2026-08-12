import { describe, expect, it } from 'vitest'

import { getOwnerClientListLimit, MAX_OWNER_CLIENTS } from './user-list-policy.js'

describe('user list policy', () => {
    it('keeps owner client lists bounded', () => {
        expect(getOwnerClientListLimit()).toBe(MAX_OWNER_CLIENTS)
        expect(getOwnerClientListLimit()).toBe(500)
    })
})
