import { Between, In, type EntityManager, type QueryFailedError } from 'typeorm'
import { createHash, randomUUID } from 'node:crypto'

import { AppDataSource } from '../../database/data-source.js'
import {
    AutomotiveProviderEntity,
    AutomotiveProviderStatus,
    AutomotiveServiceDefinitionEntity,
    AutomotiveServiceLocationEntity,
    AutomotiveServiceOfferingEntity,
    AutoCareChatThreadEntity,
    AutoCareChatThreadStatus,
    AutoCareChatThreadType,
    AutoCareRepairEventEntity,
    AutoCareServiceQuoteEntity,
    AutoCareRescheduleRequestEntity,
    AutoCareRescheduleStatus,
    ServiceAttachmentEntity,
    ServiceAttachmentStatus,
    ServiceMessageEntity,
    ServiceMessageKind,
    type ServiceMessageOffer,
    ServiceRequestEntity,
    ServiceRequestStatus,
} from '../../entities/index.js'
import type { AutomotiveOfferingSnapshot } from '../../entities/automotive/service-request.entity.js'
import { NotificationCategory } from '../../entities/notification/notification.entity.js'
import { UserRole, type UserEntity } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { enqueueNotification, enqueueNotificationSafely } from '../outbox/notification-outbox.service.js'
import type {
    AutoCareAvailabilitySlotResponse,
    AutoCareServiceRequestResponse,
    AutoCareServiceRequestConversationResponse,
    AutoCareServiceMessageResponse,
    AutoCareQuoteLineItemResponse,
    CreateAutoCareServiceAttachmentInput,
    CreateAutoCareServiceMessageInput,
    CreateAutoCareServiceOfferInput,
    CreateAutoCareServiceQuoteInput,
    CreateAutoCareServiceRequestInput,
    AutoCareServiceQuoteHistoryResponse,
    AutoCareRescheduleResponse,
} from './autocare.types.js'
import { broadcastServiceChat } from './service-chat.gateway.js'
import { ensureAutoCareRequestChatThread } from './autocare-chat.service.js'
import { assertAutoCareAttachmentQuota, decodeAutoCareAttachment } from './attachment-content.js'
import { canManageProvider, canManageProviderWithManager, getManagedProviderIds } from './provider-access.service.js'
import { getScheduleForDate, isValidTimeZone, localDateRangeToUtc, localDateTimeParts } from './availability.js'

function clientOnly(user: UserEntity) {
    if (user.role !== UserRole.Client) {
        throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'Only clients can create service requests.' })
    }
}

function ownerOnly(user: UserEntity) {
    if (user.role !== UserRole.Owner) {
        throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'Only service owners can confirm service requests.' })
    }
}

function notFound(message: string): never {
    throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message })
}

function forbidden(message: string): never {
    throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message })
}

function conflict(message: string): never {
    throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message })
}

async function appendRepairEventWithManager(manager: EntityManager, input: { requestId: string; actorId?: string | null; eventType: string; title: string; notes?: string | null; metadata?: Record<string, unknown> }) {
    await manager.getRepository(AutoCareRepairEventEntity).save(manager.getRepository(AutoCareRepairEventEntity).create({
        requestId: input.requestId,
        actorId: input.actorId ?? null,
        eventType: input.eventType,
        title: input.title,
        notes: input.notes ?? null,
        metadata: input.metadata ?? {},
    }))
}

function isRequestIdempotencyUniqueError(error: unknown) {
    const driverError = (error as QueryFailedError | undefined)?.driverError as
        | { code?: unknown; constraint?: unknown }
        | undefined
    return driverError?.code === '23505' && driverError.constraint === 'IDX_autocare_service_requests_client_idempotency_key'
}

function isSameAutoCareServiceRequest(request: ServiceRequestEntity, input: CreateAutoCareServiceRequestInput) {
    return request.providerId === input.providerId &&
        request.locationId === input.locationId &&
        request.offeringId === input.offeringId &&
        request.preferredAt?.toISOString() === new Date(input.preferredAt).toISOString() &&
        JSON.stringify(request.vehicleSnapshot) === JSON.stringify(input.vehicleSnapshot ?? null) &&
        JSON.stringify(request.contactSnapshot) === JSON.stringify(input.contactSnapshot) &&
        request.note === (input.note ?? null)
}

function requestIdempotencyConflict(): never {
    throw new AppError({
        statusCode: 409,
        code: ERROR_CODES.Conflict,
        message: 'Idempotency key was already used for another service request.',
    })
}

const serviceRequestOfferableStates = new Set<ServiceRequestStatus>([
    ServiceRequestStatus.Open,
    ServiceRequestStatus.AwaitingReply,
    ServiceRequestStatus.EstimateShared,
])

const serviceRequestConfirmableStates = new Set<ServiceRequestStatus>([
    ServiceRequestStatus.Open,
    ServiceRequestStatus.AwaitingReply,
    ServiceRequestStatus.EstimateShared,
    ServiceRequestStatus.Accepted,
])

const serviceRequestCancellableStates = new Set<ServiceRequestStatus>([
    ServiceRequestStatus.Draft,
    ServiceRequestStatus.Open,
    ServiceRequestStatus.AwaitingReply,
    ServiceRequestStatus.EstimateShared,
    ServiceRequestStatus.Accepted,
])

const serviceRequestReschedulableStates = new Set<ServiceRequestStatus>([
    ServiceRequestStatus.Open,
    ServiceRequestStatus.AwaitingReply,
    ServiceRequestStatus.EstimateShared,
    ServiceRequestStatus.Accepted,
])

function sameServiceOffer(a: ServiceMessageOffer, b: ServiceMessageOffer, compareCoupon: boolean) {
    return a.type === b.type &&
        a.title === b.title &&
        a.description === b.description &&
        a.discountPercent === b.discountPercent &&
        (!compareCoupon || a.couponCode === b.couponCode) &&
        a.amountMinor === b.amountMinor &&
        a.currencyCode === b.currencyCode &&
        a.expiresAt === b.expiresAt &&
        a.status === 'pending'
}

function createOfferingSnapshot(definition: AutomotiveServiceDefinitionEntity, offering: AutomotiveServiceOfferingEntity): AutomotiveOfferingSnapshot {
    return {
        serviceSlug: definition.slug,
        serviceLabels: definition.labels,
        description: offering.description,
        priceFromMinor: offering.priceFromMinor,
        priceToMinor: offering.priceToMinor,
        currencyCode: offering.currencyCode,
        durationMinutes: offering.durationMinutes,
        inclusions: offering.inclusions,
        warrantyText: offering.warrantyText,
        priceType: definition.priceType,
    }
}

