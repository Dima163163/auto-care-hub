import { NextClientApp } from '@/app/next/NextClientApp'
import { getRouteMetadata } from '@/app/metadata'
import type { Metadata } from 'next'

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

export default function CatchAllPage() {
    return <NextClientApp />
}
