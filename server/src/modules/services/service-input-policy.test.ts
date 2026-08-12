import { describe, expect, it } from 'vitest'

import {
    MAX_SERVICE_DESCRIPTION_LENGTH,
    MAX_SERVICE_LIST,
    normalizeServiceInput,
} from './service-input-policy.js'

describe('service input policy', () => {
    it('normalizes titles and descriptions and validates partial updates', () => {
        expect(normalizeServiceInput({
            title: '  Hair\ncut ',
            description: '  Short   description  ',
            durationMinutes: 45,
            price: 2_500,
        })).toEqual({
            title: 'Hair cut',
            description: 'Short description',
            durationMinutes: 45,
            price: 2_500,
        })
        expect(normalizeServiceInput({ price: 500 })).toEqual({ price: 500 })
        expect(MAX_SERVICE_LIST).toBe(200)
    })

    it('rejects invalid numeric and text values', () => {
        expect(() => normalizeServiceInput({ durationMinutes: 0 })).toThrow(/duration/)
        expect(() => normalizeServiceInput({ price: 1_000_001 })).toThrow(/price/)
        expect(() => normalizeServiceInput({ description: 'x'.repeat(MAX_SERVICE_DESCRIPTION_LENGTH + 1) })).toThrow(/description/)
    })
})
