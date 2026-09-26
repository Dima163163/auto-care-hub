import { describe, expect, it } from 'vitest'

import { getAppMetadata, getRouteMetadata } from './metadata'

describe('route metadata SEO boundaries', () => {
    it('indexes the canonical service discovery landing page', () => {
        expect(getRouteMetadata('/services').robots).toMatchObject({ index: true, follow: true })
    })

    it('keeps query-based discovery results out of the index', () => {
        expect(getRouteMetadata('/services', { hasSearchParams: true }).robots).toMatchObject({ index: false, follow: true })
    })

    it('keeps request and private workspace routes out of the index', () => {
        expect(getRouteMetadata('/services/api-proservice-moscow/request').robots).toMatchObject({ index: false, follow: true })
        expect(getRouteMetadata('/owner/dashboard').robots).toMatchObject({ index: false, follow: true })
        expect(getRouteMetadata('/super-admin/dashboard').robots).toMatchObject({ index: false, follow: true })
        expect(getRouteMetadata('/verify-email').robots).toMatchObject({ index: false, follow: true })
        expect(getRouteMetadata('/favorites').robots).toMatchObject({ index: false, follow: true })
        expect(getRouteMetadata('/community/clients/10000000-0000-4000-8000-000000000001').robots).toMatchObject({ index: false, follow: true })
    })

    it('provides Open Graph metadata for provider profiles', () => {
        const metadata = getRouteMetadata('/services/api-proservice-moscow')
        expect(metadata.openGraph).toMatchObject({ type: 'website', siteName: 'AutoCare Hub' })
        expect(metadata.alternates).toMatchObject({ canonical: expect.stringContaining('/services/api-proservice-moscow') })
    })

    it('renders Russian route and root metadata when the saved locale is Russian', () => {
        expect(getRouteMetadata('/services', { locale: 'ru' })).toMatchObject({
            title: { absolute: 'Найдите надёжный автосервис | AutoCare Hub' },
            openGraph: { title: 'Найдите надёжный автосервис | AutoCare Hub' },
        })
        expect(getAppMetadata('ru')).toMatchObject({
            title: { default: 'AutoCare Hub — проверенные автосервисы рядом' },
            description: 'Сравнивайте цены, отзывы и свободное время проверенных автосервисов поблизости.',
        })
    })
})
