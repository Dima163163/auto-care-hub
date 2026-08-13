import { getVehicleBrand, getVehicleModels } from './vehicleCatalog'

export { getVehicleModels }
export function getVehicleModelOptions(brandId: string) {
    return getVehicleBrand(brandId)?.models ?? []
}
