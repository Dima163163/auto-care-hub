import { describe, expect, it } from 'vitest'

import { t } from '@/shared/lib/i18n'
import { createForgotPasswordSchema } from './forgotPasswordSchema'

const schema = createForgotPasswordSchema((key, params) =>
    t(key, params, 'en')
)

describe('forgot password schema', () => {
    it('accepts a valid email', () => {
        expect(
            schema.safeParse({
                email: 'client@example.com',
            }).success
        ).toBe(true)
    })

    it('rejects an invalid email', () => {
        expect(
            schema.safeParse({
                email: 'invalid-email',
            }).success
        ).toBe(false)
    })
})
