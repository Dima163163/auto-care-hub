import { getPublicAutoCareProviderIds } from '@/app/seo/provider-sitemap'
import { createSitemapXml, getPublicSiteUrl, publicSitemapPaths } from '@/app/seo/public-seo'

export const dynamic = 'force-dynamic'

export async function GET() {
    const hasConfiguredPublicSiteUrl = Boolean(process.env.NEXT_PUBLIC_SITE_URL)
    const unconfiguredProductionSite = process.env.NODE_ENV === 'production' && !hasConfiguredPublicSiteUrl
    const providerIds = unconfiguredProductionSite ? [] : await getPublicAutoCareProviderIds()
    const body = createSitemapXml(getPublicSiteUrl(), unconfiguredProductionSite ? [] : publicSitemapPaths, providerIds)

    return new Response(body, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        },
    })
}
