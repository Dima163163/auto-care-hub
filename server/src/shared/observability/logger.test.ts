import { describe, expect, it } from 'vitest'

import { serializeError } from './logger.js'

describe('structured error logging', () => {
    it('redacts sensitive markers from error messages', () => {
        expect(serializeError(new Error('OAuth token=very-secret-value'))).toEqual({
            name: 'Error',
            message: '[REDACTED_ERROR_MESSAGE]',
        })
        expect(serializeError(new Error('password: hunter2'))).toEqual({
            name: 'Error',
            message: '[REDACTED_ERROR_MESSAGE]',
        })
    })

    it('keeps bounded non-sensitive diagnostics', () => {
        expect(serializeError(new Error('Database connection timed out'))).toEqual({
            name: 'Error',
            message: 'Database connection timed out',
        })
        expect(serializeError('not-an-error')).toEqual({ name: 'UnknownError' })
    })

    it('preserves useful causes from aggregate startup failures', () => {
        expect(serializeError(new AggregateError([
            new Error('connect ECONNREFUSED 127.0.0.1:5432'),
            new Error('Redis unavailable'),
        ]))).toEqual({
            name: 'AggregateError',
            message: 'connect ECONNREFUSED 127.0.0.1:5432; Redis unavailable',
        })
    })
})
