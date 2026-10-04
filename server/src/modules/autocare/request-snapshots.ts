import { AutomotiveServiceDefinitionEntity, AutomotiveServiceOfferingEntity, ClientVehicleEntity } from '../../entities/index.js'
import type { AutomotiveOfferingSnapshot } from '../../entities/automotive/service-request.entity.js'
import type { AutoCareRequestSnapshot } from './autocare.types.js'

export function createVehicleSnapshot(vehicle: ClientVehicleEntity): AutoCareRequestSnapshot {
    return {
        make: vehicle.brandId,
        brandId: vehicle.brandId,
        model: vehicle.model,
        year: vehicle.year,
        fuelType: vehicle.fuelType,
        engineDisplacement: vehicle.engineDisplacement === null ? null : Number(vehicle.engineDisplacement),
        horsepower: vehicle.horsepower,
        color: vehicle.color,
        vin: vehicle.vin,
        licensePlate: vehicle.licensePlate,
        internalNumber: vehicle.internalNumber,
    }
}

export function createOfferingSnapshot(definition: AutomotiveServiceDefinitionEntity, offering: AutomotiveServiceOfferingEntity): AutomotiveOfferingSnapshot {
    return {
        serviceSlug: definition.slug,
        serviceLabels: definition.labels,
        description: offering.description,
        priceFromMinor: offering.priceFromMinor,
        priceToMinor: offering.priceToMinor,
        currencyCode: offering.currencyCode,
        durationMinutes: offering.durationMinutes,
        inclusions: offering.inclusions,
        warrantyText: offering.warrantyText,
        priceType: definition.priceType,
        bookingMode: offering.bookingMode,
        requiredResourceTypes: offering.requiredResourceTypes ?? [],
        requiredResourceIds: offering.requiredResourceIds ?? [],
    }
}
