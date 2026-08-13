import { vehicleCatalog, getVehicleBrandLabel } from './vehicleCatalog'

export const automotiveVehicleBrands = vehicleCatalog
export type AutomotiveVehicleBrandId = typeof automotiveVehicleBrands[number]['id']
export { getVehicleBrandLabel }
