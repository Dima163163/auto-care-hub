export type FleetVehicleDraft = {
    brandId: string
    modelId: string
    year: string
}

export type FleetVehicleDraftSource = FleetVehicleDraft & {
    registrationNumber: string
    internalReference: string
    vin: string
}

export const EMPTY_FLEET_VEHICLE_DRAFT: FleetVehicleDraft = {
    brandId: '',
    modelId: '',
    year: '',
}

export function createFleetVehicleDraft(source: FleetVehicleDraftSource): FleetVehicleDraft {
    return {
        brandId: source.brandId,
        modelId: source.modelId,
        year: source.year,
    }
}

export function parseFleetVehicleDraft(value: unknown): FleetVehicleDraft | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null

    const source = value as Record<string, unknown>
    const read = (key: keyof FleetVehicleDraft) => typeof source[key] === 'string' ? source[key] : ''

    return {
        brandId: read('brandId'),
        modelId: read('modelId'),
        year: read('year'),
    }
}
