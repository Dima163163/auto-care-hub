import { describe, expect, it } from 'vitest'

import { normalizeCreateAdminInput } from './admin-create-input-policy.js'

describe('Admin creation input policy', () => {
    it('normalizes user data, origin and locale', () => {
        expect(normalizeCreateAdminInput(
            { name: '  Иван\n Петров ', email: ' ADMIN@EXAMPLE.COM ' },
            'https://app.example.com/',
            'RU-ru',
        )).toEqual({
            name: 'Иван Петров',
            email: 'admin@example.com',
            frontendOrigin: 'https://app.example.com',
            locale: 'ru',
        })
    })

    it('rejects unknown fields and malformed user input', () => {
        expect(normalizeCreateAdminInput(
            { name: 'Admin', email: 'admin@example.com', extra: true },
            'https://app.example.com',
            undefined,
        )).toBeNull()
        expect(normalizeCreateAdminInput(
            { name: 'Admin', email: 'not-an-email' },
            'https://app.example.com',
            undefined,
        )).toBeNull()
        expect(normalizeCreateAdminInput(
            { name: 'Admin', email: 'admin@example.com' },
            'https://evil.example.com/path',
            undefined,
        )).toBeNull()
    })

    it('requires a supported locale when one is provided', () => {
        expect(normalizeCreateAdminInput(
            { name: 'Admin', email: 'admin@example.com' },
            'https://app.example.com',
            'xx',
        )).toBeNull()
        expect(normalizeCreateAdminInput(
            { name: 'Admin', email: 'admin@example.com' },
            'https://app.example.com',
            null,
        )).toBeNull()
    })

    it('does not permit non-object payloads or unsafe origins', () => {
        expect(normalizeCreateAdminInput(null, 'https://app.example.com', undefined)).toBeNull()
        expect(normalizeCreateAdminInput([], 'https://app.example.com', undefined)).toBeNull()
        expect(normalizeCreateAdminInput(
            { name: 'Admin', email: 'admin@example.com' },
            'javascript:alert(1)',
            undefined,
        )).toBeNull()
    })
})
