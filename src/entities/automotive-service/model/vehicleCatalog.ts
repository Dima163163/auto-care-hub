// `other` remains a backwards-compatible value for vehicles saved before the
// catalog was expanded with hydrogen. New catalog engines use explicit types.
export const vehicleFuelTypes = ['petrol', 'diesel', 'hybrid', 'electric', 'lpg', 'hydrogen', 'other'] as const

export type VehicleFuelType = typeof vehicleFuelTypes[number]

export type VehicleEngineOption = {
    id: string
    fuelType: VehicleFuelType
    displacementL: number | null
    horsepower: number | null
}

export type VehicleModelOption = {
    id: string
    label: string
    yearsFrom: number
    yearsTo: number
    engines: readonly VehicleEngineOption[]
}

export type VehicleBrandOption = {
    id: string
    labels: Record<string, string>
    models: readonly VehicleModelOption[]
}

const commonEngines = [
    { id: 'petrol-20-150', fuelType: 'petrol', displacementL: 2, horsepower: 150 },
    { id: 'diesel-20-190', fuelType: 'diesel', displacementL: 2, horsepower: 190 },
    { id: 'hybrid-25-218', fuelType: 'hybrid', displacementL: 2.5, horsepower: 218 },
] as const satisfies readonly VehicleEngineOption[]

const electricEngine = [{ id: 'electric-0-204', fuelType: 'electric', displacementL: null, horsepower: 204 }] as const satisfies readonly VehicleEngineOption[]

function models(...entries: readonly [string, string, number, number][]) {
    return entries.map(([id, label, yearsFrom, yearsTo]) => ({
        id,
        label,
        yearsFrom,
        yearsTo,
        engines: commonEngines,
    }))
}

