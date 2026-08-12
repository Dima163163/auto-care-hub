import { describe, expect, it } from 'vitest'

import {
    normalizeMarkAllReadResponse,
    normalizeNotificationPageResponse,
    normalizeNotificationResponse,
    normalizeUnreadCountResponse,
} from './notification-response-schema'

const notification = {
    id: 'notification-1',
    category: 'security' as const,
    title: 'Security event',
    message: 'A new security event was recorded.',
    link: null,
    metadata: {},
    readAt: null,
    createdAt: '2026-08-01T00:00:00.000Z',
}

describe('notification response schemas', () => {
    it('normalizes list and cursor page responses', () => {
        expect(normalizeNotificationPageResponse([notification])).toEqual({
            items: [notification],
            nextCursor: null,
        })
        expect(normalizeNotificationPageResponse({
            items: [notification],
            nextCursor: 'next',
        }).nextCursor).toBe('next')
    })

    it('validates mutation and unread-count responses', () => {
        expect(normalizeNotificationResponse(notification).id).toBe('notification-1')
        expect(normalizeUnreadCountResponse({ count: 3 }).count).toBe(3)
        expect(normalizeMarkAllReadResponse({ updated: 2 }).updated).toBe(2)
        expect(() => normalizeUnreadCountResponse({ count: -1 })).toThrow()
        expect(() => normalizeNotificationResponse({ ...notification, category: 'unknown' })).toThrow()
    })

    it('accepts only trimmed internal notification links', () => {
        expect(normalizeNotificationResponse({
            ...notification,
            link: ' /profile/security ',
        }).link).toBe('/profile/security')
        expect(normalizeNotificationResponse({ ...notification, link: '' }).link).toBeNull()
        expect(() => normalizeNotificationResponse({ ...notification, link: 'https://example.com' })).toThrow()
        expect(() => normalizeNotificationResponse({ ...notification, link: '//example.com' })).toThrow()
        expect(() => normalizeNotificationResponse({ ...notification, link: 'javascript:alert(1)' })).toThrow()
        expect(() => normalizeNotificationResponse({ ...notification, link: '/profile\\security' })).toThrow()
    })
})
