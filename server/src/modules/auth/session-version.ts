import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'

export function assertCurrentSessionVersion(
    currentVersion: number,
    tokenVersion: number
) {
    if (currentVersion !== tokenVersion) {
        throw new AppError({
            statusCode: 401,
            code: ERROR_CODES.Unauthorized,
            message: 'Session has expired. Please login again.',
        })
    }
}