async function notifyAutoCareParticipant(input: {
    userId: string
    requestId: string
    event: string
    title: string
    message: string
    role: 'client' | 'owner'
}, manager?: EntityManager) {
    const notification = {
        userId: input.userId,
        category: NotificationCategory.Booking,
        title: input.title,
        message: input.message,
        link: input.role === 'owner' ? `/owner/autocare-requests?request=${input.requestId}` : `/profile/bookings?request=${input.requestId}`,
        metadata: { serviceRequestId: input.requestId, event: input.event, domain: 'autocare' },
    }
    const idempotencyKey = `notification:autocare:${input.requestId}:${input.event}:${input.userId}`
    if (manager) {
        await enqueueNotification(notification, idempotencyKey, manager)
        return
    }
    await enqueueNotificationSafely(notification, idempotencyKey)
}

function requestResponse(
    request: ServiceRequestEntity,
    provider: AutomotiveProviderEntity,
    location: AutomotiveServiceLocationEntity,
    definition: AutomotiveServiceDefinitionEntity,
    offering: AutomotiveServiceOfferingEntity | null,
    quoteHistory: AutoCareServiceQuoteHistoryResponse[] = [],
    reschedule: AutoCareRescheduleResponse | null = null,
): AutoCareServiceRequestResponse {
    const snapshot = request.offeringSnapshot ?? (offering ? createOfferingSnapshot(definition, offering) : null)
    return {
        id: request.id,
        providerId: provider.id,
        providerName: provider.name,
        locationId: location.id,
        address: location.address,
        definitionId: definition.id,
        serviceSlug: snapshot?.serviceSlug ?? definition.slug,
        serviceLabels: snapshot?.serviceLabels ?? definition.labels,
        serviceDescription: snapshot?.description ?? offering?.description ?? null,
        offeringId: offering?.id ?? null,
        priceFromMinor: snapshot?.priceFromMinor ?? offering?.priceFromMinor ?? null,
        currencyCode: snapshot?.currencyCode ?? offering?.currencyCode ?? null,
        preferredAt: request.preferredAt?.toISOString() ?? null,
        vehicleSnapshot: request.vehicleSnapshot as AutoCareServiceRequestResponse['vehicleSnapshot'],
        contactSnapshot: request.contactSnapshot as AutoCareServiceRequestResponse['contactSnapshot'],
        note: request.note,
        quote: request.estimateSnapshot && typeof request.estimateSnapshot.amountMinor === 'number'
            ? {
                amountMinor: request.estimateSnapshot.amountMinor,
                lineItems: Array.isArray(request.estimateSnapshot.lineItems) ? request.estimateSnapshot.lineItems as AutoCareQuoteLineItemResponse[] : [],
                subtotalMinor: typeof request.estimateSnapshot.subtotalMinor === 'number' ? request.estimateSnapshot.subtotalMinor : request.estimateSnapshot.amountMinor,
                taxMinor: typeof request.estimateSnapshot.taxMinor === 'number' ? request.estimateSnapshot.taxMinor : 0,
                feesMinor: typeof request.estimateSnapshot.feesMinor === 'number' ? request.estimateSnapshot.feesMinor : 0,
                currencyCode: String(request.estimateSnapshot.currencyCode ?? 'RUB'),
                note: typeof request.estimateSnapshot.note === 'string' ? request.estimateSnapshot.note : null,
                validUntil: typeof request.estimateSnapshot.validUntil === 'string' ? request.estimateSnapshot.validUntil : null,
                priceLocked: request.estimateSnapshot.priceLocked === true,
                createdAt: String(request.estimateSnapshot.createdAt ?? request.updatedAt.toISOString()),
            }
            : null,
        quoteHistory,
        status: request.status,
        clientConfirmedAt: request.clientConfirmedAt?.toISOString() ?? null,
        providerConfirmedAt: request.providerConfirmedAt?.toISOString() ?? null,
        cancelledAt: request.cancelledAt?.toISOString() ?? null,
        cancelledById: request.cancelledById,
        cancellationReason: request.cancellationReason,
        noShowAt: request.noShowAt?.toISOString() ?? null,
        noShowById: request.noShowById,
        noShowReason: request.noShowReason,
        completedAt: request.completedAt?.toISOString() ?? null,
        completedById: request.completedById,
        completionNote: request.completionNote,
        reschedule,
        createdAt: request.createdAt.toISOString(),
        updatedAt: request.updatedAt.toISOString(),
    }
}

async function getParticipantRequest(user: UserEntity, requestId: string) {
    const request = await getRequest(requestId)
    await assertParticipant(user, request)
    return request
}

function messageResponse(message: ServiceMessageEntity): AutoCareServiceMessageResponse {
    return {
        id: message.id,
        senderId: message.senderId,
        kind: message.kind,
        body: message.body,
        offer: message.offer,
        deliveredAt: message.deliveredAt?.toISOString() ?? null,
        readAt: message.readAt?.toISOString() ?? null,
        createdAt: message.createdAt.toISOString(),
    }
}

function rescheduleResponse(request: AutoCareRescheduleRequestEntity): AutoCareRescheduleResponse {
    return {
        id: request.id,
        proposedAt: request.proposedAt.toISOString(),
        requestedById: request.requestedById,
        status: request.status,
        reason: request.reason,
        resolvedById: request.resolvedById,
        resolutionReason: request.resolutionReason,
        createdAt: request.createdAt.toISOString(),
        resolvedAt: request.resolvedAt?.toISOString() ?? null,
    }
}

export async function getAutoCareServiceRequestConversation(user: UserEntity, requestId: string): Promise<AutoCareServiceRequestConversationResponse> {
    const request = await getParticipantRequest(user, requestId)
    await ensureAutoCareRequestChatThread(request)
    const [response, messages, attachments] = await Promise.all([
        hydrateRequest(request),
        AppDataSource.getRepository(ServiceMessageEntity).find({ where: { requestId }, order: { createdAt: 'ASC' } }),
        AppDataSource.getRepository(ServiceAttachmentEntity).find({ where: { requestId }, order: { createdAt: 'ASC' } }),
    ])
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
        attachments: attachments.map((attachment) => ({
            id: attachment.id,
            uploadedById: attachment.uploadedById,
            contentType: attachment.contentType,
            bytes: attachment.bytes,
            status: attachment.status,
            url: `/v1/service-requests/${requestId}/attachments/${attachment.id}`,
            createdAt: attachment.createdAt.toISOString(),
        })),
    }
}

