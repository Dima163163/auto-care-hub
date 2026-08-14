import { In, IsNull } from 'typeorm'

import { AppDataSource } from '../../database/data-source.js'
import {
    AutoCareChatThreadEntity,
    AutoCareChatThreadStatus,
    AutoCareChatThreadType,
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

export async function ensureAutoCareRequestChatThread(request: ServiceRequestEntity) {
    const repository = AppDataSource.getRepository(AutoCareChatThreadEntity)
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
    if (user.role === UserRole.SuperAdmin) return
    if ((user.role === UserRole.Admin) && [AutoCareChatThreadType.Support, AutoCareChatThreadType.AdminEscalation].includes(thread.type)) return
    if (thread.clientId === user.id) return
    if (user.role === UserRole.Owner && thread.providerId) {
        const provider = await providerForThread(thread)
        if (provider?.ownerId === user.id) return
    }
    fail(403, 'You do not have access to this chat.')
}

async function getThread(user: UserEntity, chatId: string) {
    const thread = await AppDataSource.getRepository(AutoCareChatThreadEntity).findOneBy({ id: chatId })
    if (!thread) fail(404, 'Chat not found.')
    await assertThreadAccess(user, thread)
    return thread
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
        const providers = await AppDataSource.getRepository(AutomotiveProviderEntity).find({ where: { ownerId: user.id }, select: { id: true } })
        const providerIds = providers.map((provider) => provider.id)
        threads = providerIds.length
            ? await repository.find({ where: [{ providerId: In(providerIds) }, { createdById: user.id }], order: { updatedAt: 'DESC' } })
            : await repository.find({ where: { createdById: user.id }, order: { updatedAt: 'DESC' } })
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
            const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: input.providerId, ownerId: user.id })
            if (!provider) fail(403, 'You do not manage this service.')
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

export async function getAutoCareChat(user: UserEntity, chatId: string): Promise<AutoCareChatConversationResponse> {
    const thread = await getThread(user, chatId)
    const [messages, attachments] = await Promise.all([
        AppDataSource.getRepository(ServiceMessageEntity).find({ where: thread.requestId ? [{ threadId: thread.id }, { requestId: thread.requestId }] : { threadId: thread.id }, order: { createdAt: 'ASC' } }),
        AppDataSource.getRepository(ServiceAttachmentEntity).find({ where: thread.requestId ? [{ threadId: thread.id }, { requestId: thread.requestId }] : { threadId: thread.id }, order: { createdAt: 'ASC' } }),
    ])
    return { thread: await toThreadResponse(user, thread), messages: messages.map(messageResponse), attachments: attachments.map((attachment) => attachmentResponse(attachment, thread.id)) }
}

export async function createAutoCareChatMessage(user: UserEntity, chatId: string, input: CreateAutoCareChatMessageInput) {
    const thread = await getThread(user, chatId)
    if (thread.status === AutoCareChatThreadStatus.Closed) fail(409, 'This chat is closed.')
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
    const content = Buffer.from(input.contentBase64, 'base64')
    if (content.length !== input.size) fail(409, 'Attachment content does not match its declared size.')
    const attachment = await AppDataSource.getRepository(ServiceAttachmentEntity).save(AppDataSource.getRepository(ServiceAttachmentEntity).create({ threadId: thread.id, requestId: thread.requestId, uploadedById: user.id, objectKey: `autocare-chats/${thread.id}/${Date.now()}-${input.fileName.replace(/[^a-zA-Z0-9._-]/g, '-')}`, contentType: input.contentType, bytes: content.length, content, checksum: null, status: ServiceAttachmentStatus.Ready }))
    const result = attachmentResponse(attachment, thread.id)
    broadcastServiceChat(thread.id, { type: 'attachment.created', threadId: thread.id, requestId: thread.requestId ?? undefined, payload: result })
    return result
}

export async function getAutoCareChatAttachment(user: UserEntity, chatId: string, attachmentId: string) {
    const thread = await getThread(user, chatId)
    const attachment = await AppDataSource.getRepository(ServiceAttachmentEntity).findOne({ where: thread.requestId ? [{ id: attachmentId, threadId: thread.id }, { id: attachmentId, requestId: thread.requestId }] : { id: attachmentId, threadId: thread.id }, select: { id: true, contentType: true, content: true } })
    if (!attachment?.content) fail(404, 'Chat attachment not found.')
    return attachment
}

export async function getAutoCareChatThreadForRequest(user: UserEntity, requestId: string) {
    const request = await AppDataSource.getRepository(ServiceRequestEntity).findOneBy({ id: requestId })
    if (!request) fail(404, 'Service request not found.')
    if (request.clientId !== user.id && user.role !== UserRole.Admin && user.role !== UserRole.SuperAdmin) {
        const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: request.providerId })
        if (user.role !== UserRole.Owner || provider?.ownerId !== user.id) fail(403, 'You do not have access to this request chat.')
    }
    const thread = await ensureAutoCareRequestChatThread(request)
    return toThreadResponse(user, thread)
}
