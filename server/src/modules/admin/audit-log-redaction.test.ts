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
})
