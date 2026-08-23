import { In, IsNull, type QueryFailedError } from 'typeorm'

import { AppDataSource } from '../../database/data-source.js'
import {
    AutoCareBroadcastOfferEntity,
    AutoCareBroadcastRequestEntity,
    AutoCareExpertQuestionEntity,
    AutoCareGuaranteeClaimEntity,
    AutoCareFleetAccountEntity,
    AutoCareFleetVehicleEntity,
    AutoCarePriceBenchmarkEntity,
    AutoCareRepairEventEntity,
    AutoCareTrustEvidenceEntity,
    AutomotiveMarketEntity,
    AutomotiveProviderEntity,
    AutomotiveProviderMembershipEntity,
    AutomotiveProviderMembershipStatus,
    AutomotiveProviderStatus,
    AutomotiveServiceDefinitionEntity,
    AutomotiveServiceLocationEntity,
    AutomotiveServiceOfferingEntity,
    ServiceRequestEntity,
} from '../../entities/index.js'
import { UserRole, type UserEntity } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import type {
    AutoCareBroadcastOfferResponse,
    AutoCareBroadcastRequestResponse,
    AutoCareExpertQuestionResponse,
    AutoCareGuaranteeClaimResponse,
    AutoCarePriceBenchmarkResponse,
    AutoCareRepairEventResponse,
    AutoCareTrustEvidenceResponse,
    AutoCareTrustSnapshotResponse,
    AutoCareFleetResponse,
    AutoCareFleetVehicleResponse,
    CreateAutoCareBroadcastOfferInput,
    CreateAutoCareBroadcastRequestInput,
} from './autocare.types.js'
import { canManageProvider, getManagedProviderScopes, isManagedProviderLocationAllowed } from './provider-access.service.js'
import { reassessAutoCareProviderTrust } from './trust-score.service.js'

function forbidden(message: string): never {
    throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message })
}

function notFound(message: string): never {
    throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message })
}

function conflict(message: string): never {
    throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message })
}

function requireClient(user: UserEntity) {
    if (user.role !== UserRole.Client) forbidden('Only clients can use this workflow.')
}

function requireOwner(user: UserEntity) {
    if (user.role !== UserRole.Owner) forbidden('Only service owners can use this workflow.')
}

function isBroadcastOfferUniqueError(error: unknown) {
    const driverError = (error as QueryFailedError | undefined)?.driverError as
        | { code?: unknown; constraint?: unknown }
        | undefined
    return driverError?.code === '23505' && driverError.constraint === 'UQ_autocare_broadcast_offers_provider'
}

async function findDefinition(value: string) {
    const repository = AppDataSource.getRepository(AutomotiveServiceDefinitionEntity)
    const bySlug = await repository.findOneBy({ slug: value })
    return bySlug ?? (/^[0-9a-f-]{36}$/i.test(value) ? repository.findOneBy({ id: value }) : null)
}

async function findMarket(value?: string | null) {
    if (!value) return null
    const repository = AppDataSource.getRepository(AutomotiveMarketEntity)
    const byCode = await repository.findOneBy({ cityCode: value })
    if (byCode) return byCode
    return /^[0-9a-f-]{36}$/i.test(value) ? repository.findOneBy({ id: value }) : null
}

function toBenchmarkResponse(entity: AutoCarePriceBenchmarkEntity, definition: AutomotiveServiceDefinitionEntity): AutoCarePriceBenchmarkResponse {
    return {
        serviceDefinitionId: definition.id,
        serviceSlug: definition.slug,
        marketId: entity.marketId,
        makeId: entity.makeId,
        modelId: entity.modelId,
        minPriceMinor: entity.minPriceMinor,
        medianPriceMinor: entity.medianPriceMinor,
        maxPriceMinor: entity.maxPriceMinor,
        currencyCode: entity.currencyCode,
        methodology: entity.methodology,
        source: entity.source,
        generatedAt: entity.updatedAt.toISOString(),
    }
}

