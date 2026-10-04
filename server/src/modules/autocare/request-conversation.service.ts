import { MoreThan } from 'typeorm'
import { createHash, randomUUID } from 'node:crypto'
import { AppDataSource } from '../../database/data-source.js'
import { AutomotiveProviderEntity, AutoCareChatReportEntity, AutoCareChatReportStatus, ServiceAttachmentEntity, ServiceAttachmentStatus, ServiceMessageEntity, ServiceMessageKind, type ServiceMessageOffer, ServiceRequestEntity, ServiceRequestStatus } from '../../entities/index.js'
import { UserRole, type UserEntity } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { assertCursorDate, decodeCursor, encodeCursor, getCursorLimit, normalizeCursorPaginationInput } from '../../shared/http/cursor-pagination.js'
import type { AutoCareServiceRequestConversationResponse, CreateAutoCareServiceOfferInput } from './autocare.types.js'
import { broadcastServiceChat } from './service-chat.gateway.js'
import { ensureAutoCareRequestChatThread } from './autocare-chat.service.js'
import { resolveAutoCareAttachmentContentType } from './attachment-content.js'
import { hasProviderWorkspacePermissionWithManager } from './provider-access.service.js'
import { normalizeAutoCareServiceMessageInput } from './message-content-policy.js'
import { normalizeAutoCareServiceOfferDecision, normalizeAutoCareServiceOfferInput } from './offer-policy.js'
import { normalizeAutoCareRequestUuid } from './request-input-policy.js'
import { isAutoCareServiceOfferExpired } from './request-lifecycle-policy.js'
import { assertParticipantWithManager, getParticipantRequest, lockRequestChatThreadForWrite } from './request-access.service.js'
import { appendRepairEventWithManager, notifyAutoCareParticipant } from './request-effects.service.js'
import { clientOnly, conflict, forbidden, notFound, requireAutoCareRequestUuid } from './request-errors.js'
import { isMessageIdempotencyUniqueError, messageIdempotencyConflict, sameServiceOffer } from './request-idempotency.js'
import { hydrateRequest } from './request-read.service.js'
import { messageResponse } from './request-response.js'

const serviceRequestOfferableStates = new Set<ServiceRequestStatus>([
    ServiceRequestStatus.Open,
    ServiceRequestStatus.AwaitingReply,
    ServiceRequestStatus.EstimateShared,
])

