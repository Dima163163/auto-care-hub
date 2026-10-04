import { UserEntity, UserRole } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES, type ErrorCode } from '../../shared/errors/error-codes.js'

export function fail(statusCode: number, message: string, specificCode?: ErrorCode): never {
    const code = statusCode === 404 ? ERROR_CODES.NotFound : statusCode === 409 ? ERROR_CODES.Conflict : statusCode === 400 ? ERROR_CODES.BadRequest : ERROR_CODES.Forbidden
    throw new AppError({ statusCode, code: specificCode ?? code, message })
}

export function assertRole(user: UserEntity, roles: UserRole[], message: string) {
    if (!roles.includes(user.role)) fail(403, message)
}
