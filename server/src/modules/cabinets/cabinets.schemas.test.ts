import { describe, expect, it } from 'vitest'

import { publicCabinetsQuerySchema } from './cabinets.schemas.js'

describe('public cabinet availability query', () => {
    it('accepts a bounded date and duration request', () => {
        expect(publicCabinetsQuerySchema.parse({
            availabilityDate: '2026-08-05',
            durationMinutes: '90',
        })).toMatchObject({
            availabilityDate: '2026-08-05',
            durationMinutes: 90,
        })
    })

    it('rejects malformed dates and oversized durations', () => {
        expect(() => publicCabinetsQuerySchema.parse({ availabilityDate: '2026-02-30' })).toThrow()
        expect(() => publicCabinetsQuerySchema.parse({ durationMinutes: '1441' })).toThrow()
    })
})
