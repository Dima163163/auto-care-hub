import { IsNull } from 'typeorm'
import { AppDataSource } from '../../database/data-source.js'
import { AutoCareChatThreadEntity, AutoCareChatThreadStatus, AutoCareChatThreadType, AutomotiveProviderEntity, AutomotiveProviderStatus, ServiceAttachmentEntity, ServiceAttachmentStatus, ServiceMessageEntity, ServiceRequestEntity } from '../../entities/index.js'
import { UserEntity, UserRole } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import type { AutoCareChatConversationResponse, CreateAutoCareChatInput } from './autocare.types.js'
import { broadcastServiceChat } from './service-chat.gateway.js'
import { MAX_AUTOMOTIVE_ATTACHMENTS_PER_THREAD } from './attachment-content.js'
import { getManagedProviderPermissionScopes, hasProviderWorkspacePermission } from './provider-access.service.js'
import { assertCursorDate, decodeCursor, encodeCursor, getCursorLimit, normalizeCursorPaginationInput } from '../../shared/http/cursor-pagination.js'
import { normalizeAutoCareChatInput, normalizeAutoCareChatUuid } from './chat-input-policy.js'
import { toThreadResponse } from './chat-read.service.js'
import { shouldUpdateAutoCareChatReadReceipt } from './chat-read-policy.js'
import { ensureAutoCareRequestChatThread, getThread } from './chat-access.service.js'
import { assertRole, fail } from './chat-errors.js'
import { messageResponse, safeAttachmentResponse } from './chat-response.js'

export async function createAutoCareChat(user: UserEntity, input: CreateAutoCareChatInput) {
    const normalizedInput = normalizeAutoCareChatInput(input)
    if (!normalizedInput) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Chat input is invalid.' })
    const repository = AppDataSource.getRepository(AutoCareChatThreadEntity)
    if (normalizedInput.type === 'provider_inquiry') {
        assertRole(user, [UserRole.Client], 'Only clients can ask a service a question.')
        if (!normalizedInput.providerId) fail(400, 'A provider is required for a service question.')
        const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: normalizedInput.providerId, status: AutomotiveProviderStatus.Active })
        if (!provider) fail(404, 'Automotive provider not found.')
        if (!provider.chatEnabled) fail(409, 'This service currently accepts questions by phone or request form, not in chat.')
        const existing = await repository.findOneBy({ type: AutoCareChatThreadType.ProviderInquiry, providerId: provider.id, clientId: user.id, status: AutoCareChatThreadStatus.Open })
        if (existing) return toThreadResponse(user, existing)
        const thread = await repository.save(repository.create({ type: AutoCareChatThreadType.ProviderInquiry, providerId: provider.id, clientId: user.id, createdById: user.id, subject: normalizedInput.subject, status: AutoCareChatThreadStatus.Open, lastMessageAt: null }))
        return toThreadResponse(user, thread)
    }
    if (normalizedInput.type === 'support') {
        const managesProvider = normalizedInput.providerId
            ? (await getManagedProviderPermissionScopes(user.id, 'chats')).some((scope) => scope.providerId === normalizedInput.providerId)
            : false
        if (user.role !== UserRole.Client && !managesProvider) fail(403, 'Only clients and service workspace members can open a support chat.')
        if (normalizedInput.providerId) {
            const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: normalizedInput.providerId })
            if (!provider || !managesProvider) fail(403, 'You do not manage this service.')
        }
        const clientId = user.role === UserRole.Client ? user.id : null
        const existing = await repository.findOne({
            where: {
                type: AutoCareChatThreadType.Support,
                providerId: normalizedInput.providerId ?? IsNull(),
                clientId: clientId ?? IsNull(),
                createdById: user.id,
                status: AutoCareChatThreadStatus.Open,
            },
            order: { updatedAt: 'DESC' },
        })
        if (existing) return toThreadResponse(user, existing)
        const thread = await repository.save(repository.create({ type: AutoCareChatThreadType.Support, providerId: normalizedInput.providerId ?? null, clientId, createdById: user.id, subject: normalizedInput.subject, status: AutoCareChatThreadStatus.Open, lastMessageAt: null }))
        return toThreadResponse(user, thread)
    }
    assertRole(user, [UserRole.Admin, UserRole.SuperAdmin], 'Only administrators can escalate a platform question.')
    const thread = await repository.save(repository.create({ type: AutoCareChatThreadType.AdminEscalation, providerId: null, clientId: null, createdById: user.id, subject: normalizedInput.subject, status: AutoCareChatThreadStatus.Open, lastMessageAt: null }))
    return toThreadResponse(user, thread)
}

