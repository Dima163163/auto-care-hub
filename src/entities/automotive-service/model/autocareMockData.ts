export type AutomotiveService = {
    id: string
    icon: string
    labels: Record<string, string>
}

import { generatedProviderPreviews } from './autocareGeneratedProviders'
import type { AutomotiveAmenityId } from './automotiveAmenities'

export type AutomotivePriceType = 'fixed' | 'from' | 'range' | 'quote_required'

export type ProviderPreview = {
    id: string
    name: string
    rating: number
    reviewCount: number
    distance: string
    price: number
    currency: string
    nextSlot: string
    image?: string | null
    logoUrl?: string | null
    bonus?: string
    verified: boolean
    mapPosition?: [number, number]
    serviceIds?: readonly string[]
    servicePrices?: Partial<Record<string, number>>
    address?: string
    priceType?: AutomotivePriceType
    inclusions?: readonly string[]
    warrantyMonths?: number | null
    brandSpecializations: readonly string[]
    isMultibrand: boolean
    trustScore?: number
    trustBadge?: string | null
}

export const DEFAULT_PROVIDER_IMAGE = '/images/autocare/placeholders/provider.svg'

export function getProviderImage(image?: string | null) {
    return image?.trim() || DEFAULT_PROVIDER_IMAGE
}

export type ProviderOffering = {
    id: string
    serviceId: string
    priceLabel: string
    duration: string
    availability: string
    includes: readonly string[]
}

export type ProviderReview = {
    id: string
    author: string
    rating: number
    date: string
    text: string
    serviceId: string
    photos?: readonly string[]
}

export type ProviderProfile = ProviderPreview & {
    address: string
    hours: string
    yearsActive: number
    staffCount: number
    workstationCount: number
    phone: string | null
    email: string | null
    websiteUrl: string | null
    metroStation: string | null
    warrantyText: string | null
    galleryImageUrls: readonly string[]
    about: string
    amenities: readonly AutomotiveAmenityId[]
    offerings: readonly ProviderOffering[]
    reviews: readonly ProviderReview[]
    supportsMobile?: boolean
    supportsPickup?: boolean
    coverageRadiusKm?: number | null
}

export const automotiveServices: readonly AutomotiveService[] = [
    { id: 'oil-change', icon: '◉', labels: { en: 'Oil change', ru: 'Замена масла', es: 'Cambio de aceite', ro: 'Schimb ulei' } },
    { id: 'tire-service', icon: '◌', labels: { en: 'Tire service', ru: 'Шиномонтаж', es: 'Neumáticos', ro: 'Anvelope' } },
    { id: 'diagnostics', icon: '⌁', labels: { en: 'Diagnostics', ru: 'Диагностика', es: 'Diagnóstico', ro: 'Diagnoză' } },
    { id: 'brakes', icon: '⊙', labels: { en: 'Brakes', ru: 'Тормозная система', es: 'Frenos', ro: 'Frâne' } },
    { id: 'detailing', icon: '✦', labels: { en: 'Detailing', ru: 'Детейлинг', es: 'Detallado', ro: 'Detailing' } },
    { id: 'body-paint', icon: '✧', labels: { en: 'Body & paint', ru: 'Кузов и покраска', es: 'Carrocería y pintura', ro: 'Caroserie și vopsire' } },
    { id: 'air-conditioning', icon: '❄', labels: { en: 'Air conditioning', ru: 'Кондиционер', es: 'Aire acondicionado', ro: 'Aer condiționat' } },
    { id: 'maintenance', icon: '⚙', labels: { en: 'Maintenance', ru: 'Техническое обслуживание', es: 'Mantenimiento', ro: 'Întreținere' } },
    { id: 'engine', icon: '◈', labels: { en: 'Engine', ru: 'Двигатель', es: 'Motor', ro: 'Motor' } },
    { id: 'suspension', icon: '⌁', labels: { en: 'Suspension', ru: 'Подвеска', es: 'Suspensión', ro: 'Suspensie' } },
    { id: 'electric', icon: 'ϟ', labels: { en: 'Auto electrician', ru: 'Электрика', es: 'Electricidad del auto', ro: 'Electrică auto' } },
    { id: 'tow-truck', icon: '↗', labels: { en: 'Tow truck', ru: 'Эвакуатор', es: 'Grúa', ro: 'Evacuator' } },
    { id: 'mobile-diagnostics', icon: '⌖', labels: { en: 'Mobile diagnostics', ru: 'Выездная диагностика', es: 'Diagnóstico móvil', ro: 'Diagnoză mobilă' } },
    { id: 'roadside-assistance', icon: '✚', labels: { en: 'Roadside assistance', ru: 'Помощь на дороге', es: 'Asistencia en carretera', ro: 'Asistență rutieră' } },
    { id: 'battery-service', icon: '▣', labels: { en: 'Battery and jump start', ru: 'Аккумулятор и запуск', es: 'Batería y arranque', ro: 'Baterie și pornire' } },
    { id: 'wheel-alignment', icon: '⊕', labels: { en: 'Wheel alignment', ru: 'Сход-развал', es: 'Alineación de ruedas', ro: 'Geometrie roți' } },
    { id: 'car-wash', icon: '◌', labels: { en: 'Car wash', ru: 'Автомойка', es: 'Lavado de coche', ro: 'Spălătorie auto' } },
    { id: 'windshield-repair', icon: '◇', labels: { en: 'Glass repair', ru: 'Ремонт стекол', es: 'Reparación de lunas', ro: 'Reparații parbriz' } },
]

