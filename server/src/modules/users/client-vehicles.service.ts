import { AppDataSource } from '../../database/data-source.js'
import { ClientVehicleEntity } from '../../entities/user/client-vehicle.entity.js'
import { UserEntity } from '../../entities/user/user.entity.js'
import type { Repository } from 'typeorm'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { normalizeClientVehicleInput } from './client-vehicle-policy.js'

const vehicleImageByBrand: Record<string, string> = {
    audi: '/images/autocare/vehicles/vehicle-sedan.webp',
    bmw: '/images/autocare/vehicles/vehicle-suv.webp',
    ford: '/images/autocare/vehicles/vehicle-hatchback.webp',
    hyundai: '/images/autocare/vehicles/vehicle-crossover.webp',
    kia: '/images/autocare/vehicles/vehicle-hatchback.webp',
    lada: '/images/autocare/vehicles/vehicle-suv.webp',
    'mercedes-benz': '/images/autocare/vehicles/vehicle-sedan.webp',
    skoda: '/images/autocare/vehicles/vehicle-sedan.webp',
    toyota: '/images/autocare/vehicles/vehicle-crossover.webp',
    volkswagen: '/images/autocare/vehicles/vehicle-hatchback.webp',
}
const vehicleImageByModel: Record<string, string> = {
    '1 series': '/images/autocare/vehicles/vehicle-hatchback.webp',
    '3 series': '/images/autocare/vehicles/vehicle-sedan.webp',
    '5 series': '/images/autocare/vehicles/vehicle-sedan.webp',
    a3: '/images/autocare/vehicles/vehicle-hatchback.webp',
    a4: '/images/autocare/vehicles/vehicle-sedan.webp',
    a6: '/images/autocare/vehicles/vehicle-sedan.webp',
    camry: '/images/autocare/vehicles/vehicle-sedan.webp',
    corolla: '/images/autocare/vehicles/vehicle-sedan.webp',
    focus: '/images/autocare/vehicles/vehicle-hatchback.webp',
    golf: '/images/autocare/vehicles/vehicle-hatchback.webp',
    polo: '/images/autocare/vehicles/vehicle-hatchback.webp',
    tiguan: '/images/autocare/vehicles/vehicle-crossover.webp',
    touareg: '/images/autocare/vehicles/vehicle-suv.webp',
}
const defaultVehicleImage = '/images/autocare/vehicles/vehicle-crossover.webp'

async function withClientVehicleLock<T>(userId: string, operation: (vehicleRepository: Repository<ClientVehicleEntity>) => Promise<T>) {
    return AppDataSource.transaction(async (manager) => {
        const lockedUser = await manager.getRepository(UserEntity).findOne({
            where: { id: userId },
            lock: { mode: 'pessimistic_write' },
        })
        if (!lockedUser) {
            throw new AppError({
                statusCode: 404,
                code: ERROR_CODES.NotFound,
                message: 'User not found.',
            })
        }
        return operation(manager.getRepository(ClientVehicleEntity))
    })
}

type VehicleInput = {
    brandId: string
    model: string
    year: number
    fuelType: string
    engineDisplacement: number | null
    horsepower: number | null
    color: string
    vin: string | null
    licensePlate?: string | null
    internalNumber?: string | null
}
const repository = () => AppDataSource.getRepository(ClientVehicleEntity)
function getVehicleImage(brandId: string, model: string) {
    return vehicleImageByModel[model.trim().toLowerCase()] ?? vehicleImageByBrand[brandId] ?? defaultVehicleImage
}
const toResponse = (vehicle: ClientVehicleEntity) => ({
    ...vehicle,
    engineDisplacement: vehicle.engineDisplacement === null ? null : Number(vehicle.engineDisplacement),
    horsepower: vehicle.horsepower === null ? null : Number(vehicle.horsepower),
    imageUrl: vehicle.imageUrl || getVehicleImage(vehicle.brandId, vehicle.model),
    createdAt: vehicle.createdAt.toISOString(),
})

