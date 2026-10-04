import { UserRole, type UserEntity } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { normalizeAutoCareRequestUuid } from './request-input-policy.js'

export function clientOnly(user: UserEntity) {
    if (user.role !== UserRole.Client) {
        throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'Only clients can create service requests.' })
    }
}

export function notFound(message: string): never {
    throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message })
}

export function forbidden(message: string): never {
    throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message })
}

export function conflict(message: string): never {
    throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message })
}

export function requireAutoCareRequestUuid(value: unknown) {
    const requestId = normalizeAutoCareRequestUuid(value)
    if (!requestId) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Service request id must be a valid UUID.' })
    return requestId
}
