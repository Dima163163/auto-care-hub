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
    CreateAutoCareChatMessageInput,
} from './autocare.types.js'
import { broadcastServiceChat } from './service-chat.gateway.js'
import { assertAutoCareAttachmentQuota, decodeAutoCareAttachment, normalizeAutoCareAttachment } from './attachment-content.js'
import { createAutoCareAttachmentObjectKey, readAutoCareAttachmentObject, removeAutoCareAttachmentObject, saveAutoCareAttachmentObject } from './autocare-attachment-storage.js'
import { canManageProvider, getManagedProviderScopes, isManagedProviderLocationAllowed } from './provider-access.service.js'
import { assertCursorDate, decodeCursor, encodeCursor, getCursorLimit } from '../../shared/http/cursor-pagination.js'

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
    return {
        id: attachment.id,
        uploadedById: attachment.uploadedById,
        contentType: attachment.contentType,
        bytes: attachment.bytes,
        status: attachment.status,
        url: `/v1/chats/${chatId}/attachments/${attachment.id}`,
        createdAt: attachment.createdAt.toISOString(),
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
    // Support/admin escalation threads are the only private conversations that
    // may be opened by platform staff. A service-request or provider-inquiry
    // thread must remain visible only to its participants, even for a
    // super-admin; staff access is granted through an explicit support thread.
    if ((user.role === UserRole.Admin || user.role === UserRole.SuperAdmin) && [AutoCareChatThreadType.Support, AutoCareChatThreadType.AdminEscalation].includes(thread.type)) return
    if (thread.clientId === user.id) return
    if (user.role === UserRole.Owner && thread.createdById === user.id && thread.type === AutoCareChatThreadType.Support) return
    if (user.role === UserRole.Owner && thread.providerId) {
        const provider = await providerForThread(thread)
        const request = thread.requestId
            ? await AppDataSource.getRepository(ServiceRequestEntity).findOneBy({ id: thread.requestId, providerId: thread.providerId })
            : null
        if (provider && await canManageProvider(user.id, provider.id, request?.locationId ?? null)) return
    }
    fail(403, 'You do not have access to this chat.')
}

async function getThread(user: UserEntity, chatId: string) {
    const thread = await AppDataSource.getRepository(AutoCareChatThreadEntity).findOneBy({ id: chatId })
    if (!thread) fail(404, 'Chat not found.')
    await assertThreadAccess(user, thread)
    return thread
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
    if (user.role === UserRole.Client) {
        threads = await repository.find({ where: { clientId: user.id }, order: { updatedAt: 'DESC' } })
    } else if (user.role === UserRole.Owner) {
        const scopes = await getManagedProviderScopes(user.id)
        const providerIds = scopes.map(({ providerId }) => providerId)
        threads = providerIds.length
            ? await repository.find({ where: [{ providerId: In(providerIds) }, { createdById: user.id }], order: { updatedAt: 'DESC' } })
            : await repository.find({ where: { createdById: user.id }, order: { updatedAt: 'DESC' } })
        const requestIds = threads.flatMap((thread) => thread.requestId ? [thread.requestId] : [])
        const requests = requestIds.length
            ? await AppDataSource.getRepository(ServiceRequestEntity).find({ where: { id: In(requestIds) }, select: { id: true, providerId: true, locationId: true } })
            : []
        const requestById = new Map(requests.map((request) => [request.id, request]))
        threads = threads.filter((thread) => {
            if (thread.createdById === user.id && thread.type === AutoCareChatThreadType.Support) return true
            if (!thread.providerId) return false
            const request = thread.requestId ? requestById.get(thread.requestId) : null
            return isManagedProviderLocationAllowed(scopes, thread.providerId, request?.locationId ?? null)
        })
    } else if (user.role === UserRole.Admin || user.role === UserRole.SuperAdmin) {
        threads = await repository.find({ where: [{ type: AutoCareChatThreadType.Support }, { type: AutoCareChatThreadType.AdminEscalation }], order: { updatedAt: 'DESC' } })
    }
    return Promise.all(threads.map((thread) => toThreadResponse(user, thread)))
}