function assertClient(user: UserEntity) {
    if (user.role !== 'client') {
        throw new AppError({
            statusCode: 403,
            code: ERROR_CODES.Forbidden,
            message: 'Only clients can manage vehicles.',
        })
    }
}

export async function listClientVehicles(user: UserEntity) {
    assertClient(user)
    const items = await repository().find({
        where: { userId: user.id },
        order: { isPrimary: 'DESC', createdAt: 'ASC' },
    })
    return items.map(toResponse)
}

export async function createClientVehicle(user: UserEntity, input: VehicleInput) {
    assertClient(user)
    const normalizedInput = normalizeClientVehicleInput(input, 'create')
    if (!normalizedInput) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Vehicle payload is invalid.' })
    const savedVehicle = await withClientVehicleLock(user.id, async (vehicleRepository) => {
        const existing = await vehicleRepository.count({ where: { userId: user.id } })
        if (existing >= 20) {
            throw new AppError({
                statusCode: 409,
                code: ERROR_CODES.Conflict,
                message: 'A client can save up to 20 vehicles.',
            })
        }
        const brandId = normalizedInput.brandId
        const model = normalizedInput.model
        if (!brandId || !model) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Vehicle payload is invalid.' })

        const vehicle = vehicleRepository.create({
            ...normalizedInput,
            userId: user.id,
            vin: normalizedInput.vin ?? null,
            licensePlate: normalizedInput.licensePlate ?? null,
            internalNumber: normalizedInput.internalNumber ?? null,
            imageUrl: getVehicleImage(brandId, model),
            isPrimary: existing === 0,
        })
        return vehicleRepository.save(vehicle)
    })
    return toResponse(savedVehicle)
}

export async function updateClientVehicle(user: UserEntity, id: string, input: Partial<VehicleInput>) {
    assertClient(user)
    const normalizedInput = normalizeClientVehicleInput(input, 'patch')
    if (!normalizedInput) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Vehicle payload is invalid.' })
    const savedVehicle = await withClientVehicleLock(user.id, async (vehicleRepository) => {
        const vehicle = await vehicleRepository.findOneBy({ id, userId: user.id })
        if (!vehicle) {
            throw new AppError({
                statusCode: 404,
                code: ERROR_CODES.NotFound,
                message: 'Vehicle not found.',
            })
        }

        Object.assign(vehicle, normalizedInput)
        if (normalizedInput.brandId || normalizedInput.model) {
            vehicle.imageUrl = getVehicleImage(normalizedInput.brandId ?? vehicle.brandId, normalizedInput.model ?? vehicle.model)
        }
        if (normalizedInput.vin !== undefined) {
            vehicle.vin = normalizedInput.vin ?? null
        }
        if (normalizedInput.licensePlate !== undefined) vehicle.licensePlate = normalizedInput.licensePlate ?? null
        if (normalizedInput.internalNumber !== undefined) vehicle.internalNumber = normalizedInput.internalNumber ?? null

        return vehicleRepository.save(vehicle)
    })
    return toResponse(savedVehicle)
}

export async function deleteClientVehicle(user: UserEntity, id: string) {
    assertClient(user)
    await withClientVehicleLock(user.id, async (vehicleRepository) => {
        const vehicle = await vehicleRepository.findOneBy({ id, userId: user.id })
        if (!vehicle) {
            throw new AppError({
                statusCode: 404,
                code: ERROR_CODES.NotFound,
                message: 'Vehicle not found.',
            })
        }

        await vehicleRepository.remove(vehicle)
        if (vehicle.isPrimary) {
            const nextPrimary = await vehicleRepository.findOne({
                where: { userId: user.id },
                order: { createdAt: 'ASC' },
            })
            if (nextPrimary) {
                nextPrimary.isPrimary = true
                await vehicleRepository.save(nextPrimary)
            }
        }
    })
    return { success: true as const }
}
