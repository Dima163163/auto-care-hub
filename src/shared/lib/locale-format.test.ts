import { describe, expect, it } from 'vitest'

import { formatAutoCareSlot, formatCurrency, formatDateTime, formatDistanceKm, formatPlural, getIntlLocale, parseDistanceKm } from './locale-format'

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

    it('formats distances using numeric kilometers and locale-aware units', () => {
        expect(parseDistanceKm('2.1 km')).toBe(2.1)
        expect(parseDistanceKm('4,2 км')).toBe(4.2)
        expect(formatDistanceKm(2.1, 'ru')).toContain('2,1')
        expect(formatDistanceKm(undefined, 'en')).toBe('—')
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

    it('formats automotive availability slots with the selected locale', () => {
        expect(formatAutoCareSlot('Today, 14:30', 'en')).toBe('Today, 14:30')
        expect(formatAutoCareSlot('Tomorrow, 09:30', 'ru')).toBe('Завтра, 09:30')
        expect(formatAutoCareSlot('Today, 14:30', 'es')).toBe('Hoy, 14:30')
        expect(formatAutoCareSlot('—', 'en')).toBe('—')
    })
})
