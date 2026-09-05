import { In } from 'typeorm'

import { AppDataSource } from '../../database/data-source.js'
import { CabinetEntity, CabinetStatus } from '../../entities/cabinet/cabinet.entity.js'
import { FavoriteCabinetEntity } from '../../entities/favorite-cabinet/favorite-cabinet.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { toPublicCabinet } from '../cabinets/cabinets.mappers.js'
import { getCabinetImageManifestMap } from '../cabinets/cabinet-image-manifest-store.js'
import type { PublicCabinet } from '../cabinets/cabinets.types.js'
import type { UserEntity } from '../../entities/user/user.entity.js'
import {
    MAX_FAVORITES_PER_USER,
    normalizeFavoriteCabinetId,
    normalizeFavoriteCabinetIds,
} from './favorites-policy.js'

export type FavoriteCabinetsResponse = {
    items: PublicCabinet[]
}

function cabinetNotFound(): never {
    throw new AppError({
        statusCode: 404,
        code: ERROR_CODES.NotFound,
        message: 'Cabinet not found.',
    })
}

async function getActiveCabinet(cabinetId: string) {
    const cabinet = await AppDataSource.getRepository(CabinetEntity).findOne({
        where: {
            id: cabinetId,
            status: CabinetStatus.Active,
        },
    })

    if (!cabinet) {
        cabinetNotFound()
    }

    return cabinet
}

export async function getFavoriteCabinets(user: UserEntity): Promise<FavoriteCabinetsResponse> {
    const favorites = await AppDataSource.getRepository(FavoriteCabinetEntity)
        .createQueryBuilder('favorite')
        .innerJoinAndSelect('favorite.cabinet', 'cabinet', 'cabinet.status = :status', {
            status: CabinetStatus.Active,
        })
        .where('favorite.userId = :userId', { userId: user.id })
        .orderBy('favorite.createdAt', 'DESC')
        .take(MAX_FAVORITES_PER_USER)
        .getMany()

    const imageManifests = await getCabinetImageManifestMap(
        favorites.flatMap((favorite) => favorite.cabinet.photos),
    )

    return {
        items: favorites.map((favorite) => toPublicCabinet(favorite.cabinet, null, imageManifests)),
    }
}

export async function addFavoriteCabinet(user: UserEntity, cabinetId: string) {
    const normalizedCabinetId = normalizeFavoriteCabinetId(cabinetId)
    if (!normalizedCabinetId) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Favorite cabinet id is invalid.' })
    const cabinet = await getActiveCabinet(normalizedCabinetId)
    const repository = AppDataSource.getRepository(FavoriteCabinetEntity)
    await repository.upsert(
        { userId: user.id, cabinetId: normalizedCabinetId },
        ['userId', 'cabinetId'],
    )

    const imageManifests = await getCabinetImageManifestMap(cabinet.photos)

    return toPublicCabinet(cabinet, null, imageManifests)
}

export async function removeFavoriteCabinet(user: UserEntity, cabinetId: string) {
    const normalizedCabinetId = normalizeFavoriteCabinetId(cabinetId)
    if (!normalizedCabinetId) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Favorite cabinet id is invalid.' })
    await AppDataSource.getRepository(FavoriteCabinetEntity).delete({
        userId: user.id,
        cabinetId: normalizedCabinetId,
    })

    return { success: true as const }
}

export async function syncFavoriteCabinets(user: UserEntity, cabinetIds: string[]) {
    let uniqueIds: string[]
    try {
        uniqueIds = normalizeFavoriteCabinetIds(cabinetIds)
    } catch {
        throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Favorite cabinet ids are invalid.' })
    }

    if (uniqueIds.length === 0) {
        return { items: [] }
    }

    const cabinetRepository = AppDataSource.getRepository(CabinetEntity)
    const favoriteRepository = AppDataSource.getRepository(FavoriteCabinetEntity)
    const cabinets = await cabinetRepository.find({
        where: {
            id: In(uniqueIds),
            status: CabinetStatus.Active,
        },
    })
    const validIds = cabinets.map((cabinet) => cabinet.id)

    if (validIds.length > 0) {
        await favoriteRepository.upsert(
            validIds.map((cabinetId) => ({ userId: user.id, cabinetId })),
            ['userId', 'cabinetId'],
        )
    }

    const cabinetsById = new Map(cabinets.map((cabinet) => [cabinet.id, cabinet]))
    const imageManifests = await getCabinetImageManifestMap(
        cabinets.flatMap((cabinet) => cabinet.photos),
    )

    return {
        items: uniqueIds
            .map((cabinetId) => cabinetsById.get(cabinetId))
            .filter((cabinet): cabinet is CabinetEntity => Boolean(cabinet))
            .map((cabinet) => toPublicCabinet(cabinet, null, imageManifests)),
    }
}
