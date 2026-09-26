import { describe, expect, it, vi } from 'vitest'

import type { I18nContextValue } from '@/shared/lib/i18n-context'

import { formatAutoCareCount, formatAutoCareReviewCount } from './formatAutoCareCount'

describe('formatAutoCareCount', () => {
    it('uses correct Russian singular and plural forms', () => {
        const translate: I18nContextValue['t'] = (key, params) => `${key}:${params?.count}`
        const t = vi.fn(translate)
        const keys = {
            one: 'autocare.resultCountOne',
            few: 'autocare.resultCountFew',
            many: 'autocare.resultCountMany',
            other: 'autocare.resultCountOther',
        } as const

        expect(formatAutoCareCount(1, 'ru', t, keys)).toContain('resultCountOne:1')
        expect(formatAutoCareCount(2, 'ru', t, keys)).toContain('resultCountFew:2')
        expect(formatAutoCareCount(5, 'ru', t, keys)).toContain('resultCountMany:5')
    })

    it('marks bounded result counts as lower bounds', () => {
        const translate: I18nContextValue['t'] = (key, params) => `${key}:${params?.count}`
        const t = vi.fn(translate)

        expect(formatAutoCareCount(5000, 'en', t, {
            one: 'autocare.resultCountOne',
            few: 'autocare.resultCountFew',
            many: 'autocare.resultCountMany',
            other: 'autocare.resultCountOther',
        }, true)).toContain('resultCountOther:5,000+')
    })

    it('uses singular and plural review labels in Russian and English', () => {
        const translate: I18nContextValue['t'] = (key, params) => `${key}:${params?.count}`
        const t = vi.fn(translate)

        expect(formatAutoCareReviewCount(1, 'ru', t)).toBe('autocare.reviewsOne:1')
        expect(formatAutoCareReviewCount(2, 'ru', t)).toBe('autocare.reviewsFew:2')
        expect(formatAutoCareReviewCount(1, 'en', t)).toBe('autocare.reviewsOne:1')
        expect(formatAutoCareReviewCount(2, 'en', t)).toBe('autocare.reviewsOther:2')
    })
})
