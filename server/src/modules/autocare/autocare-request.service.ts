import { Between, In, type QueryFailedError } from 'typeorm'
import { randomUUID } from 'node:crypto'

import { AppDataSource } from '../../database/data-source.js'
import {
    AutomotiveProviderEntity,
    AutomotiveProviderStatus,
    AutomotiveServiceDefinitionEntity,
    AutomotiveServiceLocationEntity,
    AutomotiveServiceOfferingEntity,
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
import { enqueueNotificationSafely } from '../outbox/notification-outbox.service.js'
import type {
    AutoCareAvailabilitySlotResponse,
    AutoCareServiceRequestResponse,
    AutoCareServiceRequestConversationResponse,
    AutoCareServiceMessageResponse,
    CreateAutoCareServiceAttachmentInput,
    CreateAutoCareServiceMessageInput,
    CreateAutoCareServiceOfferInput,
    CreateAutoCareServiceQuoteInput,
    CreateAutoCareServiceRequestInput,
} from './autocare.types.js'
import { broadcastServiceChat } from './service-chat.gateway.js'

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

function conflict(message: string): never {
    throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message })
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
}) {
    await enqueueNotificationSafely({
        userId: input.userId,
        category: NotificationCategory.Booking,
        title: input.title,
        message: input.message,
        link: input.role === 'owner' ? `/owner/autocare-requests?request=${input.requestId}` : `/profile/bookings?request=${input.requestId}`,
        metadata: { serviceRequestId: input.requestId, event: input.event, domain: 'autocare' },
    }, `notification:autocare:${input.requestId}:${input.event}:${input.userId}`)
}

function requestResponse(
    request: ServiceRequestEntity,
    provider: AutomotiveProviderEntity,
    location: AutomotiveServiceLocationEntity,
    definition: AutomotiveServiceDefinitionEntity,
    offering: AutomotiveServiceOfferingEntity | null,
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
                currencyCode: String(request.estimateSnapshot.currencyCode ?? 'RUB'),
                note: typeof request.estimateSnapshot.note === 'string' ? request.estimateSnapshot.note : null,
                createdAt: String(request.estimateSnapshot.createdAt ?? request.updatedAt.toISOString()),
            }
            : null,
        status: request.status,
        clientConfirmedAt: request.clientConfirmedAt?.toISOString() ?? null,
        providerConfirmedAt: request.providerConfirmedAt?.toISOString() ?? null,
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

export async function getAutoCareServiceRequestConversation(user: UserEntity, requestId: string): Promise<AutoCareServiceRequestConversationResponse> {
    const request = await getParticipantRequest(user, requestId)
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
    const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: request.providerId })
    const recipientId = user.id === request.clientId ? provider?.ownerId : request.clientId
    const deliveredAt = recipientId ? new Date() : null
    const message = await AppDataSource.getRepository(ServiceMessageEntity).save(AppDataSource.getRepository(ServiceMessageEntity).create({
        requestId: request.id,
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
    const request = await getRequest(requestId)
    const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: request.providerId })
    if (!provider || provider.ownerId !== user.id) throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'You do not manage this service request.' })
    if (input.type === 'discount' && !input.discountPercent) conflict('A discount offer requires a percentage.')
    const offer: ServiceMessageOffer = {
        type: input.type,
        title: input.title,
        description: input.description ?? null,
        discountPercent: input.discountPercent ?? null,
        couponCode: input.type === 'discount' ? input.couponCode?.trim().toUpperCase() || `AC-${randomUUID().slice(0, 8).toUpperCase()}` : null,
        amountMinor: input.amountMinor ?? null,
        currencyCode: input.currencyCode ?? null,
        expiresAt: input.expiresAt ?? null,
        status: 'pending',
    }
    const message = await AppDataSource.getRepository(ServiceMessageEntity).save(AppDataSource.getRepository(ServiceMessageEntity).create({
        requestId,
        senderId: user.id,
        kind: ServiceMessageKind.Offer,
        body: input.title,
        offer,
        deliveredAt: new Date(),
        readAt: null,
    }))
    await notifyAutoCareParticipant({ userId: request.clientId, requestId, event: `offer-${message.id}`, role: 'client', title: 'Сервис предложил вариант решения', message: input.title })
    const result = messageResponse(message)
    broadcastServiceChat(requestId, { type: 'message.created', requestId, payload: result })
    return result
}