export async function createAutoCareChat(user: UserEntity, input: CreateAutoCareChatInput) {
    const repository = AppDataSource.getRepository(AutoCareChatThreadEntity)
    if (input.type === 'provider_inquiry') {
        assertRole(user, [UserRole.Client], 'Only clients can ask a service a question.')
        if (!input.providerId) fail(400, 'A provider is required for a service question.')
        const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: input.providerId, status: AutomotiveProviderStatus.Active })
        if (!provider) fail(404, 'Automotive provider not found.')
        const existing = await repository.findOneBy({ type: AutoCareChatThreadType.ProviderInquiry, providerId: provider.id, clientId: user.id, status: AutoCareChatThreadStatus.Open })
        if (existing) return toThreadResponse(user, existing)
        const thread = await repository.save(repository.create({ type: AutoCareChatThreadType.ProviderInquiry, providerId: provider.id, clientId: user.id, createdById: user.id, subject: input.subject, status: AutoCareChatThreadStatus.Open, lastMessageAt: null }))
        return toThreadResponse(user, thread)
    }
    if (input.type === 'support') {
        assertRole(user, [UserRole.Client, UserRole.Owner], 'Only clients and service owners can open a support chat.')
        if (input.providerId) {
            assertRole(user, [UserRole.Owner], 'Only service owners can link support to a service.')
            const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: input.providerId })
            if (!provider || !(await canManageProvider(user.id, input.providerId))) fail(403, 'You do not manage this service.')
        }
        const clientId = user.role === UserRole.Client ? user.id : null
        const existing = await repository.findOne({
            where: {
                type: AutoCareChatThreadType.Support,
                providerId: input.providerId ?? IsNull(),
                clientId: clientId ?? IsNull(),
                createdById: user.id,
                status: AutoCareChatThreadStatus.Open,
            },
            order: { updatedAt: 'DESC' },
        })
        if (existing) return toThreadResponse(user, existing)
        const thread = await repository.save(repository.create({ type: AutoCareChatThreadType.Support, providerId: input.providerId ?? null, clientId, createdById: user.id, subject: input.subject, status: AutoCareChatThreadStatus.Open, lastMessageAt: null }))
        return toThreadResponse(user, thread)
    }
    assertRole(user, [UserRole.Admin], 'Only administrators can escalate a platform question.')
    const thread = await repository.save(repository.create({ type: AutoCareChatThreadType.AdminEscalation, providerId: null, clientId: null, createdById: user.id, subject: input.subject, status: AutoCareChatThreadStatus.Open, lastMessageAt: null }))
    return toThreadResponse(user, thread)
}

export async function getAutoCareChat(user: UserEntity, chatId: string, input: { cursor?: string; limit?: number } = {}): Promise<AutoCareChatConversationResponse> {
    const thread = await getThread(user, chatId)
    const limit = getCursorLimit(input.limit)
    const cursor = input.cursor ? decodeCursor(input.cursor, ['createdAt', 'id']) : null
    const cursorCreatedAt = cursor ? assertCursorDate(cursor, 'createdAt') : null
    const messageWhere = thread.requestId ? '(message.threadId = :threadId OR message.requestId = :requestId)' : 'message.threadId = :threadId'
    const messageQuery = AppDataSource.getRepository(ServiceMessageEntity)
        .createQueryBuilder('message')
        .where(messageWhere, { threadId: thread.id, requestId: thread.requestId })
        .orderBy('message.createdAt', 'ASC')
        .addOrderBy('message.id', 'ASC')
        .take(limit + 1)
    if (cursorCreatedAt && cursor) {
        messageQuery.andWhere('(message.createdAt > :cursorCreatedAt OR (message.createdAt = :cursorCreatedAt AND message.id > :cursorId))', {
            cursorCreatedAt,
            cursorId: cursor.id,
        })
    }
    const [messages, attachments] = await Promise.all([
        messageQuery.getMany(),
        AppDataSource.getRepository(ServiceAttachmentEntity).find({ where: thread.requestId ? [{ threadId: thread.id }, { requestId: thread.requestId }] : { threadId: thread.id }, order: { createdAt: 'ASC' } }),
    ])
    const hasMore = messages.length > limit
    const page = hasMore ? messages.slice(0, limit) : messages
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
        attachments: attachments.map((attachment) => attachmentResponse(attachment, thread.id)),
        nextCursor: hasMore && lastMessage ? encodeCursor({ createdAt: lastMessage.createdAt.toISOString(), id: lastMessage.id }) : null,
    }
}

export async function createAutoCareChatMessage(user: UserEntity, chatId: string, input: CreateAutoCareChatMessageInput) {
    const thread = await getThread(user, chatId)
    if (thread.status === AutoCareChatThreadStatus.Closed) fail(409, 'This chat is closed.')
    await assertChatMessagingAllowed(user, thread)
    const provider = await providerForThread(thread)
    const recipientId = thread.clientId === user.id ? provider?.ownerId : thread.clientId
    const now = new Date()
    const message = await AppDataSource.getRepository(ServiceMessageEntity).save(AppDataSource.getRepository(ServiceMessageEntity).create({ threadId: thread.id, requestId: thread.requestId, senderId: user.id, kind: ServiceMessageKind.Text, body: input.body, offer: null, deliveredAt: recipientId ? now : null, readAt: null }))
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
        category: input.category,
        description: input.description?.trim() || null,
        status: AutoCareChatReportStatus.Pending,
        reviewedById: null,
        resolutionReason: null,
        reviewedAt: null,
    }))
    return reportResponse(report)
}

export async function createAutoCareChatBlock(user: UserEntity, chatId: string, blockedUserId?: string, reason?: string | null) {
    const thread = await getThread(user, chatId)
    const participants = await chatParticipantIds(thread)
    const target = blockedUserId ?? [...participants].find((id) => id !== user.id)
    if (!target || target === user.id || !participants.has(target)) fail(400, 'The blocked user must be another chat participant.')
    const blocks = AppDataSource.getRepository(AutoCareChatBlockEntity)
    const existing = await blocks.findOneBy({ threadId: thread.id, blockerId: user.id, blockedUserId: target })
    const block = existing
        ? await blocks.save({ ...existing, status: AutoCareChatBlockStatus.Active, reason: reason?.trim() || existing.reason, revokedAt: null })
        : await blocks.save(blocks.create({ threadId: thread.id, blockerId: user.id, blockedUserId: target, status: AutoCareChatBlockStatus.Active, reason: reason?.trim() || null, revokedAt: null }))
    return blockResponse(block)
}

