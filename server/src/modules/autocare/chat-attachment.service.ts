import { createHash, randomUUID } from 'node:crypto'
import { AppDataSource } from '../../database/data-source.js'
import { AutoCareChatThreadStatus, ServiceAttachmentEntity, ServiceAttachmentStatus } from '../../entities/index.js'
import { UserEntity } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { broadcastServiceChat } from './service-chat.gateway.js'
import { assertAutoCareAttachmentQuota, decodeAutoCareAttachment, normalizeAutoCareAttachment, normalizeAutoCareAttachmentInput, resolveAutoCareAttachmentContentType } from './attachment-content.js'
import { assertAutoCareAttachmentObjectKeyOwnedBy, createAutoCareAttachmentObjectKey, getAutoCareAttachmentSignedDownloadUrl, readAutoCareAttachmentObject, removeAutoCareAttachmentObject, saveAutoCareAttachmentObject } from './autocare-attachment-storage.js'
import { normalizeAutoCareChatUuid } from './chat-input-policy.js'
import { assertChatMessageWriteAccess, assertChatMessagingAllowed, assertThreadAccess, getThread, lockThreadForMutation } from './chat-access.service.js'
import { fail } from './chat-errors.js'
import { attachmentResponse } from './chat-response.js'

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
