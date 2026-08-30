import { describe, expect, it } from 'vitest'

import {
    MAX_REQUEST_DESCRIPTION_LENGTH,
    MIN_REQUEST_DESCRIPTION_LENGTH,
    validateRequestDescription,
} from './request-description-validation'

describe('validateRequestDescription', () => {
    it('trims and accepts a bounded description', () => {
        expect(validateRequestDescription('  Не заводится утром  ')).toEqual({ valid: true, value: 'Не заводится утром' })
    })

    it('rejects empty and too-short descriptions', () => {
        expect(validateRequestDescription('   ')).toEqual({ valid: false, reason: 'required' })
        expect(validateRequestDescription('x'.repeat(MIN_REQUEST_DESCRIPTION_LENGTH - 1))).toEqual({ valid: false, reason: 'too_short' })
    })

    it('rejects descriptions over the server limit', () => {
        expect(validateRequestDescription('x'.repeat(MAX_REQUEST_DESCRIPTION_LENGTH + 1))).toEqual({ valid: false, reason: 'too_long' })
    })
})
