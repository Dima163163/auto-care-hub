import type { AutomotivePriceType, ProviderPreview } from './autocareMockData'
import { automotiveVehicleBrands } from './vehicleBrands'

const SERVICE_IDS = [
    'oil-change', 'tire-service', 'diagnostics', 'brakes', 'detailing', 'body-paint',
    'air-conditioning', 'maintenance', 'engine', 'suspension', 'electric', 'tow-truck',
    'mobile-diagnostics', 'roadside-assistance', 'battery-service', 'wheel-alignment',
    'car-wash', 'windshield-repair',
] as const

const SERVICE_IMAGES = [
    '/images/autocare/providers/generated/service-oil-change.png',
    '/images/autocare/providers/generated/service-tire-service.png',
    '/images/autocare/providers/generated/service-diagnostics.png',
    '/images/autocare/providers/generated/service-detailing.png',
    '/images/autocare/providers/generated/service-body-paint.png',
    '/images/autocare/providers/generated/service-air-conditioning.png',
] as const

const BRANDS = ['Atlas Auto', 'BlueLine Garage', 'DrivePoint', 'Motors Lab', 'Nova Service', 'Prime Wheels', 'Route 7 Auto', 'Urban Torque', 'Vector Garage', 'WestRing'] as const
const DISTRICTS = ['Хамовники', 'Даниловский', 'Сокол', 'Филёвский парк', 'Раменки', 'Алексеевский', 'Марьино', 'Таганский', 'Хорошёво', 'Отрадное'] as const
const SERVICE_BASE_PRICES: Record<(typeof SERVICE_IDS)[number], number> = {
    'oil-change': 1800,
    'tire-service': 2200,
    diagnostics: 1200,
    brakes: 2900,
    detailing: 4500,
    'body-paint': 8500,
    'air-conditioning': 2400,
    maintenance: 3600,
    engine: 6200,
    suspension: 3800,
    electric: 2600,
    'tow-truck': 3500,
    'mobile-diagnostics': 1800,
    'roadside-assistance': 2200,
    'battery-service': 1900,
    'wheel-alignment': 2800,
    'car-wash': 1200,
    'windshield-repair': 5400,
}
const PRICE_TYPES: readonly AutomotivePriceType[] = ['fixed', 'from', 'range', 'quote_required']
const INCLUSION_SETS = [
    ['Предварительная оценка', 'Фотоотчёт по запросу'],
    ['Запчасти', 'Расходные материалы'],
    ['Гарантия на работы', 'Фотоотчёт по запросу'],
    ['Диагностика перед работой', 'Сброс сервисного интервала'],
] as const
const VEHICLE_BRAND_IDS = automotiveVehicleBrands.map((brand) => brand.id)

function getBrandSpecializations(index: number) {
    if (index % 5 === 0) return VEHICLE_BRAND_IDS
    const first = (index * 3) % VEHICLE_BRAND_IDS.length
    const count = index % 3 === 0 ? 2 : 1
    return Array.from({ length: count }, (_, offset) => VEHICLE_BRAND_IDS[(first + offset) % VEHICLE_BRAND_IDS.length]!)
}

function createServicePrices(index: number) {
    return Object.fromEntries(SERVICE_IDS.map((serviceId, serviceIndex) => [
        serviceId,
        Math.round((SERVICE_BASE_PRICES[serviceId] * (1 + ((index * 7 + serviceIndex * 3) % 17 - 8) / 100)) / 50) * 50,
    ])) as Partial<Record<string, number>>
}

function createProvider(index: number): ProviderPreview {
    const district = DISTRICTS[index % DISTRICTS.length]
    const servicePrices = createServicePrices(index)
    const distance = Number((1.4 + ((index * 17) % 230) / 10).toFixed(1))
    const rating = Number((4.1 + ((index * 13) % 9) / 10).toFixed(1))
    const priceType = PRICE_TYPES[index % PRICE_TYPES.length]!

    return {
        id: `mock-service-${String(index + 1).padStart(3, '0')}`,
        name: `${BRANDS[index % BRANDS.length]} ${district}`,
        rating,
        reviewCount: 18 + ((index * 47) % 640),
        distance: `${distance.toFixed(1)} km`,
        price: servicePrices['oil-change'] ?? SERVICE_BASE_PRICES['oil-change'],
        priceTo: priceType === 'range' ? Math.round((servicePrices['oil-change'] ?? SERVICE_BASE_PRICES['oil-change']) * 1.2) : null,
        currency: 'RUB',
        nextSlot: index % 4 === 0 ? 'Tomorrow, 09:30' : `Today, ${String(10 + (index % 9)).padStart(2, '0')}:${index % 2 ? '30' : '00'}`,
        image: SERVICE_IMAGES[index % SERVICE_IMAGES.length],
        bonus: index % 5 === 0 ? '3% back' : index % 7 === 0 ? 'Free inspection' : undefined,
        verified: index % 6 !== 0,
        mapPosition: [55.69 + ((index * 19) % 120) / 1000, 37.48 + ((index * 31) % 240) / 1000],
        serviceIds: SERVICE_IDS,
        servicePrices,
        address: `Москва, ${district}, ул. Автомобильная, ${10 + (index % 80)}`,
        priceType,
        inclusions: INCLUSION_SETS[index % INCLUSION_SETS.length],
        warrantyMonths: index % 9 === 0 ? null : 6 + (index % 3) * 6,
        brandSpecializations: getBrandSpecializations(index),
        isMultibrand: index % 5 === 0,
    }
}

export const generatedProviderPreviews: readonly ProviderPreview[] = Array.from({ length: 100 }, (_, index) => createProvider(index))
