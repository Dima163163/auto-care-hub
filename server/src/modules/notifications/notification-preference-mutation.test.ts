import { describe, expect, it } from 'vitest'

import { assertNotificationPreferenceMutation } from './notification-preference-mutation.js'

describe('notification preference mutation guard', () => {
    it('accepts supported boolean preference changes', () => {
        expect(assertNotificationPreferenceMutation({ emailNotifications: false })).toEqual({ emailNotifications: false })
    })

    it('rejects empty, unknown, and non-boolean mutations', () => {
        expect(() => assertNotificationPreferenceMutation({})).toThrow()
        expect(() => assertNotificationPreferenceMutation({ sms: true })).toThrow()
        expect(() => assertNotificationPreferenceMutation({ emailNotifications: 'false' })).toThrow()
    })
})
