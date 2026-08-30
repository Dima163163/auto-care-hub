import { describe, expect, it } from 'vitest'

import {
    parseNames,
    parseOptionalFiniteNumber,
    toMarketProfileInput,
    type MarketProfileDraft,
} from './market-hierarchy-form-utils'

const draft = (overrides: Partial<MarketProfileDraft> = {}): MarketProfileDraft => ({
    defaultLocale: 'ru',
    supportedLocales: 'ru, en',
    timezone: 'Europe/Moscow',
    currencyCode: 'rub',
    capabilities: '{"chat":true}',
    legalLinks: '{"privacy":"https://example.test/privacy"}',
    ...overrides,
})

describe('market hierarchy form utils', () => {
    it('normalizes locales/currency and trims localized names', () => {
        expect(toMarketProfileInput(draft())).toMatchObject({
            defaultLocale: 'ru',
            supportedLocales: ['ru', 'en'],
            currencyCode: 'RUB',
        })
        expect(parseNames('{" ru ": " Москва "}')).toEqual({ ru: 'Москва' })
    })

    it('rejects a default locale outside the supported list', () => {
        expect(() => toMarketProfileInput(draft({ defaultLocale: 'de' }))).toThrow('Основная локаль')
    })

    it('accepts only HTTP(S) legal links', () => {
        expect(() => toMarketProfileInput(draft({ legalLinks: '{"privacy":"javascript:alert(1)"}' }))).toThrow('HTTP(S)')
    })

    it('parses bounded optional numbers and rejects NaN/out-of-range values', () => {
        expect(parseOptionalFiniteNumber('55.75', 'Широта', -90, 90)).toBe(55.75)
        expect(parseOptionalFiniteNumber('', 'Широта', -90, 90)).toBeNull()
        expect(() => parseOptionalFiniteNumber('NaN', 'Широта', -90, 90)).toThrow()
        expect(() => parseOptionalFiniteNumber('181', 'Долгота', -180, 180)).toThrow()
    })
})
