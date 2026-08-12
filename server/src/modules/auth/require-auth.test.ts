import { describe, expect, it } from 'vitest'

import { AppError } from '../../shared/errors/app-error.js'
import { parseBearerToken } from './bearer-token.js'

describe('parseBearerToken', () => {
    it.each([
        ['missing header', undefined],
        ['basic authentication', 'Basic credentials'],
        ['missing token', 'Bearer'],
        ['multiple tokens', 'Bearer access-token extra'],
        ['token in the scheme position', 'access-token Bearer'],
    ])('rejects %s', (_label, header) => {
        expect(() => parseBearerToken(header)).toThrow(AppError)
    })

    it('accepts a case-insensitive scheme with surrounding whitespace', () => {
        expect(parseBearerToken('  bearer\taccess-token  ')).toBe('access-token')
    })
})
