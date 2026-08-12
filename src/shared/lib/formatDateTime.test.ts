import { afterEach, describe, expect, it } from 'vitest'

import { formatDateTime } from './formatDateTime'

describe('formatDateTime', () => {
    afterEach(() => {
        window.localStorage.removeItem('autocare-hub-locale')
    })

    it('formats an ISO timestamp with date and time', () => {
        const formatted = formatDateTime('2026-07-13T10:30:00.000Z')

        expect(formatted).toContain('2026')
        expect(formatted).toMatch(/\d{1,2}:\d{2}/)
    })

    it('accepts Date instances', () => {
        expect(formatDateTime(new Date('2026-01-05T08:15:00.000Z'))).toContain('2026')
    })

    it('uses the selected locale for month names', () => {
        window.localStorage.setItem('autocare-hub-locale', 'ru')

        expect(formatDateTime('2026-07-13T10:30:00.000Z')).toMatch(/июл|июля/i)
    })
})
