import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { getAuthRouteCopy, shouldNoIndexRoute } from '../shared/config/route-metadata-policy'
import { normalizePublicLocale, normalizeServerLocale, REQUEST_LOCALE_HEADER } from '../shared/config/i18n'

import type { ServerLocale } from '../shared/config/i18n'

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

const additionalPublicCopy: Record<'es' | 'ro', Record<string, { title: string; description: string }>> = {
    es: {
        '/': { title: 'AutoCare Hub — Talleres de confianza', description: 'Compara precios, valoraciones y citas disponibles en talleres cercanos.' },
        '/services': { title: 'Encuentra talleres de confianza | AutoCare Hub', description: 'Busca y compara talleres por zona, precio, valoración y disponibilidad.' },
        '/for-owners': { title: 'Para propietarios de talleres | AutoCare Hub', description: 'Crea el perfil de tu taller y recibe solicitudes de clientes.' },
        '/about': { title: 'Sobre AutoCare Hub', description: 'Ayudamos a los conductores a comparar talleres de automoción.' },
        '/reviews': { title: 'Opiniones de clientes | AutoCare Hub', description: 'Consulta opiniones sobre talleres y servicios de automoción.' },
        '/help': { title: 'Ayuda e información | AutoCare Hub', description: 'Encuentra respuestas sobre talleres, solicitudes y citas.' },
        '/features': { title: 'Funciones de AutoCare Hub', description: 'Compara talleres, consulta opiniones y solicita citas.' },
        '/agreement': { title: 'Acuerdo de usuario | AutoCare Hub', description: 'Consulta las reglas para las cuentas y servicios de AutoCare Hub.' },
        '/rules': { title: 'Condiciones de uso | AutoCare Hub', description: 'Consulta las condiciones del catálogo, las solicitudes y las opiniones.' },
        '/privacy': { title: 'Política de privacidad | AutoCare Hub', description: 'Descubre cómo tratamos los datos de cuentas, vehículos, solicitudes y mensajes.' },
    },
    ro: {
        '/': { title: 'AutoCare Hub — Service-uri auto de încredere', description: 'Compară prețurile, evaluările și programările disponibile la service-uri din apropiere.' },
        '/services': { title: 'Găsește service-uri auto de încredere | AutoCare Hub', description: 'Caută și compară service-uri auto după zonă, preț, evaluări și disponibilitate.' },
        '/for-owners': { title: 'Pentru proprietarii de service-uri | AutoCare Hub', description: 'Creează profilul service-ului și primește solicitări de la clienți.' },
        '/about': { title: 'Despre AutoCare Hub', description: 'Ajutăm șoferii să compare service-uri auto.' },
        '/reviews': { title: 'Recenziile clienților | AutoCare Hub', description: 'Citește recenzii despre service-uri și servicii auto.' },
        '/help': { title: 'Ajutor și informații | AutoCare Hub', description: 'Găsește răspunsuri despre căutare, solicitări și programări.' },
        '/features': { title: 'Funcțiile AutoCare Hub', description: 'Compară service-uri, citește recenzii și trimite solicitări de programare.' },
        '/agreement': { title: 'Acordul utilizatorului | AutoCare Hub', description: 'Consultă regulile pentru conturile și serviciile AutoCare Hub.' },
        '/rules': { title: 'Condiții de utilizare | AutoCare Hub', description: 'Consultă condițiile pentru catalog, solicitări și recenzii.' },
        '/privacy': { title: 'Politica de confidențialitate | AutoCare Hub', description: 'Află cum gestionăm datele despre conturi, vehicule, solicitări și mesaje.' },
    },
}

const publicCopyByLocale = { en: publicCopy, ru: russianPublicCopy, ...additionalPublicCopy }
const providerCopy = {
    en: { title: 'Trusted automotive service | AutoCare Hub', description: 'View services, prices, ratings and appointment options from a trusted automotive provider.' },
    ru: { title: 'Автосервис | AutoCare Hub', description: 'Услуги, цены, отзывы и варианты записи в автосервис.' },
    es: { title: 'Taller de confianza | AutoCare Hub', description: 'Consulta los servicios, precios, opiniones y opciones de cita del taller.' },
    ro: { title: 'Service auto de încredere | AutoCare Hub', description: 'Vezi serviciile, prețurile, recenziile și opțiunile de programare.' },
}
const imageAlt = {
    en: 'AutoCare Hub automotive service map', ru: 'Карта автосервисов AutoCare Hub',
    es: 'Mapa de talleres de AutoCare Hub', ro: 'Harta service-urilor AutoCare Hub',
}
const keywords = {
    en: ['auto service', 'car repair', 'oil change', 'tire service', 'detailing', 'vehicle maintenance'],
    ru: ['автосервис', 'ремонт автомобиля', 'замена масла', 'шиномонтаж', 'обслуживание автомобиля'],
    es: ['taller mecánico', 'reparación de vehículos', 'cambio de aceite'],
    ro: ['service auto', 'reparații auto', 'schimb de ulei'],
}

const indexRobots = { index: true, follow: true, other: { 'max-image-preview': 'large' } }

type RouteMetadataOptions = {
    hasSearchParams?: boolean
    locale?: ServerLocale
}

function normalizePathname(pathname: string) {
    const normalized = pathname.trim().replace(/\/{2,}/g, '/').replace(/\/$/, '')
    return normalized || '/'
}

export function getRouteMetadata(pathname: string, options: RouteMetadataOptions = {}): Metadata {
    const path = normalizePathname(pathname)
    const isNoIndex = shouldNoIndexRoute(path, options.hasSearchParams)
    const isProvider = path.startsWith('/services/') && path !== '/services'
    const locale = options.locale ?? 'en'
    const localizedCopy = publicCopyByLocale[locale]
    const copy = getAuthRouteCopy(path, locale) ?? localizedCopy[path] ?? (isProvider ? providerCopy[locale] : localizedCopy['/'])
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
            images: [{ url: '/images/autocare/hero-map-generated.webp', alt: imageAlt[locale] }],
        },
        twitter: {
            card: 'summary_large_image',
            title: copy.title,
            description: copy.description,
            images: ['/images/autocare/hero-map-generated.webp'],
        },
    }
}

export function getAppMetadata(locale: ServerLocale = 'en'): Metadata {
    const copy = publicCopyByLocale[locale]['/']
    return {
        metadataBase: new URL(siteUrl),
        title: { default: copy.title, template: '%s | AutoCare Hub' },
        description: copy.description,
        applicationName: 'AutoCare Hub',
        keywords: keywords[locale],
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
            images: [{ url: '/images/autocare/hero-map-generated.webp', alt: imageAlt[locale] }],
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

export function resolveRequestLocale(requestHeaders: Pick<Headers, 'get'>): ServerLocale {
    const urlLocale = normalizeServerLocale(requestHeaders.get(REQUEST_LOCALE_HEADER))
    if (urlLocale) return urlLocale
    const savedLanguage = /(?:^|;\s*)autocare-hub-locale=(en|ru)(?:;|$)/i.exec(requestHeaders.get('cookie') ?? '')?.[1]?.toLowerCase()
    const savedLocale = normalizePublicLocale(savedLanguage)
    if (savedLocale) return savedLocale
    return /(?:^|[,;\s])ru(?:[-,;\s]|$)/i.test(requestHeaders.get('accept-language') ?? '') ? 'ru' : 'en'
}

export async function getRequestLocale(): Promise<ServerLocale> {
    return resolveRequestLocale(await headers())
}