export async function getAutoCareFairPrice(input: { serviceId: string; marketId?: string; makeId?: string; modelId?: string; fuelType?: string; engineLiters?: number }) {
    const definition = await findDefinition(input.serviceId)
    if (!definition) return null
    const market = await findMarket(input.marketId)
    const benchmarkRepository = AppDataSource.getRepository(AutoCarePriceBenchmarkEntity)
    const benchmarks = await benchmarkRepository.find({ where: { serviceDefinitionId: definition.id, active: true } })
    const exact = benchmarks.find((item) =>
        (item.marketId === (market?.id ?? null)) &&
        (item.makeId === (input.makeId ?? null)) &&
        (item.modelId === (input.modelId ?? null)) &&
        (item.fuelType === (input.fuelType ?? null)) &&
        (item.engineLiters === (input.engineLiters ?? null)),
    )
    if (exact) return toBenchmarkResponse(exact, definition)

    const locationRepository = AppDataSource.getRepository(AutomotiveServiceLocationEntity)
    const locations = await locationRepository.find({ where: market ? { marketId: market.id } : undefined })
    const offers = await AppDataSource.getRepository(AutomotiveServiceOfferingEntity).find({
        where: { definitionId: definition.id, active: true, ...(locations.length > 0 ? { locationId: In(locations.map((location) => location.id)) } : {}) },
    })
    if (offers.length === 0) return null
    const prices = offers.map((offer) => offer.priceFromMinor).sort((left, right) => left - right)
    const minPriceMinor = prices[0]!
    const maxPriceMinor = prices.at(-1)!
    const medianPriceMinor = prices[Math.floor(prices.length / 2)]!
    return {
        serviceDefinitionId: definition.id,
        serviceSlug: definition.slug,
        marketId: market?.id ?? null,
        makeId: input.makeId ?? null,
        modelId: input.modelId ?? null,
        minPriceMinor,
        medianPriceMinor,
        maxPriceMinor,
        currencyCode: offers[0]!.currencyCode,
        methodology: {
            kind: 'provider-offer-derived',
            sampleSize: offers.length,
            disclaimer: 'Ориентир построен по опубликованным предложениям и не заменяет смету после диагностики.',
        },
        source: 'autocare-provider-offers',
        generatedAt: new Date().toISOString(),
    } satisfies AutoCarePriceBenchmarkResponse
}

export async function getAutoCareProviderTrust(providerId: string) {
    const result = await reassessAutoCareProviderTrust(providerId)
    if (!result || result.provider.status !== AutomotiveProviderStatus.Active) notFound('Automotive provider not found.')
    const provider = result.provider
    const evidence = await AppDataSource.getRepository(AutoCareTrustEvidenceEntity).find({
        where: { providerId },
        order: { createdAt: 'DESC' },
    })
    return {
        providerId,
        score: result.trust.score,
        badge: result.trust.badge,
        reassessedAt: provider.trustReassessedAt?.toISOString() ?? null,
        evidence: evidence.map((item): AutoCareTrustEvidenceResponse => ({
            id: item.id,
            providerId: item.providerId,
            kind: item.kind,
            label: item.label,
            status: item.status,
            expiresAt: item.expiresAt?.toISOString() ?? null,
            verifiedAt: item.verifiedAt?.toISOString() ?? null,
        })),
        snapshots: result.snapshots.map((item): AutoCareTrustSnapshotResponse => ({
            id: item.id,
            providerId: item.providerId,
            locationId: item.locationId,
            policyVersion: item.policyVersion,
            score: Number(item.score),
            badge: item.badge,
            computedAt: item.computedAt.toISOString(),
            validUntil: item.validUntil.toISOString(),
            inputCounters: item.inputCounters,
            reasonCodes: item.reasonCodes,
        })),
        factors: result.trust.factors,
        explanation: 'Оценка доверия складывается из заполненности профиля, подтверждённых документов, качества обслуживания, отзывов и соблюдения заявленных условий. Открытые гарантийные обращения снижают итоговый балл до их решения.',
    }
}

function toRepairEventResponse(entity: AutoCareRepairEventEntity): AutoCareRepairEventResponse {
    return { id: entity.id, requestId: entity.requestId, eventType: entity.eventType, actorId: entity.actorId, title: entity.title, notes: entity.notes, metadata: entity.metadata, createdAt: entity.createdAt.toISOString() }
}

export async function appendAutoCareRepairEvent(input: { requestId: string; actorId?: string | null; eventType: string; title: string; notes?: string | null; metadata?: Record<string, unknown> }) {
    const event = await AppDataSource.getRepository(AutoCareRepairEventEntity).save(AppDataSource.getRepository(AutoCareRepairEventEntity).create({ ...input, actorId: input.actorId ?? null, notes: input.notes ?? null, metadata: input.metadata ?? {} }))
    return toRepairEventResponse(event)
}

