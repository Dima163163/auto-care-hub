import { beforeAll, describe, expect, it } from 'vitest'

import { loadAllTranslations } from '@/shared/config/translations'
import { getLoginErrorMessage } from './get-login-error-message'

describe('getLoginErrorMessage', () => {
    beforeAll(async () => {
        await loadAllTranslations()
    })

    it('shows a neutral sign-in failure for rejected credentials', () => {
        expect(getLoginErrorMessage({
            status: 401,
            data: {
                code: 'UNAUTHORIZED',
                message: 'Invalid email or password.',
            },
        }, 'Не удалось войти.')).toBe('Не удалось войти.')
    })

    it('keeps an expired-session message distinct from invalid credentials', () => {
        expect(getLoginErrorMessage({
            status: 401,
            data: {
                code: 'SESSION_EXPIRED',
            },
        }, 'Не удалось войти.')).toBe('Your session has expired')
    })

    it('keeps the fallback for network failures', () => {
        expect(getLoginErrorMessage({
            status: 'FETCH_ERROR',
            error: 'TypeError: Failed to fetch',
        }, 'Не удалось войти.')).toBe('The connection was interrupted. Check your internet connection and try again.')
    })
})
