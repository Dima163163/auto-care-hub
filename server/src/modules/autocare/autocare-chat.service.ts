import { In, IsNull, type EntityManager, type QueryFailedError } from 'typeorm'
import { createHash, randomUUID } from 'node:crypto'
import type { FastifyRequest } from 'fastify'

import { AppDataSource } from '../../database/data-source.js'
import {
    AutoCareChatThreadEntity,
    AutoCareChatThreadStatus,
    AutoCareChatThreadType,
    AutoCareChatBlockEntity,
    AutoCareChatBlockStatus,
    AutoCareAppealEntity,
    AutoCareAppealStatus,
    AutoCareAppealSubject,
    AutoCareChatReportCategory,
    AutoCareChatReportEntity,
    AutoCareChatReportStatus,
    AutomotiveProviderEntity,
    AutomotiveProviderStatus,
    ServiceAttachmentEntity,
    ServiceAttachmentStatus,
    ServiceMessageEntity,
    ServiceMessageKind,
    ServiceRequestEntity,
    type ServiceMessageOffer,
} from '../../entities/index.js'
import { UserEntity, UserRole, UserStatus } from '../../entities/user/user.entity.js'
import { NotificationCategory } from '../../entities/notification/notification.entity.js'
import { AuditAction } from '../../entities/audit-log/audit-log.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES, type ErrorCode } from '../../shared/errors/error-codes.js'
import type {
    AutoCareChatConversationResponse,
    AutoCareChatThreadResponse,
    AutoCareServiceAttachmentResponse,
    AutoCareServiceMessageResponse,
    CreateAutoCareChatInput,
} from './autocare.types.js'
import { broadcastServiceChat } from './service-chat.gateway.js'
import { assertAutoCareAttachmentQuota, decodeAutoCareAttachment, normalizeAutoCareAttachment, normalizeAutoCareAttachmentInput, resolveAutoCareAttachmentContentType } from './attachment-content.js'
import { assertAutoCareAttachmentObjectKeyOwnedBy, createAutoCareAttachmentObjectKey, getAutoCareAttachmentSignedDownloadUrl, readAutoCareAttachmentObject, removeAutoCareAttachmentObject, saveAutoCareAttachmentObject } from './autocare-attachment-storage.js'
import { getManagedProviderPermissionScopes, hasProviderWorkspacePermission, isManagedProviderLocationAllowed } from './provider-access.service.js'
import { assertCursorDate, decodeCursor, encodeCursor, getCursorLimit, normalizeCursorPaginationInput } from '../../shared/http/cursor-pagination.js'
import { normalizeAutoCareChatMessageInput } from './message-content-policy.js'
import { normalizeIdempotencyKey } from '../../shared/http/idempotency-key.js'
import { calculateAutoCareChatExtendedExpiry, isAutoCareChatBlockEffective, normalizeAutoCareChatBlockInput, normalizeAutoCareChatModeratorAssignment, normalizeAutoCareChatModeratorExtension, normalizeAutoCareChatReportDecision, normalizeAutoCareChatReportInput, normalizeAutoCareChatReportStatus, normalizeAutoCareChatReportUuid, resolveAutoCareChatReportConflict } from './chat-moderation-policy.js'
import { normalizeAutoCareChatInput, normalizeAutoCareChatUuid } from './chat-input-policy.js'
import { shouldUpdateAutoCareChatReadReceipt } from './chat-read-policy.js'
import { recordAuditLog } from '../admin/audit-log.service.js'
import { enqueueNotification } from '../outbox/notification-outbox.service.js'

function fail(statusCode: number, message: string, specificCode?: ErrorCode): never {
    const code = statusCode === 404 ? ERROR_CODES.NotFound : statusCode === 409 ? ERROR_CODES.Conflict : statusCode === 400 ? ERROR_CODES.BadRequest : ERROR_CODES.Forbidden
    throw new AppError({ statusCode, code: specificCode ?? code, message })
}

function assertRole(user: UserEntity, roles: UserRole[], message: string) {
    if (!roles.includes(user.role)) fail(403, message)
}

function messageResponse(message: ServiceMessageEntity): AutoCareServiceMessageResponse {
    return {
        id: message.id,
        senderId: message.senderId,
        kind: message.kind,
        body: message.body,
        offer: message.offer as ServiceMessageOffer | null,
        deliveredAt: message.deliveredAt?.toISOString() ?? null,
        readAt: message.readAt?.toISOString() ?? null,
        deletedAt: message.deletedAt?.toISOString() ?? null,
        createdAt: message.createdAt.toISOString(),
    }
}

function attachmentResponse(attachment: ServiceAttachmentEntity, chatId: string): AutoCareServiceAttachmentResponse {
    const contentType = resolveAutoCareAttachmentContentType(attachment.contentType)
    return {
        id: attachment.id,
        uploadedById: attachment.uploadedById,
        contentType,
        bytes: attachment.bytes,
        status: attachment.status,
        url: `/v1/chats/${chatId}/attachments/${attachment.id}`,
        createdAt: attachment.createdAt.toISOString(),
    }
}

function safeAttachmentResponse(attachment: ServiceAttachmentEntity, chatId: string) {
    try {
        return attachmentResponse(attachment, chatId)
    } catch (error) {
        if (error instanceof AppError && error.code === ERROR_CODES.NotFound) return null
        throw error
    }
}

