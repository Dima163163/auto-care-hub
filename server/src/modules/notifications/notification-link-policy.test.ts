import { describe, expect, it } from 'vitest'

import { normalizeNotificationLink } from './notification-link-policy.js'

describe('notification link policy', () => {
    it('keeps internal links and null values', () => {
        expect(normalizeNotificationLink(' /profile/security ')).toBe('/profile/security')
        expect(normalizeNotificationLink(null)).toBeNull()
    })

    it('rejects external, protocol-relative, and traversal-shaped links', () => {
        expect(() => normalizeNotificationLink('https://example.com')).toThrow()
        expect(() => normalizeNotificationLink('//example.com')).toThrow()
        expect(() => normalizeNotificationLink('/profile\\security')).toThrow()
    })
})
