import { Between, In, type EntityManager, type QueryFailedError } from 'typeorm'
import { createHash, randomUUID } from 'node:crypto'

import { AppDataSource } from '../../database/data-source.js'
import {
    AutomotiveProviderEntity,
    AutomotiveProviderStatus,
    AutomotiveBookingMode,
    AutomotiveServiceDefinitionEntity,
    AutomotiveServiceLocationEntity,
    AutomotiveServiceOfferingEntity,
    AutoCareChatThreadEntity,
    AutoCareChatThreadStatus,
    AutoCareChatThreadType,
    AutoCareRepairEventEntity,
    AutoCareServiceQuoteEntity,
    AutoCareQuoteStatus,
    AutoCareRescheduleRequestEntity,
    AutoCareRescheduleStatus,
    ServiceAttachmentEntity,
    ServiceAttachmentStatus,
    ServiceMessageEntity,
    ServiceMessageKind,
    type ServiceMessageOffer,
    ServiceRequestEntity,
    ServiceRequestStatus,
    ClientVehicleEntity,
} from '../../entities/index.js'
import type { AutomotiveOfferingSnapshot } from '../../entities/automotive/service-request.entity.js'
import { NotificationCategory } from '../../entities/notification/notification.entity.js'
import { UserRole, type UserEntity } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { enqueueNotification, enqueueNotificationSafely } from '../outbox/notification-outbox.service.js'
import { assertCursorDate, decodeCursor, encodeCursor, getCursorLimit } from '../../shared/http/cursor-pagination.js'
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
    AutoCareRequestSnapshot,
    AutoCareServiceQuoteHistoryResponse,
    AutoCareBookingSnapshotResponse,
    AutoCareRescheduleResponse,
} from './autocare.types.js'
import { broadcastServiceChat } from './service-chat.gateway.js'
import { ensureAutoCareRequestChatThread } from './autocare-chat.service.js'
import { assertAutoCareAttachmentQuota, decodeAutoCareAttachment, normalizeAutoCareAttachment } from './attachment-content.js'
import { createAutoCareAttachmentObjectKey, getAutoCareAttachmentSignedDownloadUrl, readAutoCareAttachmentObject, removeAutoCareAttachmentObject, saveAutoCareAttachmentObject } from './autocare-attachment-storage.js'
import { canManageProvider, canManageProviderWithManager, getManagedProviderScopes, isManagedProviderLocationAllowed } from './provider-access.service.js'
import { getScheduleForDate, isValidTimeZone, localDateRangeToUtc, localDateTimeParts, zonedWallTimeToUtc } from './availability.js'
import { createAutoCareBookingSnapshot } from './booking-snapshot.js'
import { getAutoCareQuoteLifecycleStatus, isAutoCareQuoteExpired } from './quote-policy.js'
import { awardAutoCareBonusForCompletedVisit, refundAutoCareBonusForCancelledRequest } from './autocare-bonus.service.js'
import { hasAvailableAppointmentCapacity } from './capacity-reservation.js'
import { hasAutoCareResourceAvailability, releaseAutoCareResources, reserveAutoCareResources } from './capacity-resource.service.js'
import { reassessAutoCareProviderTrust } from './trust-score.service.js'
import { logError } from '../../shared/observability/logger.js'

function clientOnly(user: UserEntity) {
    if (user.role !== UserRole.Client) {
        throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'Only clients can create service requests.' })
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

function isMessageIdempotencyUniqueError(error: unknown) {
    const driverError = (error as QueryFailedError | undefined)?.driverError as
        | { code?: unknown; constraint?: unknown }
        | undefined
    return driverError?.code === '23505' && driverError.constraint === 'IDX_autocare_service_messages_idempotency'
}

function isSameAutoCareServiceRequest(request: ServiceRequestEntity, input: CreateAutoCareServiceRequestInput) {
    return request.providerId === input.providerId &&
        request.locationId === input.locationId &&
        request.offeringId === input.offeringId &&
        request.preferredAt?.toISOString() === new Date(input.preferredAt).toISOString() &&
        request.vehicleId === (input.vehicleId ?? null) &&
        (input.vehicleId ? true : JSON.stringify(request.vehicleSnapshot) === JSON.stringify(input.vehicleSnapshot ?? null)) &&
        JSON.stringify(request.contactSnapshot) === JSON.stringify(input.contactSnapshot) &&
        request.note === (input.note ?? null)
}

function createVehicleSnapshot(vehicle: ClientVehicleEntity): AutoCareRequestSnapshot {
    return {
        make: vehicle.brandId,
        brandId: vehicle.brandId,
        model: vehicle.model,
        year: vehicle.year,
        fuelType: vehicle.fuelType,
        engineDisplacement: vehicle.engineDisplacement === null ? null : Number(vehicle.engineDisplacement),
        horsepower: vehicle.horsepower,
        color: vehicle.color,
        vin: vehicle.vin,
        licensePlate: vehicle.licensePlate,
        internalNumber: vehicle.internalNumber,
    }
}

