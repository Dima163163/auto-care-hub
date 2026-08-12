import { AppDataSource } from '../../database/data-source.js'
import { BookingEntity } from '../../entities/booking/booking.entity.js'
import {
    CabinetEntity,
    CabinetStatus,
} from '../../entities/cabinet/cabinet.entity.js'
import { ServiceEntity } from '../../entities/service/service.entity.js'
import { UserEntity, UserRole } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { toPublicService } from './services.mappers.js'
import {
    MAX_SERVICE_LIST,
    normalizeServiceInput,
} from './service-input-policy.js'

type CreateOwnerServiceInput = {
    cabinetId: string
    title: string
    description?: string
    durationMinutes: number
    price: number
    isActive?: boolean
}

type UpdateOwnerServiceInput = {
    title?: string
    description?: string | null
    durationMinutes?: number
    price?: number
}

function assertOwner(user: UserEntity) {
    if (user.role !== UserRole.Owner) {
        throw new AppError({
            statusCode: 403,
            code: ERROR_CODES.Forbidden,
            message: 'Only owners can use this service endpoint.',
        })
    }
}

async function getOwnerCabinetEntityById(ownerId: string, cabinetId: string) {
    const cabinetRepository = AppDataSource.getRepository(CabinetEntity)

    const cabinet = await cabinetRepository.findOne({
        where: {
            id: cabinetId,
            ownerId,
        },
    })

    if (!cabinet) {
        throw new AppError({
            statusCode: 404,
            code: ERROR_CODES.NotFound,
            message: 'Cabinet not found.',
        })
    }

    return cabinet
}

async function getOwnerServiceEntityById(ownerId: string, serviceId: string) {
    const serviceRepository = AppDataSource.getRepository(ServiceEntity)

    const service = await serviceRepository
        .createQueryBuilder('service')
        .leftJoinAndSelect('service.cabinet', 'cabinet')
        .where('service.id = :serviceId', { serviceId })
        .andWhere('cabinet.ownerId = :ownerId', { ownerId })
        .getOne()

    if (!service) {
        throw new AppError({
            statusCode: 404,
            code: ERROR_CODES.NotFound,
            message: 'Service not found.',
        })
    }

    return service
}

export async function getPublicServicesByCabinetId(cabinetId: string) {
    const cabinetRepository = AppDataSource.getRepository(CabinetEntity)
    const serviceRepository = AppDataSource.getRepository(ServiceEntity)

    const cabinet = await cabinetRepository.findOne({
        where: {
            id: cabinetId,
            status: CabinetStatus.Active,
        },
    })

    if (!cabinet) {
        throw new AppError({
            statusCode: 404,
            code: ERROR_CODES.NotFound,
            message: 'Cabinet not found.',
        })
    }

    const services = await serviceRepository.find({
        where: {
            cabinetId,
            isActive: true,
        },
        order: {
            price: 'ASC',
        },
        take: MAX_SERVICE_LIST,
    })

    return services.map(toPublicService)
}

export async function getOwnerServices(owner: UserEntity) {
    assertOwner(owner)

    const serviceRepository = AppDataSource.getRepository(ServiceEntity)

    const services = await serviceRepository
        .createQueryBuilder('service')
        .leftJoinAndSelect('service.cabinet', 'cabinet')
        .where('cabinet.ownerId = :ownerId', { ownerId: owner.id })
        .orderBy('service.title', 'ASC')
        .take(MAX_SERVICE_LIST)
        .getMany()

    return services.map(toPublicService)
}

export async function createOwnerService(
    owner: UserEntity,
    input: CreateOwnerServiceInput
) {
    assertOwner(owner)
    const normalizedInput = normalizeServiceInput(input)

    await getOwnerCabinetEntityById(owner.id, input.cabinetId)

    const serviceRepository = AppDataSource.getRepository(ServiceEntity)

    const service = serviceRepository.create({
        cabinetId: input.cabinetId,
        title: normalizedInput.title ?? input.title,
        description: normalizedInput.description ?? input.description ?? null,
        durationMinutes: normalizedInput.durationMinutes ?? input.durationMinutes,
        price: normalizedInput.price ?? input.price,
        isActive: input.isActive ?? true,
    })

    const savedService = await serviceRepository.save(service)

    return toPublicService(savedService)
}

export async function updateOwnerService(
    owner: UserEntity,
    serviceId: string,
    input: UpdateOwnerServiceInput
) {
    assertOwner(owner)
    const normalizedInput = normalizeServiceInput(input)

    const serviceRepository = AppDataSource.getRepository(ServiceEntity)
    const service = await getOwnerServiceEntityById(owner.id, serviceId)

    if (normalizedInput.title !== undefined) {
        service.title = normalizedInput.title
    }

    if (normalizedInput.description !== undefined) {
        service.description = normalizedInput.description
    }

    if (normalizedInput.durationMinutes !== undefined) {
        service.durationMinutes = normalizedInput.durationMinutes
    }

    if (normalizedInput.price !== undefined) {
        service.price = normalizedInput.price
    }

    const savedService = await serviceRepository.save(service)

    return toPublicService(savedService)
}

export async function updateOwnerServiceStatus(
    owner: UserEntity,
    serviceId: string,
    isActive: boolean
) {
    assertOwner(owner)

    const serviceRepository = AppDataSource.getRepository(ServiceEntity)
    const service = await getOwnerServiceEntityById(owner.id, serviceId)

    service.isActive = isActive

    const savedService = await serviceRepository.save(service)

    return toPublicService(savedService)
}

export async function deleteOwnerService(owner: UserEntity, serviceId: string) {
    assertOwner(owner)

    const bookingRepository = AppDataSource.getRepository(BookingEntity)
    const serviceRepository = AppDataSource.getRepository(ServiceEntity)
    const service = await getOwnerServiceEntityById(owner.id, serviceId)

    const bookingsCount = await bookingRepository.count({
        where: {
            serviceId: service.id,
        },
    })

    if (bookingsCount > 0) {
        throw new AppError({
            statusCode: 409,
            code: ERROR_CODES.Conflict,
            message: 'Service with bookings cannot be deleted.',
        })
    }

    await serviceRepository.remove(service)

    return {
        success: true,
    } as const
}
