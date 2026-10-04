import { createHash } from 'node:crypto'
import { AppDataSource } from '../../database/data-source.js'
import { AutoCareChatThreadEntity, AutoCareChatThreadStatus, AutoCareChatReportEntity, AutoCareChatReportStatus, ServiceMessageEntity, ServiceMessageKind } from '../../entities/index.js'
import { UserEntity } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { broadcastServiceChat } from './service-chat.gateway.js'
import { normalizeAutoCareChatMessageInput } from './message-content-policy.js'
import { normalizeIdempotencyKey } from '../../shared/http/idempotency-key.js'
import { normalizeAutoCareChatUuid } from './chat-input-policy.js'
import { shouldUpdateAutoCareChatReadReceipt } from './chat-read-policy.js'
import { assertChatMessageWriteAccess, assertChatMessagingAllowed, assertThreadAccess, getThread, lockThreadForMutation, providerForThread } from './chat-access.service.js'
import { fail } from './chat-errors.js'
import { chatMessageIdempotencyConflict, isChatMessageIdempotencyUniqueError } from './chat-idempotency.js'
import { messageResponse } from './chat-response.js'

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