async function providerForThread(thread: AutoCareChatThreadEntity) {
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

async function assertThreadAccess(user: UserEntity, thread: AutoCareChatThreadEntity): Promise<AutoCareChatAccessScope> {
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

function assertChatMessageWriteAccess(user: UserEntity, thread: AutoCareChatThreadEntity) {
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

async function getThread(user: UserEntity, chatId: string) {
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

async function chatParticipantIds(thread: AutoCareChatThreadEntity) {
    const ids = new Set<string>()
    if (thread.clientId) ids.add(thread.clientId)
    const provider = await providerForThread(thread)
    if (provider?.ownerId) ids.add(provider.ownerId)
    if (thread.createdById) ids.add(thread.createdById)
    return ids
}

async function assertChatMessagingAllowed(user: UserEntity, thread: AutoCareChatThreadEntity, manager?: EntityManager) {
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
async function lockThreadForMutation(manager: EntityManager, thread: AutoCareChatThreadEntity) {
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

function isChatMessageIdempotencyUniqueError(error: unknown) {
    const driverError = (error as QueryFailedError | undefined)?.driverError as
        | { code?: unknown; constraint?: unknown }
        | undefined
    return driverError?.code === '23505' && [
        'IDX_autocare_service_messages_thread_idempotency',
        // Request-scoped messages keep the existing request-level uniqueness
        // rule. A collision there can occur if a retry crosses API channels.
        'IDX_autocare_service_messages_idempotency',
    ].includes(String(driverError.constraint))
}

function chatMessageIdempotencyConflict(): never {
    fail(409, 'Idempotency key was already used for a different message.')
}

async function toThreadResponse(user: UserEntity, thread: AutoCareChatThreadEntity): Promise<AutoCareChatThreadResponse> {
    const provider = await providerForThread(thread)
    const messages = await AppDataSource.getRepository(ServiceMessageEntity).find({ where: thread.requestId ? [{ threadId: thread.id }, { requestId: thread.requestId }] : { threadId: thread.id } })
    const sanctions = await AppDataSource.getRepository(AutoCareChatBlockEntity).find({
        where: { threadId: thread.id, blockedUserId: user.id, status: AutoCareChatBlockStatus.Active },
        order: { createdAt: 'DESC' },
        take: 20,
    })
    const sanction = sanctions.find((item) => item.sourceReportId)
    const sanctionAppeal = sanction ? await AppDataSource.getRepository(AutoCareAppealEntity).findOneBy({
        subject: AutoCareAppealSubject.ChatRestriction,
        subjectId: sanction.id,
        submittedById: user.id,
        status: AutoCareAppealStatus.Pending,
    }) : null
    return {
        id: thread.id,
        type: thread.type,
        status: thread.status,
        subject: thread.subject,
        requestId: thread.requestId,
        providerId: thread.providerId,
        providerName: provider?.name ?? null,
        clientId: thread.clientId,
        lastMessageAt: thread.lastMessageAt?.toISOString() ?? null,
        unreadCount: messages.filter((message) => message.senderId !== user.id && !message.readAt).length,
        moderationRestriction: sanction?.sourceReportId && sanction.reason && sanction.expiresAt
            ? {
                id: sanction.id,
                reason: sanction.reason,
                expiresAt: sanction.expiresAt.toISOString(),
                state: sanction.expiresAt.getTime() > Date.now() ? 'active' : 'expired',
                appealStatus: sanctionAppeal?.status ?? null,
            }
            : null,
        createdAt: thread.createdAt.toISOString(),
        updatedAt: thread.updatedAt.toISOString(),
    }
}

export async function getMyAutoCareChats(user: UserEntity) {
    const repository = AppDataSource.getRepository(AutoCareChatThreadEntity)
    let threads: AutoCareChatThreadEntity[] = []
    const scopes = await getManagedProviderPermissionScopes(user.id, 'chats')
    if (user.role === UserRole.Client) {
        threads = await repository.find({ where: { clientId: user.id }, order: { updatedAt: 'DESC' } })
    }
    if (scopes.length > 0) {
        const providerIds = scopes.map(({ providerId }) => providerId)
        const providerThreads = providerIds.length
            ? await repository.find({ where: [{ providerId: In(providerIds) }, { createdById: user.id }], order: { updatedAt: 'DESC' } })
            : await repository.find({ where: { createdById: user.id }, order: { updatedAt: 'DESC' } })
        const requestIds = providerThreads.flatMap((thread) => thread.requestId ? [thread.requestId] : [])
        const requests = requestIds.length
            ? await AppDataSource.getRepository(ServiceRequestEntity).find({ where: { id: In(requestIds) }, select: { id: true, providerId: true, locationId: true } })
            : []
        const requestById = new Map(requests.map((request) => [request.id, request]))
        const visibleProviderThreads = providerThreads.filter((thread) => {
            if (thread.createdById === user.id && thread.type === AutoCareChatThreadType.Support) return true
            if (!thread.providerId) return false
            const request = thread.requestId ? requestById.get(thread.requestId) : null
            return isManagedProviderLocationAllowed(scopes, thread.providerId, request?.locationId ?? null)
        })
        threads = [...new Map([...threads, ...visibleProviderThreads].map((thread) => [thread.id, thread])).values()]
    } else if (user.role === UserRole.SuperAdmin) {
        threads = await repository.find({ order: { updatedAt: 'DESC' } })
    } else if (user.role === UserRole.Admin) {
        const moderationReports = await AppDataSource.getRepository(AutoCareChatReportEntity).find({ where: { status: AutoCareChatReportStatus.Pending, assignedModeratorId: user.id }, order: { createdAt: 'DESC' }, take: 100 })
        const now = Date.now()
        const activeReports = moderationReports.filter((report) => report.accessExpiresAt && report.accessExpiresAt.getTime() > now)
        const reportedThreadIds = [...new Set(activeReports.map((report) => report.threadId))]
        const reportedThreads = reportedThreadIds.length ? await repository.find({ where: { id: In(reportedThreadIds) }, order: { updatedAt: 'DESC' } }) : []
        const operationalThreads = await repository.find({ where: [{ type: AutoCareChatThreadType.Support }, { type: AutoCareChatThreadType.AdminEscalation }], order: { updatedAt: 'DESC' } })
        threads = [...new Map([...operationalThreads, ...reportedThreads].map((thread) => [thread.id, thread])).values()]
    }
    return Promise.all(threads.map((thread) => toThreadResponse(user, thread)))
}

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
        AppDataSource.getRepository(ServiceAttachmentEntity).find({ where: thread.requestId ? [{ threadId: thread.id, status: ServiceAttachmentStatus.Ready }, { requestId: thread.requestId, status: ServiceAttachmentStatus.Ready }] : { threadId: thread.id, status: ServiceAttachmentStatus.Ready }, order: { createdAt: 'ASC' } }),
    ])
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

export async function createAutoCareChatMessage(user: UserEntity, chatId: string, input: unknown, idempotencyKey?: string) {
    const normalizedInput = normalizeAutoCareChatMessageInput(input)
    if (!normalizedInput) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Message body is invalid.' })
    const body = normalizedInput.body
    const normalizedKey = normalizeIdempotencyKey(idempotencyKey)
    const thread = await getThread(user, chatId)
    assertChatMessageWriteAccess(user, thread)
    if (thread.status === AutoCareChatThreadStatus.Closed) fail(409, 'This chat is closed.', ERROR_CODES.ChatClosed)
    await assertChatMessagingAllowed(user, thread)
    const provider = await providerForThread(thread)
    const recipientId = thread.clientId === user.id ? provider?.ownerId : thread.clientId
    const fingerprint = createHash('sha256')
        .update(JSON.stringify({ threadId: thread.id, senderId: user.id, recipientId: recipientId ?? null, kind: ServiceMessageKind.Text, body }))
        .digest('hex')
    let message: ServiceMessageEntity | null = null
    let created = false

    try {
        await AppDataSource.transaction(async (manager) => {
            const lockedThread = await lockThreadForMutation(manager, thread)
            await assertThreadAccess(user, lockedThread)
            assertChatMessageWriteAccess(user, lockedThread)
            if (lockedThread.status === AutoCareChatThreadStatus.Closed) fail(409, 'This chat is closed.', ERROR_CODES.ChatClosed)
            await assertChatMessagingAllowed(user, lockedThread, manager)

            const repository = manager.getRepository(ServiceMessageEntity)
            if (normalizedKey) {
                const existing = await repository.findOneBy({ threadId: lockedThread.id, senderId: user.id, idempotencyKey: normalizedKey })
                if (existing) {
                    if (existing.idempotencyFingerprint !== fingerprint) chatMessageIdempotencyConflict()
                    message = existing
                    return
                }
            }

            const now = new Date()
            message = await repository.save(repository.create({
                threadId: lockedThread.id,
                requestId: lockedThread.requestId,
                senderId: user.id,
                kind: ServiceMessageKind.Text,
                body,
                idempotencyKey: normalizedKey ?? null,
                idempotencyFingerprint: normalizedKey ? fingerprint : null,
                offer: null,
                deliveredAt: recipientId ? now : null,
                readAt: null,
            }))
            lockedThread.lastMessageAt = now
            await manager.getRepository(AutoCareChatThreadEntity).save(lockedThread)
            created = true
        })
    } catch (error) {
        if (!normalizedKey || !isChatMessageIdempotencyUniqueError(error)) throw error
        const existing = await AppDataSource.transaction(async (manager) => {
            const currentThread = await lockThreadForMutation(manager, thread)
            await assertThreadAccess(user, currentThread)
            assertChatMessageWriteAccess(user, currentThread)
            if (currentThread.status === AutoCareChatThreadStatus.Closed) fail(409, 'This chat is closed.', ERROR_CODES.ChatClosed)
            await assertChatMessagingAllowed(user, currentThread, manager)
            return manager.getRepository(ServiceMessageEntity).findOneBy({ threadId: currentThread.id, senderId: user.id, idempotencyKey: normalizedKey })
        })
        if (!existing) chatMessageIdempotencyConflict()
        if (existing.idempotencyFingerprint !== fingerprint) chatMessageIdempotencyConflict()
        message = existing
    }

    if (!message) throw new Error('Chat message transaction completed without a saved message.')
    const result = messageResponse(message)
    if (created) broadcastServiceChat(thread.id, { type: 'message.created', threadId: thread.id, requestId: thread.requestId ?? undefined, payload: result })
    return result
}

export type CreateAutoCareChatReportInput = {
    messageId: string
    category: AutoCareChatReportCategory
    description?: string | null
    acknowledgeFullThreadReview: true
}

export type AutoCareChatReportResponse = {
    id: string
    threadId: string
    messageId: string | null
    relatedReportId: string | null
    reporterId: string
    reportedUserId: string | null
    category: AutoCareChatReportCategory
    description: string | null
    status: AutoCareChatReportStatus
    reviewedById: string | null
    resolutionReason: string | null
    overturnedAt: string | null
    assignedModeratorId: string | null
    accessExpiresAt: string | null
    extensionUsed: boolean
    createdAt: string
    reviewedAt: string | null
    acknowledgedAt: string | null
    policyVersion: string | null
}

export type AutoCareChatBlockResponse = {
    id: string
    threadId: string
    blockerId: string
    blockedUserId: string
    status: AutoCareChatBlockStatus
    reason: string | null
    sourceReportId: string | null
    expiresAt: string | null
    createdAt: string
    revokedAt: string | null
}

function reportResponse(report: AutoCareChatReportEntity, includePrivateDetails = false): AutoCareChatReportResponse {
    return {
        id: report.id,
        threadId: report.threadId,
        messageId: report.reportedMessageId,
        relatedReportId: report.relatedReportId,
        reporterId: report.reporterId,
        reportedUserId: report.reportedUserId,
        category: report.category,
        description: includePrivateDetails ? report.description : null,
        status: report.status,
        reviewedById: report.reviewedById,
        resolutionReason: includePrivateDetails ? report.resolutionReason : null,
        overturnedAt: report.overturnedAt?.toISOString() ?? null,
        assignedModeratorId: report.assignedModeratorId,
        accessExpiresAt: report.accessExpiresAt?.toISOString() ?? null,
        extensionUsed: report.extensionUsed,
        createdAt: report.createdAt.toISOString(),
        reviewedAt: report.reviewedAt?.toISOString() ?? null,
        acknowledgedAt: report.acknowledgedAt?.toISOString() ?? null,
        policyVersion: report.policyVersion,
    }
}

function blockResponse(block: AutoCareChatBlockEntity): AutoCareChatBlockResponse {
    return {
        id: block.id,
        threadId: block.threadId,
        blockerId: block.blockerId,
        blockedUserId: block.blockedUserId,
        status: block.status,
        reason: block.reason,
        sourceReportId: block.sourceReportId,
        expiresAt: block.expiresAt?.toISOString() ?? null,
        createdAt: block.createdAt.toISOString(),
        revokedAt: block.revokedAt?.toISOString() ?? null,
    }
}

export async function createAutoCareChatReport(user: UserEntity, chatId: string, input: CreateAutoCareChatReportInput) {
    const normalizedInput = normalizeAutoCareChatReportInput(input)
    if (!normalizedInput) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Chat report is invalid.' })
    const thread = await getThread(user, chatId)
    if (user.role === UserRole.Admin || user.role === UserRole.SuperAdmin) fail(403, 'Only chat participants can report a message.')
    if (thread.type !== AutoCareChatThreadType.ServiceRequest || !thread.requestId) fail(400, 'Only service-request messages can be reported.')
    const request = await AppDataSource.getRepository(ServiceRequestEntity).findOneBy({ id: thread.requestId })
    const canReport = thread.clientId === user.id || (thread.providerId !== null && request !== null && await hasProviderWorkspacePermission(user.id, thread.providerId, 'chats', request.locationId))
    if (!canReport) fail(403, 'Only a participant in this service request can report a message.')

    const report = await AppDataSource.transaction(async (manager) => {
        const lockedThread = await lockThreadForMutation(manager, thread)
        await assertThreadAccess(user, lockedThread)
        if (!lockedThread.requestId) fail(409, 'This thread is no longer a service-request conversation.')
        const message = await manager.getRepository(ServiceMessageEntity).findOne({
            where: [{ id: normalizedInput.reportedMessageId, threadId: lockedThread.id }, { id: normalizedInput.reportedMessageId, requestId: lockedThread.requestId }],
        })
        if (!message || message.deletedAt || message.kind !== ServiceMessageKind.Text || !message.body?.trim() || message.senderId === user.id) fail(400, 'Choose a visible text message sent by the other participant.')
        const reports = manager.getRepository(AutoCareChatReportEntity)
        const pendingReports = await reports.find({ where: { threadId: lockedThread.id, status: AutoCareChatReportStatus.Pending } })
        const currentAssignment = pendingReports.find((pending) => pending.reportedMessageId && pending.acknowledgedAt && pending.policyVersion && pending.assignedModeratorId && pending.accessExpiresAt && pending.accessExpiresAt.getTime() > Date.now())
        // A person already under review cannot file a retaliatory report against
        // a message sent after that case began. Older, distinct incidents remain reportable.
        const conflict = resolveAutoCareChatReportConflict({
            activeReports: pendingReports.map((pending) => ({
                ...pending,
                reporterSide: pending.reporterId === lockedThread.clientId ? 'client' as const : 'provider' as const,
                reportedSide: pending.reportedUserId === lockedThread.clientId ? 'client' as const : 'provider' as const,
            })),
            reporterSide: user.id === lockedThread.clientId ? 'client' : 'provider',
            messageSenderSide: message.senderId === lockedThread.clientId ? 'client' : 'provider',
            messageId: message.id,
            messageCreatedAt: message.createdAt,
            category: normalizedInput.category,
            description: normalizedInput.description,
        })
        if (conflict.blocked) fail(409, 'This message cannot be reported during the current review.', ERROR_CODES.ChatReportConflict)
        const existing = await reports.findOneBy({ threadId: lockedThread.id, reporterId: user.id, reportedMessageId: message.id })
        if (existing) return existing
        const created = await reports.save(reports.create({
            threadId: lockedThread.id,
            reportedMessageId: message.id,
            relatedReportId: conflict.relatedReportId,
            reporterId: user.id,
            reportedUserId: message.senderId,
            category: normalizedInput.category,
            description: normalizedInput.description,
            status: AutoCareChatReportStatus.Pending,
            reviewedById: null,
            resolutionReason: null,
            reviewedAt: null,
            acknowledgedAt: new Date(),
            policyVersion: '2026-09-24-v1',
            assignedModeratorId: currentAssignment?.assignedModeratorId ?? null,
            assignedById: currentAssignment?.assignedById ?? null,
            assignmentReason: currentAssignment?.assignmentReason ?? null,
            assignedAt: currentAssignment?.assignedAt ?? null,
            accessExpiresAt: currentAssignment?.accessExpiresAt ?? null,
            extensionUsed: currentAssignment?.extensionUsed ?? false,
            extensionReason: currentAssignment?.extensionReason ?? null,
            extendedAt: currentAssignment?.extendedAt ?? null,
        }))
        const recipients = currentAssignment?.assignedModeratorId
            ? [currentAssignment.assignedModeratorId]
            : (await manager.getRepository(UserEntity).find({
                where: { role: UserRole.SuperAdmin, status: UserStatus.Active },
                select: { id: true },
            })).map((admin) => admin.id)
        const notificationTemplate = currentAssignment?.assignedModeratorId
            ? 'autocare.chat_report_assigned'
            : 'autocare.chat_report_received'
        for (const recipientId of recipients) {
            await enqueueNotification({
                userId: recipientId,
                category: NotificationCategory.Moderation,
                template: { key: notificationTemplate },
                link: '/admin/dashboard',
                metadata: { reportId: created.id },
            }, `autocare-chat-report:${created.id}:received:${recipientId}`, manager)
        }
        return created
    })
    return reportResponse(report, true)
}

export async function listMyAutoCareChatReports(user: UserEntity, chatId: string, input: { cursor?: string; limit?: number } = {}) {
    const thread = await getThread(user, chatId)
    const limit = getCursorLimit(input.limit, 50)
    const query = AppDataSource.getRepository(AutoCareChatReportEntity).createQueryBuilder('report')
        .where('report.threadId = :threadId', { threadId: thread.id })
        .andWhere('report.reporterId = :reporterId', { reporterId: user.id })
    const totalCount = await query.clone().getCount()
    if (input.cursor) {
        const cursor = decodeCursor(input.cursor, ['createdAt', 'id'])
        const cursorCreatedAt = assertCursorDate(cursor, 'createdAt')
        if (!cursor.id) fail(400, 'Chat report cursor is invalid.')
        query.andWhere(
            '(report.createdAt < :cursorCreatedAt OR (report.createdAt = :cursorCreatedAt AND report.id < :cursorId))',
            { cursorCreatedAt, cursorId: cursor.id },
        )
    }
    const rows = await query.orderBy('report.createdAt', 'DESC').addOrderBy('report.id', 'DESC').take(limit + 1).getMany()
    const hasMore = rows.length > limit
    const reports = hasMore ? rows.slice(0, limit) : rows
    const lastReport = reports.at(-1)
    return {
        items: reports.map((report) => reportResponse(report, true)),
        nextCursor: hasMore && lastReport
            ? encodeCursor({ createdAt: lastReport.createdAt.toISOString(), id: lastReport.id })
            : null,
        totalCount,
    }
}

export async function deleteAutoCareChatMessage(user: UserEntity, chatId: string, messageId: string) {
    const normalizedChatId = normalizeAutoCareChatUuid(chatId)
    const normalizedMessageId = normalizeAutoCareChatUuid(messageId)
    if (!normalizedChatId || !normalizedMessageId) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Chat and message ids must be valid UUIDs.' })
    const thread = await AppDataSource.getRepository(AutoCareChatThreadEntity).findOneBy({ id: normalizedChatId })
    if (!thread) fail(404, 'Chat not found.')
    const message = await AppDataSource.transaction(async (manager) => {
        const lockedThread = await lockThreadForMutation(manager, thread)
        await assertThreadAccess(user, lockedThread)
        const messages = manager.getRepository(ServiceMessageEntity)
        const current = await messages.findOne({ where: [{ id: normalizedMessageId, threadId: lockedThread.id }, ...(lockedThread.requestId ? [{ id: normalizedMessageId, requestId: lockedThread.requestId }] : [])] })
        if (!current) fail(404, 'Chat message not found.')
        if (current.senderId !== user.id || current.kind !== ServiceMessageKind.Text) fail(403, 'Only your own text messages can be deleted.')
        if (current.deletedAt) return current
        if (Date.now() - current.createdAt.getTime() > 5 * 60_000) fail(409, 'Messages can only be deleted for everyone within five minutes.', ERROR_CODES.ChatDeleteWindowExpired)
        const openCaseInThread = await manager.getRepository(AutoCareChatReportEntity).findOneBy({ threadId: lockedThread.id, status: AutoCareChatReportStatus.Pending })
        if (openCaseInThread || (current.evidenceRetainUntil && current.evidenceRetainUntil.getTime() > Date.now())) {
            fail(409, 'This message is temporarily preserved as evidence for a chat report.', ERROR_CODES.ChatMessagePreserved)
        }
        current.body = null
        current.offer = null
        current.deletedAt = new Date()
        current.deletedById = user.id
        return messages.save(current)
    })
    const deletedAt = message.deletedAt?.toISOString() ?? null
    broadcastServiceChat(thread.id, { type: 'message.deleted', threadId: thread.id, requestId: thread.requestId ?? undefined, payload: { id: message.id, deletedAt } })
    return { id: message.id, deletedAt }
}

export async function createAutoCareChatBlock(user: UserEntity, chatId: string, blockedUserId?: string, reason?: string | null) {
    const normalizedInput = normalizeAutoCareChatBlockInput(blockedUserId, reason)
    if (!normalizedInput) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Chat block is invalid.' })
    if (user.role === UserRole.Admin || user.role === UserRole.SuperAdmin) fail(403, 'Administrators must apply chat blocks through a moderation decision.')
    const thread = await getThread(user, chatId)
    const block = await AppDataSource.transaction(async (manager) => {
        const lockedThread = await lockThreadForMutation(manager, thread)
        await assertThreadAccess(user, lockedThread)
        const participants = await chatParticipantIds(lockedThread)
        const target = normalizedInput.blockedUserId ?? [...participants].find((id) => id !== user.id)
        if (!target || target === user.id || !participants.has(target)) fail(400, 'The blocked user must be another chat participant.')
        const blocks = manager.getRepository(AutoCareChatBlockEntity)
        const existing = await blocks.findOneBy({ threadId: lockedThread.id, blockerId: user.id, blockedUserId: target, status: AutoCareChatBlockStatus.Active, sourceReportId: IsNull() })
        return existing ?? blocks.save(blocks.create({ threadId: lockedThread.id, blockerId: user.id, blockedUserId: target, status: AutoCareChatBlockStatus.Active, reason: normalizedInput.reason, sourceReportId: null, expiresAt: null, revokedAt: null }))
    })
    return blockResponse(block)
}

export async function revokeAutoCareChatBlock(user: UserEntity, chatId: string, blockId: string) {
    const normalizedChatId = normalizeAutoCareChatUuid(chatId)
    const normalizedBlockId = normalizeAutoCareChatUuid(blockId)
    if (!normalizedChatId || !normalizedBlockId) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Chat and block ids must be valid UUIDs.' })
    const thread = await AppDataSource.getRepository(AutoCareChatThreadEntity).findOneBy({ id: normalizedChatId })
    if (!thread) fail(404, 'Chat not found.')
    const block = await AppDataSource.transaction(async (manager) => {
        const lockedThread = await lockThreadForMutation(manager, thread)
        const blocks = manager.getRepository(AutoCareChatBlockEntity)
        const block = await blocks.findOneBy({ id: normalizedBlockId, threadId: lockedThread.id })
        if (!block) fail(404, 'Chat block not found.')
        if (user.role === UserRole.Admin) fail(403, 'Only a super administrator can override a moderation block.')
        if (user.role !== UserRole.SuperAdmin && block.blockerId !== user.id) fail(403, 'You can only revoke your own chat block.')
        block.status = AutoCareChatBlockStatus.Revoked
        block.revokedAt = new Date()
        return blocks.save(block)
    })
    return blockResponse(block)
}

export async function listAdminAutoCareChatReports(user: UserEntity, input: {
    status?: AutoCareChatReportStatus
    scope?: 'active' | 'archive'
    search?: string
    assignedModeratorId?: string
    category?: AutoCareChatReportCategory
    cursor?: string
    limit?: number
} = {}) {
    assertRole(user, [UserRole.Admin, UserRole.SuperAdmin], 'Only administrators can review chat reports.')
    const normalizedStatus = input.status === undefined ? undefined : normalizeAutoCareChatReportStatus(input.status)
    if (input.status !== undefined && !normalizedStatus) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Chat report status is invalid.' })
    if (input.scope && ((input.scope === 'active' && normalizedStatus && normalizedStatus !== AutoCareChatReportStatus.Pending)
        || (input.scope === 'archive' && normalizedStatus === AutoCareChatReportStatus.Pending))) {
        throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Chat report scope and status do not match.' })
    }
    if (input.assignedModeratorId === 'unassigned' && user.role !== UserRole.SuperAdmin) fail(403, 'Only a super administrator can filter unassigned reports.')
    if (input.assignedModeratorId && input.assignedModeratorId !== 'unassigned' && input.assignedModeratorId !== 'me'
        && user.role !== UserRole.SuperAdmin && input.assignedModeratorId !== user.id) {
        fail(403, 'Administrators can only filter reports assigned to themselves.')
    }
    const assignedModeratorId = input.assignedModeratorId === 'me' ? user.id : input.assignedModeratorId
    const normalizedSearch = input.search?.normalize('NFKC').trim().toLowerCase()
    if (input.search !== undefined && (!normalizedSearch || normalizedSearch.length > 120)) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Chat report search is invalid.' })
    const limit = getCursorLimit(input.limit, 50)
    const query = AppDataSource.getRepository(AutoCareChatReportEntity).createQueryBuilder('report')
    if (normalizedStatus) query.andWhere('report.status = :status', { status: normalizedStatus })
    else if (input.scope === 'active') query.andWhere('report.status = :activeStatus', { activeStatus: AutoCareChatReportStatus.Pending })
    else if (input.scope === 'archive') query.andWhere('report.status IN (:...archiveStatuses)', { archiveStatuses: [AutoCareChatReportStatus.Resolved, AutoCareChatReportStatus.Dismissed] })
    if (input.category) query.andWhere('report.category = :category', { category: input.category })
    if (assignedModeratorId === 'unassigned') query.andWhere('report.assignedModeratorId IS NULL')
    else if (assignedModeratorId) query.andWhere('report.assignedModeratorId = :assignedModeratorId', { assignedModeratorId })
    if (normalizedSearch) {
        query.andWhere(
            '(POSITION(:search IN LOWER(CAST(report.id AS text))) > 0 OR POSITION(:search IN LOWER(CAST(report.threadId AS text))) > 0)',
            { search: normalizedSearch },
        )
    }
    const totalCount = await query.clone().getCount()
    if (input.cursor) {
        const cursor = decodeCursor(input.cursor, ['createdAt', 'id'])
        const cursorCreatedAt = assertCursorDate(cursor, 'createdAt')
        if (!cursor.id) fail(400, 'Chat report cursor is invalid.')
        query.andWhere(
            '(report.createdAt < :cursorCreatedAt OR (report.createdAt = :cursorCreatedAt AND report.id < :cursorId))',
            { cursorCreatedAt, cursorId: cursor.id },
        )
    }
    const rows = await query
        .orderBy('report.createdAt', 'DESC')
        .addOrderBy('report.id', 'DESC')
        .take(limit + 1)
        .getMany()
    const hasMore = rows.length > limit
    const reports = hasMore ? rows.slice(0, limit) : rows
    const now = Date.now()
    const items = reports.map((report) => reportResponse(report,
        report.status === AutoCareChatReportStatus.Pending
        && Boolean(report.reportedMessageId && report.acknowledgedAt && report.policyVersion)
        && (user.role === UserRole.SuperAdmin || (report.assignedModeratorId === user.id && Boolean(report.accessExpiresAt && report.accessExpiresAt.getTime() > now))),
    ))
    const lastReport = reports.at(-1)
    return {
        items,
        nextCursor: hasMore && lastReport
            ? encodeCursor({ createdAt: lastReport.createdAt.toISOString(), id: lastReport.id })
            : null,
        totalCount,
    }
}

export async function assignAdminAutoCareChatModerator(user: UserEntity, reportId: string, moderatorId: string | null, reason: string, request?: FastifyRequest) {
    assertRole(user, [UserRole.SuperAdmin], 'Only a super administrator can assign chat moderators.')
    const normalizedReportId = normalizeAutoCareChatReportUuid(reportId)
    const normalizedInput = normalizeAutoCareChatModeratorAssignment(moderatorId, reason)
    if (!normalizedReportId || !normalizedInput) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Moderator assignment is invalid.' })
    const report = await AppDataSource.getRepository(AutoCareChatReportEntity).findOneBy({ id: normalizedReportId })
    if (!report) fail(404, 'Chat report not found.')
    const thread = await AppDataSource.getRepository(AutoCareChatThreadEntity).findOneBy({ id: report.threadId })
    if (!thread) fail(404, 'Chat not found.')
    const assigned = await AppDataSource.transaction(async (manager) => {
        const lockedThread = await lockThreadForMutation(manager, thread)
        const reports = manager.getRepository(AutoCareChatReportEntity)
        const lockedReport = await reports.findOne({ where: { id: normalizedReportId }, lock: { mode: 'pessimistic_write' } })
        if (!lockedReport) fail(404, 'Chat report not found.')
        if (lockedReport.status !== AutoCareChatReportStatus.Pending) fail(409, 'Only pending reports can be assigned.')
        if (lockedThread.type !== AutoCareChatThreadType.ServiceRequest || !lockedThread.requestId) fail(409, 'Moderation assignment is limited to service-request threads.')
        if (!lockedReport.reportedMessageId || !lockedReport.acknowledgedAt || !lockedReport.policyVersion) fail(409, 'This legacy report has no message-level consent and cannot grant chat access.')
        if (normalizedInput.moderatorId) {
            const moderator = await manager.getRepository(UserEntity).findOneBy({ id: normalizedInput.moderatorId })
            if (!moderator || moderator.role !== UserRole.Admin || moderator.status !== UserStatus.Active) fail(400, 'The moderator must be an active administrator.')
        }
        const now = new Date()
        if (normalizedInput.moderatorId
            && lockedReport.assignedModeratorId === normalizedInput.moderatorId
            && lockedReport.assignmentReason === normalizedInput.reason
            && lockedReport.accessExpiresAt
            && lockedReport.accessExpiresAt.getTime() > now.getTime()) {
            return lockedReport
        }
        const anchor = await manager.getRepository(ServiceMessageEntity).findOne({
            where: { id: lockedReport.reportedMessageId, requestId: lockedThread.requestId },
            select: { id: true, threadId: true, requestId: true, kind: true, deletedAt: true },
        })
        if (!anchor || anchor.threadId !== lockedThread.id || anchor.kind !== ServiceMessageKind.Text || anchor.deletedAt) fail(409, 'This report does not reference an eligible message in the service-request thread.')
        const pending = await reports.find({ where: { threadId: lockedThread.id, status: AutoCareChatReportStatus.Pending } })
        const assignable = pending.filter((item) => item.reportedMessageId && item.acknowledgedAt && item.policyVersion)
        const accessExpiresAt = normalizedInput.moderatorId ? new Date(now.getTime() + 24 * 60 * 60_000) : null
        const extensionAlreadyUsed = assignable.some((item) => item.extensionUsed)
        const updated = assignable.map((item) => ({
            ...item,
            assignedModeratorId: normalizedInput.moderatorId,
            assignedById: user.id,
            assignmentReason: normalizedInput.reason,
            assignedAt: normalizedInput.moderatorId ? now : null,
            accessExpiresAt,
            extensionUsed: extensionAlreadyUsed || item.extensionUsed,
            extensionReason: item.extensionReason,
            extendedAt: item.extendedAt,
        }))
        const saved = await reports.save(updated)
        const result = saved.find((item) => item.id === lockedReport.id) ?? lockedReport
        if (normalizedInput.moderatorId) {
            for (const assignedReport of saved) {
                await enqueueNotification({
                    userId: normalizedInput.moderatorId,
                    category: NotificationCategory.Moderation,
                    template: { key: 'autocare.chat_report_assigned' },
                    link: '/admin/dashboard',
                    metadata: { reportId: assignedReport.id },
                }, `autocare-chat-report:${assignedReport.id}:assigned:${now.getTime()}`, manager)
            }
        }
        await recordAuditLog({
            manager,
            actorId: user.id,
            action: AuditAction.ChatReportModerated,
            targetId: lockedReport.id,
            targetType: 'autocare_chat_report_assignment',
            metadata: { threadId: lockedThread.id, requestId: lockedThread.requestId, moderatorId: normalizedInput.moderatorId, reason: normalizedInput.reason, operation: normalizedInput.moderatorId ? 'assigned' : 'unassigned', accessExpiresAt: result.accessExpiresAt?.toISOString() ?? null, reportsUpdated: saved.length },
            request,
        })
        return result
    })
    return reportResponse(assigned, true)
}

export async function extendAdminAutoCareChatModeratorAccess(user: UserEntity, reportId: string, reason: string, request?: FastifyRequest) {
    assertRole(user, [UserRole.Admin, UserRole.SuperAdmin], 'Only an administrator can extend moderation access.')
    const normalizedReportId = normalizeAutoCareChatReportUuid(reportId)
    const normalizedInput = normalizeAutoCareChatModeratorExtension(reason)
    if (!normalizedReportId || !normalizedInput) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Moderation access extension is invalid.' })
    const reports = AppDataSource.getRepository(AutoCareChatReportEntity)
    const report = await reports.findOneBy({ id: normalizedReportId })
    if (!report) fail(404, 'Chat report not found.')
    if (user.role === UserRole.Admin && report.assignedModeratorId !== user.id) fail(403, 'Only the assigned moderator can extend this access.')
    const thread = await AppDataSource.getRepository(AutoCareChatThreadEntity).findOneBy({ id: report.threadId })
    if (!thread) fail(404, 'Chat not found.')
    if (thread.type !== AutoCareChatThreadType.ServiceRequest || !thread.requestId) fail(409, 'Moderator access can only be extended for a service-request thread.')
    const extended = await AppDataSource.transaction(async (manager) => {
        const lockedThread = await lockThreadForMutation(manager, thread)
        if (lockedThread.type !== AutoCareChatThreadType.ServiceRequest || !lockedThread.requestId) fail(409, 'Moderator access can only be extended for a service-request thread.')
        const lockedReport = await manager.getRepository(AutoCareChatReportEntity).findOne({ where: { id: normalizedReportId }, lock: { mode: 'pessimistic_write' } })
        if (!lockedReport) fail(404, 'Chat report not found.')
        if (lockedReport.status !== AutoCareChatReportStatus.Pending || !lockedReport.assignedModeratorId) fail(409, 'Only an assigned pending report can be extended.')
        if (!lockedReport.reportedMessageId || !lockedReport.acknowledgedAt || !lockedReport.policyVersion) fail(409, 'This report has no message-level consent for moderator access.')
        if (user.role === UserRole.Admin && lockedReport.assignedModeratorId !== user.id) fail(403, 'Only the assigned moderator can extend this access.')
        const pendingReports = (await manager.getRepository(AutoCareChatReportEntity).find({ where: { threadId: thread.id, status: AutoCareChatReportStatus.Pending } })).filter((active) => active.reportedMessageId && active.acknowledgedAt && active.policyVersion && active.assignedModeratorId)
        if (pendingReports.some((active) => active.extensionUsed)) fail(409, 'Moderation access can only be extended once for this service request.')
        if (pendingReports.some((active) => !active.accessExpiresAt || active.accessExpiresAt.getTime() <= Date.now())) fail(409, 'Expired moderation access cannot be extended.')
        if (pendingReports.some((active) => active.assignedModeratorId !== lockedReport.assignedModeratorId)) fail(409, 'Moderator assignment is inconsistent for this service request.')
        const previousExpiry = lockedReport.accessExpiresAt
        if (!previousExpiry || pendingReports.some((active) => active.accessExpiresAt?.getTime() !== previousExpiry.getTime())) fail(409, 'Moderation access expiry is inconsistent for this service request.')
        const now = new Date()
        const accessExpiresAt = calculateAutoCareChatExtendedExpiry(previousExpiry)
        if (!accessExpiresAt) fail(409, 'Expired moderation access cannot be extended.')
        const updated = pendingReports.map((active) => ({ ...active, extensionUsed: true, extensionReason: normalizedInput.reason, extendedAt: now, accessExpiresAt }))
        const saved = await manager.getRepository(AutoCareChatReportEntity).save(updated)
        const result = saved.find((item) => item.id === lockedReport.id) ?? lockedReport
        await recordAuditLog({
            manager,
            actorId: user.id,
            action: AuditAction.ChatReportModerated,
            targetId: lockedReport.id,
            targetType: 'autocare_chat_report_assignment',
            metadata: { threadId: lockedThread.id, requestId: lockedThread.requestId, moderatorId: result.assignedModeratorId, reason: normalizedInput.reason, operation: 'extended', previousAccessExpiresAt: previousExpiry.toISOString(), accessExpiresAt: result.accessExpiresAt?.toISOString() ?? null, extensionUsed: result.extensionUsed, reportsUpdated: saved.length },
            request,
        })
        return result
    })
    return reportResponse(extended, true)
}

export async function decideAdminAutoCareChatReport(user: UserEntity, reportId: string, status: AutoCareChatReportStatus.Resolved | AutoCareChatReportStatus.Dismissed, reason?: string | null, blockUser = false, blockDurationDays?: number) {
    assertRole(user, [UserRole.Admin, UserRole.SuperAdmin], 'Only administrators can review chat reports.')
    const normalizedReportId = normalizeAutoCareChatReportUuid(reportId)
    if (!normalizedReportId) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Chat report id must be a valid UUID.' })
    const normalizedInput = normalizeAutoCareChatReportDecision(status, reason, blockUser, blockDurationDays)
    if (!normalizedInput) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Chat report decision is invalid.' })
    if (normalizedInput.blockDurationDays === 30 && user.role !== UserRole.SuperAdmin) fail(403, 'Only a super administrator can apply a 30-day chat restriction.')
    const reports = AppDataSource.getRepository(AutoCareChatReportEntity)
    const report = await reports.findOneBy({ id: normalizedReportId })
    if (!report) fail(404, 'Chat report not found.')
    if (report.status !== AutoCareChatReportStatus.Pending) return reportResponse(report)
    const thread = await AppDataSource.getRepository(AutoCareChatThreadEntity).findOneBy({ id: report.threadId })
    if (!thread) fail(404, 'Chat not found.')
    const result = await AppDataSource.transaction(async (manager) => {
        const lockedThread = await lockThreadForMutation(manager, thread)
        const lockedReports = manager.getRepository(AutoCareChatReportEntity)
        const lockedReport = await lockedReports.findOne({ where: { id: normalizedReportId }, lock: { mode: 'pessimistic_write' } })
        if (!lockedReport) fail(404, 'Chat report not found.')
        if (lockedReport.status !== AutoCareChatReportStatus.Pending) return lockedReport
        if ((!lockedReport.reportedMessageId || !lockedReport.acknowledgedAt || !lockedReport.policyVersion) && user.role === UserRole.SuperAdmin && (normalizedInput.reason?.length ?? 0) < 10) {
            fail(400, 'A reason of at least 10 characters is required to close a legacy report without consent metadata.')
        }
        if (user.role === UserRole.Admin && (lockedReport.assignedModeratorId !== user.id || !lockedReport.reportedMessageId || !lockedReport.acknowledgedAt || !lockedReport.policyVersion)) {
            fail(403, 'Only the assigned moderator can decide an active consented case.')
        }
        await assertThreadAccess(user, lockedThread)
        if (user.role === UserRole.Admin && (!lockedReport.accessExpiresAt || lockedReport.accessExpiresAt.getTime() <= Date.now())) fail(403, 'Moderation access has expired.', ERROR_CODES.ChatModerationAccessExpired)
        lockedReport.status = normalizedInput.status
        lockedReport.reviewedById = user.id
        lockedReport.resolutionReason = normalizedInput.reason
        lockedReport.reviewedAt = new Date()
        const savedReport = await lockedReports.save(lockedReport)
        const evidenceRetainUntil = new Date(Date.now() + 90 * 24 * 60 * 60_000)
        await manager.query(
            `UPDATE "autocare_service_messages"
             SET "evidenceRetainUntil" = GREATEST(COALESCE("evidenceRetainUntil", $1), $1)
             WHERE "threadId" = $2 OR ("requestId" = $3 AND "requestId" IS NOT NULL)`,
            [evidenceRetainUntil, lockedThread.id, lockedThread.requestId],
        )
        if (normalizedInput.blockUser && lockedReport.reportedUserId) {
            const blocks = manager.getRepository(AutoCareChatBlockEntity)
            const expiresAt = new Date(Date.now() + (normalizedInput.blockDurationDays ?? 1) * 24 * 60 * 60_000)
            await blocks.save(blocks.create({
                threadId: lockedThread.id,
                blockerId: user.id,
                blockedUserId: lockedReport.reportedUserId,
                sourceReportId: lockedReport.id,
                status: AutoCareChatBlockStatus.Active,
                reason: normalizedInput.reason,
                expiresAt,
                revokedAt: null,
            }))
        }
        await enqueueNotification({
            userId: lockedReport.reporterId,
            category: NotificationCategory.Moderation,
            template: { key: normalizedInput.status === AutoCareChatReportStatus.Resolved ? 'autocare.chat_report_resolved' : 'autocare.chat_report_dismissed' },
            link: `/chats?chat=${encodeURIComponent(lockedThread.id)}`,
            metadata: { reportId: lockedReport.id, threadId: lockedThread.id, outcome: normalizedInput.status },
        }, `autocare-chat-report:${lockedReport.id}:${normalizedInput.status}`, manager)
        return savedReport
    })
    return reportResponse(result)
}

export async function markAutoCareChatRead(user: UserEntity, chatId: string) {
    const thread = await getThread(user, chatId)
    if (!shouldUpdateAutoCareChatReadReceipt(user.role, thread.type)) return { updated: 0 }
    const repository = AppDataSource.getRepository(ServiceMessageEntity)
    const messages = await repository.find({ where: thread.requestId ? [{ threadId: thread.id }, { requestId: thread.requestId }] : { threadId: thread.id } })
    const unread = messages.filter((message) => message.senderId !== user.id && !message.readAt)
    if (!unread.length) return { updated: 0 }
    const readAt = new Date()
    unread.forEach((message) => { message.readAt = readAt })
    await repository.save(unread)
    broadcastServiceChat(thread.id, { type: 'message.read', threadId: thread.id, requestId: thread.requestId ?? undefined, payload: { messageIds: unread.map((message) => message.id), readAt: readAt.toISOString() } })
    return { updated: unread.length }
}

export async function createAutoCareChatAttachment(user: UserEntity, chatId: string, input: { fileName: string; contentType: 'image/jpeg' | 'image/png' | 'image/webp'; size: number; contentBase64: string }) {
    const normalizedInput = normalizeAutoCareAttachmentInput(input)
    if (!normalizedInput) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Attachment payload is invalid.' })
    const thread = await getThread(user, chatId)
    assertChatMessageWriteAccess(user, thread)
    await assertChatMessagingAllowed(user, thread)
    if (thread.status === AutoCareChatThreadStatus.Closed) fail(409, 'This chat is closed.')
    const rawContent = decodeAutoCareAttachment(normalizedInput)
    const content = await normalizeAutoCareAttachment(rawContent, normalizedInput.contentType)
    const objectKey = createAutoCareAttachmentObjectKey('chats', thread.id, randomUUID())
    await saveAutoCareAttachmentObject(objectKey, content, normalizedInput.contentType)
    try {
        const attachment = await AppDataSource.transaction(async (manager) => {
            const lockedThread = await lockThreadForMutation(manager, thread)
            await assertThreadAccess(user, lockedThread)
            assertChatMessageWriteAccess(user, lockedThread)
            await assertChatMessagingAllowed(user, lockedThread, manager)
            if (lockedThread.status === AutoCareChatThreadStatus.Closed) fail(409, 'This chat is closed.')
            const quota = await manager.getRepository(ServiceAttachmentEntity)
                .createQueryBuilder('attachment')
                .select('COUNT(DISTINCT attachment.id)', 'count')
                .addSelect('COALESCE(SUM(attachment.bytes), 0)', 'bytes')
                .where('attachment.threadId = :threadId', { threadId: lockedThread.id })
                .getRawOne<{ count: string; bytes: string }>()
            assertAutoCareAttachmentQuota({
                existingCount: Number(quota?.count ?? 0),
                existingBytes: Number(quota?.bytes ?? 0),
                incomingBytes: content.length,
            })
            return manager.getRepository(ServiceAttachmentEntity).save(manager.getRepository(ServiceAttachmentEntity).create({ threadId: lockedThread.id, requestId: lockedThread.requestId, uploadedById: user.id, objectKey, contentType: normalizedInput.contentType, bytes: content.length, checksum: createHash('sha256').update(content).digest('hex'), status: ServiceAttachmentStatus.Ready }))
        })
        const result = attachmentResponse(attachment, thread.id)
        broadcastServiceChat(thread.id, { type: 'attachment.created', threadId: thread.id, requestId: thread.requestId ?? undefined, payload: result })
        return result
    } catch (error) {
        await removeAutoCareAttachmentObject(objectKey).catch(() => undefined)
        throw error
    }
}

export async function getAutoCareChatAttachment(user: UserEntity, chatId: string, attachmentId: string) {
    const thread = await getThread(user, chatId)
    const normalizedAttachmentId = normalizeAutoCareChatUuid(attachmentId)
    if (!normalizedAttachmentId) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Chat attachment id must be a valid UUID.' })
    const attachment = await AppDataSource.getRepository(ServiceAttachmentEntity).findOne({ where: thread.requestId ? [{ id: normalizedAttachmentId, threadId: thread.id, status: ServiceAttachmentStatus.Ready }, { id: normalizedAttachmentId, requestId: thread.requestId, status: ServiceAttachmentStatus.Ready }] : { id: normalizedAttachmentId, threadId: thread.id, status: ServiceAttachmentStatus.Ready }, select: { id: true, objectKey: true, contentType: true, bytes: true, checksum: true } })
    if (!attachment) fail(404, 'Chat attachment not found.')
    assertAutoCareAttachmentObjectKeyOwnedBy(attachment.objectKey, [
        { scope: 'chats', parentId: thread.id },
        ...(thread.requestId ? [{ scope: 'requests' as const, parentId: thread.requestId }] : []),
    ])
    const contentType = resolveAutoCareAttachmentContentType(attachment.contentType)
    const signedUrl = await getAutoCareAttachmentSignedDownloadUrl(attachment.objectKey, contentType, attachment.checksum, attachment.bytes)
    return {
        ...attachment,
        contentType,
        signedUrl,
        content: signedUrl ? null : await readAutoCareAttachmentObject(attachment.objectKey, attachment.checksum, attachment.bytes),
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