export async function createAutoCareServiceMessage(user: UserEntity, requestId: string, input: CreateAutoCareServiceMessageInput) {
    const request = await getParticipantRequest(user, requestId)
    const thread = await ensureAutoCareRequestChatThread(request)
    const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: request.providerId })
    const recipientId = user.id === request.clientId ? provider?.ownerId : request.clientId
    const deliveredAt = recipientId ? new Date() : null
    const message = await AppDataSource.getRepository(ServiceMessageEntity).save(AppDataSource.getRepository(ServiceMessageEntity).create({
        requestId: request.id,
        threadId: thread.id,
        senderId: user.id,
        kind: ServiceMessageKind.Text,
        body: input.body,
        offer: null,
        deliveredAt,
        readAt: null,
    }))
    if (recipientId) {
        await notifyAutoCareParticipant({
            userId: recipientId,
            requestId,
            event: `message-${message.id}`,
            role: recipientId === provider?.ownerId ? 'owner' : 'client',
            title: 'Новое сообщение по заявке',
            message: 'В переписке по услуге появилось новое сообщение.',
        })
    }
    const result = messageResponse(message)
    broadcastServiceChat(requestId, { type: 'message.created', requestId, payload: result })
    return result
}

export async function createAutoCareServiceOffer(user: UserEntity, requestId: string, input: CreateAutoCareServiceOfferInput) {
    ownerOnly(user)
    if (input.type === 'discount' && !input.discountPercent) conflict('A discount offer requires a percentage.')
    const offerInput: ServiceMessageOffer = {
        type: input.type,
        title: input.title,
        description: input.description ?? null,
        discountPercent: input.discountPercent ?? null,
        couponCode: input.type === 'discount' ? input.couponCode?.trim().toUpperCase() || null : null,
        amountMinor: input.amountMinor ?? null,
        currencyCode: input.currencyCode ?? null,
        expiresAt: input.expiresAt ?? null,
        status: 'pending',
    }
    const transactionResult = await AppDataSource.transaction(async (manager) => {
        const requestRepository = manager.getRepository(ServiceRequestEntity)
        const lockedRequest = await requestRepository.findOne({ where: { id: requestId }, lock: { mode: 'pessimistic_write' } })
        if (!lockedRequest) notFound('Service request not found.')
        const provider = await manager.getRepository(AutomotiveProviderEntity).findOneBy({ id: lockedRequest.providerId })
        if (!provider || !(await canManageProviderWithManager(manager, user.id, provider.id))) throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'You do not manage this service request.' })
        if (!serviceRequestOfferableStates.has(lockedRequest.status)) conflict('This service request cannot receive a new offer.')

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
        let thread = await manager.getRepository(AutoCareChatThreadEntity).findOneBy({ requestId, type: AutoCareChatThreadType.ServiceRequest })
        if (!thread) {
            thread = await manager.getRepository(AutoCareChatThreadEntity).save(manager.getRepository(AutoCareChatThreadEntity).create({
                type: AutoCareChatThreadType.ServiceRequest,
                requestId,
                providerId: lockedRequest.providerId,
                clientId: lockedRequest.clientId,
                createdById: lockedRequest.clientId,
                subject: 'Заявка на услугу',
                status: AutoCareChatThreadStatus.Open,
                lastMessageAt: null,
            }))
        }
        const message = await messageRepository.save(messageRepository.create({
            requestId,
            threadId: thread.id,
            senderId: user.id,
            kind: ServiceMessageKind.Offer,
            body: input.title,
            offer,
            deliveredAt: new Date(),
            readAt: null,
        }))
        await appendRepairEventWithManager(manager, { requestId, actorId: user.id, eventType: 'offer_shared', title: 'Сервис предложил вариант решения', notes: input.title })
        await notifyAutoCareParticipant({ userId: lockedRequest.clientId, requestId, event: `offer-${message.id}`, role: 'client', title: 'Сервис предложил вариант решения', message: input.title }, manager)
        return { message, request: lockedRequest, changed: true }
    })
    const result = messageResponse(transactionResult.message)
    if (transactionResult.changed) broadcastServiceChat(requestId, { type: 'message.created', requestId, payload: result })
    return result
}

export async function decideAutoCareServiceOffer(user: UserEntity, requestId: string, messageId: string, decision: 'accept' | 'decline') {
    clientOnly(user)
    const transactionResult = await AppDataSource.transaction(async (manager) => {
        const request = await manager.getRepository(ServiceRequestEntity).findOne({ where: { id: requestId }, lock: { mode: 'pessimistic_write' } })
        if (!request) notFound('Service request not found.')
        if (request.clientId !== user.id) throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'You do not have access to this service request.' })
        if ([ServiceRequestStatus.Declined, ServiceRequestStatus.Closed].includes(request.status)) conflict('This service request can no longer accept offers.')
        const message = await manager.getRepository(ServiceMessageEntity).findOne({ where: { id: messageId, requestId }, lock: { mode: 'pessimistic_write' } })
        if (!message || message.kind !== ServiceMessageKind.Offer || !message.offer) notFound('Service offer not found.')
        const targetStatus = decision === 'accept' ? 'accepted' : 'declined'
        if (message.offer.status === targetStatus) return { message, request, changed: false }
        if (message.offer.status !== 'pending') conflict('This service offer has already been resolved.')
        message.offer = { ...message.offer, status: targetStatus }
        const saved = await manager.getRepository(ServiceMessageEntity).save(message)
        const provider = await manager.getRepository(AutomotiveProviderEntity).findOneBy({ id: request.providerId })
        await appendRepairEventWithManager(manager, { requestId, actorId: user.id, eventType: `offer_${decision}`, title: decision === 'accept' ? 'Клиент принял предложение' : 'Клиент отклонил предложение' })
        if (provider?.ownerId) {
            await notifyAutoCareParticipant({ userId: provider.ownerId, requestId, event: `offer-${decision}-${saved.id}`, role: 'owner', title: decision === 'accept' ? 'Клиент принял предложение' : 'Клиент отклонил предложение', message: saved.offer?.title ?? '' }, manager)
        }
        return { message: saved, request, provider, changed: true }
    })
    const result = messageResponse(transactionResult.message)
    if (transactionResult.changed) broadcastServiceChat(requestId, { type: 'offer.updated', requestId, payload: result })
    return result
}

