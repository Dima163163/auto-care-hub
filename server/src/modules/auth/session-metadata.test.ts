import { describe, expect, it } from 'vitest'

import { normalizeSessionMetadata } from './session-metadata.js'

describe('session metadata bounds', () => {
    it('trims optional metadata and preserves absent values', () => {
        expect(normalizeSessionMetadata({ userAgent: ' Browser ', ipAddress: ' 127.0.0.1 ' }))
            .toEqual({ userAgent: 'Browser', ipAddress: '127.0.0.1' })
        expect(normalizeSessionMetadata({})).toEqual({ userAgent: null, ipAddress: null })
    })

    it('rejects oversized user-agent and IP metadata', () => {
        expect(() => normalizeSessionMetadata({ userAgent: 'x'.repeat(513) })).toThrow(/user agent/)
        expect(() => normalizeSessionMetadata({ ipAddress: 'x'.repeat(65) })).toThrow(/IP/)
    })
})
