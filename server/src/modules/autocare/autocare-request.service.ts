import { In } from 'typeorm'

import { AppDataSource } from '../../database/data-source.js'
import {
    AutomotiveProviderEntity,
    AutomotiveProviderStatus,
    AutomotiveServiceDefinitionEntity,
    AutomotiveServiceLocationEntity,
    AutomotiveServiceOfferingEntity,
    ServiceRequestEntity,
    ServiceRequestStatus,
} from '../../entities/index.js'
import { UserRole, type UserEntity } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import type {
    AutoCareServiceRequestResponse,
    CreateAutoCareServiceRequestInput,
} from './autocare.types.js'

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

function requestResponse(
    request: ServiceRequestEntity,
    provider: AutomotiveProviderEntity,
    location: AutomotiveServiceLocationEntity,
    definition: AutomotiveServiceDefinitionEntity,
    offering: AutomotiveServiceOfferingEntity | null,
): AutoCareServiceRequestResponse {
    return {
        id: request.id,
        providerId: provider.id,
        providerName: provider.name,
        locationId: location.id,
        address: location.address,
        definitionId: definition.id,
        serviceSlug: definition.slug,
        serviceLabels: definition.labels,
        offeringId: offering?.id ?? null,
        priceFromMinor: offering?.priceFromMinor ?? null,
        currencyCode: offering?.currencyCode ?? null,
        preferredAt: request.preferredAt?.toISOString() ?? null,
        vehicleSnapshot: request.vehicleSnapshot as AutoCareServiceRequestResponse['vehicleSnapshot'],
        contactSnapshot: request.contactSnapshot as AutoCareServiceRequestResponse['contactSnapshot'],
        note: request.note,
        status: request.status,
        clientConfirmedAt: request.clientConfirmedAt?.toISOString() ?? null,
        providerConfirmedAt: request.providerConfirmedAt?.toISOString() ?? null,
        createdAt: request.createdAt.toISOString(),
        updatedAt: request.updatedAt.toISOString(),
    }
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
    const provider = await providerRepository.findOneBy({ id: input.providerId, status: AutomotiveProviderStatus.Active })
    if (!provider) notFound('Automotive provider not found.')
    const location = await locationRepository.findOneBy({ id: input.locationId, providerId: provider.id })
    if (!location) notFound('Automotive service location not found.')
    const offering = await offeringRepository.findOneBy({ id: input.offeringId, locationId: location.id, active: true })
    if (!offering) notFound('Automotive service offering not found.')
    const definition = await definitionRepository.findOneBy({ id: offering.definitionId, active: true })
    if (!definition) notFound('Automotive service definition not found.')

    const request = await AppDataSource.getRepository(ServiceRequestEntity).save(AppDataSource.getRepository(ServiceRequestEntity).create({
        clientId: user.id,
        providerId: provider.id,
        locationId: location.id,
        definitionId: definition.id,
        offeringId: offering.id,
        vehicleSnapshot: input.vehicleSnapshot ?? null,
        contactSnapshot: input.contactSnapshot,
        preferredAt: new Date(input.preferredAt),
        note: input.note ?? null,
        status: ServiceRequestStatus.AwaitingReply,
        clientConfirmedAt: new Date(),
        providerConfirmedAt: null,
    }))
    return requestResponse(request, provider, location, definition, offering)
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

export async function confirmAutoCareServiceRequest(user: UserEntity, requestId: string) {
    clientOnly(user)
    const request = await getRequest(requestId)
    if (request.clientId !== user.id) throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'You do not have access to this service request.' })
    if ([ServiceRequestStatus.Declined, ServiceRequestStatus.Closed].includes(request.status)) conflict('This service request can no longer be confirmed.')
    request.clientConfirmedAt ??= new Date()
    await AppDataSource.getRepository(ServiceRequestEntity).save(request)
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
    return hydrateRequest(request)
}
