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

const engines = [
    { id: 'petrol-20-150', fuelType: 'petrol', displacementL: 2, horsepower: 150 },
    { id: 'diesel-20-190', fuelType: 'diesel', displacementL: 2, horsepower: 190 },
    { id: 'hybrid-25-218', fuelType: 'hybrid', displacementL: 2.5, horsepower: 218 },
] as const satisfies readonly VehicleEngineOption[]

const electricEngines = [{ id: 'electric-0-204', fuelType: 'electric', displacementL: null, horsepower: 204 }] as const satisfies readonly VehicleEngineOption[]

function model(id: string, label: string, yearsFrom = 2000, yearsTo = 2026, modelEngines: readonly VehicleEngineOption[] = engines): VehicleModelOption {
    return { id, label, yearsFrom, yearsTo, engines: modelEngines }
}

function brand(id: string, label: string, models: readonly VehicleModelOption[]): VehicleBrandOption {
    return { id, labels: { en: label, ru: label, es: label, ro: label }, models }
}

export const vehicleCatalog: readonly VehicleBrandOption[] = [
    brand('audi', 'Audi', [model('a3', 'A3', 1996), model('a4', 'A4', 1994), model('a6', 'A6', 1994), model('q3', 'Q3', 2011), model('q5', 'Q5', 2008), model('q7', 'Q7', 2005)]),
    brand('bmw', 'BMW', [model('1-series', '1 Series', 2004), model('3-series', '3 Series', 1975), model('5-series', '5 Series', 1972), model('x1', 'X1', 2009), model('x3', 'X3', 2003), model('x5', 'X5', 1999), model('x7', 'X7', 2018)]),
    brand('byd', 'BYD', [model('atto-3', 'Atto 3', 2022, 2026, electricEngines), model('dolphin', 'Dolphin', 2021, 2026, electricEngines), model('han', 'Han', 2020, 2026, electricEngines)]),
    brand('chery', 'Chery', [model('tiggo-4', 'Tiggo 4', 2017), model('tiggo-7', 'Tiggo 7', 2016), model('tiggo-8', 'Tiggo 8', 2018)]),
    brand('citroen', 'Citroën', [model('c3', 'C3', 2002), model('c4', 'C4', 2004), model('c5-aircross', 'C5 Aircross', 2017)]),
    brand('ford', 'Ford', [model('focus', 'Focus', 1998), model('kuga', 'Kuga', 2008), model('mondeo', 'Mondeo', 1993, 2022), model('mustang', 'Mustang', 1964), model('transit', 'Transit', 1965)]),
    brand('geely', 'Geely', [model('coolray', 'Coolray', 2018), model('atlas', 'Atlas', 2016), model('tugella', 'Tugella', 2019)]),
    brand('haval', 'Haval', [model('jolion', 'Jolion', 2020), model('f7', 'F7', 2018), model('dargo', 'Dargo', 2020)]),
    brand('honda', 'Honda', [model('civic', 'Civic', 1972), model('cr-v', 'CR-V', 1997), model('accord', 'Accord', 1976)]),
    brand('hyundai', 'Hyundai', [model('creta', 'Creta', 2014), model('elantra', 'Elantra', 1990), model('santa-fe', 'Santa Fe', 2000), model('solaris', 'Solaris', 2010), model('tucson', 'Tucson', 2004)]),
    brand('jac', 'JAC', [model('js4', 'JS4', 2020), model('js6', 'JS6', 2022)]),
    brand('jaecoo', 'Jaecoo', [model('j7', 'J7', 2023), model('j8', 'J8', 2023)]),
    brand('kia', 'Kia', [model('ceed', 'Ceed', 2006), model('k5', 'K5', 2010), model('rio', 'Rio', 2000), model('sorento', 'Sorento', 2002), model('sportage', 'Sportage', 1993)]),
    brand('lada', 'Лада', [model('granta', 'Granta', 2011), model('largus', 'Largus', 2012), model('niva', 'Niva', 1977), model('vesta', 'Vesta', 2015)]),
    brand('lexus', 'Lexus', [model('es', 'ES', 1989), model('nx', 'NX', 2014), model('rx', 'RX', 1998)]),
    brand('mazda', 'Mazda', [model('mazda-3', 'Mazda 3', 2003), model('mazda-6', 'Mazda 6', 2002), model('cx-5', 'CX-5', 2012)]),
    brand('mercedes-benz', 'Mercedes-Benz', [model('a-class', 'A-Class', 1997), model('c-class', 'C-Class', 1993), model('e-class', 'E-Class', 1993), model('glc', 'GLC', 2015), model('gle', 'GLE', 2015), model('s-class', 'S-Class', 1972)]),
    brand('mitsubishi', 'Mitsubishi', [model('asx', 'ASX', 2010), model('outlander', 'Outlander', 2001), model('pajero', 'Pajero', 1982, 2021)]),
    brand('nissan', 'Nissan', [model('almera', 'Almera', 1995, 2020), model('qashqai', 'Qashqai', 2006), model('x-trail', 'X-Trail', 2000)]),
    brand('opel', 'Opel', [model('astra', 'Astra', 1991), model('corsa', 'Corsa', 1982), model('grandland', 'Grandland', 2017)]),
    brand('peugeot', 'Peugeot', [model('208', '208', 2012), model('308', '308', 2007), model('3008', '3008', 2009)]),
    brand('porsche', 'Porsche', [model('cayenne', 'Cayenne', 2002), model('macan', 'Macan', 2014), model('panamera', 'Panamera', 2009)]),
    brand('renault', 'Renault', [model('arkana', 'Arkana', 2019), model('duster', 'Duster', 2010), model('logan', 'Logan', 2004), model('kaptur', 'Kaptur', 2016)]),
    brand('seat', 'SEAT', [model('ibiza', 'Ibiza', 1984), model('leon', 'Leon', 1999), model('ateca', 'Ateca', 2016)]),
    brand('skoda', 'Škoda', [model('karoq', 'Karoq', 2017), model('kodiaq', 'Kodiaq', 2016), model('octavia', 'Octavia', 1996), model('rapid', 'Rapid', 2012, 2020), model('superb', 'Superb', 2001)]),
    brand('subaru', 'Subaru', [model('forester', 'Forester', 1997), model('outback', 'Outback', 1994), model('xv', 'XV', 2011)]),
    brand('suzuki', 'Suzuki', [model('vitara', 'Vitara', 1988), model('sx4', 'SX4', 2006), model('jimny', 'Jimny', 1998)]),
    brand('tesla', 'Tesla', [model('model-3', 'Model 3', 2017, 2026, electricEngines), model('model-y', 'Model Y', 2020, 2026, electricEngines), model('model-s', 'Model S', 2012, 2026, electricEngines)]),
    brand('toyota', 'Toyota', [model('camry', 'Camry', 1982), model('corolla', 'Corolla', 1966), model('land-cruiser', 'Land Cruiser', 1951), model('rav4', 'RAV4', 1994), model('highlander', 'Highlander', 2000)]),
    brand('volkswagen', 'Volkswagen', [model('golf', 'Golf', 1974), model('passat', 'Passat', 1973), model('polo', 'Polo', 1975), model('tiguan', 'Tiguan', 2007), model('touareg', 'Touareg', 2002)]),
    brand('volvo', 'Volvo', [model('s60', 'S60', 2000), model('xc40', 'XC40', 2017), model('xc60', 'XC60', 2008), model('xc90', 'XC90', 2002)]),
    brand('zeekr', 'Zeekr', [model('001', '001', 2021, 2026, electricEngines), model('x', 'X', 2023, 2026, electricEngines)]),
]

export function getVehicleCatalog(brandId?: string) {
    if (!brandId) return vehicleCatalog
    return vehicleCatalog.filter((item) => item.id === brandId)
}
