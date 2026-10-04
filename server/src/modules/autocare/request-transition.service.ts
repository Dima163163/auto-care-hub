import { AppDataSource } from '../../database/data-source.js'
import { AutomotiveProviderEntity, AutomotiveServiceOfferingEntity, ServiceRequestEntity, ServiceRequestStatus } from '../../entities/index.js'
import { type UserEntity } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { hasProviderWorkspacePermissionWithManager } from './provider-access.service.js'
import { awardAutoCareBonusForCompletedVisit, refundAutoCareBonusForCancelledRequest } from './autocare-bonus.service.js'
import { releaseAutoCareResources, reserveAutoCareResources } from './capacity-resource.service.js'
import { reassessAutoCareProviderTrust } from './trust-score.service.js'
import { logError } from '../../shared/observability/logger.js'
import { normalizeAutoCareRequestTransitionReason } from './reschedule-input-policy.js'
import { isAutoCareVisitTimeBookable } from './request-lifecycle-policy.js'
import { assertAutoCareSlotCapacity, getRequestDurationMinutes } from './request-availability.service.js'
import { appendRepairEventWithManager, expirePendingAutoCareReschedule, notifyAutoCareParticipant } from './request-effects.service.js'
import { clientOnly, conflict, forbidden, notFound, requireAutoCareRequestUuid } from './request-errors.js'
import { hydrateRequest } from './request-read.service.js'

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

export async function confirmAutoCareServiceRequest(user: UserEntity, requestId: string) {
    clientOnly(user)
    requestId = requireAutoCareRequestUuid(requestId)
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
    requestId = requireAutoCareRequestUuid(requestId)
    const transactionResult = await AppDataSource.transaction(async (manager) => {
        const request = await manager.getRepository(ServiceRequestEntity).findOne({ where: { id: requestId }, lock: { mode: 'pessimistic_write' } })
        if (!request) notFound('Service request not found.')
        const provider = await manager.getRepository(AutomotiveProviderEntity).findOneBy({ id: request.providerId })
        if (!provider || !(await hasProviderWorkspacePermissionWithManager(manager, user.id, provider.id, 'requests', request.locationId))) throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'You do not manage this service request.' })
        if (!serviceRequestConfirmableStates.has(request.status)) conflict('This service request can no longer be confirmed.')
        const changed = !request.providerConfirmedAt || request.status !== ServiceRequestStatus.Accepted
        if (changed) {
        if (!request.preferredAt) conflict('Choose a visit time before confirming this service request.')
            if (!isAutoCareVisitTimeBookable(request.preferredAt)) throw new AppError({ statusCode: 409, code: ERROR_CODES.SlotUnavailable, message: 'The selected visit time has passed or is too close to start. Choose another time.' })
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

export async function markAutoCareServiceRequestNoShow(user: UserEntity, requestId: string, reason?: string | null) {
    requestId = requireAutoCareRequestUuid(requestId)
    const normalizedReason = normalizeAutoCareRequestTransitionReason(reason)
    if (!normalizedReason.valid) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'No-show reason is invalid.' })
    const transactionResult = await AppDataSource.transaction(async (manager) => {
        const request = await manager.getRepository(ServiceRequestEntity).findOne({ where: { id: requestId }, lock: { mode: 'pessimistic_write' } })
        if (!request) notFound('Service request not found.')
        const provider = await manager.getRepository(AutomotiveProviderEntity).findOneBy({ id: request.providerId })
        if (!provider || !(await hasProviderWorkspacePermissionWithManager(manager, user.id, provider.id, 'requests', request.locationId))) forbidden('You do not manage this service request.')
        if (request.status === ServiceRequestStatus.NoShow) return { request, changed: false }
        if (request.status !== ServiceRequestStatus.Accepted || !request.providerConfirmedAt || !request.preferredAt) conflict('Only confirmed visits can be marked as no-show.')
        if (request.preferredAt.getTime() > Date.now()) conflict('A visit can be marked as no-show only after its scheduled time.')
        request.status = ServiceRequestStatus.NoShow
        request.noShowAt = new Date()
        request.noShowById = user.id
        request.noShowReason = normalizedReason.value
        await expirePendingAutoCareReschedule(manager, requestId, user.id, 'The service request was marked as no-show before the new time was accepted.')
        await releaseAutoCareResources(manager, request.id)
        await manager.getRepository(ServiceRequestEntity).save(request)
        await appendRepairEventWithManager(manager, { requestId, actorId: user.id, eventType: 'no_show', title: 'Заявка отмечена как неявка клиента', notes: request.noShowReason })
        await notifyAutoCareParticipant({ userId: request.clientId, requestId, event: 'no-show', role: 'client', title: 'Визит отмечен как неявка', message: 'Сервис отметил, что визит не состоялся.' }, manager)
        return { request, changed: true }
    })
    return hydrateRequest(transactionResult.request)
}

export async function completeAutoCareServiceRequest(user: UserEntity, requestId: string, note?: string | null) {
    requestId = requireAutoCareRequestUuid(requestId)
    const normalizedNote = normalizeAutoCareRequestTransitionReason(note)
    if (!normalizedNote.valid) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Completion note is invalid.' })
    const transactionResult = await AppDataSource.transaction(async (manager) => {
        const request = await manager.getRepository(ServiceRequestEntity).findOne({ where: { id: requestId }, lock: { mode: 'pessimistic_write' } })
        if (!request) notFound('Service request not found.')
        const provider = await manager.getRepository(AutomotiveProviderEntity).findOneBy({ id: request.providerId })
        if (!provider || !(await hasProviderWorkspacePermissionWithManager(manager, user.id, provider.id, 'requests', request.locationId))) forbidden('You do not manage this service request.')
        if (request.status === ServiceRequestStatus.Closed) return { request, changed: false }
        if (request.status !== ServiceRequestStatus.Accepted || !request.clientConfirmedAt || !request.providerConfirmedAt || !request.preferredAt) {
            conflict('Only a confirmed visit can be completed.')
        }
        const now = new Date()
        if (request.preferredAt.getTime() > now.getTime()) conflict('A visit can be completed only after its scheduled time.')
        request.status = ServiceRequestStatus.Closed
        request.completedAt = now
        request.completedById = user.id
        request.completionNote = normalizedNote.value
        await expirePendingAutoCareReschedule(manager, requestId, user.id, 'The service request was completed before the new time was accepted.')
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
    requestId = requireAutoCareRequestUuid(requestId)
    const normalizedReason = normalizeAutoCareRequestTransitionReason(reason)
    if (!normalizedReason.valid) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Cancellation reason is invalid.' })
    const transactionResult = await AppDataSource.transaction(async (manager) => {
        const request = await manager.getRepository(ServiceRequestEntity).findOne({ where: { id: requestId }, lock: { mode: 'pessimistic_write' } })
        if (!request) notFound('Service request not found.')
        if (request.clientId !== user.id) throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'You do not have access to this service request.' })
        if (request.status === ServiceRequestStatus.Cancelled) return { request, changed: false }
        if (!serviceRequestCancellableStates.has(request.status)) conflict('This service request can no longer be cancelled.')
        request.status = ServiceRequestStatus.Cancelled
        request.cancelledAt = new Date()
        request.cancelledById = user.id
        request.cancellationReason = normalizedReason.value
        await expirePendingAutoCareReschedule(manager, requestId, user.id, 'The service request was cancelled before the new time was accepted.')
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
