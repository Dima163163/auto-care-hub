import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { AutomotivePriceType, AutomotiveProviderStatus } from '../../entities/automotive/automotive.entity.js'

export const AUTOCARE_MOCK_FALLBACK_IMAGE = '/images/autocare/placeholders/provider.svg'

export type AutomotiveMockProvider = {
    key: string
    name: string
    description: string
    verified: boolean
    yearsActive: number
    staffCount: number
    rating: number
    reviewCount: number
    bonusSummary?: string | null
    imageUrl?: string | null
    galleryImageUrls?: string[]
    brandSpecializations: string[]
    isMultibrand: boolean
    address: string
    hours: string
    latitude: number
    longitude: number
    offerings: Array<{ serviceSlug: string; priceFromMinor: number; durationMinutes: number }>
}

export const AUTOMOTIVE_MOCK_MARKET = {
    countryCode: 'RU',
    countryName: 'Россия',
    cityCode: 'moscow',
    cityName: 'Москва',
    currencyCode: 'RUB',
    defaultLocale: 'ru',
    supportedLocales: ['ru', 'en', 'es', 'ro'],
    timezone: 'Europe/Moscow',
    launchReady: true,
}

export const AUTOMOTIVE_MOCK_SERVICES = [
    { slug: 'oil-change', categorySlug: 'maintenance', labels: { ru: 'Замена масла', en: 'Oil change', es: 'Cambio de aceite', ro: 'Schimb ulei' } },
    { slug: 'tire-service', categorySlug: 'tires', labels: { ru: 'Шиномонтаж', en: 'Tire service', es: 'Neumáticos', ro: 'Anvelope' } },
    { slug: 'diagnostics', categorySlug: 'diagnostics', labels: { ru: 'Диагностика', en: 'Diagnostics', es: 'Diagnóstico', ro: 'Diagnoză' } },
    { slug: 'brakes', categorySlug: 'brakes', labels: { ru: 'Тормозная система', en: 'Brakes', es: 'Frenos', ro: 'Frâne' } },
    { slug: 'detailing', categorySlug: 'detailing', labels: { ru: 'Детейлинг', en: 'Detailing', es: 'Detallado', ro: 'Detailing' } },
    { slug: 'body-paint', categorySlug: 'body', labels: { ru: 'Кузов и покраска', en: 'Body & paint', es: 'Carrocería y pintura', ro: 'Caroserie și vopsire' } },
] as const satisfies ReadonlyArray<{ slug: string; categorySlug: string; labels: Record<string, string> }>

export const AUTOMOTIVE_MOCK_PROVIDERS: readonly AutomotiveMockProvider[] = [
    {
        key: 'proservice-moscow', name: 'ProService', description: 'Проверенный сервис с фотоотчётом и гарантией на выполненные работы.', verified: true,
        yearsActive: 8, staffCount: 24, rating: 4.7, reviewCount: 256, bonusSummary: '5% back', imageUrl: '/images/autocare/providers/proservice.webp', galleryImageUrls: ['/images/autocare/providers/proservice.webp'],
        address: 'Москва, ул. Льва Толстого, 18', hours: 'Пн–Вс: 08:00–21:00', latitude: 55.7337, longitude: 37.5876,
        brandSpecializations: ['bmw', 'mercedes-benz', 'audi'], isMultibrand: false,
        offerings: [{ serviceSlug: 'oil-change', priceFromMinor: 290000, durationMinutes: 60 }, { serviceSlug: 'diagnostics', priceFromMinor: 120000, durationMinutes: 60 }, { serviceSlug: 'brakes', priceFromMinor: 350000, durationMinutes: 90 }],
    },
    {
        key: 'autolux-moscow', name: 'AutoLux', description: 'Диагностика, обслуживание и кузовные работы в одном месте.', verified: true,
        yearsActive: 5, staffCount: 12, rating: 4.9, reviewCount: 412, imageUrl: '/images/autocare/providers/detailing.webp', galleryImageUrls: ['/images/autocare/providers/detailing.webp'],
        address: 'Москва, Комсомольский пр-т, 45', hours: 'Пн–Вс: 09:00–22:00', latitude: 55.7104, longitude: 37.5838,
        brandSpecializations: ['toyota', 'volkswagen', 'skoda'], isMultibrand: false,
        offerings: [{ serviceSlug: 'oil-change', priceFromMinor: 320000, durationMinutes: 60 }, { serviceSlug: 'detailing', priceFromMinor: 650000, durationMinutes: 180 }],
    },
    {
        key: 'formula-moscow', name: 'Formula Motion', description: 'Сервис для планового обслуживания, шин и сложной диагностики.', verified: false,
        yearsActive: 4, staffCount: 10, rating: 4.6, reviewCount: 189, bonusSummary: 'Free check', imageUrl: '/images/autocare/providers/bodyshop.webp', galleryImageUrls: ['/images/autocare/providers/bodyshop.webp'],
        address: 'Москва, ул. Плющиха, 10', hours: 'Пн–Сб: 08:00–20:00', latitude: 55.7361, longitude: 37.5747,
        brandSpecializations: [], isMultibrand: true,
        offerings: [{ serviceSlug: 'oil-change', priceFromMinor: 280000, durationMinutes: 45 }, { serviceSlug: 'body-paint', priceFromMinor: 1500000, durationMinutes: 360 }],
    },
] as const

export function resolveMockAssetUrl(imageUrl: string | null | undefined, publicRoot = resolve(process.cwd(), '../public')) {
    const candidate = imageUrl?.trim()
    if (!candidate || !candidate.startsWith('/')) {
        return AUTOCARE_MOCK_FALLBACK_IMAGE
    }

    const assetPath = resolve(publicRoot, `.${candidate}`)
    const normalizedRoot = resolve(publicRoot)
    const isInsidePublicRoot = assetPath === normalizedRoot || assetPath.startsWith(`${normalizedRoot}/`)

    return isInsidePublicRoot && existsSync(assetPath) ? candidate : AUTOCARE_MOCK_FALLBACK_IMAGE
}

export const AUTOCARE_MOCK_PRICE_TYPE = AutomotivePriceType.From
export const AUTOCARE_MOCK_PROVIDER_STATUS = AutomotiveProviderStatus.Active
