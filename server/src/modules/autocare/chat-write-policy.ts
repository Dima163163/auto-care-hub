import { AutoCareChatThreadType, type AutoCareChatThreadEntity } from '../../entities/automotive/service-request.entity.js'
import { UserRole, type UserEntity } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'

/** Shared write boundary for both the chat API and legacy request API. */
export function assertChatMessageWriteAccess(
    user: Pick<UserEntity, 'role'>,
    thread: Pick<AutoCareChatThreadEntity, 'type'>,
) {
    if (
        (user.role === UserRole.Admin || user.role === UserRole.SuperAdmin)
        && thread.type !== AutoCareChatThreadType.Support
        && thread.type !== AutoCareChatThreadType.AdminEscalation
    ) {
        throw new AppError({
            statusCode: 403,
            code: ERROR_CODES.Forbidden,
            message: 'Administrators may review private conversations but cannot send messages to participants.',
        })
    }
}
