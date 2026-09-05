import { describe, expect, it } from 'vitest'

import { normalizeNotificationsQueryInput } from './notification-query-policy.js'

describe('notification query policy', () => {
    it('normalizes cursor and category values', () => {
        expect(normalizeNotificationsQueryInput({ cursor: '  opaque  ', limit: 25, read: false, category: ' ACCOUNT ' })).toEqual({ cursor: 'opaque', limit: 25, read: false, category: 'account' })
    })

    it('treats an omitted query and blank cursor as empty filters', () => {
        expect(normalizeNotificationsQueryInput(undefined)).toEqual({})
        expect(normalizeNotificationsQueryInput({ cursor: '   ' })).toEqual({})
    })

    it('rejects malformed query values and oversized cursors', () => {
        expect(normalizeNotificationsQueryInput(null)).toBeNull()
        expect(normalizeNotificationsQueryInput({ cursor: 42 })).toBeNull()
        expect(normalizeNotificationsQueryInput({ limit: '25' })).toBeNull()
        expect(normalizeNotificationsQueryInput({ read: 'false' })).toBeNull()
        expect(normalizeNotificationsQueryInput({ cursor: 'x'.repeat(513) })).toBeNull()
    })

    it('rejects unsupported fields and categories', () => {
        expect(normalizeNotificationsQueryInput({ category: 'unknown' })).toBeNull()
        expect(normalizeNotificationsQueryInput({ extra: true })).toBeNull()
        expect(normalizeNotificationsQueryInput([])).toBeNull()
    })
})
