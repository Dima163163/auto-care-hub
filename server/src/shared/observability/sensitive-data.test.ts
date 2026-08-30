import { describe, expect, it } from 'vitest'

import {
    isSensitiveLogKey,
    sanitizeLogMetadata,
    sanitizeLogString,
} from './sensitive-data.js'

describe('sensitive log metadata', () => {
    it('recognizes common credential-bearing keys', () => {
        expect(isSensitiveLogKey('password')).toBe(true)
        expect(isSensitiveLogKey('refreshToken')).toBe(true)
        expect(isSensitiveLogKey('email')).toBe(true)
        expect(isSensitiveLogKey('vin')).toBe(true)
        expect(isSensitiveLogKey('contactSnapshot')).toBe(true)
        expect(isSensitiveLogKey('licensePlate')).toBe(true)
        expect(isSensitiveLogKey('requestId')).toBe(false)
    })

    it('redacts credential values while preserving operational metadata', () => {
        expect(sanitizeLogMetadata({
            password: 'secret-value',
            email: 'private@example.com',
            requestId: 'request-123',
            retries: 2,
        })).toEqual({
            password: '[REDACTED]',
            email: '[REDACTED]',
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

    it('redacts automotive and contact PII without hiding operational fields', () => {
        expect(sanitizeLogMetadata({
            phoneNumber: '+7 999 123-45-67',
            vinNumber: 'JTM1234567890ABCD',
            contactSnapshot: { name: 'Private client', phone: '+7 999 123-45-67' },
            serviceRequestId: 'request-123',
        })).toEqual({
            phoneNumber: '[REDACTED]',
            vinNumber: '[REDACTED]',
            contactSnapshot: '[REDACTED]',
            serviceRequestId: 'request-123',
        })
    })

    it('redacts raw PII embedded in messages while preserving operational addresses', () => {
        expect(sanitizeLogString(
            'Failed for sofia.miller@example.com, phone +7 (999) 123-45-67, VIN JTM1234567890ABCD; database 127.0.0.1:5432',
        )).toBe(
            'Failed for [REDACTED_EMAIL], phone [REDACTED_PHONE], VIN [REDACTED_VIN]; database 127.0.0.1:5432',
        )
        expect(sanitizeLogString(
            'Migration id 1787550983850 and request id 3f60b204-562d-4201-8288-ecbae79b2001',
        )).toBe(
            'Migration id 1787550983850 and request id 3f60b204-562d-4201-8288-ecbae79b2001',
        )
    })
})
