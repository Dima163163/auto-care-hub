import type { ClientVehicle } from '@/entities/user'

import type { RequestFormPayload } from './RequestForm'

export function toRequestVehicleSnapshot(snapshot: Record<string, unknown> | ClientVehicle | undefined): RequestFormPayload['vehicleSnapshot'] {
    if (!snapshot) return null

    const source: Record<string, unknown> = 'brandId' in snapshot
        ? { brandId: snapshot.brandId, model: snapshot.model, year: snapshot.year, fuelType: snapshot.fuelType, engineDisplacement: snapshot.engineDisplacement, horsepower: snapshot.horsepower, color: snapshot.color, licensePlate: snapshot.licensePlate, internalNumber: snapshot.internalNumber, vin: snapshot.vin }
        : snapshot
    const make = String(source.makeLabel ?? source.make ?? source.brand ?? source.brandId ?? '').trim()
    const model = String(source.modelLabel ?? source.model ?? '').trim()
    const year = Number(source.year)

    return make && model && Number.isInteger(year) && year > 0 ? {
        make,
        model,
        year,
        fuelType: typeof source.fuelType === 'string' ? source.fuelType : undefined,
        engineDisplacement: typeof source.engineDisplacement === 'number' ? source.engineDisplacement : null,
        horsepower: typeof source.horsepower === 'number' ? source.horsepower : null,
        color: typeof source.color === 'string' ? source.color : undefined,
        licensePlate: typeof source.licensePlate === 'string' ? source.licensePlate : null,
        internalNumber: typeof source.internalNumber === 'string' ? source.internalNumber : null,
        vin: typeof source.vin === 'string' ? source.vin : null,
    } : null
}
