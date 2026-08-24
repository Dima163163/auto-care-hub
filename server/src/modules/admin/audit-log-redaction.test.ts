import { describe, expect, it } from 'vitest'

import { redactAuditMetadata } from './audit-log-redaction.js'
import { assertAuditMetadataWithinBounds } from './audit-log-guards.js'

describe('audit metadata redaction', () => {
    it('redacts credentials at every supported nesting level', () => {
        expect(redactAuditMetadata({
            password: 'secret',
            nested: { token: 'token-value', safe: 'kept' },
        })).toEqual({
            password: '[REDACTED]',
            nested: { token: '[REDACTED]', safe: 'kept' },
        })
    })

    it('returns redacted data from the persistence guard', () => {
        expect(assertAuditMetadataWithinBounds({ email: 'private@example.com', action: 'login' })).toEqual({
            email: '[REDACTED]',
            action: 'login',
        })
    })

    it('redacts contact, vehicle and private request data case-insensitively', () => {
        expect(redactAuditMetadata({
            PhoneNumber: '+7 999 123-45-67',
            vin: 'JTM1234567890ABCD',
            issueDescription: 'Engine noise after a private visit',
            requestId: 'request-123',
        })).toEqual({
            PhoneNumber: '[REDACTED]',
            vin: '[REDACTED]',
            issueDescription: '[REDACTED]',
            requestId: 'request-123',
        })
    })
})
