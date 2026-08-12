import { describe, expect, it } from 'vitest'

import {
    assertIncidentMetadataWithinBounds,
    normalizeIncidentTitle,
} from './system-incidents.service.js'

describe('system incident guards', () => {
    it('normalizes title whitespace for stable deduplication', () => {
        expect(normalizeIncidentTitle('  Database   unavailable  ')).toBe('Database unavailable')
        expect(normalizeIncidentTitle('Database\u0000 unavailable')).toBe('Database unavailable')
    })

    it('rejects oversized incident metadata', () => {
        expect(() => assertIncidentMetadataWithinBounds({ detail: 'x'.repeat(20_000) }))
            .toThrow(/too large/)
    })

    it('keeps metadata size validation independent from redaction', () => {
        expect(assertIncidentMetadataWithinBounds({ token: 'secret-value' }))
            .toEqual({ token: 'secret-value' })
    })
})
