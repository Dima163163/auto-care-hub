import { describe, expect, it } from 'vitest'

import {
    normalizeSuperAdminMarketCountryCreateInput,
    normalizeSuperAdminMarketCreateInput,
    normalizeSuperAdminMarketHierarchyUuid,
    normalizeSuperAdminLegacyMarketUpdateInput,
    normalizeSuperAdminMarketUpdateInput,
    normalizeSuperAdminMarketZoneCreateInput,
} from './super-admin-market-hierarchy-policy.js'

const marketProfile = {
    defaultLocale: 'en',
    supportedLocales: ['en', 'ru'],
    timezone: 'Europe/Samara',
    currencyCode: 'EUR',
    capabilities: { search: true },
    legalLinks: { privacy: 'https://example.test/privacy' },
}

describe('super-admin market hierarchy input policy', () => {
    it('normalizes country strings and preserves schema defaults', () => {
        const result = normalizeSuperAdminMarketCountryCreateInput({
            ...marketProfile,
            code: ' RU ',
            names: { en: ' Russia ', ru: ' Россия ' },
        })

        expect(result).toMatchObject({ code: 'RU', names: { en: 'Russia', ru: 'Россия' }, active: true })
    })

    it('rejects unsupported country fields before schema parsing', () => {
        expect(normalizeSuperAdminMarketCountryCreateInput({
            ...marketProfile,
            code: 'RU',
            names: { en: 'Russia' },
            isSuperAdmin: true,
        })).toBeNull()
    })

    it('rejects invalid market coordinates and unsupported mutation fields', () => {
        expect(normalizeSuperAdminMarketCreateInput({
            ...marketProfile,
            cityCode: 'samara',
            cityName: 'Samara',
            centerLatitude: 53.2,
        })).toBeNull()
        expect(normalizeSuperAdminMarketUpdateInput({
            ...marketProfile,
            cityCode: 'samara',
            cityName: 'Samara',
            launchReady: false,
            countryId: '00000000-0000-4000-8000-000000000000',
        })).toBeNull()
    })

    it('normalizes zone labels and validates enum-backed payloads', () => {
        const result = normalizeSuperAdminMarketZoneCreateInput({
            slug: ' central ',
            zoneType: 'district',
            names: { en: ' Central district ' },
            centerLatitude: 53.2,
            centerLongitude: 50.1,
        })

        expect(result).toMatchObject({ slug: 'central', names: { en: 'Central district' }, displayOrder: 0, active: true })
        expect(normalizeSuperAdminMarketZoneCreateInput({ slug: 'central', zoneType: 'unknown', names: { en: 'Central' } })).toBeNull()
    })

    it('normalizes hierarchy ids and rejects malformed values', () => {
        expect(normalizeSuperAdminMarketHierarchyUuid(' 00000000-0000-4000-8000-000000000001 ')).toBe('00000000-0000-4000-8000-000000000001')
        expect(normalizeSuperAdminMarketHierarchyUuid('not-a-uuid')).toBeNull()
        expect(normalizeSuperAdminMarketHierarchyUuid(null)).toBeNull()
    })

    it('validates the legacy market update contract without accepting unknown fields', () => {
        expect(normalizeSuperAdminLegacyMarketUpdateInput({
            ...marketProfile,
            launchReady: true,
        })).toMatchObject({ defaultLocale: 'en', currencyCode: 'EUR', launchReady: true })
        expect(normalizeSuperAdminLegacyMarketUpdateInput({
            ...marketProfile,
            launchReady: true,
            extra: true,
        })).toBeNull()
        expect(normalizeSuperAdminLegacyMarketUpdateInput(null)).toBeNull()
    })
})
