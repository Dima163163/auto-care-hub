import type { Metadata } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://autocarehub.app'

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

const privatePrefixes = ['/admin', '/owner', '/profile', '/chats', '/onboarding', '/notifications']
const noIndexRoutes = ['/login', '/register', '/forgot-password', '/password']
const indexRobots = { index: true, follow: true, other: { 'max-image-preview': 'large' } }

type RouteMetadataOptions = {
    hasSearchParams?: boolean
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
    const copy = publicCopy[path] ?? (isProvider
        ? {
            title: 'Trusted automotive service | AutoCare Hub',
            description: 'View services, prices, ratings and appointment options from a trusted automotive provider.',
        }
        : publicCopy['/'])
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
            images: [{ url: '/images/autocare/hero-map-generated.webp', alt: 'AutoCare Hub automotive service map' }],
        },
        twitter: {
            card: 'summary_large_image',
            title: copy.title,
            description: copy.description,
            images: ['/images/autocare/hero-map-generated.webp'],
        },
    }
}

export const appMetadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: {
        default: 'AutoCare Hub — Compare trusted automotive services',
        template: '%s | AutoCare Hub',
    },
    description: publicCopy['/'].description,
    applicationName: 'AutoCare Hub',
    keywords: ['auto service', 'car repair', 'oil change', 'tire service', 'detailing', 'vehicle maintenance'],
    creator: 'AutoCare Hub',
    publisher: 'AutoCare Hub',
    alternates: { canonical: siteUrl },
    robots: indexRobots,
    openGraph: {
        type: 'website',
        siteName: 'AutoCare Hub',
        title: 'AutoCare Hub — Compare trusted automotive services',
        description: publicCopy['/'].description,
        url: siteUrl,
        images: [{ url: '/images/autocare/hero-map-generated.webp', alt: 'AutoCare Hub automotive service map' }],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'AutoCare Hub — Compare trusted automotive services',
        description: publicCopy['/'].description,
        images: ['/images/autocare/hero-map-generated.webp'],
    },
    icons: {
        icon: '/favicon.svg',
    },
}