export async function markAutoCareServiceConversationRead(user: UserEntity, requestId: string) {
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

export async function createAutoCareServiceAttachment(user: UserEntity, requestId: string, input: CreateAutoCareServiceAttachmentInput) {
    const request = await getParticipantRequest(user, requestId)
    const content = decodeAutoCareAttachment(input)
    const attachment = await AppDataSource.transaction(async (manager) => {
        const lockedRequest = await manager.getRepository(ServiceRequestEntity).findOne({ where: { id: request.id }, lock: { mode: 'pessimistic_write' } })
        if (!lockedRequest) notFound('Service request not found.')
        if (lockedRequest.clientId !== user.id) {
            const provider = await manager.getRepository(AutomotiveProviderEntity).findOneBy({ id: lockedRequest.providerId })
            if (user.role !== UserRole.Owner || !provider || !(await canManageProvider(user.id, provider.id, lockedRequest.locationId))) {
                forbidden('You do not have access to this service request.')
            }
        }
        const thread = await ensureAutoCareRequestChatThread(lockedRequest, manager)
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
            objectKey: `autocare-requests/${lockedRequest.id}/${Date.now()}-${input.fileName.replace(/[^a-zA-Z0-9._-]/g, '-')}`,
            contentType: input.contentType,
            bytes: content.length,
            content,
            checksum: createHash('sha256').update(content).digest('hex'),
            status: ServiceAttachmentStatus.Ready,
        }))
    })
    const result = { id: attachment.id, uploadedById: attachment.uploadedById, contentType: attachment.contentType, bytes: attachment.bytes, status: attachment.status, url: `/v1/service-requests/${requestId}/attachments/${attachment.id}`, createdAt: attachment.createdAt.toISOString() }
    broadcastServiceChat(requestId, { type: 'attachment.created', requestId, payload: result })
    return result
}

export async function getAutoCareServiceAttachment(user: UserEntity, requestId: string, attachmentId: string) {
    await getParticipantRequest(user, requestId)
    const attachment = await AppDataSource.getRepository(ServiceAttachmentEntity).findOne({ where: { id: attachmentId, requestId }, select: { id: true, contentType: true, content: true } })
    if (!attachment?.content) notFound('Service attachment not found.')
    return attachment
}

export async function createAutoCareServiceQuote(user: UserEntity, requestId: string, input: CreateAutoCareServiceQuoteInput) {
    ownerOnly(user)
    const lineItems = (input.lineItems ?? []).map((item) => ({
        kind: item.kind,
        title: item.title,
        quantity: item.quantity,
        unitPriceMinor: item.unitPriceMinor,
        totalMinor: Math.round(item.quantity * item.unitPriceMinor),
    }))
    if (lineItems.some((item) => item.kind !== 'discount' && item.unitPriceMinor < 0)) {
        conflict('Only discount line items may have a negative unit price.')
    }
    if (input.validUntil && new Date(input.validUntil).getTime() <= Date.now()) {
        conflict('The estimate expiration must be in the future.')
    }
    const subtotalMinor = lineItems.reduce((total, item) => total + item.totalMinor, 0)
    const taxMinor = input.taxMinor ?? 0
    const feesMinor = input.feesMinor ?? 0
    if (lineItems.length > 0 && subtotalMinor + taxMinor + feesMinor !== input.amountMinor) {
        conflict('Structured quote totals must equal the amount.')
    }
    const request = await AppDataSource.transaction(async (manager) => {
        const lockedRequest = await manager.getRepository(ServiceRequestEntity).findOne({
            where: { id: requestId },
            lock: { mode: 'pessimistic_write' },
        })
        if (!lockedRequest) notFound('Service request not found.')
        const provider = await manager.getRepository(AutomotiveProviderEntity).findOneBy({ id: lockedRequest.providerId })
        if (!provider || !(await canManageProviderWithManager(manager, user.id, provider.id))) throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'You do not manage this service request.' })
        if ([ServiceRequestStatus.Declined, ServiceRequestStatus.Closed, ServiceRequestStatus.Accepted].includes(lockedRequest.status)) conflict('This service request cannot receive a new estimate.')
        lockedRequest.estimateSnapshot = {
            amountMinor: input.amountMinor,
            lineItems,
            subtotalMinor: lineItems.length > 0 ? subtotalMinor : input.amountMinor,
            taxMinor,
            feesMinor,
            currencyCode: input.currencyCode,
            note: input.note ?? null,
            validUntil: input.validUntil ?? null,
            priceLocked: input.priceLocked ?? false,
            createdAt: new Date().toISOString(),
        }
        lockedRequest.status = ServiceRequestStatus.EstimateShared
        const savedRequest = await manager.getRepository(ServiceRequestEntity).save(lockedRequest)
        const quoteRepository = manager.getRepository(AutoCareServiceQuoteEntity)
        const latestQuote = await quoteRepository.findOne({ where: { requestId }, order: { version: 'DESC' } })
        await quoteRepository.save(quoteRepository.create({
            requestId,
            providerId: lockedRequest.providerId,
            version: (latestQuote?.version ?? 0) + 1,
            amountMinor: input.amountMinor,
            currencyCode: input.currencyCode,
            snapshot: lockedRequest.estimateSnapshot,
            validUntil: input.validUntil ? new Date(input.validUntil) : null,
        }))
        await appendRepairEventWithManager(manager, { requestId, actorId: user.id, eventType: 'estimate_shared', title: 'Смета отправлена клиенту', notes: input.note, metadata: { amountMinor: input.amountMinor, currencyCode: input.currencyCode, priceLocked: input.priceLocked ?? false } })
        await notifyAutoCareParticipant({
            userId: lockedRequest.clientId,
            requestId,
            event: 'estimate-shared',
            role: 'client',
            title: 'Сервис прислал предварительную смету',
            message: `Проверьте предварительную стоимость услуги: ${(input.amountMinor / 100).toFixed(2)} ${input.currencyCode}.`,
        }, manager)
        return savedRequest
    })
    return hydrateRequest(request)
}

async function resolveClientQuoteDecision(user: UserEntity, requestId: string, accepted: boolean) {
    clientOnly(user)
    const transactionResult = await AppDataSource.transaction(async (manager) => {
        const lockedRequest = await manager.getRepository(ServiceRequestEntity).findOne({
            where: { id: requestId },
            lock: { mode: 'pessimistic_write' },
        })
        if (!lockedRequest) notFound('Service request not found.')
        if (lockedRequest.clientId !== user.id) throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'You do not have access to this service request.' })
        const targetStatus = accepted ? ServiceRequestStatus.Accepted : ServiceRequestStatus.Declined
        const previousDecision = typeof lockedRequest.estimateSnapshot?.clientDecision === 'string'
            ? lockedRequest.estimateSnapshot.clientDecision
            : null
        if (lockedRequest.status === targetStatus && previousDecision === targetStatus) {
            const provider = await manager.getRepository(AutomotiveProviderEntity).findOneBy({ id: lockedRequest.providerId })
            return { request: lockedRequest, provider, changed: false }
        }
        if (lockedRequest.status !== ServiceRequestStatus.EstimateShared || !lockedRequest.estimateSnapshot) conflict('There is no pending estimate for this service request.')
        const validUntil = lockedRequest.estimateSnapshot.validUntil
        if (typeof validUntil === 'string' && new Date(validUntil).getTime() <= Date.now()) conflict('This estimate has expired.')
        lockedRequest.status = targetStatus
        lockedRequest.clientConfirmedAt = new Date()
        lockedRequest.estimateSnapshot = { ...lockedRequest.estimateSnapshot, clientDecision: targetStatus }
        const request = await manager.getRepository(ServiceRequestEntity).save(lockedRequest)
        const provider = await manager.getRepository(AutomotiveProviderEntity).findOneBy({ id: request.providerId })
        await appendRepairEventWithManager(manager, { requestId, actorId: user.id, eventType: accepted ? 'estimate_accepted' : 'estimate_declined', title: accepted ? 'Клиент принял смету' : 'Клиент отклонил смету' })
        if (provider?.ownerId) {
            await notifyAutoCareParticipant({
                userId: provider.ownerId,
                requestId,
                event: accepted ? 'estimate-accepted' : 'estimate-declined',
                role: 'owner',
                title: accepted ? 'Клиент принял смету' : 'Клиент отклонил смету',
                message: accepted ? 'Клиент подтвердил предварительную стоимость услуги.' : 'Клиент попросил не продолжать по этой смете.',
            }, manager)
        }
        return { request, provider, changed: true }
    })
    const request = transactionResult.request
    return hydrateRequest(request)
}

