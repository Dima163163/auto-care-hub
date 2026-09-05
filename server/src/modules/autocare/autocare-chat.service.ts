import { In, IsNull, type EntityManager } from 'typeorm'
import { createHash, randomUUID } from 'node:crypto'

import { AppDataSource } from '../../database/data-source.js'
import {
    AutoCareChatThreadEntity,
    AutoCareChatThreadStatus,
    AutoCareChatThreadType,
    AutoCareChatBlockEntity,
    AutoCareChatBlockStatus,
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
import { UserRole, type UserEntity } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
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
import { normalizeAutoCareChatBlockInput, normalizeAutoCareChatReportDecision, normalizeAutoCareChatReportInput, normalizeAutoCareChatReportStatus, normalizeAutoCareChatReportUuid } from './chat-moderation-policy.js'
import { normalizeAutoCareChatInput, normalizeAutoCareChatUuid } from './chat-input-policy.js'

function fail(statusCode: number, message: string): never {
    const code = statusCode === 404 ? ERROR_CODES.NotFound : statusCode === 409 ? ERROR_CODES.Conflict : statusCode === 400 ? ERROR_CODES.BadRequest : ERROR_CODES.Forbidden
    throw new AppError({ statusCode, code, message })
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

async function assertThreadAccess(user: UserEntity, thread: AutoCareChatThreadEntity) {
    // The super administrator is the final escalation point and may inspect
    // and answer any conversation, including service-request attachments.
    // Regular admins remain limited to support/escalation threads unless a
    // conversation has been reported and is therefore in their moderation queue.
    if (user.role === UserRole.SuperAdmin) return
    if (user.role === UserRole.Admin && [AutoCareChatThreadType.Support, AutoCareChatThreadType.AdminEscalation].includes(thread.type)) return
    if (user.role === UserRole.Admin) {
        const report = await AppDataSource.getRepository(AutoCareChatReportEntity).findOneBy({ threadId: thread.id })
        if (report) return
    }
    if (thread.clientId === user.id) return
    if (thread.createdById === user.id && thread.type === AutoCareChatThreadType.Support) return
    if (thread.providerId) {
        const provider = await providerForThread(thread)
        const request = thread.requestId
            ? await AppDataSource.getRepository(ServiceRequestEntity).findOneBy({ id: thread.requestId, providerId: thread.providerId })
            : null
        if (provider && await hasProviderWorkspacePermission(user.id, provider.id, 'chats', request?.locationId ?? null)) return
    }
    fail(403, 'You do not have access to this chat.')
}

async function getThread(user: UserEntity, chatId: string) {
    const normalizedChatId = normalizeAutoCareChatUuid(chatId)
    if (!normalizedChatId) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Chat id must be a valid UUID.' })
    const thread = await AppDataSource.getRepository(AutoCareChatThreadEntity).findOneBy({ id: normalizedChatId })
    if (!thread) fail(404, 'Chat not found.')
    await assertThreadAccess(user, thread)
    return thread
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

async function assertChatMessagingAllowed(user: UserEntity, thread: AutoCareChatThreadEntity) {
    const blocks = await AppDataSource.getRepository(AutoCareChatBlockEntity).find({
        where: [
            { threadId: thread.id, blockedUserId: user.id, status: AutoCareChatBlockStatus.Active },
            { threadId: thread.id, blockerId: user.id, status: AutoCareChatBlockStatus.Active },
        ],
    })
    if (blocks.length > 0) fail(403, 'Messaging is unavailable because this chat is blocked.')
}

async function toThreadResponse(user: UserEntity, thread: AutoCareChatThreadEntity): Promise<AutoCareChatThreadResponse> {
    const provider = await providerForThread(thread)
    const messages = await AppDataSource.getRepository(ServiceMessageEntity).find({ where: thread.requestId ? [{ threadId: thread.id }, { requestId: thread.requestId }] : { threadId: thread.id } })
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
        const moderationReports = await AppDataSource.getRepository(AutoCareChatReportEntity).find({ order: { createdAt: 'DESC' }, take: 100 })
        const reportedThreadIds = [...new Set(moderationReports.map((report) => report.threadId))]
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
    const unread = page.filter((message) => message.senderId !== user.id && !message.readAt)
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

export async function createAutoCareChatMessage(user: UserEntity, chatId: string, input: unknown) {
    const normalizedInput = normalizeAutoCareChatMessageInput(input)
    if (!normalizedInput) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Message body is invalid.' })
    const body = normalizedInput.body
    const thread = await getThread(user, chatId)
    if (thread.status === AutoCareChatThreadStatus.Closed) fail(409, 'This chat is closed.')
    await assertChatMessagingAllowed(user, thread)
    const provider = await providerForThread(thread)
    const recipientId = thread.clientId === user.id ? provider?.ownerId : thread.clientId
    const now = new Date()
    const message = await AppDataSource.getRepository(ServiceMessageEntity).save(AppDataSource.getRepository(ServiceMessageEntity).create({ threadId: thread.id, requestId: thread.requestId, senderId: user.id, kind: ServiceMessageKind.Text, body, offer: null, deliveredAt: recipientId ? now : null, readAt: null }))
    thread.lastMessageAt = now
    await AppDataSource.getRepository(AutoCareChatThreadEntity).save(thread)
    const result = messageResponse(message)
    broadcastServiceChat(thread.id, { type: 'message.created', threadId: thread.id, requestId: thread.requestId ?? undefined, payload: result })
    return result
}

export type CreateAutoCareChatReportInput = {
    category: AutoCareChatReportCategory
    description?: string | null
}

export type AutoCareChatReportResponse = {
    id: string
    threadId: string
    reporterId: string
    reportedUserId: string | null
    category: AutoCareChatReportCategory
    description: string | null
    status: AutoCareChatReportStatus
    reviewedById: string | null
    resolutionReason: string | null
    createdAt: string
    reviewedAt: string | null
}

export type AutoCareChatBlockResponse = {
    id: string
    threadId: string
    blockerId: string
    blockedUserId: string
    status: AutoCareChatBlockStatus
    reason: string | null
    createdAt: string
    revokedAt: string | null
}

function reportResponse(report: AutoCareChatReportEntity): AutoCareChatReportResponse {
    return {
        id: report.id,
        threadId: report.threadId,
        reporterId: report.reporterId,
        reportedUserId: report.reportedUserId,
        category: report.category,
        description: report.description,
        status: report.status,
        reviewedById: report.reviewedById,
        resolutionReason: report.resolutionReason,
        createdAt: report.createdAt.toISOString(),
        reviewedAt: report.reviewedAt?.toISOString() ?? null,
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
        createdAt: block.createdAt.toISOString(),
        revokedAt: block.revokedAt?.toISOString() ?? null,
    }
}

export async function createAutoCareChatReport(user: UserEntity, chatId: string, input: CreateAutoCareChatReportInput) {
    const normalizedInput = normalizeAutoCareChatReportInput(input)
    if (!normalizedInput) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Chat report is invalid.' })
    const thread = await getThread(user, chatId)
    const reports = AppDataSource.getRepository(AutoCareChatReportEntity)
    const existing = await reports.findOneBy({ threadId: thread.id, reporterId: user.id })
    if (existing) return reportResponse(existing)
    const participants = await chatParticipantIds(thread)
    const reportedUserId = [...participants].find((id) => id !== user.id) ?? null
    const report = await reports.save(reports.create({
        threadId: thread.id,
        reporterId: user.id,
        reportedUserId,
        category: normalizedInput.category,
        description: normalizedInput.description,
        status: AutoCareChatReportStatus.Pending,
        reviewedById: null,
        resolutionReason: null,
        reviewedAt: null,
    }))
    return reportResponse(report)
}

export async function createAutoCareChatBlock(user: UserEntity, chatId: string, blockedUserId?: string, reason?: string | null) {
    const normalizedInput = normalizeAutoCareChatBlockInput(blockedUserId, reason)
    if (!normalizedInput) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Chat block is invalid.' })
    const thread = await getThread(user, chatId)
    const participants = await chatParticipantIds(thread)
    const target = normalizedInput.blockedUserId ?? [...participants].find((id) => id !== user.id)
    if (!target || target === user.id || !participants.has(target)) fail(400, 'The blocked user must be another chat participant.')
    const blocks = AppDataSource.getRepository(AutoCareChatBlockEntity)
    const existing = await blocks.findOneBy({ threadId: thread.id, blockerId: user.id, blockedUserId: target })
    const block = existing
        ? await blocks.save({ ...existing, status: AutoCareChatBlockStatus.Active, reason: normalizedInput.reason || existing.reason, revokedAt: null })
        : await blocks.save(blocks.create({ threadId: thread.id, blockerId: user.id, blockedUserId: target, status: AutoCareChatBlockStatus.Active, reason: normalizedInput.reason, revokedAt: null }))
    return blockResponse(block)
}

export async function revokeAutoCareChatBlock(user: UserEntity, chatId: string, blockId: string) {
    const normalizedChatId = normalizeAutoCareChatUuid(chatId)
    const normalizedBlockId = normalizeAutoCareChatUuid(blockId)
    if (!normalizedChatId || !normalizedBlockId) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Chat and block ids must be valid UUIDs.' })
    const thread = await AppDataSource.getRepository(AutoCareChatThreadEntity).findOneBy({ id: normalizedChatId })
    if (!thread) fail(404, 'Chat not found.')
    const blocks = AppDataSource.getRepository(AutoCareChatBlockEntity)
    const block = await blocks.findOneBy({ id: normalizedBlockId, threadId: normalizedChatId })
    if (!block) fail(404, 'Chat block not found.')
    if (![UserRole.Admin, UserRole.SuperAdmin].includes(user.role) && block.blockerId !== user.id) fail(403, 'You can only revoke your own chat block.')
    block.status = AutoCareChatBlockStatus.Revoked
    block.revokedAt = new Date()
    return blockResponse(await blocks.save(block))
}

export async function listAdminAutoCareChatReports(user: UserEntity, status?: AutoCareChatReportStatus) {
    assertRole(user, [UserRole.Admin, UserRole.SuperAdmin], 'Only administrators can review chat reports.')
    const normalizedStatus = status === undefined ? undefined : normalizeAutoCareChatReportStatus(status)
    if (status !== undefined && !normalizedStatus) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Chat report status is invalid.' })
    const reports = await AppDataSource.getRepository(AutoCareChatReportEntity).find({
        where: normalizedStatus ? { status: normalizedStatus } : undefined,
        order: { createdAt: 'DESC' },
        take: 100,
    })
    return reports.map((report) => reportResponse(report))
}

export async function decideAdminAutoCareChatReport(user: UserEntity, reportId: string, status: AutoCareChatReportStatus.Resolved | AutoCareChatReportStatus.Dismissed, reason?: string | null, blockUser = false) {
    assertRole(user, [UserRole.Admin, UserRole.SuperAdmin], 'Only administrators can review chat reports.')
    const normalizedReportId = normalizeAutoCareChatReportUuid(reportId)
    if (!normalizedReportId) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Chat report id must be a valid UUID.' })
    const normalizedInput = normalizeAutoCareChatReportDecision(status, reason, blockUser)
    if (!normalizedInput) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Chat report decision is invalid.' })
    const reports = AppDataSource.getRepository(AutoCareChatReportEntity)
    const report = await reports.findOneBy({ id: normalizedReportId })
    if (!report) fail(404, 'Chat report not found.')
    if (report.status !== AutoCareChatReportStatus.Pending) return reportResponse(report)
    report.status = normalizedInput.status
    report.reviewedById = user.id
    report.resolutionReason = normalizedInput.reason
    report.reviewedAt = new Date()
    const result = await reports.save(report)
    if (normalizedInput.blockUser && report.reportedUserId) {
        const blocks = AppDataSource.getRepository(AutoCareChatBlockEntity)
        const existing = await blocks.findOneBy({ threadId: report.threadId, blockerId: user.id, blockedUserId: report.reportedUserId })
        if (existing) {
            await blocks.save({ ...existing, status: AutoCareChatBlockStatus.Active, reason: normalizedInput.reason || 'Moderation decision', revokedAt: null })
        } else {
            await blocks.save(blocks.create({ threadId: report.threadId, blockerId: user.id, blockedUserId: report.reportedUserId, status: AutoCareChatBlockStatus.Active, reason: normalizedInput.reason || 'Moderation decision', revokedAt: null }))
        }
    }
    return reportResponse(result)
}

export async function markAutoCareChatRead(user: UserEntity, chatId: string) {
    const thread = await getThread(user, chatId)
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
    const rawContent = decodeAutoCareAttachment(normalizedInput)
    const content = await normalizeAutoCareAttachment(rawContent, normalizedInput.contentType)
    const objectKey = createAutoCareAttachmentObjectKey('chats', thread.id, randomUUID())
    await saveAutoCareAttachmentObject(objectKey, content, normalizedInput.contentType)
    try {
        const attachment = await AppDataSource.transaction(async (manager) => {
            const lockedThread = await manager.getRepository(AutoCareChatThreadEntity).findOne({ where: { id: thread.id }, lock: { mode: 'pessimistic_write' } })
            if (!lockedThread) fail(404, 'Chat not found.')
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
