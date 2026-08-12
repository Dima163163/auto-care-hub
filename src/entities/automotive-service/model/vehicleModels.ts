import type { AutomotiveVehicleBrandId } from './vehicleBrands'

export const automotiveVehicleModels = {
    audi: ['A3', 'A4', 'A6', 'Q3', 'Q5', 'Q7'],
    bmw: ['1 Series', '3 Series', '5 Series', 'X1', 'X3', 'X5', 'X7'],
    ford: ['Focus', 'Kuga', 'Mondeo', 'Mustang', 'Transit'],
    hyundai: ['Creta', 'Elantra', 'Santa Fe', 'Solaris', 'Tucson'],
    kia: ['Ceed', 'K5', 'Rio', 'Sorento', 'Sportage'],
    lada: ['Granta', 'Largus', 'Niva', 'Vesta'],
    'mercedes-benz': ['A-Class', 'C-Class', 'E-Class', 'GLC', 'GLE', 'S-Class'],
    skoda: ['Kodiaq', 'Octavia', 'Rapid', 'Superb'],
    toyota: ['Camry', 'Corolla', 'Land Cruiser', 'RAV4'],
    volkswagen: ['Golf', 'Passat', 'Polo', 'Tiguan', 'Touareg'],
} as const satisfies Record<AutomotiveVehicleBrandId, readonly string[]>

export function getVehicleModels(brandId: string) {
    return automotiveVehicleModels[brandId as AutomotiveVehicleBrandId] ?? []
}