export function acceptAutoCareServiceQuote(user: UserEntity, requestId: string) {
    return resolveClientQuoteDecision(user, requestId, true)
}

export function declineAutoCareServiceQuote(user: UserEntity, requestId: string) {
    return resolveClientQuoteDecision(user, requestId, false)
}

async function hydrateRequest(request: ServiceRequestEntity) {
    const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: request.providerId })
    const location = await AppDataSource.getRepository(AutomotiveServiceLocationEntity).findOneBy({ id: request.locationId })
    const definition = await AppDataSource.getRepository(AutomotiveServiceDefinitionEntity).findOneBy({ id: request.definitionId })
    const offering = request.offeringId
        ? await AppDataSource.getRepository(AutomotiveServiceOfferingEntity).findOneBy({ id: request.offeringId })
        : null
    const quoteHistory = await AppDataSource.getRepository(AutoCareServiceQuoteEntity).find({
        where: { requestId: request.id },
        order: { version: 'ASC' },
        take: 50,
    })
    const pendingReschedule = await AppDataSource.getRepository(AutoCareRescheduleRequestEntity).findOne({
        where: { requestId: request.id, status: AutoCareRescheduleStatus.Pending },
        order: { createdAt: 'DESC' },
    })
    if (!provider || !location || !definition) notFound('Service request references missing service data.')
    return requestResponse(request, provider, location, definition, offering, quoteHistory.map((quote) => ({
        id: quote.id,
        version: quote.version,
        amountMinor: quote.amountMinor,
        lineItems: Array.isArray(quote.snapshot.lineItems) ? quote.snapshot.lineItems as AutoCareQuoteLineItemResponse[] : [],
        subtotalMinor: typeof quote.snapshot.subtotalMinor === 'number' ? quote.snapshot.subtotalMinor : quote.amountMinor,
        taxMinor: typeof quote.snapshot.taxMinor === 'number' ? quote.snapshot.taxMinor : 0,
        feesMinor: typeof quote.snapshot.feesMinor === 'number' ? quote.snapshot.feesMinor : 0,
        currencyCode: quote.currencyCode,
        note: typeof quote.snapshot.note === 'string' ? quote.snapshot.note : null,
        validUntil: quote.validUntil?.toISOString() ?? null,
        priceLocked: quote.snapshot.priceLocked === true,
        createdAt: quote.createdAt.toISOString(),
    })), pendingReschedule ? rescheduleResponse(pendingReschedule) : null)
}

async function getRequest(requestId: string) {
    const request = await AppDataSource.getRepository(ServiceRequestEntity).findOneBy({ id: requestId })
    if (!request) notFound('Service request not found.')
    return request
}

async function assertParticipant(user: UserEntity, request: ServiceRequestEntity) {
    if (request.clientId === user.id) return
    const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: request.providerId })
    if (user.role === UserRole.Owner && provider && await canManageProvider(user.id, provider.id, request.locationId)) return
    throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'You do not have access to this service request.' })
}

