import { describe, expect, it } from 'vitest'

import {
    DEFAULT_LOCALE,
    LOCALE_OPTIONS,
    SUPPORTED_LOCALES,
    normalizeLocale,
} from './i18n'

describe('frontend locale registry', () => {
    it('exposes the same supported locale set as the language menu', () => {
        expect(LOCALE_OPTIONS.map((option) => option.value)).toEqual([...SUPPORTED_LOCALES])
        expect(LOCALE_OPTIONS.find((option) => option.value === 'ar')?.direction).toBe('rtl')
    })

    it('normalizes regional browser tags and falls back for unknown languages', () => {
        expect(normalizeLocale('pt-BR')).toBe('pt')
        expect(normalizeLocale('ZH-cn')).toBe('zh')
        expect(normalizeLocale('xx-YY')).toBeUndefined()
        expect(DEFAULT_LOCALE).toBe('en')
    })
})