export async function getAutoCareChat(user: UserEntity, chatId: string, input: { cursor?: string; beforeCursor?: string; limit?: number } = {}): Promise<AutoCareChatConversationResponse> {
    const normalizedInput = normalizeCursorPaginationInput(input)
    if (!normalizedInput) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Chat pagination query is invalid.' })
    const thread = await getThread(user, chatId)
    const limit = getCursorLimit(normalizedInput.limit)
    const cursor = normalizedInput.cursor ? decodeCursor(normalizedInput.cursor, ['createdAt', 'id']) : null
    const beforeCursor = normalizedInput.beforeCursor ? decodeCursor(normalizedInput.beforeCursor, ['createdAt', 'id']) : null
    const cursorCreatedAt = cursor ? assertCursorDate(cursor, 'createdAt') : null
    const beforeCursorCreatedAt = beforeCursor ? assertCursorDate(beforeCursor, 'createdAt') : null
    const messageWhere = thread.requestId ? '(message.threadId = :threadId OR message.requestId = :requestId)' : 'message.threadId = :threadId'
    const isLatestPage = !cursor && !beforeCursor
    const messageQuery = AppDataSource.getRepository(ServiceMessageEntity)
        .createQueryBuilder('message')
        .where(messageWhere, { threadId: thread.id, requestId: thread.requestId })
        .orderBy('message.createdAt', isLatestPage || beforeCursor ? 'DESC' : 'ASC')
        .addOrderBy('message.id', isLatestPage || beforeCursor ? 'DESC' : 'ASC')
        .take(limit + 1)
    if (cursorCreatedAt && cursor) {
        messageQuery.andWhere('(message.createdAt > :cursorCreatedAt OR (message.createdAt = :cursorCreatedAt AND message.id > :cursorId))', {
            cursorCreatedAt,
            cursorId: cursor.id,
        })
    }
    if (beforeCursorCreatedAt && beforeCursor) {
        messageQuery.andWhere('(message.createdAt < :beforeCursorCreatedAt OR (message.createdAt = :beforeCursorCreatedAt AND message.id < :beforeCursorId))', {
            beforeCursorCreatedAt,
            beforeCursorId: beforeCursor.id,
        })
    }
    const [messages, attachments] = await Promise.all([
        messageQuery.getMany(),
        AppDataSource.getRepository(ServiceAttachmentEntity).find({ where: thread.requestId ? [{ threadId: thread.id, status: ServiceAttachmentStatus.Ready }, { requestId: thread.requestId, status: ServiceAttachmentStatus.Ready }] : { threadId: thread.id, status: ServiceAttachmentStatus.Ready }, order: { createdAt: 'ASC' }, take: MAX_AUTOMOTIVE_ATTACHMENTS_PER_THREAD + 1 }),
    ])
    if (attachments.length > MAX_AUTOMOTIVE_ATTACHMENTS_PER_THREAD) throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message: 'Legacy conversation exceeds its attachment quota; attachments require review before loading.' })
    const hasMore = messages.length > limit
    const page = [...(hasMore ? messages.slice(0, limit) : messages)].reverse()
    const firstMessage = page.at(0)
    const lastMessage = page.at(-1)
    const unread = shouldUpdateAutoCareChatReadReceipt(user.role, thread.type)
        ? page.filter((message) => message.senderId !== user.id && !message.readAt)
        : []
    if (unread.length > 0) {
        const readAt = new Date()
        unread.forEach((message) => { message.readAt = readAt })
        await AppDataSource.getRepository(ServiceMessageEntity).save(unread)
        broadcastServiceChat(thread.id, { type: 'message.read', threadId: thread.id, requestId: thread.requestId ?? undefined, payload: { messageIds: unread.map((message) => message.id), readAt: readAt.toISOString() } })
    }
    return {
        thread: await toThreadResponse(user, thread),
        messages: page.map(messageResponse),
        attachments: attachments.flatMap((attachment) => {
            const response = safeAttachmentResponse(attachment, thread.id)
            return response ? [response] : []
        }),
        nextCursor: hasMore && lastMessage && !isLatestPage && !beforeCursor ? encodeCursor({ createdAt: lastMessage.createdAt.toISOString(), id: lastMessage.id }) : null,
        previousCursor: hasMore && firstMessage ? encodeCursor({ createdAt: firstMessage.createdAt.toISOString(), id: firstMessage.id }) : null,
    }
}

export async function getAutoCareChatThreadForRequest(user: UserEntity, requestId: string) {
    const normalizedRequestId = normalizeAutoCareChatUuid(requestId)
    if (!normalizedRequestId) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Service request id must be a valid UUID.' })
    const request = await AppDataSource.getRepository(ServiceRequestEntity).findOneBy({ id: normalizedRequestId })
    if (!request) fail(404, 'Service request not found.')
    if (request.clientId !== user.id) {
        const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: request.providerId })
        if (!provider || !(await hasProviderWorkspacePermission(user.id, provider.id, 'chats', request.locationId))) fail(403, 'You do not have access to this request chat.')
    }
    const thread = await ensureAutoCareRequestChatThread(request)
    return toThreadResponse(user, thread)
}
