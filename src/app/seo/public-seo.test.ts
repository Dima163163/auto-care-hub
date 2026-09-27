import { describe, expect, it } from 'vitest'

import { createRobotsTxt, createSitemapXml, getPublicSiteUrl, publicSitemapPaths } from './public-seo'

describe('public SEO routes', () => {
    it('uses one configured public origin for robots and sitemap', () => {
        const siteUrl = getPublicSiteUrl('https://www.example.test/path')
        expect(siteUrl).toBe('https://www.example.test')
        expect(createRobotsTxt(siteUrl)).toContain('Sitemap: https://www.example.test/sitemap.xml')
        expect(createSitemapXml(siteUrl, publicSitemapPaths, [])).toContain('<loc>https://www.example.test/services</loc>')
    })

    it('keeps private product areas out of crawling and can close indexing until a production domain is configured', () => {
        const robots = createRobotsTxt('https://www.example.test')
        expect(robots).toContain('Disallow: /super-admin/')
        expect(robots).toContain('Disallow: /profile/')
        expect(createRobotsTxt('https://www.example.test', { disallowAll: true })).toBe('User-agent: *\nDisallow: /\n')
    })

    it('includes public provider profiles, escapes XML and omits duplicate URLs', () => {
        const sitemap = createSitemapXml('https://www.example.test', ['/services'], ['provider-1', 'provider&2'])
        expect(sitemap.match(/<loc>https:\/\/www\.example\.test\/services<\/loc>/g)).toHaveLength(1)
        expect(sitemap).toContain('<loc>https://www.example.test/services/provider-1</loc>')
        expect(sitemap).toContain('provider%262')
    })
})
