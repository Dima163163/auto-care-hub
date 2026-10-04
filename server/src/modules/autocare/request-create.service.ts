import { randomUUID } from 'node:crypto'
import { AppDataSource } from '../../database/data-source.js'
import { isAutoCareCountryEnabled } from '../../config/enabled-market-countries.js'
import { AutomotiveProviderEntity, AutomotiveProviderStatus, AutomotiveBookingMode, AutomotiveMarketEntity, AutomotiveMarketCountryEntity, AutomotiveServiceDefinitionEntity, AutomotiveServiceLocationEntity, AutomotiveServiceOfferingEntity, ServiceRequestEntity, ServiceRequestStatus, ClientVehicleEntity } from '../../entities/index.js'
import { type UserEntity } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { normalizeIdempotencyKey } from '../../shared/http/idempotency-key.js'
import type { CreateAutoCareServiceRequestInput } from './autocare.types.js'
import { ensureAutoCareRequestChatThread } from './autocare-chat.service.js'
import { createAutoCareBookingSnapshot } from './booking-snapshot.js'
import { reserveAutoCareResources } from './capacity-resource.service.js'
import { normalizeAutoCareServiceRequestInput } from './request-input-policy.js'
import { LEGAL_DOCUMENT_VERSIONS, recordConsentWithManager } from '../users/user-consent.service.js'
import { UserConsentAction, UserConsentSource, UserConsentType } from '../../entities/user-consent/user-consent.entity.js'
import { isAutoCareVisitTimeBookable } from './request-lifecycle-policy.js'
import { assertAutoCareSlotCapacity } from './request-availability.service.js'
import { appendRepairEventWithManager, notifyAutoCareParticipant } from './request-effects.service.js'
import { clientOnly, notFound } from './request-errors.js'
import { isRequestIdempotencyUniqueError, isSameAutoCareServiceRequest, requestIdempotencyConflict } from './request-idempotency.js'
import { hydrateRequest } from './request-read.service.js'
import { requestResponse } from './request-response.js'
import { createOfferingSnapshot, createVehicleSnapshot } from './request-snapshots.js'

export async function createAutoCareServiceRequest(user: UserEntity, input: CreateAutoCareServiceRequestInput) {
    clientOnly(user)
    const normalizedInput = normalizeAutoCareServiceRequestInput(input)
    if (!normalizedInput) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Service request is invalid.' })
    const idempotencyKey = normalizeIdempotencyKey(normalizedInput.idempotencyKey)
    const providerRepository = AppDataSource.getRepository(AutomotiveProviderEntity)
    const locationRepository = AppDataSource.getRepository(AutomotiveServiceLocationEntity)
    const offeringRepository = AppDataSource.getRepository(AutomotiveServiceOfferingEntity)
    const definitionRepository = AppDataSource.getRepository(AutomotiveServiceDefinitionEntity)
    const requestRepository = AppDataSource.getRepository(ServiceRequestEntity)
    const vehicle = normalizedInput.vehicleId
        ? await AppDataSource.getRepository(ClientVehicleEntity).findOneBy({ id: normalizedInput.vehicleId, userId: user.id })
        : null
    if (normalizedInput.vehicleId && !vehicle) notFound('Selected vehicle was not found.')
    const vehicleSnapshot = vehicle ? createVehicleSnapshot(vehicle) : normalizedInput.vehicleSnapshot
    if (idempotencyKey) {
        const existing = await requestRepository.findOneBy({ clientId: user.id, idempotencyKey })
        if (existing) {
            if (!isSameAutoCareServiceRequest(existing, normalizedInput)) requestIdempotencyConflict()
            return hydrateRequest(existing)
        }
    }
    const provider = await providerRepository.findOneBy({ id: normalizedInput.providerId, status: AutomotiveProviderStatus.Active })
    if (!provider) notFound('Automotive provider not found.')
    const location = await locationRepository.findOneBy({ id: normalizedInput.locationId, providerId: provider.id })
    if (!location) notFound('Automotive service location not found.')
    const market = await AppDataSource.getRepository(AutomotiveMarketEntity).findOneBy({ id: location.marketId, launchReady: true })
    if (!market || !isAutoCareCountryEnabled(market.countryCode)) notFound('Automotive service market is not available.')
    const country = await AppDataSource.getRepository(AutomotiveMarketCountryEntity).findOneBy({ id: market.countryId, active: true })
    if (!country) notFound('Automotive service market is not available.')
    const offering = await offeringRepository.findOneBy({ id: normalizedInput.offeringId, locationId: location.id, active: true })
    if (!offering) notFound('Automotive service offering not found.')
    const definition = await definitionRepository.findOneBy({ id: offering.definitionId, active: true })
    if (!definition) notFound('Automotive service definition not found.')

    const preferredAt = new Date(normalizedInput.preferredAt)
    if (!isAutoCareVisitTimeBookable(preferredAt)) throw new AppError({ statusCode: 409, code: ERROR_CODES.SlotUnavailable, message: 'The selected visit time has passed or is too close to start. Choose another time.' })
    let savedRequest: ServiceRequestEntity
    try {
        savedRequest = await AppDataSource.transaction(async (manager) => {
            // Serialize with super-admin market/country updates. FOR SHARE
            // blocks their row UPDATE until this booking is persisted (and
            // makes a concurrent unpublish take effect for the next request).
            const lockedMarket = await manager.getRepository(AutomotiveMarketEntity).findOne({
                where: { id: location.marketId, launchReady: true },
                lock: { mode: 'pessimistic_read' },
            })
            if (!lockedMarket || !isAutoCareCountryEnabled(lockedMarket.countryCode)) notFound('Automotive service market is not available.')
            const lockedCountry = await manager.getRepository(AutomotiveMarketCountryEntity).findOne({
                where: { id: lockedMarket.countryId, active: true },
                lock: { mode: 'pessimistic_read' },
            })
            if (!lockedCountry) notFound('Automotive service market is not available.')
            if (!isAutoCareVisitTimeBookable(preferredAt)) throw new AppError({ statusCode: 409, code: ERROR_CODES.SlotUnavailable, message: 'The selected visit time has passed or is too close to start. Choose another time.' })
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
                contactSnapshot: normalizedInput.contactSnapshot,
                preferredAt,
                note: normalizedInput.note,
                idempotencyKey: idempotencyKey ?? null,
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
            if (input.dataProcessingConsent === true) {
                await recordConsentWithManager(manager, {
                    userId: user.id,
                    consentType: UserConsentType.ServiceRequest,
                    action: UserConsentAction.Granted,
                    documentVersion: LEGAL_DOCUMENT_VERSIONS.privacy,
                    source: UserConsentSource.ServiceRequest,
                    resourceId: createdRequest.id,
                    ipAddress: input.consentEvidence?.ipAddress,
                    userAgent: input.consentEvidence?.userAgent,
                })
            }
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
        if (!idempotencyKey || !isRequestIdempotencyUniqueError(error)) throw error
        const existing = await requestRepository.findOneBy({ clientId: user.id, idempotencyKey })
        if (existing && isSameAutoCareServiceRequest(existing, normalizedInput)) return hydrateRequest(existing)
        if (existing) requestIdempotencyConflict()
        throw error
    }
    return requestResponse(savedRequest, provider, location, definition, offering)
}
