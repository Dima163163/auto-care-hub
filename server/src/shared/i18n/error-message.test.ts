import { describe, expect, it } from 'vitest'

import { getLocalizedErrorMessage } from './error-message.js'

describe('localized error messages', () => {
    it('uses the requested popular locale while preserving the error code contract', () => {
        expect(getLocalizedErrorMessage('UNAUTHORIZED', 'fallback', 'es'))
            .toBe('Inicia sesión para continuar.')
        expect(getLocalizedErrorMessage('UNAUTHORIZED', 'fallback', 'ar'))
            .toBe('سجّل الدخول للمتابعة.')
    })

    it('uses the original message when a translated message is unavailable', () => {
        expect(getLocalizedErrorMessage('BREACHED_PASSWORD', 'fallback', 'en'))
            .toBe('Choose a password that has not appeared in a known data breach.')
    })
})