export async function getAutoCareRepairTimeline(user: UserEntity, requestId: string) {
    const request = await AppDataSource.getRepository(ServiceRequestEntity).findOneBy({ id: requestId })
    if (!request) notFound('Service request not found.')
    if (request.clientId !== user.id) {
        const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: request.providerId })
        if (user.role !== UserRole.Owner || !provider || !(await canManageProvider(user.id, provider.id, request.locationId))) forbidden('You do not have access to this repair timeline.')
    }
    return (await AppDataSource.getRepository(AutoCareRepairEventEntity).find({ where: { requestId }, order: { createdAt: 'ASC' } })).map(toRepairEventResponse)
}

function toBroadcastOfferResponse(entity: AutoCareBroadcastOfferEntity, provider: AutomotiveProviderEntity, location: AutomotiveServiceLocationEntity): AutoCareBroadcastOfferResponse {
    return { id: entity.id, broadcastRequestId: entity.broadcastRequestId, providerId: entity.providerId, providerName: provider.name, locationId: entity.locationId, address: location.address, offerSnapshot: entity.offerSnapshot, status: entity.status, createdAt: entity.createdAt.toISOString() }
}

export async function createAutoCareBroadcastRequest(user: UserEntity, input: CreateAutoCareBroadcastRequestInput): Promise<AutoCareBroadcastRequestResponse> {
    requireClient(user)
    const definition = await findDefinition(input.serviceDefinitionId)
    if (!definition) notFound('Service definition not found.')
    const market = await findMarket(input.marketId)
    const request = await AppDataSource.getRepository(AutoCareBroadcastRequestEntity).save(AppDataSource.getRepository(AutoCareBroadcastRequestEntity).create({
        clientId: user.id,
        serviceDefinitionId: definition.id,
        marketId: market?.id ?? null,
        issueDescription: input.issueDescription,
        vehicleSnapshot: input.vehicleSnapshot ?? null,
        photoUrls: input.photoUrls ?? [],
        preferredAt: input.preferredAt ? new Date(input.preferredAt) : null,
        maxProviders: input.maxProviders ?? 5,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        status: 'open',
    }))
    return getAutoCareBroadcastRequest(user, request.id)
}

async function getBroadcastOrThrow(id: string) {
    const request = await AppDataSource.getRepository(AutoCareBroadcastRequestEntity).findOneBy({ id })
    if (!request) notFound('Broadcast request not found.')
    return request
}

export async function assertOwnerBroadcastAccess(user: UserEntity, request: AutoCareBroadcastRequestEntity) {
    if (request.clientId === user.id || user.role === UserRole.Admin || user.role === UserRole.SuperAdmin) return
    if (user.role !== UserRole.Owner) forbidden('You do not have access to this broadcast request.')

    const managedScopes = await getManagedProviderScopes(user.id)
    const managedProviderIds = managedScopes.map(({ providerId }) => providerId)
    const providers = managedProviderIds.length === 0
        ? []
        : await AppDataSource.getRepository(AutomotiveProviderEntity).find({ where: { id: In(managedProviderIds), status: AutomotiveProviderStatus.Active } })
    if (providers.length === 0) forbidden('You do not have access to this broadcast request.')

    const providerIds = providers.map((provider) => provider.id)
    const locations = await AppDataSource.getRepository(AutomotiveServiceLocationEntity).find({
        where: { providerId: In(providerIds) },
    })
    const locationIds = locations
        .filter((location) => isManagedProviderLocationAllowed(managedScopes, location.providerId, location.id))
        .map((location) => location.id)
    if (locationIds.length === 0) forbidden('You do not have access to this broadcast request.')

    // An owner may inspect a request only if their provider already submitted
    // an offer, or while it is open and they publish the requested service at
    // one of their own locations. This keeps the direct-ID endpoint from
    // becoming a client/vehicle/offer directory.
    const existingOffer = await AppDataSource.getRepository(AutoCareBroadcastOfferEntity).findOne({
        where: { broadcastRequestId: request.id, providerId: In(providerIds) },
    })
    if (existingOffer) return
    if (request.status !== 'open' || request.expiresAt <= new Date()) forbidden('You do not have access to this broadcast request.')

    const matchingOffering = await AppDataSource.getRepository(AutomotiveServiceOfferingEntity).findOne({
        where: { definitionId: request.serviceDefinitionId, locationId: In(locationIds), active: true },
    })
    if (!matchingOffering) forbidden('You do not have access to this broadcast request.')
}

