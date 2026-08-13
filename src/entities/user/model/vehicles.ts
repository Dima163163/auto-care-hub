import type { AutomotiveVehicleBrandId } from '@/entities/automotive-service'

export const vehicleFuelTypes = ['petrol', 'diesel', 'hybrid', 'electric', 'lpg', 'other'] as const
export type VehicleFuelType = typeof vehicleFuelTypes[number]

export type ClientVehicle = {
    id: string
    brandId: AutomotiveVehicleBrandId | string
    model: string
    year: number
    fuelType: VehicleFuelType
    engineDisplacement: number | null
    horsepower: number | null
    color: string
    vin: string | null
    imageUrl: string
    isPrimary: boolean
    createdAt: string
}

export type CreateClientVehicleInput = Omit<ClientVehicle, 'id' | 'imageUrl' | 'isPrimary' | 'createdAt'>

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

export function getVehicleImage(brandId: string, model = '') {
    return vehicleImageByModel[model.trim().toLowerCase()]
        ?? vehicleImageByBrand[brandId]
        ?? '/images/autocare/vehicles/vehicle-crossover.webp'
}
