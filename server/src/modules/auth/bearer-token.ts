import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'

export function parseBearerToken(header: string | undefined) {
    const match = header?.trim().match(/^Bearer\s+(\S+)$/i)

    if (!match?.[1]) {
        throw new AppError({
            statusCode: 401,
            code: ERROR_CODES.Unauthorized,
            message: header ? 'Invalid authorization header.' : 'Authentication is required.',
        })
    }

    return match[1]
}
