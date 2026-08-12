import { describe, expect, it } from 'vitest'

import {
    MAX_CABINET_AMENITIES,
    MAX_CABINET_DESCRIPTION_LENGTH,
    MAX_OWNER_CABINETS,
    normalizeCabinetAddress,
    normalizeCabinetAmenities,
    normalizeCabinetCity,
    normalizeCabinetDescription,
    normalizeCabinetPolicy,
    normalizeCabinetTimezone,
} from './cabinet-content-policy.js'

describe('cabinet content policy', () => {
    it('normalizes cabinet content and validates timezones', () => {
        expect(normalizeCabinetDescription('  A useful\n description  ')).toBe('A useful description')
        expect(normalizeCabinetAddress('  Main   street ')).toBe('Main street')
        expect(normalizeCabinetCity('  Samara ')).toBe('Samara')
        expect(normalizeCabinetPolicy('')).toBeNull()
        expect(normalizeCabinetAmenities(['Wi-Fi', ' Wi-Fi '])).toEqual(['Wi-Fi'])
        expect(normalizeCabinetTimezone('Europe/Samara')).toBe('Europe/Samara')
        expect(MAX_OWNER_CABINETS).toBe(200)
    })

    it('rejects oversized or invalid cabinet content', () => {
        expect(() => normalizeCabinetDescription('x'.repeat(MAX_CABINET_DESCRIPTION_LENGTH + 1))).toThrow(/description/)
        expect(() => normalizeCabinetAmenities(Array.from({ length: MAX_CABINET_AMENITIES + 1 }, (_, index) => `a${index}`))).toThrow(/amenities/)
        expect(() => normalizeCabinetTimezone('Not/A_Timezone')).toThrow(/timezone/)
    })
})
