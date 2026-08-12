import { z } from 'zod'

import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import {
    checkBreachedPassword,
    type BreachedPasswordCheckResult,
} from './breached-password.js'
import {
    getBreachedPasswordClientPolicy,
    type BreachedPasswordCheckMode,
} from './breached-password-policy.js'

const COMMON_PASSWORDS = new Set([
    '123456',
    '12345678',
    'admin',
    'changeme',
    'iloveyou',
    'letmein',
    'password',
    'qwerty',
    'welcome',
])

export const passwordSchema = z
    .string()
    .min(8, 'Password must contain at least 8 characters.')
    .max(128, 'Password must contain at most 128 characters.')
    .refine((password) => !COMMON_PASSWORDS.has(password.trim().toLowerCase()), {
        message: 'Choose a less common password.',
    })

export function assertPasswordPolicy(password: string) {
    const result = passwordSchema.safeParse(password)
    if (!result.success) {
        throw new Error('Password does not satisfy the security policy.')
    }

    return result.data
}

export function assertPasswordVerificationInput(password: string) {
    if (password.length < 1 || password.length > 128) {
        throw new Error('Password input is outside the accepted bounds.')
    }

    return password
}

export async function assertPasswordSecurityPolicy(
    password: string,
    options: {
        mode: BreachedPasswordCheckMode
        timeoutMs?: number
        fetchImpl?: typeof fetch
    },
) {
    const normalizedPassword = assertPasswordPolicy(password)
    const policy = getBreachedPasswordClientPolicy(options.mode)
    const result: BreachedPasswordCheckResult = await checkBreachedPassword(
        normalizedPassword,
        {
            mode: policy.mode,
            timeoutMs: options.timeoutMs ?? policy.timeoutMs,
            fetchImpl: options.fetchImpl,
        },
    )

    if (result.status === 'breached') {
        throw new AppError({
            statusCode: 400,
            code: ERROR_CODES.BreachedPassword,
            message: 'Choose a password that has not appeared in a known data breach.',
        })
    }

    if (result.status === 'unavailable' && policy.failClosed) {
        throw new AppError({
            statusCode: 503,
            code: ERROR_CODES.InternalServerError,
            message: 'Password security verification is temporarily unavailable.',
        })
    }

    return normalizedPassword
}
