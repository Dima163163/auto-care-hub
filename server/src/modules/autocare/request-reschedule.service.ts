import { AppDataSource } from '../../database/data-source.js'
import { AutomotiveProviderEntity, AutomotiveServiceOfferingEntity, AutoCareRescheduleRequestEntity, AutoCareRescheduleStatus, ServiceRequestEntity, ServiceRequestStatus } from '../../entities/index.js'
import { type UserEntity } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { hasProviderWorkspacePermissionWithManager } from './provider-access.service.js'
import { releaseAutoCareResources, reserveAutoCareResources } from './capacity-resource.service.js'
import { normalizeAutoCareRescheduleInput, normalizeAutoCareRescheduleReason } from './reschedule-input-policy.js'
import { normalizeAutoCareRequestUuid } from './request-input-policy.js'
import { canDecideAutoCareReschedule, isAutoCareVisitTimeBookable } from './request-lifecycle-policy.js'
import { assertAutoCareRescheduleSlot, getRequestDurationMinutes } from './request-availability.service.js'
import { appendRepairEventWithManager, notifyAutoCareParticipant } from './request-effects.service.js'
import { clientOnly, conflict, forbidden, notFound, requireAutoCareRequestUuid } from './request-errors.js'
import { hydrateRequest } from './request-read.service.js'
import { rescheduleResponse } from './request-response.js'

const serviceRequestReschedulableStates = new Set<ServiceRequestStatus>([
    ServiceRequestStatus.Open,
    ServiceRequestStatus.AwaitingReply,
    ServiceRequestStatus.EstimateShared,
    ServiceRequestStatus.Accepted,
])

export async function requestAutoCareServiceReschedule(user: UserEntity, requestId: string, input: { proposedAt: string; reason?: string | null }) {
    requestId = requireAutoCareRequestUuid(requestId)
    const normalizedInput = normalizeAutoCareRescheduleInput(input)
    if (!normalizedInput) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Reschedule request is invalid.' })
    const { proposedAt, reason } = normalizedInput
    const now = Date.now()
    if (!isAutoCareVisitTimeBookable(proposedAt, now)) throw new AppError({ statusCode: 409, code: ERROR_CODES.SlotUnavailable, message: 'The proposed visit time has passed or is too close to start. Choose another time.' })
    const created = await AppDataSource.transaction(async (manager) => {
        const request = await manager.getRepository(ServiceRequestEntity).findOne({ where: { id: requestId }, lock: { mode: 'pessimistic_write' } })
        if (!request) notFound('Service request not found.')
        const provider = await manager.getRepository(AutomotiveProviderEntity).findOneBy({ id: request.providerId })
        if (!provider || !(await hasProviderWorkspacePermissionWithManager(manager, user.id, provider.id, 'requests', request.locationId))) forbidden('You do not manage this service request.')
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
            reason,
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

export async function decideAutoCareServiceReschedule(user: UserEntity, requestId: string, rescheduleId: string, decision: 'accept' | 'reject', reason?: string | null) {
    clientOnly(user)
    requestId = requireAutoCareRequestUuid(requestId)
    const normalizedRescheduleId = normalizeAutoCareRequestUuid(rescheduleId)
    if (!normalizedRescheduleId) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Reschedule request id must be a valid UUID.' })
    const normalizedReason = normalizeAutoCareRescheduleReason(reason)
    if (!normalizedReason.valid) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Reschedule reason is invalid.' })
    const transactionResult = await AppDataSource.transaction(async (manager) => {
        const requestRepository = manager.getRepository(ServiceRequestEntity)
        const request = await requestRepository.findOne({ where: { id: requestId }, lock: { mode: 'pessimistic_write' } })
        if (!request) notFound('Service request not found.')
        if (request.clientId !== user.id) forbidden('You do not have access to this service request.')
        if (!serviceRequestReschedulableStates.has(request.status)) conflict('This service request can no longer accept a reschedule decision.')
        const rescheduleRepository = manager.getRepository(AutoCareRescheduleRequestEntity)
        const pending = await rescheduleRepository.findOne({ where: { id: normalizedRescheduleId, requestId }, lock: { mode: 'pessimistic_write' } })
        if (!pending) conflict('This reschedule request is no longer active.')
        if (pending.status !== AutoCareRescheduleStatus.Pending) {
            if ((decision === 'accept' && pending.status === AutoCareRescheduleStatus.Accepted) || (decision === 'reject' && pending.status === AutoCareRescheduleStatus.Rejected)) return { request, reschedule: pending, changed: false }
            conflict('This reschedule request has already been resolved.')
        }
        if (decision === 'accept' && !canDecideAutoCareReschedule(request.status, pending.proposedAt)) conflict('The proposed visit time has passed.')
        pending.status = decision === 'accept' ? AutoCareRescheduleStatus.Accepted : AutoCareRescheduleStatus.Rejected
        pending.resolvedById = user.id
        pending.resolutionReason = normalizedReason.value
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
