import { describe, expect, it } from 'vitest'

import {
    getSecurityNotificationIdempotencyKey,
} from './security-notification-outbox.js'

describe('security notification outbox', () => {
    it('creates stable keys for repeated security events', () => {
        const input = {
            type: 'refresh_token_reuse' as const,
            userId: '123e4567-e89b-42d3-a456-426614174000',
            sessionId: '223e4567-e89b-42d3-a456-426614174000',
        }

        expect(getSecurityNotificationIdempotencyKey(input))
            .toBe(getSecurityNotificationIdempotencyKey({ ...input }))
    })

    it('separates different security event types', () => {
        const userId = '123e4567-e89b-42d3-a456-426614174000'
        expect(getSecurityNotificationIdempotencyKey({ type: 'account_deletion_requested', userId, requestId: 'request-1' }))
            .not.toBe(getSecurityNotificationIdempotencyKey({ type: 'account_deletion_requested', userId, requestId: 'request-2' }))
    })
})
