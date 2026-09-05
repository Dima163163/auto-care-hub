import { describe, expect, it } from 'vitest'

import { UserRole } from '../../entities/user/user.entity.js'
import {
    createSuperAdminAutoCareMarket,
    createSuperAdminAutoCareMarketZone,
    createSuperAdminMarketCountry,
    deleteSuperAdminAutoCareMarket,
    deleteSuperAdminAutoCareMarketZone,
    deleteSuperAdminMarketCountry,
    getSuperAdminMarketHierarchy,
    updateSuperAdminAutoCareMarketHierarchy,
    updateSuperAdminAutoCareMarketZone,
    updateSuperAdminMarketCountry,
} from './super-admin-market-hierarchy.service.js'

const superAdmin = { role: UserRole.SuperAdmin } as never
const admin = { role: UserRole.Admin } as never
const validMarketProfile = {
    defaultLocale: 'ru',
    supportedLocales: ['ru', 'en'],
    timezone: 'Europe/Samara',
    currencyCode: 'RUB',
    capabilities: { search: true },
    legalLinks: { privacy: 'https://example.test/privacy' },
}
const validMarket = {
    ...validMarketProfile,
    cityCode: 'samara',
    cityName: 'Samara',
    regionCode: null,
    regionName: null,
    centerLatitude: null,
    centerLongitude: null,
    launchReady: false,
}
const validZone = {
    parentId: null,
    slug: 'central',
    zoneType: 'district',
    names: { ru: 'Центральный район' },
    centerLatitude: null,
    centerLongitude: null,
    radiusKm: null,
    imageUrl: null,
    displayOrder: 0,
    active: true,
}

describe('Super-admin market hierarchy service boundaries', () => {
    it('rejects malformed country payloads before repository access', async () => {
        await expect(createSuperAdminMarketCountry(superAdmin, null)).rejects.toMatchObject({ statusCode: 422 })
    })

    it('rejects malformed country ids before repository access', async () => {
        await expect(updateSuperAdminMarketCountry(superAdmin, 'not-a-uuid', validMarketProfile)).rejects.toMatchObject({ statusCode: 422 })
        await expect(deleteSuperAdminMarketCountry(superAdmin, 'not-a-uuid')).rejects.toMatchObject({ statusCode: 422 })
    })

    it('rejects malformed market ids before repository access', async () => {
        await expect(createSuperAdminAutoCareMarket(superAdmin, 'not-a-uuid', validMarket)).rejects.toMatchObject({ statusCode: 422 })
        await expect(updateSuperAdminAutoCareMarketHierarchy(superAdmin, 'not-a-uuid', validMarket)).rejects.toMatchObject({ statusCode: 422 })
        await expect(deleteSuperAdminAutoCareMarket(superAdmin, 'not-a-uuid')).rejects.toMatchObject({ statusCode: 422 })
    })

    it('rejects malformed zone ids before repository access', async () => {
        await expect(createSuperAdminAutoCareMarketZone(superAdmin, 'not-a-uuid', validZone)).rejects.toMatchObject({ statusCode: 422 })
        await expect(updateSuperAdminAutoCareMarketZone(superAdmin, 'not-a-uuid', validZone)).rejects.toMatchObject({ statusCode: 422 })
        await expect(deleteSuperAdminAutoCareMarketZone(superAdmin, 'not-a-uuid')).rejects.toMatchObject({ statusCode: 422 })
    })

    it('keeps super-admin authorization ahead of hierarchy reads and mutations', async () => {
        await expect(getSuperAdminMarketHierarchy(admin)).rejects.toMatchObject({ statusCode: 403 })
        await expect(createSuperAdminMarketCountry(admin, null)).rejects.toMatchObject({ statusCode: 403 })
        await expect(updateSuperAdminAutoCareMarketHierarchy(admin, 'not-a-uuid', null)).rejects.toMatchObject({ statusCode: 403 })
    })
})
