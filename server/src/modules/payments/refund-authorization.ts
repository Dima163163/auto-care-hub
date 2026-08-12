import { UserRole } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'

export function assertRefundActorIsSuperAdmin(role: UserRole) {
    if (role === UserRole.SuperAdmin) return

    throw new AppError({
        statusCode: 403,
        code: ERROR_CODES.Forbidden,
        message: 'Only super admins can refund payments.',
    })
}
