import { describe, expect, it } from 'vitest'

import { toPublicSession } from './session-response.js'

describe('public session serializer', () => {
    it('returns only the user-facing session fields', () => {
        expect(toPublicSession({
            id: 'session-1',
            userAgent: ' Browser ',
            ipAddress: ' 127.0.0.1 ',
            lastActiveAt: new Date('2026-07-29T08:00:00.000Z'),
        } as never, 'session-1')).toEqual({
            id: 'session-1',
            userAgent: 'Browser',
            ipAddress: '127.0.0.1',
            lastActiveAt: '2026-07-29T08:00:00.000Z',
            isCurrent: true,
        })
    })
})
