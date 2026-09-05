import { describe, expect, it } from 'vitest'

import { UserRole } from '../../entities/user/user.entity.js'
import { updateSuperAdminAutoCareMarket } from './admin.service.js'

describe('Legacy admin market update service boundaries', () => {
    it('rejects malformed market input before repository access', async () => {
        const superAdmin = { role: UserRole.SuperAdmin } as never
        const validPayload = {
            defaultLocale: 'ru',
            supportedLocales: ['ru', 'en'],
            timezone: 'Europe/Samara',
            currencyCode: 'RUB',
            launchReady: true,
        }

        await expect(updateSuperAdminAutoCareMarket(superAdmin, 'market-1', validPayload)).rejects.toMatchObject({ statusCode: 422 })
        await expect(updateSuperAdminAutoCareMarket(superAdmin, '550e8400-e29b-41d4-a716-446655440000', { ...validPayload, extra: true })).rejects.toMatchObject({ statusCode: 422 })
    })

    it('keeps super-admin authorization ahead of malformed input validation', async () => {
        const admin = { role: UserRole.Admin } as never

        await expect(updateSuperAdminAutoCareMarket(admin, 'market-1', null)).rejects.toMatchObject({ statusCode: 403 })
    })
})