function requestIdempotencyConflict(): never {
    throw new AppError({
        statusCode: 409,
        code: ERROR_CODES.Conflict,
        message: 'Idempotency key was already used for another service request.',
    })
}

function messageIdempotencyConflict(): never {
    throw new AppError({
        statusCode: 409,
        code: ERROR_CODES.Conflict,
        message: 'Idempotency key was already used for another message.',
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
        bookingMode: offering.bookingMode,
        requiredResourceTypes: offering.requiredResourceTypes ?? [],
        requiredResourceIds: offering.requiredResourceIds ?? [],
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
    const latestQuote = quoteHistory.at(-1)
    const snapshotQuoteStatus = Object.values(AutoCareQuoteStatus).includes(request.estimateSnapshot?.quoteStatus as AutoCareQuoteStatus)
        ? request.estimateSnapshot?.quoteStatus as AutoCareQuoteStatus
        : AutoCareQuoteStatus.Pending
    const quoteStatus = latestQuote?.status ?? getAutoCareQuoteLifecycleStatus(
        snapshotQuoteStatus,
        typeof request.estimateSnapshot?.validUntil === 'string' ? request.estimateSnapshot.validUntil : null,
    )
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
        vehicleId: request.vehicleId,
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
                status: quoteStatus,
            }
            : null,
        quoteHistory,
        acceptedQuoteVersion: request.acceptedQuoteVersion,
        acceptedQuoteSnapshot: request.acceptedQuoteSnapshot,
        acceptedQuoteAt: request.acceptedQuoteAt?.toISOString() ?? null,
        booking: toBookingSnapshotResponse(request.bookingSnapshot),
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

function toBookingSnapshotResponse(snapshot: Record<string, unknown> | null): AutoCareBookingSnapshotResponse | null {
    if (!snapshot || typeof snapshot.requestId !== 'string' || typeof snapshot.quoteVersion !== 'number' ||
        typeof snapshot.amountMinor !== 'number' || typeof snapshot.currencyCode !== 'string' ||
        typeof snapshot.scheduledAt !== 'string' || typeof snapshot.timezone !== 'string' ||
        typeof snapshot.serviceSlug !== 'string' || typeof snapshot.providerId !== 'string' ||
        typeof snapshot.locationId !== 'string' || typeof snapshot.createdAt !== 'string') return null
    const lineItems = Array.isArray(snapshot.lineItems) ? snapshot.lineItems : []
    return {
        requestId: snapshot.requestId,
        quoteVersion: snapshot.quoteVersion,
        amountMinor: snapshot.amountMinor,
        currencyCode: snapshot.currencyCode,
        lineItems: lineItems as AutoCareBookingSnapshotResponse['lineItems'],
        scheduledAt: snapshot.scheduledAt,
        timezone: snapshot.timezone,
        serviceSlug: snapshot.serviceSlug,
        providerId: snapshot.providerId,
        locationId: snapshot.locationId,
        status: 'confirmed',
        createdAt: snapshot.createdAt,
        ...(typeof snapshot.vehicleId === 'string' ? { vehicleId: snapshot.vehicleId } : {}),
        ...(snapshot.vehicleSnapshot && typeof snapshot.vehicleSnapshot === 'object' ? { vehicleSnapshot: snapshot.vehicleSnapshot as AutoCareBookingSnapshotResponse['vehicleSnapshot'] } : {}),
        ...(typeof snapshot.bonusDiscountMinor === 'number' ? { bonusDiscountMinor: snapshot.bonusDiscountMinor } : {}),
        ...(typeof snapshot.payableAmountMinor === 'number' ? { payableAmountMinor: snapshot.payableAmountMinor } : {}),
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

export async function getAutoCareServiceRequestConversation(user: UserEntity, requestId: string, input: { cursor?: string; beforeCursor?: string; limit?: number } = {}): Promise<AutoCareServiceRequestConversationResponse> {
    const request = await getParticipantRequest(user, requestId)
    await ensureAutoCareRequestChatThread(request)
    const limit = getCursorLimit(input.limit)
    const cursor = input.cursor ? decodeCursor(input.cursor, ['createdAt', 'id']) : null
    const beforeCursor = input.beforeCursor ? decodeCursor(input.beforeCursor, ['createdAt', 'id']) : null
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
    const [response, messagePage, attachments] = await Promise.all([
        hydrateRequest(request),
        messagesQuery.getMany(),
        AppDataSource.getRepository(ServiceAttachmentEntity).find({ where: { requestId }, order: { createdAt: 'ASC' } }),
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
        attachments: attachments.map((attachment) => ({
            id: attachment.id,
            uploadedById: attachment.uploadedById,
            contentType: attachment.contentType,
            bytes: attachment.bytes,
            status: attachment.status,
            url: `/v1/service-requests/${requestId}/attachments/${attachment.id}`,
            createdAt: attachment.createdAt.toISOString(),
        })),
        nextCursor: hasMore && lastMessage
            && !isLatestPage && !beforeCursor
            ? encodeCursor({ createdAt: lastMessage.createdAt.toISOString(), id: lastMessage.id })
            : null,
        previousCursor: hasMore && firstMessage
            ? encodeCursor({ createdAt: firstMessage.createdAt.toISOString(), id: firstMessage.id })
            : null,
    }
}

export async function createAutoCareServiceMessage(user: UserEntity, requestId: string, input: CreateAutoCareServiceMessageInput) {
    const request = await getParticipantRequest(user, requestId)
    const body = input.body.trim()
    const idempotencyFingerprint = createHash('sha256').update(body).digest('hex')
    let transactionResult: { message: ServiceMessageEntity; recipientId: string | null; recipientRole: 'owner' | 'client'; changed: boolean }
    try {
        transactionResult = await AppDataSource.transaction(async (manager) => {
            const lockedRequest = await manager.getRepository(ServiceRequestEntity).findOne({
                where: { id: request.id },
                lock: { mode: 'pessimistic_write' },
            })
            if (!lockedRequest) notFound('Service request not found.')
            const messageRepository = manager.getRepository(ServiceMessageEntity)
            if (input.idempotencyKey) {
                const existing = await messageRepository.findOneBy({ requestId: request.id, senderId: user.id, idempotencyKey: input.idempotencyKey })
                if (existing) {
                    if (existing.idempotencyFingerprint !== idempotencyFingerprint) messageIdempotencyConflict()
                    const provider = await manager.getRepository(AutomotiveProviderEntity).findOneBy({ id: lockedRequest.providerId })
                    return { message: existing, recipientId: user.id === lockedRequest.clientId ? provider?.ownerId ?? null : lockedRequest.clientId, recipientRole: user.id === lockedRequest.clientId ? 'owner' : 'client', changed: false }
                }
            }
            const thread = await ensureAutoCareRequestChatThread(lockedRequest, manager)
            const provider = await manager.getRepository(AutomotiveProviderEntity).findOneBy({ id: lockedRequest.providerId })
            const recipientId = user.id === lockedRequest.clientId ? provider?.ownerId ?? null : lockedRequest.clientId
            const deliveredAt = recipientId ? new Date() : null
            const message = await messageRepository.save(messageRepository.create({
                requestId: lockedRequest.id,
                threadId: thread.id,
                senderId: user.id,
                kind: ServiceMessageKind.Text,
                body,
                idempotencyKey: input.idempotencyKey ?? null,
                idempotencyFingerprint: input.idempotencyKey ? idempotencyFingerprint : null,
                offer: null,
                deliveredAt,
                readAt: null,
            }))
            return { message, recipientId, recipientRole: user.id === lockedRequest.clientId ? 'owner' : 'client', changed: true }
        })
    } catch (error) {
        if (!input.idempotencyKey || !isMessageIdempotencyUniqueError(error)) throw error
        const existing = await AppDataSource.getRepository(ServiceMessageEntity).findOneBy({ requestId: request.id, senderId: user.id, idempotencyKey: input.idempotencyKey })
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
        if (!provider || !(await canManageProviderWithManager(manager, user.id, provider.id, lockedRequest.locationId))) throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'You do not manage this service request.' })
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
    const rawContent = decodeAutoCareAttachment(input)
    const content = await normalizeAutoCareAttachment(rawContent, input.contentType)
    const objectKey = createAutoCareAttachmentObjectKey('requests', request.id, randomUUID())
    await saveAutoCareAttachmentObject(objectKey, content)
    try {
        const attachment = await AppDataSource.transaction(async (manager) => {
            const lockedRequest = await manager.getRepository(ServiceRequestEntity).findOne({ where: { id: request.id }, lock: { mode: 'pessimistic_write' } })
            if (!lockedRequest) notFound('Service request not found.')
            if (lockedRequest.clientId !== user.id) {
                const provider = await manager.getRepository(AutomotiveProviderEntity).findOneBy({ id: lockedRequest.providerId })
                if (!provider || !(await canManageProvider(user.id, provider.id, lockedRequest.locationId))) {
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
                objectKey,
                contentType: input.contentType,
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
    await getParticipantRequest(user, requestId)
    const attachment = await AppDataSource.getRepository(ServiceAttachmentEntity).findOne({ where: { id: attachmentId, requestId }, select: { id: true, objectKey: true, contentType: true, checksum: true } })
    if (!attachment) notFound('Service attachment not found.')
    const signedUrl = await getAutoCareAttachmentSignedDownloadUrl(attachment.objectKey)
    return {
        ...attachment,
        signedUrl,
        content: signedUrl ? null : await readAutoCareAttachmentObject(attachment.objectKey),
    }
}

export async function createAutoCareServiceQuote(user: UserEntity, requestId: string, input: CreateAutoCareServiceQuoteInput) {
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
        if (!provider || !(await canManageProviderWithManager(manager, user.id, provider.id, lockedRequest.locationId))) throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'You do not manage this service request.' })
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
            quoteStatus: AutoCareQuoteStatus.Pending,
            createdAt: new Date().toISOString(),
        }
        lockedRequest.status = ServiceRequestStatus.EstimateShared
        const savedRequest = await manager.getRepository(ServiceRequestEntity).save(lockedRequest)
        const quoteRepository = manager.getRepository(AutoCareServiceQuoteEntity)
        const latestQuote = await quoteRepository.findOne({ where: { requestId }, order: { version: 'DESC' } })
        await quoteRepository.update(
            { requestId, status: AutoCareQuoteStatus.Pending },
            { status: AutoCareQuoteStatus.Superseded },
        )
        await quoteRepository.save(quoteRepository.create({
            requestId,
            providerId: lockedRequest.providerId,
            version: (latestQuote?.version ?? 0) + 1,
            amountMinor: input.amountMinor,
            currencyCode: input.currencyCode,
            snapshot: lockedRequest.estimateSnapshot,
            validUntil: input.validUntil ? new Date(input.validUntil) : null,
            status: AutoCareQuoteStatus.Pending,
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
        if (lockedRequest.status === targetStatus && (
            previousDecision === targetStatus ||
            (accepted && lockedRequest.acceptedQuoteVersion !== null)
        )) {
            const provider = await manager.getRepository(AutomotiveProviderEntity).findOneBy({ id: lockedRequest.providerId })
            return { request: lockedRequest, provider, changed: false, expired: false }
        }
        if (lockedRequest.status !== ServiceRequestStatus.EstimateShared || !lockedRequest.estimateSnapshot) conflict('There is no pending estimate for this service request.')
        const quoteRepository = manager.getRepository(AutoCareServiceQuoteEntity)
        const latestQuote = await quoteRepository.findOne({
            where: { requestId },
            order: { version: 'DESC' },
            lock: { mode: 'pessimistic_write' },
        })
        if (!latestQuote) conflict('There is no pending estimate for this service request.')
        const validUntil = latestQuote.validUntil ?? (
            typeof lockedRequest.estimateSnapshot.validUntil === 'string'
                ? new Date(lockedRequest.estimateSnapshot.validUntil)
                : null
        )
        if (latestQuote.status === AutoCareQuoteStatus.Pending && isAutoCareQuoteExpired(validUntil)) {
            latestQuote.status = AutoCareQuoteStatus.Expired
            await quoteRepository.save(latestQuote)
            lockedRequest.estimateSnapshot = {
                ...lockedRequest.estimateSnapshot,
                quoteStatus: AutoCareQuoteStatus.Expired,
                expiredAt: new Date().toISOString(),
            }
            lockedRequest.status = ServiceRequestStatus.AwaitingReply
            await manager.getRepository(ServiceRequestEntity).save(lockedRequest)
            return { request: lockedRequest, provider: null, changed: false, expired: true }
        }
        if (latestQuote.status !== AutoCareQuoteStatus.Pending) conflict('This estimate is no longer available.')
        const acceptedAt = new Date()
        if (accepted) {
            if (!lockedRequest.preferredAt) conflict('Choose a visit time before accepting this estimate.')
            await assertAutoCareSlotCapacity(manager, {
                locationId: lockedRequest.locationId,
                providerId: lockedRequest.providerId,
                preferredAt: lockedRequest.preferredAt,
                durationMinutes: getRequestDurationMinutes(lockedRequest),
                scheduleMessage: 'The selected visit time is outside the service schedule.',
                capacityMessage: 'The selected visit time is no longer available.',
            })
            const offering = lockedRequest.offeringId
                ? await manager.getRepository(AutomotiveServiceOfferingEntity).findOneBy({ id: lockedRequest.offeringId, locationId: lockedRequest.locationId })
                : null
            await reserveAutoCareResources(manager, {
                requestId: lockedRequest.id,
                providerId: lockedRequest.providerId,
                locationId: lockedRequest.locationId,
                startsAt: lockedRequest.preferredAt,
                durationMinutes: getRequestDurationMinutes(lockedRequest),
                requiredResourceTypes: offering?.requiredResourceTypes ?? lockedRequest.offeringSnapshot?.requiredResourceTypes,
                requiredResourceIds: offering?.requiredResourceIds ?? lockedRequest.offeringSnapshot?.requiredResourceIds,
            })
        }
        latestQuote.status = accepted ? AutoCareQuoteStatus.Accepted : AutoCareQuoteStatus.Declined
        await quoteRepository.save(latestQuote)
        lockedRequest.status = targetStatus
        lockedRequest.clientConfirmedAt = acceptedAt
        lockedRequest.estimateSnapshot = {
            ...lockedRequest.estimateSnapshot,
            clientDecision: targetStatus,
            quoteStatus: accepted ? AutoCareQuoteStatus.Accepted : AutoCareQuoteStatus.Declined,
        }
        lockedRequest.acceptedQuoteVersion = accepted ? latestQuote?.version ?? null : null
        lockedRequest.acceptedQuoteSnapshot = accepted
            ? {
                ...(latestQuote?.snapshot ?? lockedRequest.estimateSnapshot),
                acceptedAt: acceptedAt.toISOString(),
                acceptedFromQuoteVersion: latestQuote?.version ?? null,
            }
            : null
        lockedRequest.acceptedQuoteAt = accepted ? acceptedAt : null
        const location = await manager.getRepository(AutomotiveServiceLocationEntity).findOneBy({ id: lockedRequest.locationId, providerId: lockedRequest.providerId })
        lockedRequest.bookingSnapshot = accepted && lockedRequest.preferredAt && latestQuote
            ? createAutoCareBookingSnapshot({
                requestId: lockedRequest.id,
                quoteVersion: latestQuote.version,
                amountMinor: latestQuote.amountMinor,
                currencyCode: latestQuote.currencyCode,
                lineItems: Array.isArray(latestQuote.snapshot.lineItems) ? latestQuote.snapshot.lineItems as AutoCareQuoteLineItemResponse[] : [],
                scheduledAt: lockedRequest.preferredAt.toISOString(),
                timezone: location?.timezone ?? 'UTC',
                serviceSlug: typeof lockedRequest.offeringSnapshot?.serviceSlug === 'string' ? lockedRequest.offeringSnapshot.serviceSlug : 'automotive-service',
                providerId: lockedRequest.providerId,
                locationId: lockedRequest.locationId,
                createdAt: acceptedAt.toISOString(),
                vehicleId: lockedRequest.vehicleId,
                vehicleSnapshot: lockedRequest.vehicleSnapshot as AutoCareRequestSnapshot | null,
            })
            : null
        lockedRequest.bookingCreatedAt = accepted ? acceptedAt : null
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
        return { request, provider, changed: true, expired: false }
    })
    if (transactionResult.expired) conflict('This estimate has expired.')
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
        status: getAutoCareQuoteLifecycleStatus(quote.status, quote.validUntil),
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
    if (provider && await canManageProvider(user.id, provider.id, request.locationId)) return
    throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'You do not have access to this service request.' })
}

export async function createAutoCareServiceRequest(user: UserEntity, input: CreateAutoCareServiceRequestInput) {
    clientOnly(user)
    const providerRepository = AppDataSource.getRepository(AutomotiveProviderEntity)
    const locationRepository = AppDataSource.getRepository(AutomotiveServiceLocationEntity)
    const offeringRepository = AppDataSource.getRepository(AutomotiveServiceOfferingEntity)
    const definitionRepository = AppDataSource.getRepository(AutomotiveServiceDefinitionEntity)
    const requestRepository = AppDataSource.getRepository(ServiceRequestEntity)
    const vehicle = input.vehicleId
        ? await AppDataSource.getRepository(ClientVehicleEntity).findOneBy({ id: input.vehicleId, userId: user.id })
        : null
    if (input.vehicleId && !vehicle) notFound('Selected vehicle was not found.')
    const vehicleSnapshot = vehicle ? createVehicleSnapshot(vehicle) : input.vehicleSnapshot ?? null
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
    let savedRequest: ServiceRequestEntity
    try {
        savedRequest = await AppDataSource.transaction(async (manager) => {
            const lockedLocation = await assertAutoCareSlotCapacity(manager, {
                locationId: location.id,
                providerId: provider.id,
                preferredAt,
                durationMinutes: offering.durationMinutes,
                requireAvailableCapacity: offering.bookingMode === AutomotiveBookingMode.Instant,
                scheduleMessage: 'The selected visit time is outside the service schedule.',
                capacityMessage: 'The selected visit time is no longer available.',
            })
            const requestId = randomUUID()
            const confirmationAt = new Date()
            const createdRequest = await manager.getRepository(ServiceRequestEntity).save(manager.getRepository(ServiceRequestEntity).create({
                id: requestId,
                clientId: user.id,
                providerId: provider.id,
                locationId: location.id,
                definitionId: definition.id,
                offeringId: offering.id,
                offeringSnapshot: createOfferingSnapshot(definition, offering),
                vehicleId: vehicle?.id ?? null,
                vehicleSnapshot,
                contactSnapshot: input.contactSnapshot,
                preferredAt,
                note: input.note ?? null,
                idempotencyKey: input.idempotencyKey ?? null,
                status: offering.bookingMode === AutomotiveBookingMode.Instant ? ServiceRequestStatus.Accepted : ServiceRequestStatus.AwaitingReply,
                clientConfirmedAt: confirmationAt,
                providerConfirmedAt: offering.bookingMode === AutomotiveBookingMode.Instant ? confirmationAt : null,
                bookingSnapshot: offering.bookingMode === AutomotiveBookingMode.Instant
                    ? createAutoCareBookingSnapshot({
                        requestId,
                        quoteVersion: 0,
                        amountMinor: offering.priceFromMinor,
                        currencyCode: offering.currencyCode,
                        lineItems: [],
                        scheduledAt: preferredAt.toISOString(),
                        timezone: lockedLocation.timezone,
                        serviceSlug: definition.slug,
                        providerId: provider.id,
                        locationId: location.id,
                        createdAt: confirmationAt.toISOString(),
                        vehicleId: vehicle?.id ?? null,
                        vehicleSnapshot,
                    })
                    : null,
                bookingCreatedAt: offering.bookingMode === AutomotiveBookingMode.Instant ? confirmationAt : null,
            }))
            if (offering.bookingMode === AutomotiveBookingMode.Instant) {
                await reserveAutoCareResources(manager, {
                    requestId: createdRequest.id,
                    providerId: provider.id,
                    locationId: location.id,
                    startsAt: preferredAt,
                    durationMinutes: offering.durationMinutes,
                    requiredResourceTypes: offering.requiredResourceTypes,
                    requiredResourceIds: offering.requiredResourceIds,
                })
            }
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
    const scopes = await getManagedProviderScopes(user.id)
    const providerIds = scopes.map(({ providerId }) => providerId)
    const providers = providerIds.length === 0
        ? []
        : await AppDataSource.getRepository(AutomotiveProviderEntity).find({ where: { id: In(providerIds) } })
    if (providers.length === 0) return []
    const requests = await AppDataSource.getRepository(ServiceRequestEntity).find({ where: { providerId: In(providers.map((provider) => provider.id)) }, order: { createdAt: 'DESC' } })
    const visibleRequests = requests.filter((request) => isManagedProviderLocationAllowed(scopes, request.providerId, request.locationId))
    return Promise.all(visibleRequests.map(hydrateRequest))
}

export async function getAutoCareServiceRequest(user: UserEntity, requestId: string) {
    const request = await getRequest(requestId)
    await assertParticipant(user, request)
    return hydrateRequest(request)
}

function formatClock(totalMinutes: number) {
    return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`
}

async function assertAutoCareSlotCapacity(
    manager: EntityManager,
    input: {
        locationId: string
        providerId: string
        preferredAt: Date
        durationMinutes: number
        excludeRequestId?: string
        requireAvailableCapacity?: boolean
        scheduleMessage: string
        capacityMessage: string
    },
) {
    const location = await manager.getRepository(AutomotiveServiceLocationEntity).findOne({
        where: { id: input.locationId, providerId: input.providerId },
        lock: { mode: 'pessimistic_write' },
    })
    if (!location) conflict('The service location for this request is no longer available.')

    const timezone = isValidTimeZone(location.timezone) ? location.timezone : 'UTC'
    const localVisit = localDateTimeParts(input.preferredAt, timezone)
    const schedule = getScheduleForDate(localVisit.date, location.hours, location.weeklySchedule)
    const dayRange = localDateRangeToUtc(localVisit.date, timezone)
    const visitEndMinutes = localVisit.minutes + input.durationMinutes
    const scheduleOpenMinutes = Number(schedule.open.slice(0, 2)) * 60 + Number(schedule.open.slice(3))
    const scheduleCloseMinutes = Number(schedule.close.slice(0, 2)) * 60 + Number(schedule.close.slice(3))
    if (location.blackoutDates.includes(localVisit.date) || schedule.closed || !dayRange || localVisit.minutes < scheduleOpenMinutes || visitEndMinutes > scheduleCloseMinutes) {
        conflict(input.scheduleMessage)
    }

    const reservations = await manager.getRepository(ServiceRequestEntity).find({
        where: {
            providerId: input.providerId,
            locationId: input.locationId,
            preferredAt: Between(dayRange.start, dayRange.end),
            status: ServiceRequestStatus.Accepted,
        },
    })
    const occupied = reservations.filter((reservation) => reservation.id !== input.excludeRequestId && reservation.preferredAt)
    const offeringIds = occupied.flatMap((reservation) => reservation.offeringId ? [reservation.offeringId] : [])
    const offerings = offeringIds.length > 0
        ? await manager.getRepository(AutomotiveServiceOfferingEntity).findBy({ id: In(offeringIds) })
        : []
    const durationByOfferingId = new Map(offerings.map((offering) => [offering.id, offering.durationMinutes]))
    const activeReservations = occupied.flatMap((reservation) => {
        if (!reservation.preferredAt) return []
        const local = localDateTimeParts(reservation.preferredAt, timezone)
        if (local.date !== localVisit.date) return []
        return [{
            startsAtMinutes: local.minutes,
            durationMinutes: durationByOfferingId.get(reservation.offeringId ?? '')
                ?? (typeof reservation.offeringSnapshot?.durationMinutes === 'number' ? reservation.offeringSnapshot.durationMinutes : 60),
        }]
    })
    if (input.requireAvailableCapacity !== false && !hasAvailableAppointmentCapacity({
        capacity: location.appointmentCapacity,
        candidate: { startsAtMinutes: localVisit.minutes, durationMinutes: input.durationMinutes },
        reservations: activeReservations,
    })) {
        conflict(input.capacityMessage)
    }
    return { ...location, timezone }
}

function getRequestDurationMinutes(request: ServiceRequestEntity) {
    return typeof request.offeringSnapshot?.durationMinutes === 'number'
        ? request.offeringSnapshot.durationMinutes
        : 60
}

async function assertAutoCareRescheduleSlot(
    manager: EntityManager,
    request: ServiceRequestEntity,
    proposedAt: Date,
    requireAvailableCapacity: boolean,
) {
    const offeringRepository = manager.getRepository(AutomotiveServiceOfferingEntity)
    const offering = request.offeringId
        ? await offeringRepository.findOneBy({ id: request.offeringId, locationId: request.locationId, active: true })
        : null
    const durationMinutes = offering?.durationMinutes
        ?? (typeof request.offeringSnapshot?.durationMinutes === 'number' ? request.offeringSnapshot.durationMinutes : 60)
    await assertAutoCareSlotCapacity(manager, {
        locationId: request.locationId,
        providerId: request.providerId,
        preferredAt: proposedAt,
        durationMinutes,
        excludeRequestId: request.id,
        requireAvailableCapacity,
        scheduleMessage: 'The proposed visit time is outside the service schedule.',
        capacityMessage: 'The proposed visit time is no longer available.',
    })
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
    const requests = await AppDataSource.getRepository(ServiceRequestEntity).find({
        where: {
            providerId,
            locationId,
            preferredAt: Between(dayStart, dayEnd),
            status: ServiceRequestStatus.Accepted,
        },
    })
    const requestOfferings = await Promise.all(requests.map((request) => request.offeringId
        ? AppDataSource.getRepository(AutomotiveServiceOfferingEntity).findOneBy({ id: request.offeringId })
        : null))
    const slots: AutoCareAvailabilitySlotResponse[] = []
    for (let start = openMinutes; start + offering.durationMinutes <= closeMinutes; start += 30) {
        const end = start + offering.durationMinutes
        const occupied = requests.filter((request, index) => {
            const preferred = request.preferredAt
            if (!preferred) return false
            const local = localDateTimeParts(preferred, timezone)
            if (local.date !== date) return false
            const requestStart = local.minutes
            const requestDuration = requestOfferings[index]?.durationMinutes ?? 60
            return start < requestStart + requestDuration && end > requestStart
        }).length
        if (occupied < Math.max(1, location.appointmentCapacity)) {
            const startsAt = zonedWallTimeToUtc(date, `${formatClock(start)}`, timezone)
            if (!startsAt) continue
            const resourcesAvailable = await hasAutoCareResourceAvailability(AppDataSource.manager, {
                requestId: undefined,
                providerId,
                locationId,
                startsAt,
                durationMinutes: offering.durationMinutes,
                requiredResourceTypes: offering.requiredResourceTypes,
                requiredResourceIds: offering.requiredResourceIds,
            })
            if (resourcesAvailable) slots.push({ startTime: formatClock(start), endTime: formatClock(end) })
        }
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
    const transactionResult = await AppDataSource.transaction(async (manager) => {
        const request = await manager.getRepository(ServiceRequestEntity).findOne({ where: { id: requestId }, lock: { mode: 'pessimistic_write' } })
        if (!request) notFound('Service request not found.')
        const provider = await manager.getRepository(AutomotiveProviderEntity).findOneBy({ id: request.providerId })
        if (!provider || !(await canManageProviderWithManager(manager, user.id, provider.id, request.locationId))) throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'You do not manage this service request.' })
        if (!serviceRequestConfirmableStates.has(request.status)) conflict('This service request can no longer be confirmed.')
        const changed = !request.providerConfirmedAt || request.status !== ServiceRequestStatus.Accepted
        if (changed) {
            if (!request.preferredAt) conflict('Choose a visit time before confirming this service request.')
            await assertAutoCareSlotCapacity(manager, {
                locationId: request.locationId,
                providerId: request.providerId,
                preferredAt: request.preferredAt,
                durationMinutes: getRequestDurationMinutes(request),
                excludeRequestId: request.id,
                scheduleMessage: 'The selected visit time is outside the service schedule.',
                capacityMessage: 'The selected visit time is no longer available.',
            })
            const offering = request.offeringId
                ? await manager.getRepository(AutomotiveServiceOfferingEntity).findOneBy({ id: request.offeringId, locationId: request.locationId })
                : null
            await reserveAutoCareResources(manager, {
                requestId: request.id,
                providerId: request.providerId,
                locationId: request.locationId,
                startsAt: request.preferredAt,
                durationMinutes: getRequestDurationMinutes(request),
                requiredResourceTypes: offering?.requiredResourceTypes ?? request.offeringSnapshot?.requiredResourceTypes,
                requiredResourceIds: offering?.requiredResourceIds ?? request.offeringSnapshot?.requiredResourceIds,
            })
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
    const proposedAt = new Date(input.proposedAt)
    if (Number.isNaN(proposedAt.getTime()) || proposedAt.getTime() <= Date.now()) conflict('The proposed visit time must be in the future.')
    const created = await AppDataSource.transaction(async (manager) => {
        const request = await manager.getRepository(ServiceRequestEntity).findOne({ where: { id: requestId }, lock: { mode: 'pessimistic_write' } })
        if (!request) notFound('Service request not found.')
        const provider = await manager.getRepository(AutomotiveProviderEntity).findOneBy({ id: request.providerId })
        if (!provider || !(await canManageProviderWithManager(manager, user.id, provider.id, request.locationId))) forbidden('You do not manage this service request.')
        if (!serviceRequestReschedulableStates.has(request.status)) conflict('This service request cannot be rescheduled.')
        if (request.preferredAt?.getTime() === proposedAt.getTime()) conflict('Choose a different visit time.')
        await assertAutoCareRescheduleSlot(manager, request, proposedAt, false)
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
            await assertAutoCareRescheduleSlot(manager, request, pending.proposedAt, true)
            await releaseAutoCareResources(manager, request.id)
            const offering = request.offeringId
                ? await manager.getRepository(AutomotiveServiceOfferingEntity).findOneBy({ id: request.offeringId, locationId: request.locationId })
                : null
            await reserveAutoCareResources(manager, {
                requestId: request.id,
                providerId: request.providerId,
                locationId: request.locationId,
                startsAt: pending.proposedAt,
                durationMinutes: getRequestDurationMinutes(request),
                requiredResourceTypes: offering?.requiredResourceTypes ?? request.offeringSnapshot?.requiredResourceTypes,
                requiredResourceIds: offering?.requiredResourceIds ?? request.offeringSnapshot?.requiredResourceIds,
            })
            request.preferredAt = pending.proposedAt
            if (request.bookingSnapshot) {
                request.bookingSnapshot = {
                    ...request.bookingSnapshot,
                    scheduledAt: pending.proposedAt.toISOString(),
                }
            }
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
        await releaseAutoCareResources(manager, request.id)
        await manager.getRepository(ServiceRequestEntity).save(request)
        await appendRepairEventWithManager(manager, { requestId, actorId: user.id, eventType: 'no_show', title: 'Заявка отмечена как неявка клиента', notes: request.noShowReason })
        await notifyAutoCareParticipant({ userId: request.clientId, requestId, event: 'no-show', role: 'client', title: 'Визит отмечен как неявка', message: 'Сервис отметил, что визит не состоялся.' }, manager)
        return { request, changed: true }
    })
    return hydrateRequest(transactionResult.request)
}

export async function completeAutoCareServiceRequest(user: UserEntity, requestId: string, note?: string | null) {
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
        await releaseAutoCareResources(manager, request.id)
        await manager.getRepository(ServiceRequestEntity).save(request)
        await awardAutoCareBonusForCompletedVisit(manager, request, user.id)
        await appendRepairEventWithManager(manager, { requestId, actorId: user.id, eventType: 'completed', title: 'Сервис отметил визит завершённым', notes: request.completionNote })
        await notifyAutoCareParticipant({ userId: request.clientId, requestId, event: 'completed', role: 'client', title: 'Визит завершён', message: 'Сервис отметил услугу завершённой. Теперь можно оставить отзыв.' }, manager)
        return { request, changed: true }
    })
    // Completion is the durable trust event. Refresh snapshots after commit so
    // a successful booking is never rolled back by a transient trust failure.
    try {
        await reassessAutoCareProviderTrust(transactionResult.request.providerId)
    } catch (error) {
        logError('Could not refresh AutoCare trust after completed visit', error, {
            providerId: transactionResult.request.providerId,
            requestId,
        })
    }
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
        await releaseAutoCareResources(manager, request.id)
        await manager.getRepository(ServiceRequestEntity).save(request)
        await refundAutoCareBonusForCancelledRequest(manager, request, user.id)
        await appendRepairEventWithManager(manager, { requestId, actorId: user.id, eventType: 'cancelled', title: 'Клиент отменил заявку', notes: request.cancellationReason })
        const provider = await manager.getRepository(AutomotiveProviderEntity).findOneBy({ id: request.providerId })
        if (provider?.ownerId) {
            await notifyAutoCareParticipant({ userId: provider.ownerId, requestId, event: 'cancelled-client', role: 'owner', title: 'Клиент отменил заявку', message: 'Клиент отменил заявку на услугу.', }, manager)
        }
        return { request, changed: true }
    })
    return hydrateRequest(transactionResult.request)
}