export async function getAutoCareServiceRequestConversation(user: UserEntity, requestId: string, input: { cursor?: string; beforeCursor?: string; limit?: number } = {}): Promise<AutoCareServiceRequestConversationResponse> {
    requestId = requireAutoCareRequestUuid(requestId)
    const normalizedInput = normalizeCursorPaginationInput(input)
    if (!normalizedInput) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Service conversation pagination query is invalid.' })
    if (user.role === UserRole.SuperAdmin) forbidden('SuperAdmin chat review must use the audited chat access route.')
    const request = await getParticipantRequest(user, requestId)
    const chatThread = await ensureAutoCareRequestChatThread(request)
    const limit = getCursorLimit(normalizedInput.limit)
    const cursor = normalizedInput.cursor ? decodeCursor(normalizedInput.cursor, ['createdAt', 'id']) : null
    const beforeCursor = normalizedInput.beforeCursor ? decodeCursor(normalizedInput.beforeCursor, ['createdAt', 'id']) : null
    const cursorCreatedAt = cursor ? assertCursorDate(cursor, 'createdAt') : null
    const beforeCursorCreatedAt = beforeCursor ? assertCursorDate(beforeCursor, 'createdAt') : null
    const isLatestPage = !cursor && !beforeCursor
    const messagesQuery = AppDataSource.getRepository(ServiceMessageEntity)
        .createQueryBuilder('message')
        .where('message.requestId = :requestId', { requestId })
        .orderBy('message.createdAt', isLatestPage || beforeCursor ? 'DESC' : 'ASC')
        .addOrderBy('message.id', isLatestPage || beforeCursor ? 'DESC' : 'ASC')
        .take(limit + 1)
    if (cursorCreatedAt && cursor) {
        messagesQuery.andWhere('(message.createdAt > :cursorCreatedAt OR (message.createdAt = :cursorCreatedAt AND message.id > :cursorId))', {
            cursorCreatedAt,
            cursorId: cursor.id,
        })
    }
    if (beforeCursorCreatedAt && beforeCursor) {
        messagesQuery.andWhere('(message.createdAt < :beforeCursorCreatedAt OR (message.createdAt = :beforeCursorCreatedAt AND message.id < :beforeCursorId))', {
            beforeCursorCreatedAt,
            beforeCursorId: beforeCursor.id,
        })
    }
    const evidenceCheckAt = new Date()
    const [response, messagePage, attachments, moderationReviewActive, messagesProtected] = await Promise.all([
        hydrateRequest(request),
        messagesQuery.getMany(),
        AppDataSource.getRepository(ServiceAttachmentEntity).find({ where: { requestId, status: ServiceAttachmentStatus.Ready }, order: { createdAt: 'ASC' } }),
        AppDataSource.getRepository(AutoCareChatReportEntity).exist({ where: { threadId: chatThread.id, status: AutoCareChatReportStatus.Pending } }),
        AppDataSource.getRepository(ServiceMessageEntity).exist({ where: { requestId, evidenceRetainUntil: MoreThan(evidenceCheckAt) } }),
    ])
    const hasMore = messagePage.length > limit
    const messages = [...(hasMore ? messagePage.slice(0, limit) : messagePage)].reverse()
    const firstMessage = messages.at(0)
    const lastMessage = messages.at(-1)
    const unreadMessages = messages.filter((message) => message.senderId !== user.id && !message.readAt)
    if (unreadMessages.length > 0) {
        const readAt = new Date()
        unreadMessages.forEach((message) => { message.readAt = readAt })
        await AppDataSource.getRepository(ServiceMessageEntity).save(unreadMessages)
        broadcastServiceChat(requestId, { type: 'message.read', requestId, payload: { messageIds: unreadMessages.map((message) => message.id), readAt: readAt.toISOString() } })
    }
    return {
        request: response,
        messages: messages.map(messageResponse),
        attachments: attachments.flatMap((attachment) => {
            try {
                const contentType = resolveAutoCareAttachmentContentType(attachment.contentType)
                return [{
                    id: attachment.id,
                    uploadedById: attachment.uploadedById,
                    contentType,
                    bytes: attachment.bytes,
                    status: attachment.status,
                    url: `/v1/service-requests/${requestId}/attachments/${attachment.id}`,
                    createdAt: attachment.createdAt.toISOString(),
                }]
            } catch (error) {
                if (error instanceof AppError && error.code === ERROR_CODES.NotFound) return []
                throw error
            }
        }),
        nextCursor: hasMore && lastMessage
            && !isLatestPage && !beforeCursor
            ? encodeCursor({ createdAt: lastMessage.createdAt.toISOString(), id: lastMessage.id })
            : null,
        previousCursor: hasMore && firstMessage
            ? encodeCursor({ createdAt: firstMessage.createdAt.toISOString(), id: firstMessage.id })
            : null,
        moderationReviewActive,
        messagesProtected: moderationReviewActive || messagesProtected,
    }
}

