import { NextClientApp } from '@/app/next/NextClientApp'
import { getRouteMetadata } from '@/app/metadata'
import { getNextRoutePath, isNextRoutePath } from '@/app/next/next-route-contract'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

/**
 * Public pages are generated as an ISR shell so crawlers receive canonical
 * metadata and the stable layout without waiting for the client API tree.
 * Unknown provider ids continue to render dynamically through `dynamicParams`.
 */
export const revalidate = 300
export const dynamicParams = true

const PRERENDERED_PUBLIC_PATHS = [
    '/',
    '/for-owners',
    '/about',
    '/reviews',
    '/features',
    '/help',
    '/agreement',
    '/rules',
    '/privacy',
] as const

function pathToSlug(pathname: string) {
    return pathname === '/' ? [] : pathname.slice(1).split('/')
}

/**
 * Keep the stable public route shell in the build output. Provider profiles
 * have their own `[providerId]` route so they can be generated independently
 * from the query-driven discovery page.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function generateStaticParams() {
    return PRERENDERED_PUBLIC_PATHS.map((pathname) => ({ slug: pathToSlug(pathname) }))
}

type CatchAllPageProps = {
    params: Promise<{ slug?: string[] }>
}

// Next.js consumes this server export for crawler-visible metadata.
// eslint-disable-next-line react-refresh/only-export-components
export async function generateMetadata({ params }: CatchAllPageProps): Promise<Metadata> {
    const { slug } = await params
    return getRouteMetadata(`/${slug?.join('/') ?? ''}`)
}

export default async function CatchAllPage({ params }: CatchAllPageProps) {
    const { slug } = await params
    const pathname = getNextRoutePath(`/${slug?.join('/') ?? ''}`)

    if (!isNextRoutePath(pathname)) {
        notFound()
    }

    return <NextClientApp initialPathname={pathname} />
}
