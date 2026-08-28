import type { ClientVehicle } from '@/entities/user'

import type { RequestFormPayload } from './RequestForm'

export function toRequestVehicleSnapshot(snapshot: Record<string, unknown> | ClientVehicle | undefined): RequestFormPayload['vehicleSnapshot'] {
    if (!snapshot) return null

    const make = String(snapshot.makeLabel ?? snapshot.make ?? snapshot.brand ?? snapshot.brandId ?? '').trim()
    const model = String(snapshot.modelLabel ?? snapshot.model ?? '').trim()
    const year = Number(snapshot.year)

    return make && model && Number.isInteger(year) && year > 0 ? {
        make,
        model,
        year,
        fuelType: typeof snapshot.fuelType === 'string' ? snapshot.fuelType : undefined,
        engineDisplacement: typeof snapshot.engineDisplacement === 'number' ? snapshot.engineDisplacement : null,
        horsepower: typeof snapshot.horsepower === 'number' ? snapshot.horsepower : null,
        color: typeof snapshot.color === 'string' ? snapshot.color : undefined,
        licensePlate: typeof snapshot.licensePlate === 'string' ? snapshot.licensePlate : null,
        internalNumber: typeof snapshot.internalNumber === 'string' ? snapshot.internalNumber : null,
        vin: typeof snapshot.vin === 'string' ? snapshot.vin : null,
    } : null
}