export async function revokeAutoCareChatBlock(user: UserEntity, chatId: string, blockId: string) {
    const thread = await AppDataSource.getRepository(AutoCareChatThreadEntity).findOneBy({ id: chatId })
    if (!thread) fail(404, 'Chat not found.')
    const blocks = AppDataSource.getRepository(AutoCareChatBlockEntity)
    const block = await blocks.findOneBy({ id: blockId, threadId: chatId })
    if (!block) fail(404, 'Chat block not found.')
    if (![UserRole.Admin, UserRole.SuperAdmin].includes(user.role) && block.blockerId !== user.id) fail(403, 'You can only revoke your own chat block.')
    block.status = AutoCareChatBlockStatus.Revoked
    block.revokedAt = new Date()
    return blockResponse(await blocks.save(block))
}

export async function listAdminAutoCareChatReports(user: UserEntity, status?: AutoCareChatReportStatus) {
    assertRole(user, [UserRole.Admin, UserRole.SuperAdmin], 'Only administrators can review chat reports.')
    const reports = await AppDataSource.getRepository(AutoCareChatReportEntity).find({
        where: status ? { status } : undefined,
        order: { createdAt: 'DESC' },
        take: 100,
    })
    return reports.map((report) => reportResponse(report))
}

export async function decideAdminAutoCareChatReport(user: UserEntity, reportId: string, status: AutoCareChatReportStatus.Resolved | AutoCareChatReportStatus.Dismissed, reason?: string | null, blockUser = false) {
    assertRole(user, [UserRole.Admin, UserRole.SuperAdmin], 'Only administrators can review chat reports.')
    const reports = AppDataSource.getRepository(AutoCareChatReportEntity)
    const report = await reports.findOneBy({ id: reportId })
    if (!report) fail(404, 'Chat report not found.')
    if (report.status !== AutoCareChatReportStatus.Pending) return reportResponse(report)
    report.status = status
    report.reviewedById = user.id
    report.resolutionReason = reason?.trim() || null
    report.reviewedAt = new Date()
    const result = await reports.save(report)
    if (blockUser && report.reportedUserId) {
        const blocks = AppDataSource.getRepository(AutoCareChatBlockEntity)
        const existing = await blocks.findOneBy({ threadId: report.threadId, blockerId: user.id, blockedUserId: report.reportedUserId })
        if (existing) {
            await blocks.save({ ...existing, status: AutoCareChatBlockStatus.Active, reason: reason?.trim() || 'Moderation decision', revokedAt: null })
        } else {
            await blocks.save(blocks.create({ threadId: report.threadId, blockerId: user.id, blockedUserId: report.reportedUserId, status: AutoCareChatBlockStatus.Active, reason: reason?.trim() || 'Moderation decision', revokedAt: null }))
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
    const thread = await getThread(user, chatId)
    const rawContent = decodeAutoCareAttachment(input)
    const content = await normalizeAutoCareAttachment(rawContent, input.contentType)
    const objectKey = createAutoCareAttachmentObjectKey('chats', thread.id, randomUUID())
    await saveAutoCareAttachmentObject(objectKey, content)
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
            return manager.getRepository(ServiceAttachmentEntity).save(manager.getRepository(ServiceAttachmentEntity).create({ threadId: lockedThread.id, requestId: lockedThread.requestId, uploadedById: user.id, objectKey, contentType: input.contentType, bytes: content.length, content: null, checksum: createHash('sha256').update(content).digest('hex'), status: ServiceAttachmentStatus.Ready }))
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
    const attachment = await AppDataSource.getRepository(ServiceAttachmentEntity).findOne({ where: thread.requestId ? [{ id: attachmentId, threadId: thread.id }, { id: attachmentId, requestId: thread.requestId }] : { id: attachmentId, threadId: thread.id }, select: { id: true, objectKey: true, contentType: true, content: true } })
    if (!attachment) fail(404, 'Chat attachment not found.')
    return { ...attachment, content: await readAutoCareAttachmentObject(attachment.objectKey) }
}

export async function getAutoCareChatThreadForRequest(user: UserEntity, requestId: string) {
    const request = await AppDataSource.getRepository(ServiceRequestEntity).findOneBy({ id: requestId })
    if (!request) fail(404, 'Service request not found.')
    if (request.clientId !== user.id) {
        const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: request.providerId })
        if (user.role !== UserRole.Owner || !provider || !(await canManageProvider(user.id, provider.id, request.locationId))) fail(403, 'You do not have access to this request chat.')
    }
    const thread = await ensureAutoCareRequestChatThread(request)
    return toThreadResponse(user, thread)
}