export async function decideAutoCareServiceOffer(user: UserEntity, requestId: string, messageId: string, decision: 'accept' | 'decline') {
    clientOnly(user)
    const request = await getParticipantRequest(user, requestId)
    if (request.clientId !== user.id) throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'You do not have access to this service request.' })
    const repository = AppDataSource.getRepository(ServiceMessageEntity)
    const message = await repository.findOneBy({ id: messageId, requestId })
    if (!message || message.kind !== ServiceMessageKind.Offer || !message.offer) notFound('Service offer not found.')
    if (message.offer.status !== 'pending') conflict('This service offer has already been resolved.')
    message.offer = { ...message.offer, status: decision === 'accept' ? 'accepted' : 'declined' }
    const saved = await repository.save(message)
    const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: request.providerId })
    if (provider?.ownerId) await notifyAutoCareParticipant({ userId: provider.ownerId, requestId, event: `offer-${decision}-${message.id}`, role: 'owner', title: decision === 'accept' ? 'Клиент принял предложение' : 'Клиент отклонил предложение', message: message.offer.title })
    const result = messageResponse(saved)
    broadcastServiceChat(requestId, { type: 'offer.updated', requestId, payload: result })
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
    const content = Buffer.from(input.contentBase64, 'base64')
    if (content.length !== input.size) conflict('Attachment content does not match its declared size.')
    const attachment = await AppDataSource.getRepository(ServiceAttachmentEntity).save(AppDataSource.getRepository(ServiceAttachmentEntity).create({
        requestId: request.id,
        uploadedById: user.id,
        objectKey: `autocare-requests/${request.id}/${Date.now()}-${input.fileName.replace(/[^a-zA-Z0-9._-]/g, '-')}`,
        contentType: input.contentType,
        bytes: content.length,
        content,
        checksum: null,
        status: ServiceAttachmentStatus.Ready,
    }))
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
    const request = await getRequest(requestId)
    const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: request.providerId })
    if (!provider || provider.ownerId !== user.id) throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'You do not manage this service request.' })
    if ([ServiceRequestStatus.Declined, ServiceRequestStatus.Closed, ServiceRequestStatus.Accepted].includes(request.status)) conflict('This service request cannot receive a new estimate.')
    request.estimateSnapshot = { amountMinor: input.amountMinor, currencyCode: input.currencyCode, note: input.note ?? null, createdAt: new Date().toISOString() }
    request.status = ServiceRequestStatus.EstimateShared
    await AppDataSource.getRepository(ServiceRequestEntity).save(request)
    await notifyAutoCareParticipant({
        userId: request.clientId,
        requestId,
        event: 'estimate-shared',
        role: 'client',
        title: 'Сервис прислал предварительную смету',
        message: `Проверьте предварительную стоимость услуги: ${(input.amountMinor / 100).toFixed(2)} ${input.currencyCode}.`,
    })
    return hydrateRequest(request)
}

async function resolveClientQuoteDecision(user: UserEntity, requestId: string, accepted: boolean) {
    clientOnly(user)
    const request = await getRequest(requestId)
    if (request.clientId !== user.id) throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'You do not have access to this service request.' })
    if (request.status !== ServiceRequestStatus.EstimateShared || !request.estimateSnapshot) conflict('There is no pending estimate for this service request.')
    request.status = accepted ? ServiceRequestStatus.Accepted : ServiceRequestStatus.Declined
    request.clientConfirmedAt = new Date()
    await AppDataSource.getRepository(ServiceRequestEntity).save(request)
    const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: request.providerId })
    if (provider?.ownerId) {
        await notifyAutoCareParticipant({
            userId: provider.ownerId,
            requestId,
            event: accepted ? 'estimate-accepted' : 'estimate-declined',
            role: 'owner',
            title: accepted ? 'Клиент принял смету' : 'Клиент отклонил смету',
            message: accepted ? 'Клиент подтвердил предварительную стоимость услуги.' : 'Клиент попросил не продолжать по этой смете.',
        })
    }
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
    if (!provider || !location || !definition) notFound('Service request references missing service data.')
    return requestResponse(request, provider, location, definition, offering)
}

async function getRequest(requestId: string) {
    const request = await AppDataSource.getRepository(ServiceRequestEntity).findOneBy({ id: requestId })
    if (!request) notFound('Service request not found.')
    return request
}

async function assertParticipant(user: UserEntity, request: ServiceRequestEntity) {
    if (request.clientId === user.id) return
    const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: request.providerId })
    if (user.role === UserRole.Owner && provider?.ownerId === user.id) return
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

    const request = requestRepository.create({
        clientId: user.id,
        providerId: provider.id,
        locationId: location.id,
        definitionId: definition.id,
        offeringId: offering.id,
        offeringSnapshot: createOfferingSnapshot(definition, offering),
        vehicleSnapshot: input.vehicleSnapshot ?? null,
        contactSnapshot: input.contactSnapshot,
        preferredAt: new Date(input.preferredAt),
        note: input.note ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
        status: ServiceRequestStatus.AwaitingReply,
        clientConfirmedAt: new Date(),
        providerConfirmedAt: null,
    })
    let savedRequest: ServiceRequestEntity
    try {
        savedRequest = await requestRepository.save(request)
    } catch (error) {
        if (!input.idempotencyKey || !isRequestIdempotencyUniqueError(error)) throw error
        const existing = await requestRepository.findOneBy({ clientId: user.id, idempotencyKey: input.idempotencyKey })
        if (existing && isSameAutoCareServiceRequest(existing, input)) return hydrateRequest(existing)
        if (existing) requestIdempotencyConflict()
        throw error
    }
    if (provider.ownerId) {
        await notifyAutoCareParticipant({
            userId: provider.ownerId,
            requestId: savedRequest.id,
            event: 'created-owner',
            role: 'owner',
            title: 'Новая заявка на услугу',
            message: `Клиент отправил заявку на услугу «${definition.labels.ru ?? definition.slug}».`,
        })
    }
    await notifyAutoCareParticipant({
        userId: user.id,
        requestId: savedRequest.id,
        event: 'created-client',
        role: 'client',
        title: 'Заявка отправлена',
        message: 'Заявка передана автосервису. Следующий ответ появится в переписке по услуге.',
    })
    return requestResponse(savedRequest, provider, location, definition, offering)
}

