import type { Metadata } from 'next'
import { headers } from 'next/headers'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

const publicCopy: Record<string, { title: string; description: string }> = {
    '/': {
        title: 'AutoCare Hub — Compare trusted automotive services',
        description: 'Compare prices, ratings and available appointments at trusted automotive services near you.',
    },
    '/services': {
        title: 'Find trusted automotive services | AutoCare Hub',
        description: 'Search and compare automotive services by location, price, rating and available appointments.',
    },
    '/for-owners': {
        title: 'For automotive service owners | AutoCare Hub',
        description: 'Create a service profile, receive qualified requests and grow your automotive business with AutoCare Hub.',
    },
    '/about': {
        title: 'About AutoCare Hub',
        description: 'AutoCare Hub helps drivers compare automotive services and helps reliable providers earn trust and new customers.',
    },
    '/reviews': {
        title: 'AutoCare Hub customer reviews',
        description: 'Read verified customer feedback about AutoCare Hub and the automotive service experience.',
    },
    '/help': {
        title: 'Help and information | AutoCare Hub',
        description: 'Find answers about service discovery, requests, appointments, reviews, bonuses and provider profiles.',
    },
    '/features': {
        title: 'AutoCare Hub features',
        description: 'Explore comparison, trusted reviews, appointment requests and provider tools from AutoCare Hub.',
    },
    '/agreement': {
        title: 'User agreement | AutoCare Hub',
        description: 'Rules for using AutoCare Hub accounts, service discovery, requests, reviews and provider tools.',
    },
    '/rules': {
        title: 'Terms of use | AutoCare Hub',
        description: 'Terms for using the AutoCare Hub marketplace, requests, reviews, bonuses and automotive service tools.',
    },
    '/privacy': {
        title: 'Privacy policy | AutoCare Hub',
        description: 'How AutoCare Hub handles account, vehicle, request, message, photo and review data.',
    },
}

const russianPublicCopy: Record<string, { title: string; description: string }> = {
    '/': { title: 'AutoCare Hub — проверенные автосервисы рядом', description: 'Сравнивайте цены, отзывы и свободное время проверенных автосервисов поблизости.' },
    '/services': { title: 'Найдите надёжный автосервис | AutoCare Hub', description: 'Ищите и сравнивайте автосервисы по району, цене, рейтингу и доступному времени.' },
    '/for-owners': { title: 'Для владельцев автосервисов | AutoCare Hub', description: 'Создайте профиль сервиса, получайте заявки от клиентов и развивайте бизнес.' },
    '/about': { title: 'О проекте AutoCare Hub', description: 'AutoCare Hub помогает водителям сравнивать автосервисы, а надёжным компаниям — находить клиентов.' },
    '/reviews': { title: 'Отзывы клиентов | AutoCare Hub', description: 'Читайте отзывы клиентов об автосервисах и опыте обслуживания автомобилей.' },
    '/help': { title: 'Помощь и информация | AutoCare Hub', description: 'Ответы о поиске автосервиса, заявках, записи, отзывах и профилях компаний.' },
    '/features': { title: 'Возможности AutoCare Hub', description: 'Сравнение автосервисов, отзывы, заявки на запись и инструменты для компаний.' },
    '/agreement': { title: 'Пользовательское соглашение | AutoCare Hub', description: 'Правила использования аккаунтов, поиска автосервисов, заявок, отзывов и бонусов.' },
    '/rules': { title: 'Правила использования | AutoCare Hub', description: 'Условия работы с каталогом автосервисов, заявками, отзывами и бонусами AutoCare Hub.' },
    '/privacy': { title: 'Политика конфиденциальности | AutoCare Hub', description: 'Как AutoCare Hub обрабатывает данные аккаунта, автомобиля, заявок, переписки, фотографий и отзывов.' },
}

const privatePrefixes = ['/admin', '/super-admin', '/owner', '/profile', '/chats', '/onboarding', '/notifications']
const noIndexRoutes = ['/login', '/register', '/forgot-password', '/password', '/verify-email', '/favorites', '/community/clients']
const indexRobots = { index: true, follow: true, other: { 'max-image-preview': 'large' } }

