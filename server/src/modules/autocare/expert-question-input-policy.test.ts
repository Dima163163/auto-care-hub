import { describe, expect, it } from 'vitest'

import { normalizeAutoCareExpertQuestionInput } from './expert-question-input-policy.js'

describe('AutoCare expert question input policy', () => {
    it('canonicalizes symptoms, category and vehicle snapshot', () => {
        expect(normalizeAutoCareExpertQuestionInput({
            symptoms: '  Мотор глохнет после прогрева  ',
            categorySlug: '  engine-diagnostics  ',
            vehicleSnapshot: { make: ' BMW ', model: ' Ｘ５ ', year: 2021, vin: ' wba1234567890abcd ' },
        })).toEqual({
            symptoms: 'Мотор глохнет после прогрева',
            categorySlug: 'engine-diagnostics',
            vehicleSnapshot: { make: 'BMW', model: 'X5', year: 2021, vin: 'WBA1234567890ABCD' },
        })
    })

    it('normalizes omitted and explicit nullable fields to null', () => {
        expect(normalizeAutoCareExpertQuestionInput({ symptoms: 'Не заводится после ночной стоянки' })).toEqual({
            symptoms: 'Не заводится после ночной стоянки',
            categorySlug: null,
            vehicleSnapshot: null,
        })
        expect(normalizeAutoCareExpertQuestionInput({ symptoms: 'Не заводится после ночной стоянки', categorySlug: null, vehicleSnapshot: null })).toEqual({
            symptoms: 'Не заводится после ночной стоянки',
            categorySlug: null,
            vehicleSnapshot: null,
        })
    })

    it('rejects malformed text and unexpected top-level keys', () => {
        expect(normalizeAutoCareExpertQuestionInput({ symptoms: 'коротко' })).toBeNull()
        expect(normalizeAutoCareExpertQuestionInput({ symptoms: 'x'.repeat(4_001) })).toBeNull()
        expect(normalizeAutoCareExpertQuestionInput({ symptoms: 'Не заводится после ночной стоянки', unexpected: true })).toBeNull()
    })

    it('rejects malformed category and vehicle snapshots', () => {
        const symptoms = 'Не заводится после ночной стоянки'
        expect(normalizeAutoCareExpertQuestionInput({ symptoms, categorySlug: '   ' })).toBeNull()
        expect(normalizeAutoCareExpertQuestionInput({ symptoms, categorySlug: 42 })).toBeNull()
        expect(normalizeAutoCareExpertQuestionInput({ symptoms, vehicleSnapshot: { make: 'BMW', model: 'X5', year: 2021, unknown: true } })).toBeNull()
        expect(normalizeAutoCareExpertQuestionInput({ symptoms, vehicleSnapshot: { make: 'BMW', model: 'X5', year: 2021, mileage: -1 } })).toBeNull()
    })

    it('rejects non-object payloads and invalid nullable values', () => {
        expect(normalizeAutoCareExpertQuestionInput(null)).toBeNull()
        expect(normalizeAutoCareExpertQuestionInput([])).toBeNull()
        expect(normalizeAutoCareExpertQuestionInput({ symptoms: 'Не заводится после ночной стоянки', categorySlug: undefined, vehicleSnapshot: 'not-a-snapshot' })).toBeNull()
    })
})
