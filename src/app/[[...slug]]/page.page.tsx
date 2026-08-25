import { NextClientApp } from '@/app/next/NextClientApp'
import { getRouteMetadata } from '@/app/metadata'
import { getNextRoutePath, isNextRoutePath } from '@/app/next/next-route-contract'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

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

    return <NextClientApp />
}
