import { describe, expect, it } from 'vitest'

import { AppError } from '../../shared/errors/app-error'
import { ERROR_CODES } from '../../shared/errors/error-codes'
import { assertCurrentSessionVersion } from './session-version'

describe('session version validation', () => {
    it('accepts a token issued for the current session version', () => {
        expect(() => assertCurrentSessionVersion(4, 4)).not.toThrow()
    })

    it('rejects a token issued before the session version changed', () => {
        expect(() => assertCurrentSessionVersion(4, 3)).toThrow(AppError)

        try {
            assertCurrentSessionVersion(4, 3)
        } catch (error) {
            expect((error as AppError).statusCode).toBe(401)
            expect((error as AppError).code).toBe(ERROR_CODES.Unauthorized)
        }
    })
})
