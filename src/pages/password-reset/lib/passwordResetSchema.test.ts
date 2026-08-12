import { describe, expect, it } from 'vitest'

import { t } from '@/shared/lib/i18n'
import { createPasswordResetSchema } from './passwordResetSchema'

const schema = createPasswordResetSchema((key, params) =>
    t(key, params, 'en')
)

describe('password reset schema', () => {
    it('accepts matching passwords with at least 6 characters', () => {
        expect(
            schema.safeParse({
                password: 'secret123',
                confirmPassword: 'secret123',
            }).success
        ).toBe(true)
    })

    it('rejects short passwords', () => {
        expect(
            schema.safeParse({
                password: '12345',
                confirmPassword: '12345',
            }).success
        ).toBe(false)
    })

    it('rejects different passwords', () => {
        const result = schema.safeParse({
            password: 'secret123',
            confirmPassword: 'different123',
        })

        expect(result.success).toBe(false)

        if (!result.success) {
            expect(result.error.issues[0]?.path).toEqual(['confirmPassword'])
        }
    })
})