export const vehicleCatalog: readonly VehicleBrandOption[] = [
    { id: 'audi', labels: { en: 'Audi', ru: 'Audi', es: 'Audi', ro: 'Audi' }, models: models(['a3', 'A3', 1996, 2026], ['a4', 'A4', 1994, 2026], ['a6', 'A6', 1994, 2026], ['q3', 'Q3', 2011, 2026], ['q5', 'Q5', 2008, 2026], ['q7', 'Q7', 2005, 2026]) },
    { id: 'bmw', labels: { en: 'BMW', ru: 'BMW', es: 'BMW', ro: 'BMW' }, models: models(['1-series', '1 Series', 2004, 2026], ['3-series', '3 Series', 1975, 2026], ['5-series', '5 Series', 1972, 2026], ['x1', 'X1', 2009, 2026], ['x3', 'X3', 2003, 2026], ['x5', 'X5', 1999, 2026], ['x7', 'X7', 2018, 2026]) },
    { id: 'byd', labels: { en: 'BYD', ru: 'BYD', es: 'BYD', ro: 'BYD' }, models: models(['atto-3', 'Atto 3', 2022, 2026], ['dolphin', 'Dolphin', 2021, 2026], ['han', 'Han', 2020, 2026]) },
    { id: 'chery', labels: { en: 'Chery', ru: 'Chery', es: 'Chery', ro: 'Chery' }, models: models(['tiggo-4', 'Tiggo 4', 2017, 2026], ['tiggo-7', 'Tiggo 7', 2016, 2026], ['tiggo-8', 'Tiggo 8', 2018, 2026]) },
    { id: 'citroen', labels: { en: 'Citroën', ru: 'Citroën', es: 'Citroën', ro: 'Citroën' }, models: models(['c3', 'C3', 2002, 2026], ['c4', 'C4', 2004, 2026], ['c5-aircross', 'C5 Aircross', 2017, 2026]) },
    { id: 'ford', labels: { en: 'Ford', ru: 'Ford', es: 'Ford', ro: 'Ford' }, models: models(['focus', 'Focus', 1998, 2026], ['kuga', 'Kuga', 2008, 2026], ['mondeo', 'Mondeo', 1993, 2022], ['mustang', 'Mustang', 1964, 2026], ['transit', 'Transit', 1965, 2026]) },
    { id: 'geely', labels: { en: 'Geely', ru: 'Geely', es: 'Geely', ro: 'Geely' }, models: models(['coolray', 'Coolray', 2018, 2026], ['atlas', 'Atlas', 2016, 2026], ['tugella', 'Tugella', 2019, 2026]) },
    { id: 'haval', labels: { en: 'Haval', ru: 'Haval', es: 'Haval', ro: 'Haval' }, models: models(['jolion', 'Jolion', 2020, 2026], ['f7', 'F7', 2018, 2026], ['dargo', 'Dargo', 2020, 2026]) },
    { id: 'honda', labels: { en: 'Honda', ru: 'Honda', es: 'Honda', ro: 'Honda' }, models: models(['civic', 'Civic', 1972, 2026], ['cr-v', 'CR-V', 1997, 2026], ['accord', 'Accord', 1976, 2026]) },
    { id: 'hyundai', labels: { en: 'Hyundai', ru: 'Hyundai', es: 'Hyundai', ro: 'Hyundai' }, models: models(['creta', 'Creta', 2014, 2026], ['elantra', 'Elantra', 1990, 2026], ['santa-fe', 'Santa Fe', 2000, 2026], ['solaris', 'Solaris', 2010, 2026], ['tucson', 'Tucson', 2004, 2026]) },
    { id: 'jac', labels: { en: 'JAC', ru: 'JAC', es: 'JAC', ro: 'JAC' }, models: models(['js4', 'JS4', 2020, 2026], ['js6', 'JS6', 2022, 2026]) },
    { id: 'jaecoo', labels: { en: 'Jaecoo', ru: 'Jaecoo', es: 'Jaecoo', ro: 'Jaecoo' }, models: models(['j7', 'J7', 2023, 2026], ['j8', 'J8', 2023, 2026]) },
    { id: 'kia', labels: { en: 'Kia', ru: 'Kia', es: 'Kia', ro: 'Kia' }, models: models(['ceed', 'Ceed', 2006, 2026], ['k5', 'K5', 2010, 2026], ['rio', 'Rio', 2000, 2026], ['sorento', 'Sorento', 2002, 2026], ['sportage', 'Sportage', 1993, 2026]) },
    { id: 'lada', labels: { en: 'Lada', ru: 'Лада', es: 'Lada', ro: 'Lada' }, models: models(['granta', 'Granta', 2011, 2026], ['largus', 'Largus', 2012, 2026], ['niva', 'Niva', 1977, 2026], ['vesta', 'Vesta', 2015, 2026]) },
    { id: 'lexus', labels: { en: 'Lexus', ru: 'Lexus', es: 'Lexus', ro: 'Lexus' }, models: models(['es', 'ES', 1989, 2026], ['nx', 'NX', 2014, 2026], ['rx', 'RX', 1998, 2026]) },
    { id: 'mazda', labels: { en: 'Mazda', ru: 'Mazda', es: 'Mazda', ro: 'Mazda' }, models: models(['3', 'Mazda 3', 2003, 2026], ['6', 'Mazda 6', 2002, 2026], ['cx-5', 'CX-5', 2012, 2026]) },
    { id: 'mercedes-benz', labels: { en: 'Mercedes-Benz', ru: 'Mercedes-Benz', es: 'Mercedes-Benz', ro: 'Mercedes-Benz' }, models: models(['a-class', 'A-Class', 1997, 2026], ['c-class', 'C-Class', 1993, 2026], ['e-class', 'E-Class', 1993, 2026], ['glc', 'GLC', 2015, 2026], ['gle', 'GLE', 2015, 2026], ['s-class', 'S-Class', 1972, 2026]) },
    { id: 'mitsubishi', labels: { en: 'Mitsubishi', ru: 'Mitsubishi', es: 'Mitsubishi', ro: 'Mitsubishi' }, models: models(['asx', 'ASX', 2010, 2026], ['outlander', 'Outlander', 2001, 2026], ['pajero', 'Pajero', 1982, 2021]) },
    { id: 'nissan', labels: { en: 'Nissan', ru: 'Nissan', es: 'Nissan', ro: 'Nissan' }, models: models(['almera', 'Almera', 1995, 2020], ['qashqai', 'Qashqai', 2006, 2026], ['x-trail', 'X-Trail', 2000, 2026]) },
    { id: 'opel', labels: { en: 'Opel', ru: 'Opel', es: 'Opel', ro: 'Opel' }, models: models(['astra', 'Astra', 1991, 2026], ['corsa', 'Corsa', 1982, 2026], ['grandland', 'Grandland', 2017, 2026]) },
    { id: 'peugeot', labels: { en: 'Peugeot', ru: 'Peugeot', es: 'Peugeot', ro: 'Peugeot' }, models: models(['208', '208', 2012, 2026], ['308', '308', 2007, 2026], ['3008', '3008', 2009, 2026]) },
    { id: 'porsche', labels: { en: 'Porsche', ru: 'Porsche', es: 'Porsche', ro: 'Porsche' }, models: models(['cayenne', 'Cayenne', 2002, 2026], ['macan', 'Macan', 2014, 2026], ['panamera', 'Panamera', 2009, 2026]) },
    { id: 'renault', labels: { en: 'Renault', ru: 'Renault', es: 'Renault', ro: 'Renault' }, models: models(['arkana', 'Arkana', 2019, 2026], ['duster', 'Duster', 2010, 2026], ['logan', 'Logan', 2004, 2026], ['kaptur', 'Kaptur', 2016, 2026]) },
    { id: 'seat', labels: { en: 'SEAT', ru: 'SEAT', es: 'SEAT', ro: 'SEAT' }, models: models(['ibiza', 'Ibiza', 1984, 2026], ['leon', 'Leon', 1999, 2026], ['ateca', 'Ateca', 2016, 2026]) },
    { id: 'skoda', labels: { en: 'Škoda', ru: 'Škoda', es: 'Škoda', ro: 'Škoda' }, models: models(['karoq', 'Karoq', 2017, 2026], ['kodiaq', 'Kodiaq', 2016, 2026], ['octavia', 'Octavia', 1996, 2026], ['rapid', 'Rapid', 2012, 2020], ['superb', 'Superb', 2001, 2026]) },
    { id: 'subaru', labels: { en: 'Subaru', ru: 'Subaru', es: 'Subaru', ro: 'Subaru' }, models: models(['forester', 'Forester', 1997, 2026], ['outback', 'Outback', 1994, 2026], ['xv', 'XV', 2011, 2026]) },
    { id: 'suzuki', labels: { en: 'Suzuki', ru: 'Suzuki', es: 'Suzuki', ro: 'Suzuki' }, models: models(['vitara', 'Vitara', 1988, 2026], ['sx4', 'SX4', 2006, 2026], ['jimny', 'Jimny', 1998, 2026]) },
    { id: 'tesla', labels: { en: 'Tesla', ru: 'Tesla', es: 'Tesla', ro: 'Tesla' }, models: [{ id: 'model-3', label: 'Model 3', yearsFrom: 2017, yearsTo: 2026, engines: electricEngine }, { id: 'model-y', label: 'Model Y', yearsFrom: 2020, yearsTo: 2026, engines: electricEngine }, { id: 'model-s', label: 'Model S', yearsFrom: 2012, yearsTo: 2026, engines: electricEngine }] },
    { id: 'toyota', labels: { en: 'Toyota', ru: 'Toyota', es: 'Toyota', ro: 'Toyota' }, models: models(['camry', 'Camry', 1982, 2026], ['corolla', 'Corolla', 1966, 2026], ['land-cruiser', 'Land Cruiser', 1951, 2026], ['rav4', 'RAV4', 1994, 2026], ['highlander', 'Highlander', 2000, 2026]) },
    { id: 'volkswagen', labels: { en: 'Volkswagen', ru: 'Volkswagen', es: 'Volkswagen', ro: 'Volkswagen' }, models: models(['golf', 'Golf', 1974, 2026], ['passat', 'Passat', 1973, 2026], ['polo', 'Polo', 1975, 2026], ['tiguan', 'Tiguan', 2007, 2026], ['touareg', 'Touareg', 2002, 2026]) },
    { id: 'volvo', labels: { en: 'Volvo', ru: 'Volvo', es: 'Volvo', ro: 'Volvo' }, models: models(['s60', 'S60', 2000, 2026], ['xc40', 'XC40', 2017, 2026], ['xc60', 'XC60', 2008, 2026], ['xc90', 'XC90', 2002, 2026]) },
    { id: 'zeekr', labels: { en: 'Zeekr', ru: 'Zeekr', es: 'Zeekr', ro: 'Zeekr' }, models: [{ id: '001', label: '001', yearsFrom: 2021, yearsTo: 2026, engines: electricEngine }, { id: 'x', label: 'X', yearsFrom: 2023, yearsTo: 2026, engines: electricEngine }] },
] as const

export function getVehicleBrandLabel(brand: VehicleBrandOption, locale: string) {
    return brand.labels[locale] ?? brand.labels.en ?? brand.id
}

export function getVehicleModels(brandId: string) {
    return vehicleCatalog.find((brand) => brand.id === brandId)?.models.map((model) => model.label) ?? []
}

export function getVehicleBrand(brandId: string) {
    return vehicleCatalog.find((brand) => brand.id === brandId)
}
