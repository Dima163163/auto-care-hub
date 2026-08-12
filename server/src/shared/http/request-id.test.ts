import { describe, expect, it } from 'vitest'

import { sanitizeIncomingRequestId } from './request-id.js'

describe('request id sanitizer', () => {
    it('keeps safe identifiers and trims transport whitespace', () => {
        expect(sanitizeIncomingRequestId('  edge_request-123  ')).toBe('edge_request-123')
    })

    it('rejects short, oversized, and header-injection values', () => {
        expect(sanitizeIncomingRequestId('short')).toBeUndefined()
        expect(sanitizeIncomingRequestId('a'.repeat(129))).toBeUndefined()
        expect(sanitizeIncomingRequestId('valid-id\nforged-header')).toBeUndefined()
        expect(sanitizeIncomingRequestId(undefined)).toBeUndefined()
    })
})