export async function createAutoCareServiceMessage(user: UserEntity, requestId: string, input: unknown) {
    requestId = requireAutoCareRequestUuid(requestId)
    const normalizedInput = normalizeAutoCareServiceMessageInput(input)
    if (!normalizedInput) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Message body is invalid.' })
    const request = await getParticipantRequest(user, requestId)
    const body = normalizedInput.body
    const idempotencyKey = normalizedInput.idempotencyKey
    const idempotencyFingerprint = createHash('sha256').update(body).digest('hex')
    let transactionResult: { message: ServiceMessageEntity; recipientId: string | null; recipientRole: 'owner' | 'client'; changed: boolean }
    try {
        transactionResult = await AppDataSource.transaction(async (manager) => {
            const lockedRequest = await manager.getRepository(ServiceRequestEntity).findOne({
                where: { id: request.id },
                lock: { mode: 'pessimistic_write' },
            })
            if (!lockedRequest) notFound('Service request not found.')
            await assertParticipantWithManager(manager, user, lockedRequest)
            const thread = await lockRequestChatThreadForWrite(manager, lockedRequest, user)
            const messageRepository = manager.getRepository(ServiceMessageEntity)
            if (idempotencyKey) {
                const existing = await messageRepository.findOneBy({ requestId: request.id, senderId: user.id, idempotencyKey })
                if (existing) {
                    if (existing.idempotencyFingerprint !== idempotencyFingerprint) messageIdempotencyConflict()
                    const provider = await manager.getRepository(AutomotiveProviderEntity).findOneBy({ id: lockedRequest.providerId })
                    return { message: existing, recipientId: user.id === lockedRequest.clientId ? provider?.ownerId ?? null : lockedRequest.clientId, recipientRole: user.id === lockedRequest.clientId ? 'owner' : 'client', changed: false }
                }
            }
            const provider = await manager.getRepository(AutomotiveProviderEntity).findOneBy({ id: lockedRequest.providerId })
            const recipientId = user.id === lockedRequest.clientId ? provider?.ownerId ?? null : lockedRequest.clientId
            const deliveredAt = recipientId ? new Date() : null
            const message = await messageRepository.save(messageRepository.create({
                requestId: lockedRequest.id,
                threadId: thread.id,
                senderId: user.id,
                kind: ServiceMessageKind.Text,
                body,
                idempotencyKey: idempotencyKey ?? null,
                idempotencyFingerprint: idempotencyKey ? idempotencyFingerprint : null,
                offer: null,
                deliveredAt,
                readAt: null,
            }))
            return { message, recipientId, recipientRole: user.id === lockedRequest.clientId ? 'owner' : 'client', changed: true }
        })
    } catch (error) {
        if (!idempotencyKey || !isMessageIdempotencyUniqueError(error)) throw error
        const existing = await AppDataSource.getRepository(ServiceMessageEntity).findOneBy({ requestId: request.id, senderId: user.id, idempotencyKey })
        if (!existing) throw error
        if (existing.idempotencyFingerprint !== idempotencyFingerprint) messageIdempotencyConflict()
        transactionResult = { message: existing, recipientId: null, recipientRole: 'client', changed: false }
    }
    const { message, recipientId, recipientRole, changed } = transactionResult
    if (changed && recipientId) {
        await notifyAutoCareParticipant({
            userId: recipientId,
            requestId,
            event: `message-${message.id}`,
            role: recipientRole,
            title: 'Новое сообщение по заявке',
            message: 'В переписке по услуге появилось новое сообщение.',
        })
    }
    const result = messageResponse(message)
    if (changed) broadcastServiceChat(requestId, { type: 'message.created', requestId, payload: result })
    return result
}

export async function createAutoCareServiceOffer(user: UserEntity, requestId: string, input: CreateAutoCareServiceOfferInput) {
    requestId = requireAutoCareRequestUuid(requestId)
    const normalizedInput = normalizeAutoCareServiceOfferInput(input)
    if (!normalizedInput) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Service offer is invalid.' })
    const offerInput: ServiceMessageOffer = {
        ...normalizedInput,
        status: 'pending',
    }
    const transactionResult = await AppDataSource.transaction(async (manager) => {
        const requestRepository = manager.getRepository(ServiceRequestEntity)
        const lockedRequest = await requestRepository.findOne({ where: { id: requestId }, lock: { mode: 'pessimistic_write' } })
        if (!lockedRequest) notFound('Service request not found.')
        const provider = await manager.getRepository(AutomotiveProviderEntity).findOneBy({ id: lockedRequest.providerId })
        if (!provider || !(await hasProviderWorkspacePermissionWithManager(manager, user.id, provider.id, 'requests', lockedRequest.locationId))) throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'You do not manage this service request.' })
        if (!serviceRequestOfferableStates.has(lockedRequest.status)) conflict('This service request cannot receive a new offer.')
        const thread = await lockRequestChatThreadForWrite(manager, lockedRequest, user)

        const messageRepository = manager.getRepository(ServiceMessageEntity)
        const previousOffers = await messageRepository.find({ where: { requestId, senderId: user.id, kind: ServiceMessageKind.Offer }, order: { createdAt: 'DESC' } })
        const sameOffer = previousOffers.find((message) => message.offer && sameServiceOffer(message.offer, offerInput, offerInput.couponCode !== null))
        if (sameOffer) return { message: sameOffer, request: lockedRequest, provider: null, changed: false }

        // Generate a coupon only after the duplicate check. This keeps a retried request
        // without an explicit coupon idempotent while preserving unique coupons for new offers.
        const offer: ServiceMessageOffer = {
            ...offerInput,
            couponCode: offerInput.type === 'discount' ? offerInput.couponCode || `AC-${randomUUID().slice(0, 8).toUpperCase()}` : null,
        }
        const message = await messageRepository.save(messageRepository.create({
            requestId,
            threadId: thread.id,
            senderId: user.id,
            kind: ServiceMessageKind.Offer,
            body: offerInput.title,
            offer,
            deliveredAt: new Date(),
            readAt: null,
        }))
        await appendRepairEventWithManager(manager, { requestId, actorId: user.id, eventType: 'offer_shared', title: 'Сервис предложил вариант решения', notes: offerInput.title })
        await notifyAutoCareParticipant({ userId: lockedRequest.clientId, requestId, event: `offer-${message.id}`, role: 'client', title: 'Сервис предложил вариант решения', message: offerInput.title }, manager)
        return { message, request: lockedRequest, changed: true }
    })
    const result = messageResponse(transactionResult.message)
    if (transactionResult.changed) broadcastServiceChat(requestId, { type: 'message.created', requestId, payload: result })
    return result
}