type RouteMetadataOptions = {
    hasSearchParams?: boolean
    locale?: 'en' | 'ru'
}

function normalizePathname(pathname: string) {
    const normalized = pathname.trim().replace(/\/{2,}/g, '/').replace(/\/$/, '')
    return normalized || '/'
}

export function getRouteMetadata(pathname: string, options: RouteMetadataOptions = {}): Metadata {
    const path = normalizePathname(pathname)
    const isPrivate = privatePrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
    const isServiceRequest = /^\/services\/[^/]+\/request$/.test(path)
    const isSearchResult = path === '/services' && options.hasSearchParams === true
    const isNoIndex = isPrivate || isServiceRequest || isSearchResult || noIndexRoutes.some((prefix) =>
        path === prefix || path.startsWith(`${prefix}/`))
    const isProvider = path.startsWith('/services/') && path !== '/services'
    const localizedCopy = options.locale === 'ru' ? russianPublicCopy : publicCopy
    const copy = localizedCopy[path] ?? (isProvider
        ? {
            title: options.locale === 'ru' ? 'Автосервис | AutoCare Hub' : 'Trusted automotive service | AutoCare Hub',
            description: options.locale === 'ru'
                ? 'Услуги, цены, отзывы и варианты записи в автосервис.'
                : 'View services, prices, ratings and appointment options from a trusted automotive provider.',
        }
        : localizedCopy['/'])
    const canonical = new URL(path, siteUrl).toString()

    return {
        title: { absolute: copy.title },
        description: copy.description,
        alternates: { canonical },
        robots: isNoIndex ? { index: false, follow: true } : indexRobots,
        openGraph: {
            type: 'website',
            siteName: 'AutoCare Hub',
            title: copy.title,
            description: copy.description,
            url: canonical,
            images: [{ url: '/images/autocare/hero-map-generated.webp', alt: options.locale === 'ru' ? 'Карта автосервисов AutoCare Hub' : 'AutoCare Hub automotive service map' }],
        },
        twitter: {
            card: 'summary_large_image',
            title: copy.title,
            description: copy.description,
            images: ['/images/autocare/hero-map-generated.webp'],
        },
    }
}

export function getAppMetadata(locale: 'en' | 'ru' = 'en'): Metadata {
    const copy = locale === 'ru' ? russianPublicCopy['/'] : publicCopy['/']
    return {
        metadataBase: new URL(siteUrl),
        title: { default: copy.title, template: '%s | AutoCare Hub' },
        description: copy.description,
        applicationName: 'AutoCare Hub',
        keywords: locale === 'ru'
            ? ['автосервис', 'ремонт автомобиля', 'замена масла', 'шиномонтаж', 'обслуживание автомобиля']
            : ['auto service', 'car repair', 'oil change', 'tire service', 'detailing', 'vehicle maintenance'],
        creator: 'AutoCare Hub',
        publisher: 'AutoCare Hub',
        alternates: { canonical: siteUrl },
        robots: indexRobots,
        openGraph: {
            type: 'website',
            siteName: 'AutoCare Hub',
            title: copy.title,
            description: copy.description,
            url: siteUrl,
            images: [{ url: '/images/autocare/hero-map-generated.webp', alt: locale === 'ru' ? 'Карта автосервисов AutoCare Hub' : 'AutoCare Hub automotive service map' }],
        },
        twitter: {
            card: 'summary_large_image',
            title: copy.title,
            description: copy.description,
            images: ['/images/autocare/hero-map-generated.webp'],
        },
        icons: { icon: '/favicon.svg' },
    }
}

export async function getRequestLocale(): Promise<'en' | 'ru'> {
    const requestHeaders = await headers()
    const savedLanguage = /(?:^|;\s*)autocare-hub-locale=(en|ru)(?:;|$)/i.exec(requestHeaders.get('cookie') ?? '')?.[1]?.toLowerCase()
    if (savedLanguage === 'ru' || savedLanguage === 'en') return savedLanguage
    return /(?:^|[,;\s])ru(?:[-,;\s]|$)/i.test(requestHeaders.get('accept-language') ?? '') ? 'ru' : 'en'
}
