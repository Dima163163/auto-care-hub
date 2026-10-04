import { In } from 'typeorm'
import { AppDataSource } from '../../database/data-source.js'
import { AutomotiveProviderEntity, AutomotiveProviderStatus, AutomotiveBookingMode, AutomotiveServiceDefinitionEntity, AutomotiveServiceLocationEntity, AutomotiveServiceOfferingEntity, AutoCareCapacityResourceEntity, AutoCareCapacityResourceType } from '../../entities/index.js'
import { type UserEntity } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { hasProviderWorkspacePermission } from './provider-access.service.js'
import { toOfferResponse, toProviderResponse } from './autocare.mappers.js'
import { normalizeAutoCareCommunicationProviderUuid, normalizeAutoCareCommunicationSettingsInput } from './communication-input-policy.js'
import { areAutoCareOfferResourcesCompatible, normalizeAutoCareOfferProviderUuid, normalizeAutoCareOfferUuid, normalizeOwnerAutoCareOfferInput } from './owner-offer-input-policy.js'
import type { UpdateAutoCareCommunicationSettingsInput } from './autocare.types.js'
import { assertOwner } from './provider-guards.js'

export async function updateOwnerAutoCareOffer(owner: UserEntity, providerId: string, offerId: string, input: { description: string | null; priceFromMinor: number; bookingMode?: 'request' | 'instant'; requiredResourceTypes?: AutoCareCapacityResourceType[]; requiredResourceIds?: string[] }) {
    const normalizedProviderId = normalizeAutoCareOfferProviderUuid(providerId)
    const normalizedOfferId = normalizeAutoCareOfferUuid(offerId)
    const normalizedInput = normalizeOwnerAutoCareOfferInput(input)
    if (!normalizedProviderId || !normalizedOfferId) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Provider and offer ids must be valid UUIDs.' })
    if (!normalizedInput) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Offer update payload is invalid.' })
    const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: normalizedProviderId })
    if (!provider || provider.status === AutomotiveProviderStatus.Suspended) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive service provider not found.' })

    const offeringRepository = AppDataSource.getRepository(AutomotiveServiceOfferingEntity)
    const offering = await offeringRepository.findOne({ where: { id: normalizedOfferId, active: true } })
    if (!offering) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive service offer not found.' })
    const location = await AppDataSource.getRepository(AutomotiveServiceLocationEntity).findOneBy({ id: offering.locationId, providerId: normalizedProviderId })
    if (!location || !(await hasProviderWorkspacePermission(owner.id, normalizedProviderId, 'catalog', location.id))) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive service offer not found.' })

    const definition = await AppDataSource.getRepository(AutomotiveServiceDefinitionEntity).findOneBy({ id: offering.definitionId })
    if (!definition) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive service definition not found.' })

    offering.description = normalizedInput.description
    offering.priceFromMinor = normalizedInput.priceFromMinor
    if (normalizedInput.bookingMode) offering.bookingMode = normalizedInput.bookingMode === 'instant' ? AutomotiveBookingMode.Instant : AutomotiveBookingMode.Request
    if (normalizedInput.requiredResourceTypes !== undefined) offering.requiredResourceTypes = normalizedInput.requiredResourceTypes
    if (normalizedInput.requiredResourceIds !== undefined) {
        const resourceIds = normalizedInput.requiredResourceIds
        const resources = resourceIds.length > 0
            ? await AppDataSource.getRepository(AutoCareCapacityResourceEntity).findBy({ id: In(resourceIds), providerId: normalizedProviderId, locationId: location.id, active: true })
            : []
        if (resources.length !== resourceIds.length) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Every selected resource must be active at the offer location.' })
        if (!areAutoCareOfferResourcesCompatible(resources, normalizedInput.requiredResourceTypes)) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Selected resources must match the offer resource types.' })
        offering.requiredResourceIds = resourceIds
    }
    if (offering.priceToMinor !== null && offering.priceToMinor < normalizedInput.priceFromMinor) offering.priceToMinor = normalizedInput.priceFromMinor
    const savedOffering = await offeringRepository.save(offering)
    return toOfferResponse(savedOffering, definition)
}

export async function updateOwnerAutoCareCommunicationSettings(owner: UserEntity, providerId: string, input: UpdateAutoCareCommunicationSettingsInput) {
    const normalizedProviderId = normalizeAutoCareCommunicationProviderUuid(providerId)
    const normalizedInput = normalizeAutoCareCommunicationSettingsInput(input)
    if (!normalizedProviderId) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Provider id must be a valid UUID.' })
    if (!normalizedInput) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Communication settings payload is invalid.' })
    assertOwner(owner)
    const providerRepository = AppDataSource.getRepository(AutomotiveProviderEntity)
    const provider = await providerRepository.findOneBy({ id: normalizedProviderId, ownerId: owner.id })
    if (!provider) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive provider not found.' })

    Object.assign(provider, normalizedInput)
    const savedProvider = await providerRepository.save(provider)
    const location = await AppDataSource.getRepository(AutomotiveServiceLocationEntity).findOne({ where: { providerId: savedProvider.id }, order: { id: 'ASC' } })
    if (!location) throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message: 'Automotive provider has no service location.' })
    return toProviderResponse(savedProvider, location)
}
