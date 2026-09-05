import { describe, expect, it } from 'vitest'

import { assessReviewIntegrity, normalizeAutoCareReviewContent, normalizeReviewText } from './review-integrity-policy.js'

const at = (minutes: number) => new Date(Date.UTC(2026, 7, 22, 12, minutes))

describe('AutoCare review integrity policy', () => {
    it('normalizes punctuation and casing before duplicate comparison', () => {
        expect(normalizeReviewText(' Отличный сервис!   Быстро и честно. ')).toBe('отличный сервис быстро и честно')
    })

    it('flags a repeated request and repeated client text without mutating the rating', () => {
        const input = { clientId: 'client-1', providerId: 'provider-1', serviceRequestId: 'request-1', text: 'Отличный сервис', rating: 5, createdAt: at(10) }
        const result = assessReviewIntegrity(input, [{ ...input, createdAt: at(9) }, { ...input, createdAt: at(8), serviceRequestId: 'request-0' }], at(10))
        expect(result.flags).toContain('duplicate_text')
        expect(result.flags).toContain('duplicate_request')
        expect(result.needsModeration).toBe(true)
        expect(result.recencyWeight).toBe(1)
    })

    it('flags a coordinated rating burst across distinct clients', () => {
        const input = { clientId: 'client-4', providerId: 'provider-1', serviceRequestId: 'request-4', text: 'Нормально', rating: 5, createdAt: at(10) }
        const recent = [1, 2, 3].map((index) => ({ clientId: `client-${index}`, providerId: 'provider-1', serviceRequestId: `request-${index}`, text: `Отзыв ${index}`, rating: 5, createdAt: at(10 - index) }))
        expect(assessReviewIntegrity(input, recent, at(10)).flags).toContain('coordinated_burst')
    })

    it('decays older reviews deterministically', () => {
        const now = new Date(Date.UTC(2026, 7, 22))
        const old = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1_000)
        const result = assessReviewIntegrity({ clientId: null, providerId: 'provider-1', serviceRequestId: null, text: 'Старый отзыв', rating: 4, createdAt: old }, [], now)
        expect(result.recencyWeight).toBeCloseTo(0.3679, 3)
        expect(result.needsModeration).toBe(false)
    })

    it('normalizes review content at the service boundary and fails closed', () => {
        expect(normalizeAutoCareReviewContent({ rating: 5, text: '  Ａвтосервис быстро помог.  ' })).toEqual({ rating: 5, text: 'Aвтосервис быстро помог.' })
        expect(normalizeAutoCareReviewContent({ rating: 5.5, text: 'Достаточно длинный текст' })).toBeNull()
        expect(normalizeAutoCareReviewContent({ rating: 0, text: 'Достаточно длинный текст' })).toBeNull()
        expect(normalizeAutoCareReviewContent({ rating: 4, text: 'коротко' })).toBeNull()
        expect(normalizeAutoCareReviewContent({ rating: 4, text: null })).toBeNull()
    })
})
