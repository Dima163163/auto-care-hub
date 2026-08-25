import { In } from 'typeorm'

import { AppDataSource } from '../../database/data-source.js'
import {
    AutomotiveProviderEntity,
    AutomotiveProviderFavoriteEntity,
    AutomotiveProviderStatus,
    AutomotiveServiceDefinitionEntity,
    AutomotiveServiceLocationEntity,
    AutomotiveServiceOfferingEntity,
    type UserEntity,
} from '../../entities/index.js'
import { UserRole } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { toOfferResponse, toProviderResponse } from './autocare.mappers.js'

export type AutoCareFavoriteResponse = {
    id: string
    providerId: string
    locationId: string
    createdAt: string
    provider: ReturnType<typeof toProviderResponse>
    offer: ReturnType<typeof toOfferResponse> | null
}

function assertClient(user: UserEntity) {
    if (user.role !== UserRole.Client) {
        throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'Only clients can save automotive providers.' })
    }
}

async function getFavoriteResponse(favorite: AutomotiveProviderFavoriteEntity): Promise<AutoCareFavoriteResponse | null> {
    const providerRepository = AppDataSource.getRepository(AutomotiveProviderEntity)
    const locationRepository = AppDataSource.getRepository(AutomotiveServiceLocationEntity)
    const definitionRepository = AppDataSource.getRepository(AutomotiveServiceDefinitionEntity)
    const offeringRepository = AppDataSource.getRepository(AutomotiveServiceOfferingEntity)
    const provider = await providerRepository.findOneBy({ id: favorite.providerId, status: AutomotiveProviderStatus.Active })
    const location = provider
        ? await locationRepository.findOneBy({ id: favorite.locationId, providerId: provider.id })
        : null
    if (!provider || !location) return null

    const offering = await offeringRepository.findOne({
        where: { locationId: location.id, active: true },
        order: { priceFromMinor: 'ASC', id: 'ASC' },
    })
    const definition = offering ? await definitionRepository.findOneBy({ id: offering.definitionId, active: true }) : null
    return {
        id: favorite.id,
        providerId: provider.id,
        locationId: location.id,
        createdAt: favorite.createdAt.toISOString(),
        provider: toProviderResponse(provider, location),
        offer: offering ? toOfferResponse(offering, definition ?? undefined) : null,
    }
}

export async function getMyAutoCareFavorites(user: UserEntity) {
    assertClient(user)
    const favorites = await AppDataSource.getRepository(AutomotiveProviderFavoriteEntity).find({
        where: { userId: user.id },
        order: { createdAt: 'DESC', id: 'DESC' },
    })
    const responses = await Promise.all(favorites.map(getFavoriteResponse))
    const staleIds = favorites.filter((_favorite, index) => responses[index] === null).map((favorite) => favorite.id)
    if (staleIds.length > 0) await AppDataSource.getRepository(AutomotiveProviderFavoriteEntity).delete({ id: In(staleIds) })
    return responses.filter((item): item is AutoCareFavoriteResponse => item !== null)
}

export async function addAutoCareFavorite(user: UserEntity, providerId: string, locationId?: string) {
    assertClient(user)
    const providerRepository = AppDataSource.getRepository(AutomotiveProviderEntity)
    const locationRepository = AppDataSource.getRepository(AutomotiveServiceLocationEntity)
    const provider = await providerRepository.findOneBy({ id: providerId, status: AutomotiveProviderStatus.Active })
    if (!provider) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive provider not found.' })
    const location = locationId
        ? await locationRepository.findOneBy({ id: locationId, providerId: provider.id })
        : (await locationRepository.find({ where: { providerId: provider.id }, order: { id: 'ASC' }, take: 1 }))[0]
    if (!location) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive provider location not found.' })

    const repository = AppDataSource.getRepository(AutomotiveProviderFavoriteEntity)
    await repository.upsert(
        { userId: user.id, providerId: provider.id, locationId: location.id },
        { conflictPaths: ['userId', 'providerId'] },
    )
    const saved = await repository.findOneBy({ userId: user.id, providerId: provider.id })
    const response = saved ? await getFavoriteResponse(saved) : null
    if (!response) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive provider favorite could not be loaded.' })
    return response
}

export async function removeAutoCareFavorite(user: UserEntity, providerId: string) {
    assertClient(user)
    await AppDataSource.getRepository(AutomotiveProviderFavoriteEntity).delete({ userId: user.id, providerId })
    return { success: true as const }
}

export async function syncAutoCareFavorites(user: UserEntity, providerIds: string[]) {
    assertClient(user)
    const uniqueProviderIds = [...new Set(providerIds)]
    for (const providerId of uniqueProviderIds) {
        await addAutoCareFavorite(user, providerId)
    }
    return getMyAutoCareFavorites(user)
}
