export const publicSitemapPaths = [
    '/',
    '/services',
    '/cabinets',
    '/for-owners',
    '/about',
    '/reviews',
    '/features',
    '/help',
    '/agreement',
    '/rules',
    '/privacy',
] as const

export function getPublicSiteUrl(configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL) {
    if (configuredSiteUrl) return new URL(configuredSiteUrl).origin
    return 'http://localhost:3000'
}

export function createRobotsTxt(siteUrl: string, { disallowAll = false } = {}) {
    const lines = ['User-agent: *']

    if (disallowAll) {
        lines.push('Disallow: /')
        return `${lines.join('\n')}\n`
    }

    lines.push(
        'Allow: /',
        'Disallow: /admin/',
        'Disallow: /super-admin/',
        'Disallow: /owner/',
        'Disallow: /profile/',
        'Disallow: /chats/',
        'Disallow: /onboarding/',
        'Disallow: /notifications/',
        'Disallow: /login',
        'Disallow: /register',
        'Disallow: /forgot-password',
        'Disallow: /password/',
        'Disallow: /verify-email',
        'Disallow: /favorites',
        `Sitemap: ${new URL('/sitemap.xml', siteUrl).toString()}`,
    )
    return `${lines.join('\n')}\n`
}

export function createSitemapXml(siteUrl: string, paths: readonly string[], providerIds: readonly string[]) {
    const urls = new Set([
        ...paths.map((pathname) => new URL(pathname, siteUrl).toString()),
        ...providerIds.map((providerId) => new URL(`/services/${encodeURIComponent(providerId)}`, siteUrl).toString()),
    ])
    const urlEntries = [...urls].map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`)
    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...urlEntries,
        '</urlset>',
        '',
    ].join('\n')
}

function escapeXml(value: string) {
    return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;')
}
