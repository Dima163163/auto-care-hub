import { describe, expect, it } from 'vitest'

import { DEFAULT_LOCALE } from '../../config/i18n.js'
import { getEmailLocale, getRequestLocale, MAX_ACCEPT_LANGUAGE_LENGTH } from './request-locale.js'

function requestWithAcceptLanguage(acceptLanguage?: string) {
    return { headers: { 'accept-language': acceptLanguage } } as never
}

describe('request locale', () => {
    it('selects the first supported base locale', () => {
        expect(getRequestLocale(requestWithAcceptLanguage('de-DE, RU;q=0.9'))).toBe('de')
        expect(getRequestLocale(requestWithAcceptLanguage('ro-RO,en;q=0.8'))).toBe('ro')
    })

    it('respects quality weights and keeps header order for equal weights', () => {
        expect(getRequestLocale(requestWithAcceptLanguage('de;q=0.4,es;q=0.9,fr;q=0.9'))).toBe('es')
        expect(getRequestLocale(requestWithAcceptLanguage('xx;q=0.9,ja-JP;q=0.8'))).toBe('ja')
    })

    it('falls back for missing or oversized headers', () => {
        expect(getRequestLocale(requestWithAcceptLanguage())).toBe(DEFAULT_LOCALE)
        expect(getRequestLocale(requestWithAcceptLanguage('x'.repeat(MAX_ACCEPT_LANGUAGE_LENGTH + 1))))
            .toBe(DEFAULT_LOCALE)
    })

    it('prefers the stored account locale for email delivery', () => {
        expect(getEmailLocale('de', requestWithAcceptLanguage('en-US'))).toBe('de')
        expect(getEmailLocale(null, requestWithAcceptLanguage('fr-FR'))).toBe('fr')
    })
})
