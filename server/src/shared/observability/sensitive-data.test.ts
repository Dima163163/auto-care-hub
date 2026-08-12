import { describe, expect, it } from 'vitest'

import {
    isSensitiveLogKey,
    sanitizeLogMetadata,
} from './sensitive-data.js'

describe('sensitive log metadata', () => {
    it('recognizes common credential-bearing keys', () => {
        expect(isSensitiveLogKey('password')).toBe(true)
        expect(isSensitiveLogKey('refreshToken')).toBe(true)
        expect(isSensitiveLogKey('requestId')).toBe(false)
    })

    it('redacts credential values while preserving operational metadata', () => {
        expect(sanitizeLogMetadata({
            password: 'secret-value',
            requestId: 'request-123',
            retries: 2,
        })).toEqual({
            password: '[REDACTED]',
            requestId: 'request-123',
            retries: 2,
        })
    })

    it('redacts sensitive keys inside nested objects and arrays', () => {
        expect(sanitizeLogMetadata({
            request: {
                headers: { authorization: 'Bearer secret' },
                attempts: [{ token: 'nested-secret', count: 1 }],
            },
        })).toEqual({
            request: {
                headers: { authorization: '[REDACTED]' },
                attempts: [{ token: '[REDACTED]', count: 1 }],
            },
        })
    })

    it('redacts credential-bearing URL and bearer values inside log strings', () => {
        expect(sanitizeLogMetadata({
            message: 'https://autocarehub.example/password/setup?token=one-time-secret&source=email',
            authorizationHeader: 'Bearer should-be-redacted',
        })).toEqual({
            message: 'https://autocarehub.example/password/setup?token=[REDACTED]&source=email',
            authorizationHeader: '[REDACTED]',
        })
    })
})