const featuredProviderPreviews: readonly ProviderPreview[] = [
    {
        id: 'proservice-moscow', name: 'ProService', rating: 4.7, reviewCount: 256,
        distance: '2.1 km', price: 2900, currency: 'RUB', nextSlot: 'Today, 14:30',
        image: '/images/autocare/providers/proservice.webp', logoUrl: '/images/autocare/providers/logos/proservice.svg', bonus: '5% back', verified: true, mapPosition: [55.758, 37.594],
        brandSpecializations: ['bmw', 'mercedes-benz', 'audi'], isMultibrand: false,
    },
    {
        id: 'autolux-moscow', name: 'AutoLux', rating: 4.9, reviewCount: 412,
        distance: '3.4 km', price: 3200, currency: 'RUB', nextSlot: 'Today, 15:00',
        image: '/images/autocare/providers/detailing.webp', logoUrl: '/images/autocare/providers/logos/autolux.svg', verified: true, mapPosition: [55.741, 37.603],
        brandSpecializations: ['toyota', 'volkswagen', 'skoda'], isMultibrand: false,
    },
    {
        id: 'formula-moscow', name: 'Formula Motion', rating: 4.6, reviewCount: 189,
        distance: '4.2 km', price: 2800, currency: 'RUB', nextSlot: 'Today, 16:00',
        image: null, bonus: 'Free check', verified: false, mapPosition: [55.749, 37.626],
        brandSpecializations: [], isMultibrand: true,
    },
] as const

export const providerPreviews: readonly ProviderPreview[] = [...featuredProviderPreviews, ...generatedProviderPreviews]

const defaultOfferings: readonly ProviderOffering[] = [
    { id: 'mock-offer-oil-change', serviceId: 'oil-change', priceLabel: 'от 2 900 ₽', duration: '45–60 мин', availability: 'Сегодня', includes: ['Масло и фильтр', 'Проверка уровней', 'Сброс сервисного интервала'] },
    { id: 'mock-offer-diagnostics', serviceId: 'diagnostics', priceLabel: 'от 1 200 ₽', duration: '60 мин', availability: 'Сегодня', includes: ['Компьютерная диагностика', 'Отчёт по ошибкам'] },
    { id: 'mock-offer-brakes', serviceId: 'brakes', priceLabel: 'от 3 500 ₽', duration: '90 мин', availability: 'Завтра', includes: ['Осмотр системы', 'Фотоотчёт', 'Гарантия 12 мес.'] },
]

export const providerProfiles: readonly ProviderProfile[] = providerPreviews.map((provider) => ({
    ...provider,
    address: provider.id === 'proservice-moscow' ? 'Москва, ул. Льва Толстого, 18' : 'Москва, Комсомольский пр-т, 45',
    hours: 'Пн–Вс: 08:00–21:00',
    yearsActive: provider.id === 'proservice-moscow' ? 8 : 5,
    staffCount: provider.id === 'proservice-moscow' ? 24 : 12,
    workstationCount: provider.id === 'proservice-moscow' ? 12 : 8,
    phone: '+7 (495) 645-35-35',
    email: 'service@example.com',
    websiteUrl: null,
    metroStation: 'м. Парк культуры',
    warrantyText: 'Гарантия на работы 12 месяцев',
    galleryImageUrls: provider.image ? [provider.image] : [],
    about: 'Проверенный сервис с понятными ценами, фотоотчётом и гарантией на выполненные работы.',
    amenities: ['waiting_room', 'customer_parking', 'wifi', 'online_booking', 'coffee', 'card_payment'],
    offerings: defaultOfferings,
    reviews: [
        { id: `${provider.id}-review-1`, author: 'Алексей С.', rating: 5, date: '2 дня назад', text: 'Сделали быстро, заранее объяснили стоимость. Фотоотчёт пришёл в чате.', serviceId: 'oil-change', photos: ['/images/autocare/providers/generated/service-body-paint.png'] },
        { id: `${provider.id}-review-2`, author: 'Мария К.', rating: 4, date: '1 неделю назад', text: 'Удобная запись и внимательный мастер. Цена совпала с предварительной оценкой.', serviceId: 'diagnostics' },
    ],
}))

export function getServiceLabel(service: AutomotiveService, locale: string) {
    return service.labels[locale] ?? service.labels.en ?? service.id
}

export function getProviderProfile(providerId: string) {
    const normalizedId = providerId.startsWith('api-') ? providerId.slice(4) : providerId
    return providerProfiles.find((provider) => provider.id === providerId || provider.id === normalizedId)
}
