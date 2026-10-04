import { ServiceAttachmentEntity, ServiceMessageEntity, type ServiceMessageOffer } from '../../entities/index.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import type { AutoCareServiceAttachmentResponse, AutoCareServiceMessageResponse } from './autocare.types.js'
import { resolveAutoCareAttachmentContentType } from './attachment-content.js'

export function messageResponse(message: ServiceMessageEntity): AutoCareServiceMessageResponse {
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

export function attachmentResponse(attachment: ServiceAttachmentEntity, chatId: string): AutoCareServiceAttachmentResponse {
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

export function safeAttachmentResponse(attachment: ServiceAttachmentEntity, chatId: string) {
    try {
        return attachmentResponse(attachment, chatId)
    } catch (error) {
        if (error instanceof AppError && error.code === ERROR_CODES.NotFound) return null
        throw error
    }
}
