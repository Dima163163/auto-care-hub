import { createRobotsTxt, getPublicSiteUrl } from '@/app/seo/public-seo'

export const dynamic = 'force-dynamic'

export function GET() {
    const siteUrl = getPublicSiteUrl()
    const unconfiguredProductionSite = process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_SITE_URL
    const body = createRobotsTxt(siteUrl, { disallowAll: unconfiguredProductionSite })

    return new Response(body, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        },
    })
}
