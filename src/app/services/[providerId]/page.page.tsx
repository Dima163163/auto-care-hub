import { NextClientApp } from '@/app/next/NextClientApp'
import { getRequestLocale, getRouteMetadata } from '@/app/metadata'
import { getServerPublicProviderProfile } from '@/app/server-provider'
import { getPublicAutoCareProviderIds } from '@/app/seo/provider-sitemap'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

// The root layout reads request headers to set the initial language. Provider
// profiles therefore need an on-demand render when their dynamic segment is
// not one of the build-time SEO seeds.
export const dynamic = 'force-dynamic'
export const dynamicParams = true

// eslint-disable-next-line react-refresh/only-export-components -- Next.js route data exports belong beside the route component.
export async function generateStaticParams() {
    const providerIds = await getPublicAutoCareProviderIds(process.env.NEXT_PUBLIC_PRERENDER_PROVIDER_IDS)
    return providerIds.map((providerId) => ({ providerId }))
}

type ProviderPageProps = {
    params: Promise<{ providerId: string }>
    searchParams: Promise<Record<string, string | string[] | undefined>>
}

// eslint-disable-next-line react-refresh/only-export-components
export async function generateMetadata({ params }: ProviderPageProps): Promise<Metadata> {
    const { providerId } = await params
    const locale = await getRequestLocale()
    const { profile, notFound: providerNotFound } = await getServerPublicProviderProfile(providerId)
    if (providerNotFound) return { ...getRouteMetadata(`/services/${providerId}`, { locale }), robots: { index: false, follow: false } }

    const metadata = getRouteMetadata(`/services/${providerId}`, { locale })
    if (!profile) return { ...metadata, robots: { index: false, follow: false } }

    const title = `${profile.name} | AutoCare Hub`
    const description = profile.description?.trim() || (locale === 'ru'
        ? `Услуги, цены и варианты записи в автосервисе «${profile.name}».`
        : `Compare published service offers, customer reviews and appointment options from ${profile.name}.`)
    const imageUrl = getPublicImageUrl(profile.coverImageUrl)
    return {
        ...metadata,
        title: { absolute: title },
        description,
        openGraph: { ...metadata.openGraph, title, description, ...(imageUrl ? { images: [{ url: imageUrl, alt: profile.name }] } : {}) },
        twitter: { ...metadata.twitter, title, description, ...(imageUrl ? { images: [imageUrl] } : {}) },
    }
}

export default async function ProviderPage({ params, searchParams }: ProviderPageProps) {
    const { providerId } = await params
    const [result, locale, query] = await Promise.all([getServerPublicProviderProfile(providerId), getRequestLocale(), searchParams])
    if (result.notFound) notFound()
    const selectedServiceId = typeof query.service === 'string' ? query.service : undefined
    return <NextClientApp
        initialPathname={`/services/${providerId}`}
        initialPublicProviderProfile={result.profile ?? undefined}
        initialProviderLocale={locale}
        initialProviderSelectedServiceId={selectedServiceId}
    />
}

function getPublicImageUrl(value: string | null) {
    if (!value) return undefined
    try {
        const url = new URL(value, process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000')
        return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined
    } catch {
        return undefined
    }
}
