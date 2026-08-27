import { NextClientApp } from '@/app/next/NextClientApp'
import { getRouteMetadata } from '@/app/metadata'
import type { Metadata } from 'next'

type ServiceDiscoveryPageProps = {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}

export const revalidate = 300

// Next.js uses the query-aware metadata to keep filtered result pages noindex
// while the canonical `/services` landing page stays discoverable.
// eslint-disable-next-line react-refresh/only-export-components
export async function generateMetadata({ searchParams }: ServiceDiscoveryPageProps): Promise<Metadata> {
    const query = await searchParams
    return getRouteMetadata('/services', { hasSearchParams: Object.keys(query).length > 0 })
}

export default function ServiceDiscoveryPage() {
    return <NextClientApp initialPathname="/services" />
}
