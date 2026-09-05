import { describe, expect, it } from 'vitest'
import { normalizeAutoCareAvailabilityDate, normalizeAutoCareAvailabilityUuid } from './availability-input-policy.js'

describe('AutoCare availability input policy', () => {
    it('canonicalizes provider, location and offering UUIDs', () => {
        expect(normalizeAutoCareAvailabilityUuid('  11111111-1111-4111-8111-111111111111 ')).toBe('11111111-1111-4111-8111-111111111111')
        expect(normalizeAutoCareAvailabilityUuid('availability-1')).toBeNull()
    })

    it('accepts real calendar dates and normalizes whitespace', () => {
        expect(normalizeAutoCareAvailabilityDate(' 2026-09-04 ')).toBe('2026-09-04')
        expect(normalizeAutoCareAvailabilityDate('2024-02-29')).toBe('2024-02-29')
    })

    it('rejects impossible dates and non-date values', () => {
        expect(normalizeAutoCareAvailabilityDate('2026-02-29')).toBeNull()
        expect(normalizeAutoCareAvailabilityDate('2026-13-01')).toBeNull()
        expect(normalizeAutoCareAvailabilityDate('tomorrow')).toBeNull()
        expect(normalizeAutoCareAvailabilityDate(20260904)).toBeNull()
    })
})
