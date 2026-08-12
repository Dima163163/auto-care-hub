import { describe, expect, it } from 'vitest'

import { UserRole } from '../../entities/user/user.entity.js'
import { getSecurityEvents, toSecurityEventResponse } from './security-events.service.js'

describe('security event reader', () => {
    it('requires a super administrator before touching the database', async () => {
        await expect(getSecurityEvents({ role: UserRole.Admin } as never)).rejects.toMatchObject({
            statusCode: 403,
        })
    })

    it('redacts IP addresses while preserving investigation fields', () => {
        expect(toSecurityEventResponse({
            id: 'event-1',
            userId: 'user-1',
            type: 'login_failed',
            failedLoginAttempts: 2,
            lockedUntil: null,
            ipAddress: '192.0.2.42',
            userAgent: 'Browser',
            correlationId: 'request-1',
            createdAt: new Date('2026-08-01T12:00:00.000Z'),
        } as never)).toEqual({
            id: 'event-1',
            userId: 'user-1',
            type: 'login_failed',
            failedLoginAttempts: 2,
            lockedUntil: null,
            ipAddress: '192.0.2.*',
            userAgent: 'Browser',
            correlationId: 'request-1',
            createdAt: '2026-08-01T12:00:00.000Z',
        })
    })
})