export async function getAutoCareBroadcastRequest(user: UserEntity, broadcastId: string): Promise<AutoCareBroadcastRequestResponse> {
    const request = await getBroadcastOrThrow(broadcastId)
    await assertOwnerBroadcastAccess(user, request)
    const definition = await AppDataSource.getRepository(AutomotiveServiceDefinitionEntity).findOneBy({ id: request.serviceDefinitionId })
    if (!definition) notFound('Service definition not found.')
    const ownedScopes = user.role === UserRole.Owner ? await getManagedProviderScopes(user.id) : null
    const ownedProviderIds = ownedScopes?.map(({ providerId }) => providerId) ?? null
    const offers = await AppDataSource.getRepository(AutoCareBroadcastOfferEntity).find({
        where: ownedProviderIds ? { broadcastRequestId: request.id, providerId: In(ownedProviderIds) } : { broadcastRequestId: request.id },
        order: { createdAt: 'ASC' },
    })
    const visibleOffers = ownedScopes
        ? offers.filter((offer) => isManagedProviderLocationAllowed(ownedScopes, offer.providerId, offer.locationId))
        : offers
    const providers = await AppDataSource.getRepository(AutomotiveProviderEntity).find({ where: { id: In(visibleOffers.map((offer) => offer.providerId)) } })
    const locations = await AppDataSource.getRepository(AutomotiveServiceLocationEntity).find({ where: { id: In(visibleOffers.map((offer) => offer.locationId)) } })
    const providerById = new Map(providers.map((provider) => [provider.id, provider]))
    const locationById = new Map(locations.map((location) => [location.id, location]))
    return {
        id: request.id,
        serviceDefinitionId: request.serviceDefinitionId,
        serviceSlug: definition.slug,
        marketId: request.marketId,
        issueDescription: request.issueDescription,
        vehicleSnapshot: request.vehicleSnapshot as AutoCareBroadcastRequestResponse['vehicleSnapshot'],
        preferredAt: request.preferredAt?.toISOString() ?? null,
        status: request.status,
        maxProviders: request.maxProviders,
        expiresAt: request.expiresAt.toISOString(),
        createdAt: request.createdAt.toISOString(),
        offers: visibleOffers.flatMap((offer) => {
            const provider = providerById.get(offer.providerId)
            const location = locationById.get(offer.locationId)
            return provider && location ? [toBroadcastOfferResponse(offer, provider, location)] : []
        }),
    }
}

export async function getMyAutoCareBroadcastRequests(user: UserEntity) {
    requireClient(user)
    const requests = await AppDataSource.getRepository(AutoCareBroadcastRequestEntity).find({ where: { clientId: user.id }, order: { createdAt: 'DESC' } })
    return Promise.all(requests.map((request) => getAutoCareBroadcastRequest(user, request.id)))
}

export async function getOwnerAutoCareBroadcastRequests(user: UserEntity) {
    requireOwner(user)
    const scopes = await getManagedProviderScopes(user.id)
    const providerIds = scopes.map(({ providerId }) => providerId)
    const providers = providerIds.length === 0
        ? []
        : await AppDataSource.getRepository(AutomotiveProviderEntity).find({ where: { id: In(providerIds) } })
    const locations = (await AppDataSource.getRepository(AutomotiveServiceLocationEntity).find({ where: { providerId: In(providers.map((provider) => provider.id)) } }))
        .filter((location) => isManagedProviderLocationAllowed(scopes, location.providerId, location.id))
    const requests = await AppDataSource.getRepository(AutoCareBroadcastRequestEntity).find({ where: { status: 'open' }, order: { createdAt: 'DESC' }, take: 100 })
    if (locations.length === 0 || requests.length === 0) return []
    const definitionIds = new Set(requests.map((request) => request.serviceDefinitionId))
    const offers = await AppDataSource.getRepository(AutomotiveServiceOfferingEntity).find({ where: { definitionId: In([...definitionIds]), locationId: In(locations.map((location) => location.id)), active: true } })
    const eligibleDefinitions = new Set(offers.map((offer) => offer.definitionId))
    return Promise.all(requests
        .filter((request) => (!request.expiresAt || request.expiresAt > new Date()) && eligibleDefinitions.has(request.serviceDefinitionId))
        .map((request) => getAutoCareBroadcastRequest(user, request.id)))
}

