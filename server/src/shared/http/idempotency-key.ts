import { AppError } from '../errors/app-error.js'
import { ERROR_CODES } from '../errors/error-codes.js'

export function normalizeIdempotencyKey(value: unknown) {
    if (value === undefined || value === null) {
        return undefined
    }

    const normalized = typeof value === 'string' ? value.trim() : ''
    if (!/^[a-zA-Z0-9_-]{8,128}$/.test(normalized)) {
        throw new AppError({
            statusCode: 400,
            code: ERROR_CODES.BadRequest,
            message: 'Idempotency-Key must contain 8-128 safe characters.',
        })
    }

    return normalized
}

export function getOptionalIdempotencyKey(headers: Record<string, unknown>) {
    return normalizeIdempotencyKey(headers['idempotency-key'])
}
