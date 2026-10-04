import { type EntityManager } from 'typeorm'
import { AppDataSource } from '../../database/data-source.js'
import { AutoCareChatThreadEntity, AutoCareChatThreadStatus, AutoCareChatThreadType, AutoCareChatBlockEntity, AutoCareChatBlockStatus, AutoCareChatReportEntity, AutoCareChatReportStatus, AutomotiveProviderEntity, ServiceRequestEntity } from '../../entities/index.js'
import { UserEntity, UserRole } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { hasProviderWorkspacePermission } from './provider-access.service.js'
import { isAutoCareChatBlockEffective } from './chat-moderation-policy.js'
import { normalizeAutoCareChatUuid } from './chat-input-policy.js'
import { fail } from './chat-errors.js'

export async function providerForThread(thread: AutoCareChatThreadEntity) {
    return thread.providerId
        ? AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: thread.providerId })
        : null
}

export async function ensureAutoCareRequestChatThread(request: ServiceRequestEntity, manager?: EntityManager) {
    const repository = manager?.getRepository(AutoCareChatThreadEntity) ?? AppDataSource.getRepository(AutoCareChatThreadEntity)
    const existing = await repository.findOneBy({ requestId: request.id, type: AutoCareChatThreadType.ServiceRequest })
    if (existing) return existing
    return repository.save(repository.create({
        type: AutoCareChatThreadType.ServiceRequest,
        requestId: request.id,
        providerId: request.providerId,
        clientId: request.clientId,
        createdById: request.clientId,
        subject: 'Заявка на услугу',
        status: AutoCareChatThreadStatus.Open,
        lastMessageAt: null,
    }))
}

type AutoCareChatAccessScope = 'super_admin' | 'operational_support' | 'pending_report_moderation' | 'client_or_creator' | 'provider_workspace'

export async function assertThreadAccess(user: UserEntity, thread: AutoCareChatThreadEntity): Promise<AutoCareChatAccessScope> {
    // The super administrator is the final escalation point and may inspect
    // and answer any conversation, including service-request attachments.
    // Regular admins remain limited to operational support/escalation threads
    // or a conversation with an active pending moderation report.
    if (user.role === UserRole.SuperAdmin) return 'super_admin'
    if (user.role === UserRole.Admin && [AutoCareChatThreadType.Support, AutoCareChatThreadType.AdminEscalation].includes(thread.type)) return 'operational_support'
    if (user.role === UserRole.Admin) {
        if (thread.type !== AutoCareChatThreadType.ServiceRequest || !thread.requestId) fail(403, 'Moderation access is limited to an assigned service-request case.')
        const reports = await AppDataSource.getRepository(AutoCareChatReportEntity).find({
            where: { threadId: thread.id, status: AutoCareChatReportStatus.Pending, assignedModeratorId: user.id },
        })
        if (reports.some((report) => report.reportedMessageId && report.acknowledgedAt && report.policyVersion && report.accessExpiresAt && report.accessExpiresAt.getTime() > Date.now())) return 'pending_report_moderation'
    }
    if (thread.clientId === user.id) return 'client_or_creator'
    if (thread.createdById === user.id && thread.type === AutoCareChatThreadType.Support) return 'client_or_creator'
    if (thread.providerId) {
        const provider = await providerForThread(thread)
        const request = thread.requestId
            ? await AppDataSource.getRepository(ServiceRequestEntity).findOneBy({ id: thread.requestId, providerId: thread.providerId })
            : null
        if (provider && await hasProviderWorkspacePermission(user.id, provider.id, 'chats', request?.locationId ?? null)) return 'provider_workspace'
    }
    fail(403, 'You do not have access to this chat.')
}

export function assertChatMessageWriteAccess(user: UserEntity, thread: AutoCareChatThreadEntity) {
    if ([UserRole.Admin, UserRole.SuperAdmin].includes(user.role) && ![AutoCareChatThreadType.Support, AutoCareChatThreadType.AdminEscalation].includes(thread.type)) {
        fail(403, 'Administrators may review private conversations but cannot send messages to participants.')
    }
}

