import { UserRole } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { isAdminRole } from '../../shared/auth/roles.js'

export function assertOAuthLoginRoleAllowed(role: UserRole) {
    if (isAdminRole(role)) {
        throw new AppError({
            statusCode: 403,
            code: ERROR_CODES.Forbidden,
            message: 'Privileged accounts cannot sign in through this OAuth flow.',
        })
    }
}
