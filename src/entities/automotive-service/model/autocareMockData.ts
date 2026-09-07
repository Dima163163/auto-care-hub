import type { AutomotiveAmenityId } from './automotiveAmenities'
import { providerPreviews } from './autocareMockProviders'

export { automotiveServices, type AutomotiveService } from './autocareServiceCatalog'
export { providerPreviews } from './autocareMockProviders'

export type AutomotivePriceType = 'fixed' | 'from' | 'range' | 'quote_required'

export type ProviderPreview = {
    id: string
    name: string
    rating: number
    reviewCount: number
    distance: string
    price: number
    priceTo?: number | null
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

export type ProviderScheduleDay = {
    open: string
    close: string
    closed: boolean
}

export type ProviderReview = {
    id: string
    author: string
    vehicleLabel?: string
    avatarUrl?: string | null
    rating: number
    date: string
    text: string
    serviceId: string
    photos?: readonly string[]
}

export type ProviderProfile = ProviderPreview & {
    status?: 'draft' | 'active' | 'suspended'
    locationId?: string
    address: string
    hours: string
    yearsActive: number
    staffCount: number
    workstationCount: number
    phone: string | null
    phones: readonly string[]
    email: string | null
    websiteUrl: string | null
    metroStation: string | null
    warrantyText: string | null
    galleryImageUrls: readonly string[]
    about: string
    amenities: readonly AutomotiveAmenityId[]
    offerings: readonly ProviderOffering[]
    reviews: readonly ProviderReview[]
    reviewDistribution?: Record<'1' | '2' | '3' | '4' | '5', number>
    supportsMobile?: boolean
    supportsPickup?: boolean
    coverageRadiusKm?: number | null
    teamSize?: 'solo' | 'small_team' | 'team' | 'enterprise'
    businessType?: 'sole_proprietor' | 'self_employed' | 'company' | 'private_master' | 'other'
    chatEnabled?: boolean
    communicationMode?: 'online' | 'request_then_confirm' | 'phone_only'
    responseWindowMinutes?: number | null
    responseHours?: 'working_hours' | 'always_on'
    phoneBookingEnabled?: boolean
    callbackEnabled?: boolean
    requestPhotosEnabled?: boolean
    publicContactNote?: string | null
    timezone?: string
    weeklySchedule?: Readonly<Record<string, ProviderScheduleDay>>
    blackoutDates?: readonly string[]
    appointmentCapacity?: number
}

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
    phones: ['+7 (495) 645-35-35'],
    email: 'service@example.com',
    websiteUrl: null,
    metroStation: 'м. Парк культуры',
    warrantyText: 'Гарантия на работы 12 месяцев',
    galleryImageUrls: provider.image ? [provider.image] : [],
    about: 'Проверенный сервис с понятными ценами, фотоотчётом и гарантией на выполненные работы.',
    amenities: ['waiting_room', 'customer_parking', 'wifi', 'online_booking', 'coffee'],
    offerings: defaultOfferings,
    reviews: [
        { id: `${provider.id}-review-1`, author: 'Алексей С.', rating: 5, date: '2 дня назад', text: 'Сделали быстро, заранее объяснили стоимость. Фотоотчёт пришёл в чате.', serviceId: 'oil-change', photos: ['/images/autocare/providers/generated/service-body-paint.png'] },
        { id: `${provider.id}-review-2`, author: 'Мария К.', rating: 4, date: '1 неделю назад', text: 'Удобная запись и внимательный мастер. Цена совпала с предварительной оценкой.', serviceId: 'diagnostics' },
    ],
}))

export function getProviderProfile(providerId: string) {
    const normalizedId = providerId.startsWith('api-') ? providerId.slice(4) : providerId
    return providerProfiles.find((provider) => provider.id === providerId || provider.id === normalizedId)
}
