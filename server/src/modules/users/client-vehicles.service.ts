import { AppDataSource } from '../../database/data-source.js'
import { ClientVehicleEntity } from '../../entities/user/client-vehicle.entity.js'
import type { UserEntity } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'

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

type VehicleInput = {
    brandId: string
    model: string
    year: number
    fuelType: string
    engineDisplacement: number | null
    horsepower: number | null
    color: string
    vin: string | null
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
    const existing = await repository().count({ where: { userId: user.id } })
    if (existing >= 20) {
        throw new AppError({
            statusCode: 409,
            code: ERROR_CODES.Conflict,
            message: 'A client can save up to 20 vehicles.',
        })
    }

    const vehicle = repository().create({
        ...input,
        userId: user.id,
        vin: input.vin || null,
        imageUrl: getVehicleImage(input.brandId, input.model),
        isPrimary: existing === 0,
    })
    return toResponse(await repository().save(vehicle))
}

export async function updateClientVehicle(user: UserEntity, id: string, input: Partial<VehicleInput>) {
    assertClient(user)
    const vehicle = await repository().findOneBy({ id, userId: user.id })
    if (!vehicle) {
        throw new AppError({
            statusCode: 404,
            code: ERROR_CODES.NotFound,
            message: 'Vehicle not found.',
        })
    }

    Object.assign(vehicle, input)
    if (input.brandId || input.model) {
        vehicle.imageUrl = getVehicleImage(input.brandId ?? vehicle.brandId, input.model ?? vehicle.model)
    }
    if (input.vin !== undefined) {
        vehicle.vin = input.vin || null
    }

    return toResponse(await repository().save(vehicle))
}

export async function deleteClientVehicle(user: UserEntity, id: string) {
    assertClient(user)
    const vehicle = await repository().findOneBy({ id, userId: user.id })
    if (!vehicle) {
        throw new AppError({
            statusCode: 404,
            code: ERROR_CODES.NotFound,
            message: 'Vehicle not found.',
        })
    }

    await repository().remove(vehicle)
    if (vehicle.isPrimary) {
        const nextPrimary = await repository().findOne({
            where: { userId: user.id },
            order: { createdAt: 'ASC' },
        })
        if (nextPrimary) {
            nextPrimary.isPrimary = true
            await repository().save(nextPrimary)
        }
    }
    return { success: true as const }
}