export async function createAutoCareServiceRequest(user: UserEntity, input: CreateAutoCareServiceRequestInput) {
    clientOnly(user)
    const providerRepository = AppDataSource.getRepository(AutomotiveProviderEntity)
    const locationRepository = AppDataSource.getRepository(AutomotiveServiceLocationEntity)
    const offeringRepository = AppDataSource.getRepository(AutomotiveServiceOfferingEntity)
    const definitionRepository = AppDataSource.getRepository(AutomotiveServiceDefinitionEntity)
    const requestRepository = AppDataSource.getRepository(ServiceRequestEntity)
    if (input.idempotencyKey) {
        const existing = await requestRepository.findOneBy({ clientId: user.id, idempotencyKey: input.idempotencyKey })
        if (existing) {
            if (!isSameAutoCareServiceRequest(existing, input)) requestIdempotencyConflict()
            return hydrateRequest(existing)
        }
    }
    const provider = await providerRepository.findOneBy({ id: input.providerId, status: AutomotiveProviderStatus.Active })
    if (!provider) notFound('Automotive provider not found.')
    const location = await locationRepository.findOneBy({ id: input.locationId, providerId: provider.id })
    if (!location) notFound('Automotive service location not found.')
    const offering = await offeringRepository.findOneBy({ id: input.offeringId, locationId: location.id, active: true })
    if (!offering) notFound('Automotive service offering not found.')
    const definition = await definitionRepository.findOneBy({ id: offering.definitionId, active: true })
    if (!definition) notFound('Automotive service definition not found.')

    const preferredAt = new Date(input.preferredAt)
    if (Number.isNaN(preferredAt.getTime())) conflict('The requested visit time is invalid.')
    const timezone = isValidTimeZone(location.timezone) ? location.timezone : 'UTC'
    const localVisit = localDateTimeParts(preferredAt, timezone)
    const schedule = getScheduleForDate(localVisit.date, location.hours, location.weeklySchedule)
    const visitStartMinutes = localVisit.minutes
    const visitEndMinutes = visitStartMinutes + offering.durationMinutes
    const scheduleOpenMinutes = Number(schedule.open.slice(0, 2)) * 60 + Number(schedule.open.slice(3))
    const scheduleCloseMinutes = Number(schedule.close.slice(0, 2)) * 60 + Number(schedule.close.slice(3))
    const dayRange = localDateRangeToUtc(localVisit.date, timezone)
    if (location.blackoutDates.includes(localVisit.date) || schedule.closed || !dayRange || visitStartMinutes < scheduleOpenMinutes || visitEndMinutes > scheduleCloseMinutes) {
        conflict('The selected visit time is outside the service schedule.')
    }

    let savedRequest: ServiceRequestEntity
    try {
        savedRequest = await AppDataSource.transaction(async (manager) => {
            await manager.getRepository(AutomotiveServiceLocationEntity).findOne({ where: { id: location.id }, lock: { mode: 'pessimistic_write' } })
            const activeRequests = await manager.getRepository(ServiceRequestEntity).find({ where: { providerId: provider.id, locationId: location.id, preferredAt: Between(dayRange.start, dayRange.end) } })
            const active = activeRequests.filter((item) => ![ServiceRequestStatus.Declined, ServiceRequestStatus.Closed].includes(item.status))
            const occupiedOfferings = await Promise.all(active.map((item) => item.offeringId ? manager.getRepository(AutomotiveServiceOfferingEntity).findOneBy({ id: item.offeringId }) : null))
            const overlaps = active.some((item, index) => {
                if (!item.preferredAt) return false
                const local = localDateTimeParts(item.preferredAt, timezone)
                const itemStart = local.minutes
                const itemEnd = itemStart + (occupiedOfferings[index]?.durationMinutes ?? 60)
                return local.date === localVisit.date && visitStartMinutes < itemEnd && visitEndMinutes > itemStart
            })
            if (overlaps) conflict('The selected visit time is no longer available.')
            const createdRequest = await manager.getRepository(ServiceRequestEntity).save(manager.getRepository(ServiceRequestEntity).create({
                clientId: user.id,
                providerId: provider.id,
                locationId: location.id,
                definitionId: definition.id,
                offeringId: offering.id,
                offeringSnapshot: createOfferingSnapshot(definition, offering),
                vehicleSnapshot: input.vehicleSnapshot ?? null,
                contactSnapshot: input.contactSnapshot,
                preferredAt,
                note: input.note ?? null,
                idempotencyKey: input.idempotencyKey ?? null,
                status: ServiceRequestStatus.AwaitingReply,
                clientConfirmedAt: new Date(),
                providerConfirmedAt: null,
            }))
            await appendRepairEventWithManager(manager, {
                requestId: createdRequest.id,
                actorId: user.id,
                eventType: 'created',
                title: 'Заявка создана',
                notes: createdRequest.note,
                metadata: { providerId: provider.id, serviceSlug: definition.slug },
            })
            await ensureAutoCareRequestChatThread(createdRequest, manager)
            if (provider.ownerId) {
                await notifyAutoCareParticipant({
                    userId: provider.ownerId,
                    requestId: createdRequest.id,
                    event: 'created-owner',
                    role: 'owner',
                    title: 'Новая заявка на услугу',
                    message: `Клиент отправил заявку на услугу «${definition.labels.ru ?? definition.slug}».`,
                }, manager)
            }
            await notifyAutoCareParticipant({
                userId: user.id,
                requestId: createdRequest.id,
                event: 'created-client',
                role: 'client',
                title: 'Заявка отправлена',
                message: 'Заявка передана автосервису. Следующий ответ появится в переписке по услуге.',
            }, manager)
            return createdRequest
        })
    } catch (error) {
        if (!input.idempotencyKey || !isRequestIdempotencyUniqueError(error)) throw error
        const existing = await requestRepository.findOneBy({ clientId: user.id, idempotencyKey: input.idempotencyKey })
        if (existing && isSameAutoCareServiceRequest(existing, input)) return hydrateRequest(existing)
        if (existing) requestIdempotencyConflict()
        throw error
    }
    return requestResponse(savedRequest, provider, location, definition, offering)
}

export async function getMyAutoCareServiceRequests(user: UserEntity) {
    clientOnly(user)
    const requests = await AppDataSource.getRepository(ServiceRequestEntity).find({ where: { clientId: user.id }, order: { createdAt: 'DESC' } })
    return Promise.all(requests.map(hydrateRequest))
}

export async function getOwnerAutoCareServiceRequests(user: UserEntity) {
    ownerOnly(user)
    const providerIds = await getManagedProviderIds(user.id)
    const providers = providerIds.length === 0
        ? []
        : await AppDataSource.getRepository(AutomotiveProviderEntity).find({ where: { id: In(providerIds) } })
    if (providers.length === 0) return []
    const requests = await AppDataSource.getRepository(ServiceRequestEntity).find({ where: { providerId: In(providers.map((provider) => provider.id)) }, order: { createdAt: 'DESC' } })
    return Promise.all(requests.map(hydrateRequest))
}

export async function getAutoCareServiceRequest(user: UserEntity, requestId: string) {
    const request = await getRequest(requestId)
    await assertParticipant(user, request)
    return hydrateRequest(request)
}

