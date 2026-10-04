import { type EntityManager } from 'typeorm'
import { AppDataSource } from '../../database/data-source.js'
import { AutomotiveProviderEntity, AutoCareChatThreadEntity, AutoCareChatBlockEntity, AutoCareChatBlockStatus, ServiceRequestEntity } from '../../entities/index.js'
import { UserRole, type UserEntity } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { ensureAutoCareRequestChatThread } from './autocare-chat.service.js'
import { hasProviderWorkspacePermission, hasProviderWorkspacePermissionWithManager } from './provider-access.service.js'
import { isAutoCareChatBlockEffective } from './chat-moderation-policy.js'
import { forbidden, notFound, requireAutoCareRequestUuid } from './request-errors.js'

export async function getParticipantRequest(user: UserEntity, requestId: string) {
    const request = await getRequest(requestId)
    await assertParticipant(user, request)
    return request
}

/**
 * Lightweight access check for long-lived realtime connections. This avoids
 * hydrating the full request or mutating read state while revalidating a
 * socket after session, membership or provider-access changes.
 */
export async function assertAutoCareServiceRequestRealtimeAccess(user: UserEntity, requestId: string) {
    if (user.role === UserRole.SuperAdmin) forbidden('SuperAdmin chat review must use the audited chat access route.')
    await getParticipantRequest(user, requestId)
    return true
}

export async function getRequest(requestId: string) {
    const normalizedRequestId = requireAutoCareRequestUuid(requestId)
    const request = await AppDataSource.getRepository(ServiceRequestEntity).findOneBy({ id: normalizedRequestId })
    if (!request) notFound('Service request not found.')
    return request
}

export async function assertParticipant(user: UserEntity, request: ServiceRequestEntity) {
    if (user.role === UserRole.SuperAdmin) return
    if (request.clientId === user.id) return
    const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: request.providerId })
    if (provider && await hasProviderWorkspacePermission(user.id, provider.id, 'requests', request.locationId)) return
    throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'You do not have access to this service request.' })
}

export function requireSuperAdminRequestAccessReason(user: UserEntity, emergencyReason?: string) {
    if (user.role !== UserRole.SuperAdmin) return

    const normalizedReason = typeof emergencyReason === 'string'
        ? emergencyReason.normalize('NFKC').trim()
        : ''
    if (normalizedReason.length < 10 || normalizedReason.length > 2_000) {
        throw new AppError({
            statusCode: 400,
            code: ERROR_CODES.ValidationError,
            message: 'Privileged request access requires a reason of 10 to 2000 characters.',
        })
    }
}

export async function assertParticipantWithManager(manager: EntityManager, user: UserEntity, request: ServiceRequestEntity) {
    if (user.role === UserRole.SuperAdmin || request.clientId === user.id) return
    const provider = await manager.getRepository(AutomotiveProviderEntity).findOneBy({ id: request.providerId })
    if (provider && await hasProviderWorkspacePermissionWithManager(manager, user.id, provider.id, 'requests', request.locationId)) return
    forbidden('You do not have access to this service request.')
}

export async function lockRequestChatThreadForWrite(manager: EntityManager, request: ServiceRequestEntity, user: UserEntity) {
    const candidate = await ensureAutoCareRequestChatThread(request, manager)
    const thread = await manager.getRepository(AutoCareChatThreadEntity).findOne({
        where: { id: candidate.id },
        lock: { mode: 'pessimistic_write' },
    })
    if (!thread) notFound('Chat not found.')
    const blocks = await manager.getRepository(AutoCareChatBlockEntity).find({
        where: [
            { threadId: thread.id, blockedUserId: user.id, status: AutoCareChatBlockStatus.Active },
            { threadId: thread.id, blockerId: user.id, status: AutoCareChatBlockStatus.Active },
        ],
    })
    const now = new Date()
    if (blocks.some((block) => isAutoCareChatBlockEffective(block.expiresAt, now))) forbidden('Messaging is unavailable because this chat is blocked.')
    return thread
}
