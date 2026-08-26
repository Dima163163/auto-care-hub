import { describe, expect, it } from 'vitest'

import { formatCurrency, formatDateTime, formatPlural, getIntlLocale } from './locale-format'

describe('locale formatting', () => {
    it('maps supported locales to stable Intl tags', () => {
        expect(getIntlLocale('ru')).toBe('ru-RU')
        expect(getIntlLocale('es')).toBe('es-ES')
        expect(getIntlLocale('ro')).toBe('ro-RO')
        expect(getIntlLocale('en')).toBe('en-US')
    })

    it('formats currency using the selected locale instead of the browser locale', () => {
        expect(formatCurrency(2900, 'RUB', 'ru')).toContain('2 900')
        expect(formatCurrency(2900, 'EUR', 'es')).toMatch(/(?:2900|2[.\u00a0]900)/)
    })

    it('formats dates with the selected locale', () => {
        const value = '2026-08-25T12:30:00.000Z'
        expect(formatDateTime(value, 'en', { timeZone: 'UTC', dateStyle: 'medium' })).toContain('Aug')
        expect(formatDateTime(value, 'ru', { timeZone: 'UTC', dateStyle: 'medium' })).toContain('авг')
    })

    it('uses locale-specific plural categories for customer-facing counts', () => {
        const forms = {
            one: 'service',
            few: 'services',
            many: 'services',
            other: 'services',
        }

        expect(formatPlural(1, 'en', forms)).toBe('service')
        expect(formatPlural(2, 'en', forms)).toBe('services')
        expect(formatPlural(1, 'ru', { one: 'сервис', few: 'сервиса', many: 'сервисов', other: 'сервисов' })).toBe('сервис')
        expect(formatPlural(5, 'ru', { one: 'сервис', few: 'сервиса', many: 'сервисов', other: 'сервисов' })).toBe('сервисов')
        expect(formatPlural(1, 'ro', { one: 'service', few: 'service', other: 'de servicii' })).toBe('service')
    })
})
