import { AutomotiveProviderEntity, AutomotiveProviderStatus } from '../../entities/index.js'
import { UserRole, type UserEntity } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'

export function assertProviderActive(provider: AutomotiveProviderEntity | null): asserts provider is AutomotiveProviderEntity {
    if (!provider || provider.status !== AutomotiveProviderStatus.Active) {
        throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive provider not found.' })
    }
}

export function throwNotFound(message: string): never {
    throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message })
}

export function assertOwner(user: UserEntity) {
    if (user.role !== UserRole.Owner) {
        throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'Only owners can manage automotive service profiles.' })
    }
}

export function assertClient(user: UserEntity) {
    if (user.role !== UserRole.Client) {
        throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'Only clients can manage automotive review revisions.' })
    }
}
