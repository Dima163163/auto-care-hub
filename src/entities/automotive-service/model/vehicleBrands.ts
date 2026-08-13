export const automotiveVehicleBrands = [
    { id: 'audi', labels: { en: 'Audi', ru: 'Audi', es: 'Audi', ro: 'Audi' } },
    { id: 'bmw', labels: { en: 'BMW', ru: 'BMW', es: 'BMW', ro: 'BMW' } },
    { id: 'ford', labels: { en: 'Ford', ru: 'Ford', es: 'Ford', ro: 'Ford' } },
    { id: 'hyundai', labels: { en: 'Hyundai', ru: 'Hyundai', es: 'Hyundai', ro: 'Hyundai' } },
    { id: 'kia', labels: { en: 'Kia', ru: 'Kia', es: 'Kia', ro: 'Kia' } },
    { id: 'lada', labels: { en: 'Lada', ru: 'Лада', es: 'Lada', ro: 'Lada' } },
    { id: 'mercedes-benz', labels: { en: 'Mercedes-Benz', ru: 'Mercedes-Benz', es: 'Mercedes-Benz', ro: 'Mercedes-Benz' } },
    { id: 'skoda', labels: { en: 'Škoda', ru: 'Škoda', es: 'Škoda', ro: 'Škoda' } },
    { id: 'toyota', labels: { en: 'Toyota', ru: 'Toyota', es: 'Toyota', ro: 'Toyota' } },
    { id: 'volkswagen', labels: { en: 'Volkswagen', ru: 'Volkswagen', es: 'Volkswagen', ro: 'Volkswagen' } },
] as const

export type AutomotiveVehicleBrandId = typeof automotiveVehicleBrands[number]['id']

export function getVehicleBrandLabel(brand: typeof automotiveVehicleBrands[number], locale: string) {
    return brand.labels[locale as keyof typeof brand.labels] ?? brand.labels.en
}
