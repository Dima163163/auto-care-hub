import { describe, expect, it } from 'vitest'

import { sanitizeLogMetadata } from '../../shared/observability/sensitive-data.js'

describe('system incident metadata redaction', () => {
    it('redacts sensitive nested values before incident persistence', () => {
        expect(sanitizeLogMetadata({
            stripe: { token: 'secret', status: 'failed' },
            failureMessage: 'provider failed',
        })).toEqual({
            stripe: { token: '[REDACTED]', status: 'failed' },
            failureMessage: 'provider failed',
        })
    })
})
