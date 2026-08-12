import { describe, expect, it } from 'vitest'

import { ERROR_CODES } from './error-codes.js'
import { createApiErrorResponse } from './api-error-response.js'

describe('API error response builder', () => {
    it('keeps the public error envelope stable', () => {
        expect(createApiErrorResponse({
            statusCode: 400,
            code: ERROR_CODES.ValidationError,
            message: 'Validation failed.',
            details: [{ path: 'email', message: 'Invalid email.' }],
            requestId: 'request-123',
        })).toEqual({
            statusCode: 400,
            code: ERROR_CODES.ValidationError,
            message: 'Validation failed.',
            details: [{ path: 'email', message: 'Invalid email.' }],
            requestId: 'request-123',
        })
    })
})
