import { describe, expect, it } from 'vitest'
import { QueryFailedError } from 'typeorm'

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

    it('redacts contact and vehicle PII embedded in diagnostics', () => {
        expect(serializeError(new Error(
            'Unable to notify sofia.miller@example.com at +7 (999) 123-45-67 for VIN JTM1234567890ABCD',
        ))).toEqual({
            name: 'Error',
            message: 'Unable to notify [REDACTED_EMAIL] at [REDACTED_PHONE] for VIN [REDACTED_VIN]',
        })
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

    it('keeps SQL diagnostics without serializing query values or driver details', () => {
        const driverError = Object.assign(new Error('duplicate value: confidential repair notes'), {
            code: '23505',
            detail: 'Key (email)=(private-client@example.test) already exists.',
        })
        const error = new QueryFailedError('INSERT INTO messages VALUES (\'confidential repair notes\')', [
            'private-client@example.test', 'JTM1234567890ABCD', 'confidential repair notes',
        ], driverError)

        expect(serializeError(error)).toEqual({
            name: 'QueryFailedError',
            code: '23505',
            message: 'Database query failed.',
        })
    })

    it('redacts raw PostgreSQL errors and SQL errors nested in an aggregate', () => {
        const error = Object.assign(new Error('invalid input: confidential repair notes'), { code: '22P02' })
        expect(serializeError(error)).toEqual({ name: 'Error', code: '22P02', message: 'Database query failed.' })
        expect(serializeError(new AggregateError([error], 'Operation failed', { cause: error }))).toEqual({
            name: 'AggregateError',
            message: 'Operation failed; Database query failed.',
        })
    })

    it('bounds recursive aggregates and does not traverse attached causes', () => {
        const error = new AggregateError([], 'Operation failed')
        error.errors.push(error)
        Object.assign(error, { cause: new Error('private-client@example.test') })

        const result = serializeError(error)
        expect(result.name).toBe('AggregateError')
        expect(result.message?.length).toBeLessThanOrEqual(500)
        expect(JSON.stringify(result)).not.toContain('private-client')
    })

    it('does not throw when an error has unsafe property getters', () => {
        const error = new Error('Operation failed')
        Object.defineProperty(error, 'message', { get: () => { throw new Error('private data') } })

        expect(serializeError(error)).toEqual({ name: 'UnknownError' })
    })
})