async function getAuthorizedThread(user: UserEntity, chatId: string) {
    const normalizedChatId = normalizeAutoCareChatUuid(chatId)
    if (!normalizedChatId) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Chat id must be a valid UUID.' })
    const thread = await AppDataSource.getRepository(AutoCareChatThreadEntity).findOneBy({ id: normalizedChatId })
    if (!thread) fail(404, 'Chat not found.')
    const accessScope = await assertThreadAccess(user, thread)
    return { thread, accessScope }
}

export async function getThread(user: UserEntity, chatId: string) {
    return (await getAuthorizedThread(user, chatId)).thread
}

/**
 * Authorizes access to a chat without loading messages or attachments. Routes
 * use this metadata to record a scoped content-access audit before retrieval.
 */
export async function getAutoCareChatAccessContext(user: UserEntity, chatId: string, emergencyReason?: string) {
    const { thread, accessScope } = await getAuthorizedThread(user, chatId)
    if (user.role === UserRole.SuperAdmin) {
        const reason = typeof emergencyReason === 'string' ? emergencyReason.normalize('NFKC').trim() : ''
        if (reason.length < 10 || reason.length > 2_000) fail(400, 'Emergency access requires a reason of 10 to 2000 characters.')
    }
    return {
        threadId: thread.id,
        requestId: thread.requestId,
        threadType: thread.type,
        accessScope,
        ...(user.role === UserRole.SuperAdmin ? { emergencyReason: emergencyReason?.normalize('NFKC').trim() ?? null } : {}),
    }
}

/**
 * Lightweight access check for long-lived realtime connections. Keep this
 * separate from getAutoCareChat: the latter hydrates messages and marks them
 * as read, which is not safe to repeat for every WebSocket event.
 */
export async function assertAutoCareChatRealtimeAccess(user: UserEntity, chatId: string) {
    const thread = await getThread(user, chatId)
    await assertChatMessagingAllowed(user, thread)
    return true
}

export async function chatParticipantIds(thread: AutoCareChatThreadEntity) {
    const ids = new Set<string>()
    if (thread.clientId) ids.add(thread.clientId)
    const provider = await providerForThread(thread)
    if (provider?.ownerId) ids.add(provider.ownerId)
    if (thread.createdById) ids.add(thread.createdById)
    return ids
}

export async function assertChatMessagingAllowed(user: UserEntity, thread: AutoCareChatThreadEntity, manager?: EntityManager) {
    const blocks = await (manager?.getRepository(AutoCareChatBlockEntity) ?? AppDataSource.getRepository(AutoCareChatBlockEntity)).find({
        where: [
            { threadId: thread.id, blockedUserId: user.id, status: AutoCareChatBlockStatus.Active },
            { threadId: thread.id, blockerId: user.id, status: AutoCareChatBlockStatus.Active },
        ],
    })
    const now = new Date()
    if (blocks.some((block) => isAutoCareChatBlockEffective(block.expiresAt, now))) fail(403, 'Messaging is unavailable because this chat has an active participant or moderation restriction.', ERROR_CODES.ChatMessagingRestricted)
}

/**
 * Mutations on request-backed chats must use the same request -> thread lock
 * order as the service-request API. The thread row serializes block changes
 * with all message and attachment writes for the conversation.
 */
export async function lockThreadForMutation(manager: EntityManager, thread: AutoCareChatThreadEntity) {
    if (thread.requestId) {
        const request = await manager.getRepository(ServiceRequestEntity).findOne({
            where: { id: thread.requestId },
            lock: { mode: 'pessimistic_write' },
        })
        if (!request) fail(404, 'Service request not found.')
    }
    const lockedThread = await manager.getRepository(AutoCareChatThreadEntity).findOne({
        where: { id: thread.id },
        lock: { mode: 'pessimistic_write' },
    })
    if (!lockedThread) fail(404, 'Chat not found.')
    return lockedThread
}