export async function decideAutoCareServiceOffer(user: UserEntity, requestId: string, messageId: string, decision: unknown) {
    clientOnly(user)
    requestId = requireAutoCareRequestUuid(requestId)
    const normalizedMessageId = normalizeAutoCareRequestUuid(messageId)
    if (!normalizedMessageId) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Service message id must be a valid UUID.' })
    const normalizedDecision = normalizeAutoCareServiceOfferDecision(decision)
    if (!normalizedDecision) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Service offer decision is invalid.' })
    const transactionResult = await AppDataSource.transaction(async (manager) => {
        const request = await manager.getRepository(ServiceRequestEntity).findOne({ where: { id: requestId }, lock: { mode: 'pessimistic_write' } })
        if (!request) notFound('Service request not found.')
        if (request.clientId !== user.id) throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'You do not have access to this service request.' })
        if ([ServiceRequestStatus.Declined, ServiceRequestStatus.Closed].includes(request.status)) conflict('This service request can no longer accept offers.')
        const message = await manager.getRepository(ServiceMessageEntity).findOne({ where: { id: normalizedMessageId, requestId }, lock: { mode: 'pessimistic_write' } })
        if (!message || message.kind !== ServiceMessageKind.Offer || !message.offer) notFound('Service offer not found.')
        const targetStatus = normalizedDecision === 'accept' ? 'accepted' : 'declined'
        if (message.offer.status === targetStatus) return { message, request, changed: false }
        if (message.offer.status !== 'pending') conflict('This service offer has already been resolved.')
        if (normalizedDecision === 'accept' && isAutoCareServiceOfferExpired(message.offer.expiresAt)) conflict('This service offer has expired.')
        message.offer = { ...message.offer, status: targetStatus }
        const saved = await manager.getRepository(ServiceMessageEntity).save(message)
        const provider = await manager.getRepository(AutomotiveProviderEntity).findOneBy({ id: request.providerId })
        await appendRepairEventWithManager(manager, { requestId, actorId: user.id, eventType: `offer_${normalizedDecision}`, title: normalizedDecision === 'accept' ? 'Клиент принял предложение' : 'Клиент отклонил предложение' })
        if (provider?.ownerId) {
            await notifyAutoCareParticipant({ userId: provider.ownerId, requestId, event: `offer-${normalizedDecision}-${saved.id}`, role: 'owner', title: normalizedDecision === 'accept' ? 'Клиент принял предложение' : 'Клиент отклонил предложение', message: saved.offer?.title ?? '' }, manager)
        }
        return { message: saved, request, provider, changed: true }
    })
    const result = messageResponse(transactionResult.message)
    if (transactionResult.changed) broadcastServiceChat(requestId, { type: 'offer.updated', requestId, payload: result })
    return result
}

export async function markAutoCareServiceConversationRead(user: UserEntity, requestId: string) {
    requestId = requireAutoCareRequestUuid(requestId)
    if (user.role === UserRole.SuperAdmin) return { updated: 0 }
    await getParticipantRequest(user, requestId)
    const repository = AppDataSource.getRepository(ServiceMessageEntity)
    const messages = await repository.find({ where: { requestId } })
    const unreadMessages = messages.filter((message) => message.senderId !== user.id && !message.readAt)
    if (unreadMessages.length === 0) return { updated: 0 }
    const readAt = new Date()
    unreadMessages.forEach((message) => { message.readAt = readAt })
    await repository.save(unreadMessages)
    broadcastServiceChat(requestId, { type: 'message.read', requestId, payload: { messageIds: unreadMessages.map((message) => message.id), readAt: readAt.toISOString() } })
    return { updated: unreadMessages.length }
}