export async function createAutoCareBroadcastOffer(user: UserEntity, broadcastId: string, input: CreateAutoCareBroadcastOfferInput) {
    requireOwner(user)
    try {
        const result = await AppDataSource.transaction(async (manager) => {
            const request = await manager.getRepository(AutoCareBroadcastRequestEntity).findOne({
                where: { id: broadcastId },
                lock: { mode: 'pessimistic_write' },
            })
            if (!request) notFound('Broadcast request not found.')
            if (request.status !== 'open' || request.expiresAt <= new Date()) conflict('This broadcast request is no longer accepting offers.')

            const location = await manager.getRepository(AutomotiveServiceLocationEntity).findOneBy({ id: input.locationId })
            if (!location) notFound('Provider location not found.')
            const provider = await manager.getRepository(AutomotiveProviderEntity).findOneBy({ id: location.providerId, status: AutomotiveProviderStatus.Active })
            const membership = provider
                ? await manager.getRepository(AutomotiveProviderMembershipEntity).findOne({ where: [
                    { providerId: provider.id, userId: user.id, locationId: IsNull(), status: AutomotiveProviderMembershipStatus.Active },
                    { providerId: provider.id, userId: user.id, locationId: location.id, status: AutomotiveProviderMembershipStatus.Active },
                ] })
                : null
            if (!provider || (provider.ownerId !== user.id && !membership)) forbidden('This location is not managed by the current owner.')
            const definitionOffer = await manager.getRepository(AutomotiveServiceOfferingEntity).findOneBy({ locationId: location.id, definitionId: request.serviceDefinitionId, active: true })
            if (!definitionOffer) conflict('This provider does not publish the requested service at this location.')

            const repository = manager.getRepository(AutoCareBroadcastOfferEntity)
            const existing = await repository.findOneBy({ broadcastRequestId: request.id, providerId: provider.id })
            if (existing) conflict('This provider has already sent an offer.')
            const offerCount = await repository.countBy({ broadcastRequestId: request.id })
            if (offerCount >= request.maxProviders) conflict('This broadcast request has reached its provider limit.')
            const offer = await repository.save(repository.create({
                broadcastRequestId: request.id,
                providerId: provider.id,
                locationId: location.id,
                offerSnapshot: { amountMinor: input.amountMinor, currencyCode: input.currencyCode, note: input.note ?? null, durationMinutes: input.durationMinutes ?? definitionOffer.durationMinutes, validUntil: input.validUntil ?? null },
                status: 'pending',
            }))
            return { offer, provider, location }
        })
        return toBroadcastOfferResponse(result.offer, result.provider, result.location)
    } catch (error) {
        if (isBroadcastOfferUniqueError(error)) conflict('This provider has already sent an offer.')
        throw error
    }
}

export async function createAutoCareGuaranteeClaim(user: UserEntity, input: { requestId: string; claimType: string; summary: string; evidenceUrls?: string[] }): Promise<AutoCareGuaranteeClaimResponse> {
    requireClient(user)
    const request = await AppDataSource.getRepository(ServiceRequestEntity).findOneBy({ id: input.requestId, clientId: user.id })
    if (!request) notFound('Service request not found.')
    const claim = await AppDataSource.getRepository(AutoCareGuaranteeClaimEntity).save(AppDataSource.getRepository(AutoCareGuaranteeClaimEntity).create({ requestId: request.id, clientId: user.id, providerId: request.providerId, claimType: input.claimType, summary: input.summary, evidenceUrls: input.evidenceUrls ?? [], status: 'submitted', resolution: null, resolvedById: null, resolvedAt: null }))
    return { id: claim.id, requestId: claim.requestId, claimType: claim.claimType, status: claim.status, summary: claim.summary, evidenceUrls: claim.evidenceUrls, resolution: claim.resolution, createdAt: claim.createdAt.toISOString(), updatedAt: claim.updatedAt.toISOString() }
}

export async function getMyAutoCareGuaranteeClaims(user: UserEntity) {
    requireClient(user)
    return (await AppDataSource.getRepository(AutoCareGuaranteeClaimEntity).find({ where: { clientId: user.id }, order: { createdAt: 'DESC' } })).map((claim) => ({ id: claim.id, requestId: claim.requestId, claimType: claim.claimType, status: claim.status, summary: claim.summary, evidenceUrls: claim.evidenceUrls, resolution: claim.resolution, createdAt: claim.createdAt.toISOString(), updatedAt: claim.updatedAt.toISOString() }))
}

