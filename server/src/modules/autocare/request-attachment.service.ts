import { createHash, randomUUID } from 'node:crypto'
import { AppDataSource } from '../../database/data-source.js'
import { ServiceAttachmentEntity, ServiceAttachmentStatus, ServiceRequestEntity } from '../../entities/index.js'
import { UserRole, type UserEntity } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import type { CreateAutoCareServiceAttachmentInput } from './autocare.types.js'
import { broadcastServiceChat } from './service-chat.gateway.js'
import { assertAutoCareAttachmentQuota, decodeAutoCareAttachment, normalizeAutoCareAttachment, normalizeAutoCareAttachmentInput, resolveAutoCareAttachmentContentType } from './attachment-content.js'
import { assertAutoCareAttachmentObjectKeyOwnedBy, createAutoCareAttachmentObjectKey, getAutoCareAttachmentSignedDownloadUrl, readAutoCareAttachmentObject, removeAutoCareAttachmentObject, saveAutoCareAttachmentObject } from './autocare-attachment-storage.js'
import { normalizeAutoCareRequestUuid } from './request-input-policy.js'
import { assertParticipantWithManager, getParticipantRequest, lockRequestChatThreadForWrite } from './request-access.service.js'
import { forbidden, notFound, requireAutoCareRequestUuid } from './request-errors.js'

export async function createAutoCareServiceAttachment(user: UserEntity, requestId: string, input: CreateAutoCareServiceAttachmentInput) {
    requestId = requireAutoCareRequestUuid(requestId)
    const normalizedInput = normalizeAutoCareAttachmentInput(input)
    if (!normalizedInput) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Attachment payload is invalid.' })
    const request = await getParticipantRequest(user, requestId)
    await AppDataSource.transaction(async (manager) => {
        const lockedRequest = await manager.getRepository(ServiceRequestEntity).findOne({ where: { id: request.id }, lock: { mode: 'pessimistic_write' } })
        if (!lockedRequest) notFound('Service request not found.')
        await assertParticipantWithManager(manager, user, lockedRequest)
        await lockRequestChatThreadForWrite(manager, lockedRequest, user)
    })
    const rawContent = decodeAutoCareAttachment(normalizedInput)
    const content = await normalizeAutoCareAttachment(rawContent, normalizedInput.contentType)
    const objectKey = createAutoCareAttachmentObjectKey('requests', request.id, randomUUID())
    await saveAutoCareAttachmentObject(objectKey, content, normalizedInput.contentType)
    try {
        const attachment = await AppDataSource.transaction(async (manager) => {
            const lockedRequest = await manager.getRepository(ServiceRequestEntity).findOne({ where: { id: request.id }, lock: { mode: 'pessimistic_write' } })
            if (!lockedRequest) notFound('Service request not found.')
            await assertParticipantWithManager(manager, user, lockedRequest)
            const thread = await lockRequestChatThreadForWrite(manager, lockedRequest, user)
            const quota = await manager.getRepository(ServiceAttachmentEntity)
                .createQueryBuilder('attachment')
                .select('COUNT(DISTINCT attachment.id)', 'count')
                .addSelect('COALESCE(SUM(attachment.bytes), 0)', 'bytes')
                .where('attachment.requestId = :requestId', { requestId: lockedRequest.id })
                .getRawOne<{ count: string; bytes: string }>()
            assertAutoCareAttachmentQuota({
                existingCount: Number(quota?.count ?? 0),
                existingBytes: Number(quota?.bytes ?? 0),
                incomingBytes: content.length,
            })
            return manager.getRepository(ServiceAttachmentEntity).save(manager.getRepository(ServiceAttachmentEntity).create({
                requestId: lockedRequest.id,
                threadId: thread.id,
                uploadedById: user.id,
                objectKey,
                contentType: normalizedInput.contentType,
                bytes: content.length,
                checksum: createHash('sha256').update(content).digest('hex'),
                status: ServiceAttachmentStatus.Ready,
            }))
        })
        const result = { id: attachment.id, uploadedById: attachment.uploadedById, contentType: attachment.contentType, bytes: attachment.bytes, status: attachment.status, url: `/v1/service-requests/${requestId}/attachments/${attachment.id}`, createdAt: attachment.createdAt.toISOString() }
        broadcastServiceChat(requestId, { type: 'attachment.created', requestId, payload: result })
        return result
    } catch (error) {
        await removeAutoCareAttachmentObject(objectKey).catch(() => undefined)
        throw error
    }
}

export async function getAutoCareServiceAttachment(user: UserEntity, requestId: string, attachmentId: string) {
    requestId = requireAutoCareRequestUuid(requestId)
    const normalizedAttachmentId = normalizeAutoCareRequestUuid(attachmentId)
    if (!normalizedAttachmentId) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Service attachment id must be a valid UUID.' })
    if (user.role === UserRole.SuperAdmin) forbidden('SuperAdmin chat review must use the audited chat attachment route.')
    await getParticipantRequest(user, requestId)
    const attachment = await AppDataSource.getRepository(ServiceAttachmentEntity).findOne({ where: { id: normalizedAttachmentId, requestId, status: ServiceAttachmentStatus.Ready }, select: { id: true, objectKey: true, contentType: true, bytes: true, checksum: true } })
    if (!attachment) notFound('Service attachment not found.')
    assertAutoCareAttachmentObjectKeyOwnedBy(attachment.objectKey, [{ scope: 'requests', parentId: requestId }])
    const contentType = resolveAutoCareAttachmentContentType(attachment.contentType)
    const signedUrl = await getAutoCareAttachmentSignedDownloadUrl(attachment.objectKey, contentType, attachment.checksum, attachment.bytes)
    return {
        ...attachment,
        contentType,
        signedUrl,
        content: signedUrl ? null : await readAutoCareAttachmentObject(attachment.objectKey, attachment.checksum, attachment.bytes),
    }
}