function formatClock(totalMinutes: number) {
    return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`
}

export async function getAutoCareAvailability(providerId: string, locationId: string, offeringId: string, date: string) {
    const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: providerId, status: AutomotiveProviderStatus.Active })
    const location = await AppDataSource.getRepository(AutomotiveServiceLocationEntity).findOneBy({ id: locationId, providerId })
    const offering = await AppDataSource.getRepository(AutomotiveServiceOfferingEntity).findOneBy({ id: offeringId, locationId, active: true })
    if (!provider || !location || !offering) notFound('Automotive availability references missing service data.')

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound('Availability date is invalid.')
    const timezone = isValidTimeZone(location.timezone) ? location.timezone : 'UTC'
    const range = localDateRangeToUtc(date, timezone)
    const schedule = getScheduleForDate(date, location.hours, location.weeklySchedule)
    if (!range) notFound('Availability date is invalid.')
    if (location.blackoutDates.includes(date) || schedule.closed) return { date, timezone, durationMinutes: offering.durationMinutes, slots: [] }
    const openMinutes = Number(schedule.open.slice(0, 2)) * 60 + Number(schedule.open.slice(3))
    const closeMinutes = Number(schedule.close.slice(0, 2)) * 60 + Number(schedule.close.slice(3))
    const dayStart = range.start
    const dayEnd = range.end
    const activeRequests = await AppDataSource.getRepository(ServiceRequestEntity).find({ where: { providerId, locationId, preferredAt: Between(dayStart, dayEnd) } })
    const requests = activeRequests.filter((request) => ![ServiceRequestStatus.Declined, ServiceRequestStatus.Closed].includes(request.status))
    const requestOfferings = await Promise.all(requests.map((request) => request.offeringId
        ? AppDataSource.getRepository(AutomotiveServiceOfferingEntity).findOneBy({ id: request.offeringId })
        : null))
    const slots: AutoCareAvailabilitySlotResponse[] = []
    for (let start = openMinutes; start + offering.durationMinutes <= closeMinutes; start += 30) {
        const end = start + offering.durationMinutes
        const occupied = requests.some((request, index) => {
            const preferred = request.preferredAt
            if (!preferred) return false
            const local = localDateTimeParts(preferred, timezone)
            if (local.date !== date) return false
            const requestStart = local.minutes
            const requestDuration = requestOfferings[index]?.durationMinutes ?? 60
            return start < requestStart + requestDuration && end > requestStart
        })
        if (!occupied) slots.push({ startTime: formatClock(start), endTime: formatClock(end) })
    }
    return { date, timezone, durationMinutes: offering.durationMinutes, slots }
}

export async function confirmAutoCareServiceRequest(user: UserEntity, requestId: string) {
    clientOnly(user)
    const transactionResult = await AppDataSource.transaction(async (manager) => {
        const request = await manager.getRepository(ServiceRequestEntity).findOne({ where: { id: requestId }, lock: { mode: 'pessimistic_write' } })
        if (!request) notFound('Service request not found.')
        if (request.clientId !== user.id) throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'You do not have access to this service request.' })
        if (!serviceRequestConfirmableStates.has(request.status)) conflict('This service request can no longer be confirmed.')
        const changed = !request.clientConfirmedAt
        if (changed) {
            request.clientConfirmedAt = new Date()
            await manager.getRepository(ServiceRequestEntity).save(request)
            await appendRepairEventWithManager(manager, { requestId, actorId: user.id, eventType: 'client_confirmed', title: 'Клиент подтвердил заявку' })
        }
        const provider = await manager.getRepository(AutomotiveProviderEntity).findOneBy({ id: request.providerId })
        if (changed && provider?.ownerId) {
            await notifyAutoCareParticipant({ userId: provider.ownerId, requestId, event: 'confirmed-client', role: 'owner', title: 'Клиент подтвердил заявку', message: 'Клиент подтвердил детали заявки на услугу.' }, manager)
        }
        return { request, provider, changed }
    })
    const request = transactionResult.request
    return hydrateRequest(request)
}

export async function confirmOwnerAutoCareServiceRequest(user: UserEntity, requestId: string) {
    ownerOnly(user)
    const transactionResult = await AppDataSource.transaction(async (manager) => {
        const request = await manager.getRepository(ServiceRequestEntity).findOne({ where: { id: requestId }, lock: { mode: 'pessimistic_write' } })
        if (!request) notFound('Service request not found.')
        const provider = await manager.getRepository(AutomotiveProviderEntity).findOneBy({ id: request.providerId })
        if (!provider || !(await canManageProviderWithManager(manager, user.id, provider.id, request.locationId))) throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'You do not manage this service request.' })
        if (!serviceRequestConfirmableStates.has(request.status)) conflict('This service request can no longer be confirmed.')
        const changed = !request.providerConfirmedAt || request.status !== ServiceRequestStatus.Accepted
        if (changed) {
            request.providerConfirmedAt ??= new Date()
            request.status = ServiceRequestStatus.Accepted
            await manager.getRepository(ServiceRequestEntity).save(request)
            await appendRepairEventWithManager(manager, { requestId, actorId: user.id, eventType: 'provider_confirmed', title: 'Сервис подтвердил заявку' })
            await notifyAutoCareParticipant({ userId: request.clientId, requestId, event: 'confirmed-owner', role: 'client', title: 'Сервис подтвердил заявку', message: 'Сервис подтвердил заявку и готов перейти к следующему шагу.' }, manager)
        }
        return { request, changed }
    })
    const request = transactionResult.request
    return hydrateRequest(request)
}

export async function requestAutoCareServiceReschedule(user: UserEntity, requestId: string, input: { proposedAt: string; reason?: string | null }) {
    ownerOnly(user)
    const proposedAt = new Date(input.proposedAt)
    if (Number.isNaN(proposedAt.getTime()) || proposedAt.getTime() <= Date.now()) conflict('The proposed visit time must be in the future.')
    const created = await AppDataSource.transaction(async (manager) => {
        const request = await manager.getRepository(ServiceRequestEntity).findOne({ where: { id: requestId }, lock: { mode: 'pessimistic_write' } })
        if (!request) notFound('Service request not found.')
        const provider = await manager.getRepository(AutomotiveProviderEntity).findOneBy({ id: request.providerId })
        if (!provider || !(await canManageProviderWithManager(manager, user.id, provider.id, request.locationId))) forbidden('You do not manage this service request.')
        if (!serviceRequestReschedulableStates.has(request.status)) conflict('This service request cannot be rescheduled.')
        if (request.preferredAt?.getTime() === proposedAt.getTime()) conflict('Choose a different visit time.')
        const rescheduleRepository = manager.getRepository(AutoCareRescheduleRequestEntity)
        const pending = await rescheduleRepository.findOne({ where: { requestId, status: AutoCareRescheduleStatus.Pending }, lock: { mode: 'pessimistic_write' } })
        if (pending) conflict('This service request already has a pending reschedule request.')
        const result = await rescheduleRepository.save(rescheduleRepository.create({
            requestId,
            requestedById: user.id,
            proposedAt,
            status: AutoCareRescheduleStatus.Pending,
            reason: input.reason?.trim() || null,
            resolvedById: null,
            resolutionReason: null,
            resolvedAt: null,
        }))
        await appendRepairEventWithManager(manager, { requestId, actorId: user.id, eventType: 'reschedule_requested', title: 'Сервис предложил новое время', notes: result.reason, metadata: { proposedAt: proposedAt.toISOString() } })
        await notifyAutoCareParticipant({ userId: request.clientId, requestId, event: `reschedule-requested-${result.id}`, role: 'client', title: 'Сервис предложил новое время', message: 'Проверьте новое время визита в заявке.' }, manager)
        return result
    })
    return rescheduleResponse(created)
}

export async function decideAutoCareServiceReschedule(user: UserEntity, requestId: string, decision: 'accept' | 'reject', reason?: string | null) {
    clientOnly(user)
    const transactionResult = await AppDataSource.transaction(async (manager) => {
        const requestRepository = manager.getRepository(ServiceRequestEntity)
        const request = await requestRepository.findOne({ where: { id: requestId }, lock: { mode: 'pessimistic_write' } })
        if (!request) notFound('Service request not found.')
        if (request.clientId !== user.id) forbidden('You do not have access to this service request.')
        const rescheduleRepository = manager.getRepository(AutoCareRescheduleRequestEntity)
        const pending = await rescheduleRepository.findOne({ where: { requestId }, order: { createdAt: 'DESC' }, lock: { mode: 'pessimistic_write' } })
        if (!pending) notFound('Reschedule request not found.')
        if (pending.status !== AutoCareRescheduleStatus.Pending) {
            if ((decision === 'accept' && pending.status === AutoCareRescheduleStatus.Accepted) || (decision === 'reject' && pending.status === AutoCareRescheduleStatus.Rejected)) return { request, reschedule: pending, changed: false }
            conflict('This reschedule request has already been resolved.')
        }
        pending.status = decision === 'accept' ? AutoCareRescheduleStatus.Accepted : AutoCareRescheduleStatus.Rejected
        pending.resolvedById = user.id
        pending.resolutionReason = reason?.trim() || null
        pending.resolvedAt = new Date()
        if (decision === 'accept') {
            const conflicting = await requestRepository.find({ where: { providerId: request.providerId, locationId: request.locationId, preferredAt: pending.proposedAt } })
            if (conflicting.some((item) => item.id !== request.id && ![ServiceRequestStatus.Declined, ServiceRequestStatus.Cancelled, ServiceRequestStatus.Closed].includes(item.status))) conflict('The proposed visit time is no longer available.')
            request.preferredAt = pending.proposedAt
        }
        await rescheduleRepository.save(pending)
        await requestRepository.save(request)
        await appendRepairEventWithManager(manager, { requestId, actorId: user.id, eventType: decision === 'accept' ? 'reschedule_accepted' : 'reschedule_rejected', title: decision === 'accept' ? 'Клиент подтвердил новое время' : 'Клиент отклонил новое время', notes: pending.resolutionReason, metadata: { proposedAt: pending.proposedAt.toISOString() } })
        const provider = await manager.getRepository(AutomotiveProviderEntity).findOneBy({ id: request.providerId })
        if (provider?.ownerId) await notifyAutoCareParticipant({ userId: provider.ownerId, requestId, event: `reschedule-${decision}-${pending.id}`, role: 'owner', title: decision === 'accept' ? 'Клиент подтвердил новое время' : 'Клиент отклонил новое время', message: decision === 'accept' ? 'Новое время визита подтверждено клиентом.' : 'Клиент отклонил предложенное время визита.' }, manager)
        return { request, reschedule: pending, changed: true }
    })
    return hydrateRequest(transactionResult.request)
}

export async function markAutoCareServiceRequestNoShow(user: UserEntity, requestId: string, reason?: string | null) {
    ownerOnly(user)
    const transactionResult = await AppDataSource.transaction(async (manager) => {
        const request = await manager.getRepository(ServiceRequestEntity).findOne({ where: { id: requestId }, lock: { mode: 'pessimistic_write' } })
        if (!request) notFound('Service request not found.')
        const provider = await manager.getRepository(AutomotiveProviderEntity).findOneBy({ id: request.providerId })
        if (!provider || !(await canManageProviderWithManager(manager, user.id, provider.id, request.locationId))) forbidden('You do not manage this service request.')
        if (request.status === ServiceRequestStatus.NoShow) return { request, changed: false }
        if (request.status !== ServiceRequestStatus.Accepted || !request.providerConfirmedAt || !request.preferredAt) conflict('Only confirmed visits can be marked as no-show.')
        if (request.preferredAt.getTime() > Date.now()) conflict('A visit can be marked as no-show only after its scheduled time.')
        request.status = ServiceRequestStatus.NoShow
        request.noShowAt = new Date()
        request.noShowById = user.id
        request.noShowReason = reason?.trim() || null
        await manager.getRepository(ServiceRequestEntity).save(request)
        await appendRepairEventWithManager(manager, { requestId, actorId: user.id, eventType: 'no_show', title: 'Заявка отмечена как неявка клиента', notes: request.noShowReason })
        await notifyAutoCareParticipant({ userId: request.clientId, requestId, event: 'no-show', role: 'client', title: 'Визит отмечен как неявка', message: 'Сервис отметил, что визит не состоялся.' }, manager)
        return { request, changed: true }
    })
    return hydrateRequest(transactionResult.request)
}

export async function completeAutoCareServiceRequest(user: UserEntity, requestId: string, note?: string | null) {
    ownerOnly(user)
    const transactionResult = await AppDataSource.transaction(async (manager) => {
        const request = await manager.getRepository(ServiceRequestEntity).findOne({ where: { id: requestId }, lock: { mode: 'pessimistic_write' } })
        if (!request) notFound('Service request not found.')
        const provider = await manager.getRepository(AutomotiveProviderEntity).findOneBy({ id: request.providerId })
        if (!provider || !(await canManageProviderWithManager(manager, user.id, provider.id, request.locationId))) forbidden('You do not manage this service request.')
        if (request.status === ServiceRequestStatus.Closed) return { request, changed: false }
        if (request.status !== ServiceRequestStatus.Accepted || !request.clientConfirmedAt || !request.providerConfirmedAt || !request.preferredAt) {
            conflict('Only a confirmed visit can be completed.')
        }
        const now = new Date()
        if (request.preferredAt.getTime() > now.getTime()) conflict('A visit can be completed only after its scheduled time.')
        request.status = ServiceRequestStatus.Closed
        request.completedAt = now
        request.completedById = user.id
        request.completionNote = note?.trim() || null
        await manager.getRepository(ServiceRequestEntity).save(request)
        await appendRepairEventWithManager(manager, { requestId, actorId: user.id, eventType: 'completed', title: 'Сервис отметил визит завершённым', notes: request.completionNote })
        await notifyAutoCareParticipant({ userId: request.clientId, requestId, event: 'completed', role: 'client', title: 'Визит завершён', message: 'Сервис отметил услугу завершённой. Теперь можно оставить отзыв.' }, manager)
        return { request, changed: true }
    })
    return hydrateRequest(transactionResult.request)
}

export async function cancelAutoCareServiceRequest(user: UserEntity, requestId: string, reason?: string | null) {
    clientOnly(user)
    const transactionResult = await AppDataSource.transaction(async (manager) => {
        const request = await manager.getRepository(ServiceRequestEntity).findOne({ where: { id: requestId }, lock: { mode: 'pessimistic_write' } })
        if (!request) notFound('Service request not found.')
        if (request.clientId !== user.id) throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'You do not have access to this service request.' })
        if (request.status === ServiceRequestStatus.Cancelled) return { request, changed: false }
        if (!serviceRequestCancellableStates.has(request.status)) conflict('This service request can no longer be cancelled.')
        request.status = ServiceRequestStatus.Cancelled
        request.cancelledAt = new Date()
        request.cancelledById = user.id
        request.cancellationReason = reason?.trim() || null
        await manager.getRepository(ServiceRequestEntity).save(request)
        await appendRepairEventWithManager(manager, { requestId, actorId: user.id, eventType: 'cancelled', title: 'Клиент отменил заявку', notes: request.cancellationReason })
        const provider = await manager.getRepository(AutomotiveProviderEntity).findOneBy({ id: request.providerId })
        if (provider?.ownerId) {
            await notifyAutoCareParticipant({ userId: provider.ownerId, requestId, event: 'cancelled-client', role: 'owner', title: 'Клиент отменил заявку', message: 'Клиент отменил заявку на услугу.', }, manager)
        }
        return { request, changed: true }
    })
    return hydrateRequest(transactionResult.request)
}
