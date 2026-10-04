import { AppDataSource } from '../../database/data-source.js'
import { AutomotiveProviderEntity, AutomotiveServiceLocationEntity, AutomotiveServiceOfferingEntity, AutoCareServiceQuoteEntity, AutoCareQuoteStatus, ServiceRequestEntity, ServiceRequestStatus } from '../../entities/index.js'
import { type UserEntity } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import type { AutoCareQuoteLineItemResponse, CreateAutoCareServiceQuoteInput, AutoCareRequestSnapshot } from './autocare.types.js'
import { hasProviderWorkspacePermissionWithManager } from './provider-access.service.js'
import { createAutoCareBookingSnapshot } from './booking-snapshot.js'
import { isAutoCareQuoteExpired } from './quote-policy.js'
import { reserveAutoCareResources } from './capacity-resource.service.js'
import { normalizeAutoCareQuoteDecisionInput, normalizeAutoCareServiceQuoteInput } from './quote-input-policy.js'
import { canCreateAutoCareServiceQuote, isAutoCareVisitTimeBookable } from './request-lifecycle-policy.js'
import { assertAutoCareSlotCapacity, getRequestDurationMinutes } from './request-availability.service.js'
import { appendRepairEventWithManager, expirePendingAutoCareReschedule, notifyAutoCareParticipant } from './request-effects.service.js'
import { clientOnly, conflict, notFound, requireAutoCareRequestUuid } from './request-errors.js'
import { hydrateRequest } from './request-read.service.js'

export async function createAutoCareServiceQuote(user: UserEntity, requestId: string, input: CreateAutoCareServiceQuoteInput) {
    requestId = requireAutoCareRequestUuid(requestId)
    const normalizedInput = normalizeAutoCareServiceQuoteInput(input)
    if (!normalizedInput) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Service quote is invalid.' })
    const { amountMinor, currencyCode, note, lineItems, taxMinor, feesMinor, validUntil, priceLocked } = normalizedInput
    if (lineItems.some((item) => item.kind !== 'discount' && item.unitPriceMinor < 0)) {
        conflict('Only discount line items may have a negative unit price.')
    }
    if (validUntil && new Date(validUntil).getTime() <= Date.now()) {
        conflict('The estimate expiration must be in the future.')
    }
    const subtotalMinor = lineItems.reduce((total, item) => total + item.totalMinor, 0)
    if (lineItems.length > 0 && subtotalMinor + taxMinor + feesMinor !== amountMinor) {
        conflict('Structured quote totals must equal the amount.')
    }
    const request = await AppDataSource.transaction(async (manager) => {
        const lockedRequest = await manager.getRepository(ServiceRequestEntity).findOne({
            where: { id: requestId },
            lock: { mode: 'pessimistic_write' },
        })
        if (!lockedRequest) notFound('Service request not found.')
        const provider = await manager.getRepository(AutomotiveProviderEntity).findOneBy({ id: lockedRequest.providerId })
        if (!provider || !(await hasProviderWorkspacePermissionWithManager(manager, user.id, provider.id, 'requests', lockedRequest.locationId))) throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'You do not manage this service request.' })
        if (!canCreateAutoCareServiceQuote(lockedRequest.status)) conflict('This service request cannot receive a new estimate.')
        lockedRequest.estimateSnapshot = {
            amountMinor,
            lineItems,
            subtotalMinor: lineItems.length > 0 ? subtotalMinor : amountMinor,
            taxMinor,
            feesMinor,
            currencyCode,
            note,
            validUntil,
            priceLocked,
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
            amountMinor,
            currencyCode,
            snapshot: lockedRequest.estimateSnapshot,
            validUntil: validUntil ? new Date(validUntil) : null,
            status: AutoCareQuoteStatus.Pending,
        }))
        await appendRepairEventWithManager(manager, { requestId, actorId: user.id, eventType: 'estimate_shared', title: 'Смета отправлена клиенту', notes: note, metadata: { amountMinor, currencyCode, priceLocked } })
        await notifyAutoCareParticipant({
            userId: lockedRequest.clientId,
            requestId,
            event: 'estimate-shared',
            role: 'client',
            title: 'Сервис прислал предварительную смету',
            message: `Проверьте предварительную стоимость услуги: ${(amountMinor / 100).toFixed(2)} ${currencyCode}.`,
        }, manager)
        return savedRequest
    })
    return hydrateRequest(request)
}

async function resolveClientQuoteDecision(user: UserEntity, requestId: string, accepted: boolean, input?: unknown) {
    clientOnly(user)
    requestId = requireAutoCareRequestUuid(requestId)
    // Direct internal callers from the legacy request workflow may omit the
    // revision while the HTTP route is strict. Public callers must always send
    // quoteId + quoteVersion so the transaction can reject stale consent.
    const expectedQuote = input === undefined ? null : normalizeAutoCareQuoteDecisionInput(input)
    if (input !== undefined && !expectedQuote) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Quote id and version are required.' })
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
            if (expectedQuote && (lockedRequest.estimateSnapshot?.decisionQuoteId !== expectedQuote.quoteId || lockedRequest.estimateSnapshot?.decisionQuoteVersion !== expectedQuote.quoteVersion)) {
                conflict('The estimate changed. Review the latest estimate before deciding.')
            }
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
        if (expectedQuote && (latestQuote.id !== expectedQuote.quoteId || latestQuote.version !== expectedQuote.quoteVersion)) {
            conflict('The estimate changed. Review the latest estimate before deciding.')
        }
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
            if (!isAutoCareVisitTimeBookable(lockedRequest.preferredAt)) throw new AppError({ statusCode: 409, code: ERROR_CODES.SlotUnavailable, message: 'The selected visit time has passed or is too close to start. Choose another time.' })
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
            decisionQuoteId: latestQuote.id,
            decisionQuoteVersion: latestQuote.version,
            quoteStatus: accepted ? AutoCareQuoteStatus.Accepted : AutoCareQuoteStatus.Declined,
        }
        lockedRequest.acceptedQuoteVersion = accepted ? latestQuote?.version ?? null : null
        lockedRequest.acceptedQuoteSnapshot = accepted
            ? {
                ...(latestQuote?.snapshot ?? lockedRequest.estimateSnapshot),
                acceptedAt: acceptedAt.toISOString(),
                acceptedFromQuoteId: latestQuote?.id ?? null,
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
        if (!accepted) {
            await expirePendingAutoCareReschedule(manager, requestId, user.id, 'The service request was declined before the new time was accepted.')
        }
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

export function acceptAutoCareServiceQuote(user: UserEntity, requestId: string, input?: unknown) {
    return resolveClientQuoteDecision(user, requestId, true, input)
}

export function declineAutoCareServiceQuote(user: UserEntity, requestId: string, input?: unknown) {
    return resolveClientQuoteDecision(user, requestId, false, input)
}
