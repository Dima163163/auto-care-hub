import { afterEach, describe, expect, it } from 'vitest'

import { formatCurrency } from './formatCurrency'

function normalizeSpaces(value: string) {
    return value.replace(/\s/g, ' ')
}

describe('formatCurrency', () => {
    afterEach(() => {
        window.localStorage.removeItem('autocare-hub-locale')
    })

    it('formats EUR value without fraction digits', () => {
        expect(normalizeSpaces(formatCurrency(1200))).toContain('1,200')
    })

    it('rounds fraction digits because maximumFractionDigits is 0', () => {
        expect(normalizeSpaces(formatCurrency(1200.6))).toContain('1,201')
    })

    it('formats zero value', () => {
        expect(normalizeSpaces(formatCurrency(0))).toContain('0')
    })

    it('uses the selected locale for currency separators', () => {
        window.localStorage.setItem('autocare-hub-locale', 'ru')

        expect(normalizeSpaces(formatCurrency(1200))).toContain('1 200')
    })
})