export async function getMyAutoCareServiceRequests(user: UserEntity) {
    clientOnly(user)
    const requests = await AppDataSource.getRepository(ServiceRequestEntity).find({ where: { clientId: user.id }, order: { createdAt: 'DESC' } })
    return Promise.all(requests.map(hydrateRequest))
}

export async function getOwnerAutoCareServiceRequests(user: UserEntity) {
    ownerOnly(user)
    const providers = await AppDataSource.getRepository(AutomotiveProviderEntity).find({ where: { ownerId: user.id } })
    if (providers.length === 0) return []
    const requests = await AppDataSource.getRepository(ServiceRequestEntity).find({ where: { providerId: In(providers.map((provider) => provider.id)) }, order: { createdAt: 'DESC' } })
    return Promise.all(requests.map(hydrateRequest))
}

export async function getAutoCareServiceRequest(user: UserEntity, requestId: string) {
    const request = await getRequest(requestId)
    await assertParticipant(user, request)
    return hydrateRequest(request)
}

function parseServiceHours(hours: string) {
    const match = /(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/.exec(hours)
    if (!match) return { openMinutes: 8 * 60, closeMinutes: 21 * 60 }
    return {
        openMinutes: Number(match[1]) * 60 + Number(match[2]),
        closeMinutes: Number(match[3]) * 60 + Number(match[4]),
    }
}

function formatClock(totalMinutes: number) {
    return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`
}

export async function getAutoCareAvailability(providerId: string, locationId: string, offeringId: string, date: string) {
    const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: providerId, status: AutomotiveProviderStatus.Active })
    const location = await AppDataSource.getRepository(AutomotiveServiceLocationEntity).findOneBy({ id: locationId, providerId })
    const offering = await AppDataSource.getRepository(AutomotiveServiceOfferingEntity).findOneBy({ id: offeringId, locationId, active: true })
    if (!provider || !location || !offering) notFound('Automotive availability references missing service data.')

    const { openMinutes, closeMinutes } = parseServiceHours(location.hours)
    const dayStart = new Date(`${date}T00:00:00.000Z`)
    const dayEnd = new Date(`${date}T23:59:59.999Z`)
    if (Number.isNaN(dayStart.getTime()) || Number.isNaN(dayEnd.getTime())) notFound('Availability date is invalid.')
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
            if (!preferred || preferred.toISOString().slice(0, 10) !== date) return false
            const requestStart = preferred.getUTCHours() * 60 + preferred.getUTCMinutes()
            const requestDuration = requestOfferings[index]?.durationMinutes ?? 60
            return start < requestStart + requestDuration && end > requestStart
        })
        if (!occupied) slots.push({ startTime: formatClock(start), endTime: formatClock(end) })
    }
    return { date, durationMinutes: offering.durationMinutes, slots }
}

export async function confirmAutoCareServiceRequest(user: UserEntity, requestId: string) {
    clientOnly(user)
    const request = await getRequest(requestId)
    if (request.clientId !== user.id) throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'You do not have access to this service request.' })
    if ([ServiceRequestStatus.Declined, ServiceRequestStatus.Closed].includes(request.status)) conflict('This service request can no longer be confirmed.')
    request.clientConfirmedAt ??= new Date()
    await AppDataSource.getRepository(ServiceRequestEntity).save(request)
    const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: request.providerId })
    if (provider?.ownerId) {
        await notifyAutoCareParticipant({ userId: provider.ownerId, requestId, event: 'confirmed-client', role: 'owner', title: 'Клиент подтвердил заявку', message: 'Клиент подтвердил детали заявки на услугу.' })
    }
    return hydrateRequest(request)
}

export async function confirmOwnerAutoCareServiceRequest(user: UserEntity, requestId: string) {
    ownerOnly(user)
    const request = await getRequest(requestId)
    const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: request.providerId })
    if (!provider || provider.ownerId !== user.id) throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'You do not manage this service request.' })
    if ([ServiceRequestStatus.Declined, ServiceRequestStatus.Closed].includes(request.status)) conflict('This service request can no longer be confirmed.')
    request.providerConfirmedAt ??= new Date()
    request.status = ServiceRequestStatus.Accepted
    await AppDataSource.getRepository(ServiceRequestEntity).save(request)
    await notifyAutoCareParticipant({ userId: request.clientId, requestId, event: 'confirmed-owner', role: 'client', title: 'Сервис подтвердил заявку', message: 'Сервис подтвердил заявку и готов перейти к следующему шагу.' })
    return hydrateRequest(request)
}
