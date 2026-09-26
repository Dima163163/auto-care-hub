import { describe, expect, it } from 'vitest'

import {
    DEFAULT_LOCALE,
    LOCALE_OPTIONS,
    SUPPORTED_LOCALES,
    VISIBLE_LOCALE_OPTIONS,
    VISIBLE_LOCALES,
    normalizeLocale,
} from './i18n'

describe('frontend locale registry', () => {
    it('exposes only Russian and English in the language menu', () => {
        expect(VISIBLE_LOCALE_OPTIONS.map((option) => option.value)).toEqual([...VISIBLE_LOCALES])
        expect(SUPPORTED_LOCALES).toContain('es')
        expect(LOCALE_OPTIONS.find((option) => option.value === 'ar')?.direction).toBe('rtl')
    })

    it('normalizes regional browser tags and falls back for unknown languages', () => {
        expect(normalizeLocale('pt-BR')).toBe('pt')
        expect(normalizeLocale('ZH-cn')).toBe('zh')
        expect(normalizeLocale('xx-YY')).toBeUndefined()
        expect(DEFAULT_LOCALE).toBe('en')
    })
})
