import { describe, expect, it } from 'vitest'

import { normalizeAutoCareRequestTransitionReason, normalizeAutoCareRescheduleInput, normalizeAutoCareRescheduleReason } from './reschedule-input-policy.js'

describe('AutoCare reschedule input policy', () => {
    it('normalizes an offset-aware reschedule and reason', () => {
        const result = normalizeAutoCareRescheduleInput({ proposedAt: '  2026-09-04T10:30:00.000+03:00  ', reason: '  Перенос визита  ' })
        expect(result?.proposedAt.toISOString()).toBe('2026-09-04T07:30:00.000Z')
        expect(result?.reason).toBe('Перенос визита')
    })

    it('uses null for omitted or blank reasons', () => {
        expect(normalizeAutoCareRescheduleInput({ proposedAt: '2026-09-04T10:30:00.000Z' })?.reason).toBeNull()
        expect(normalizeAutoCareRescheduleReason('   ')).toEqual({ valid: true, value: null })
        expect(normalizeAutoCareRescheduleReason(null)).toEqual({ valid: true, value: null })
        expect(normalizeAutoCareRequestTransitionReason('  Завершено без замечаний  ')).toEqual({ valid: true, value: 'Завершено без замечаний' })
    })

    it('rejects malformed direct-service values before Date or trim operations', () => {
        expect(normalizeAutoCareRescheduleInput(null)).toBeNull()
        expect(normalizeAutoCareRescheduleInput({ proposedAt: '2026-09-04T10:30:00.000' })).toBeNull()
        expect(normalizeAutoCareRescheduleInput({ proposedAt: 'not-a-date+03:00' })).toBeNull()
        expect(normalizeAutoCareRescheduleInput({ proposedAt: '2026-09-04T10:30:00.000Z', reason: 'x'.repeat(1_001) })).toBeNull()
        expect(normalizeAutoCareRescheduleReason(42)).toEqual({ valid: false })
    })
})
