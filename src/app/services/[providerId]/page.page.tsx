import { NextClientApp } from '@/app/next/NextClientApp'
import { getRouteMetadata } from '@/app/metadata'
import type { Metadata } from 'next'

const DEFAULT_PROVIDER_IDS = [
    'api-proservice-moscow',
    'api-autolux-moscow',
    'api-formula-moscow',
] as const

function getProviderIdsForPrerender() {
    const configured = String(process.env.NEXT_PUBLIC_PRERENDER_PROVIDER_IDS ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)

    return configured.length > 0 ? configured : [...DEFAULT_PROVIDER_IDS]
}

export const revalidate = 300
export const dynamicParams = true

type ProviderPageProps = {
    params: Promise<{ providerId: string }>
}

// eslint-disable-next-line react-refresh/only-export-components
export function generateStaticParams() {
    return getProviderIdsForPrerender().map((providerId) => ({ providerId }))
}

// eslint-disable-next-line react-refresh/only-export-components
export async function generateMetadata({ params }: ProviderPageProps): Promise<Metadata> {
    const { providerId } = await params
    return getRouteMetadata(`/services/${providerId}`)
}

export default async function ProviderPage({ params }: ProviderPageProps) {
    const { providerId } = await params
    return <NextClientApp initialPathname={`/services/${providerId}`} />
}