export async function createAutoCareExpertQuestion(user: UserEntity, input: { symptoms: string; categorySlug?: string | null; vehicleSnapshot?: Record<string, unknown> | null }) {
    requireClient(user)
    const question = await AppDataSource.getRepository(AutoCareExpertQuestionEntity).save(AppDataSource.getRepository(AutoCareExpertQuestionEntity).create({ clientId: user.id, symptoms: input.symptoms, categorySlug: input.categorySlug ?? null, vehicleSnapshot: input.vehicleSnapshot ?? null, status: 'open', answer: null, answeredById: null, answeredAt: null }))
    return toExpertQuestionResponse(question)
}

function toExpertQuestionResponse(question: AutoCareExpertQuestionEntity): AutoCareExpertQuestionResponse {
    return { id: question.id, symptoms: question.symptoms, categorySlug: question.categorySlug, vehicleSnapshot: question.vehicleSnapshot as AutoCareExpertQuestionResponse['vehicleSnapshot'], status: question.status, answer: question.answer, createdAt: question.createdAt.toISOString(), answeredAt: question.answeredAt?.toISOString() ?? null }
}

export async function getMyAutoCareExpertQuestions(user: UserEntity) {
    requireClient(user)
    return (await AppDataSource.getRepository(AutoCareExpertQuestionEntity).find({ where: { clientId: user.id }, order: { createdAt: 'DESC' } })).map(toExpertQuestionResponse)
}

function toFleetVehicleResponse(vehicle: AutoCareFleetVehicleEntity): AutoCareFleetVehicleResponse {
    return { id: vehicle.id, fleetId: vehicle.fleetId, label: vehicle.label, vehicleSnapshot: vehicle.vehicleSnapshot, approvalPolicy: vehicle.approvalPolicy, createdAt: vehicle.createdAt.toISOString() }
}

export async function getMyAutoCareFleets(user: UserEntity): Promise<AutoCareFleetResponse[]> {
    requireOwner(user)
    const fleets = await AppDataSource.getRepository(AutoCareFleetAccountEntity).find({ where: { ownerId: user.id }, order: { createdAt: 'DESC' } })
    const vehicles = fleets.length === 0 ? [] : await AppDataSource.getRepository(AutoCareFleetVehicleEntity).find({ where: { fleetId: In(fleets.map((fleet) => fleet.id)) }, order: { createdAt: 'ASC' } })
    const vehiclesByFleet = new Map<string, AutoCareFleetVehicleResponse[]>()
    vehicles.forEach((vehicle) => vehiclesByFleet.set(vehicle.fleetId, [...(vehiclesByFleet.get(vehicle.fleetId) ?? []), toFleetVehicleResponse(vehicle)]))
    return fleets.map((fleet) => ({ id: fleet.id, name: fleet.name, notes: fleet.notes, vehicles: vehiclesByFleet.get(fleet.id) ?? [], createdAt: fleet.createdAt.toISOString(), updatedAt: fleet.updatedAt.toISOString() }))
}

export async function createAutoCareFleet(user: UserEntity, input: { name: string; notes?: string | null }): Promise<AutoCareFleetResponse> {
    requireOwner(user)
    const fleet = await AppDataSource.getRepository(AutoCareFleetAccountEntity).save(AppDataSource.getRepository(AutoCareFleetAccountEntity).create({ ownerId: user.id, name: input.name, notes: input.notes ?? null }))
    return { id: fleet.id, name: fleet.name, notes: fleet.notes, vehicles: [], createdAt: fleet.createdAt.toISOString(), updatedAt: fleet.updatedAt.toISOString() }
}

export async function createAutoCareFleetVehicle(user: UserEntity, fleetId: string, input: { label: string; vehicleSnapshot: Record<string, unknown>; approvalPolicy?: string | null }): Promise<AutoCareFleetVehicleResponse> {
    requireOwner(user)
    const fleet = await AppDataSource.getRepository(AutoCareFleetAccountEntity).findOneBy({ id: fleetId, ownerId: user.id })
    if (!fleet) notFound('Fleet account not found.')
    const vehicle = await AppDataSource.getRepository(AutoCareFleetVehicleEntity).save(AppDataSource.getRepository(AutoCareFleetVehicleEntity).create({ fleetId, label: input.label, vehicleSnapshot: input.vehicleSnapshot, approvalPolicy: input.approvalPolicy ?? null }))
    return toFleetVehicleResponse(vehicle)
}
