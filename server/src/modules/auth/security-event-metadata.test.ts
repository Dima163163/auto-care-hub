import { describe, expect, it } from 'vitest'

import {
    MAX_SECURITY_EVENT_IP_LENGTH,
    MAX_SECURITY_EVENT_TIMESTAMP_LENGTH,
    normalizeSecurityEventMetadata,
} from './security-event-metadata.js'

describe('security event metadata', () => {
    it('keeps only bounded security fields', () => {
        const result = normalizeSecurityEventMetadata({
            failedLoginAttempts: 3,
            lockedUntil: '2'.repeat(MAX_SECURITY_EVENT_TIMESTAMP_LENGTH + 10),
            ipAddress: `  ${'1'.repeat(MAX_SECURITY_EVENT_IP_LENGTH + 10)}  `,
        })

        expect(result.failedLoginAttempts).toBe(3)
        expect(result.lockedUntil).toHaveLength(MAX_SECURITY_EVENT_TIMESTAMP_LENGTH)
        expect(result.ipAddress).toHaveLength(MAX_SECURITY_EVENT_IP_LENGTH)
    })

    it('normalizes absent optional fields', () => {
        expect(normalizeSecurityEventMetadata({})).toEqual({
            failedLoginAttempts: undefined,
            lockedUntil: null,
            ipAddress: null,
        })
    })
})
