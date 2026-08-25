import { describe, expect, it } from 'vitest'

import {
    MAX_ADMIN_SEARCH_LENGTH,
    normalizeAdminSearch,
} from './admin-query-policy.js'
import {
    securityCenterEventsQuerySchema,
    securityCenterExportQuerySchema,
    updateSecurityCenterEventStatusSchema,
    updateSuperAdminAutoCareMarketSchema,
} from './admin.schemas.js'

describe('admin query policy', () => {
    it('normalizes bounded search terms', () => {
        expect(normalizeAdminSearch('  Jane\n Doe ')).toBe('Jane Doe')
        expect(normalizeAdminSearch(undefined)).toBeUndefined()
    })

    it('ignores blank searches and rejects oversized searches', () => {
        expect(normalizeAdminSearch('   ')).toBeUndefined()
        expect(() => normalizeAdminSearch('x'.repeat(MAX_ADMIN_SEARCH_LENGTH + 1))).toThrow(/search/)
    })

    it('accepts bounded Security Center investigation filters', () => {
        expect(securityCenterEventsQuerySchema.parse({
            actorRole: 'super_admin',
            requestId: 'request-123',
            authOutcome: 'failed',
            rateLimitResult: 'blocked',
        })).toMatchObject({
            actorRole: 'super_admin',
            requestId: 'request-123',
            authOutcome: 'failed',
            rateLimitResult: 'blocked',
        })
        expect(() => securityCenterEventsQuerySchema.parse({ requestId: 'x'.repeat(129) })).toThrow()
        expect(() => securityCenterEventsQuerySchema.parse({ authOutcome: 'maybe' })).toThrow()
    })

    it('rejects reversed investigation time ranges for list and export queries', () => {
        const range = { from: '2026-08-08T12:00:00.000Z', to: '2026-08-08T11:00:00.000Z' }

        expect(() => securityCenterEventsQuerySchema.parse(range)).toThrow(/end of the time range/)
        expect(() => securityCenterExportQuerySchema.parse(range)).toThrow(/end of the time range/)
    })

    it('accepts an optional nullable super-admin assignee and rejects non-UUID values', () => {
        expect(updateSecurityCenterEventStatusSchema.parse({
            status: 'investigating',
            assigneeId: '00000000-0000-4000-8000-000000000001',
        })).toMatchObject({
            status: 'investigating',
            assigneeId: '00000000-0000-4000-8000-000000000001',
        })
        expect(updateSecurityCenterEventStatusSchema.parse({
            status: 'resolved',
            assigneeId: null,
        }).assigneeId).toBeNull()
        expect(() => updateSecurityCenterEventStatusSchema.parse({
            status: 'acknowledged',
            assigneeId: 'not-a-uuid',
        })).toThrow()
    })

    it('bounds operator notes in Security Center status mutations', () => {
        expect(updateSecurityCenterEventStatusSchema.parse({
            status: 'investigating',
            operatorNote: '  Review the request burst.  ',
        })).toMatchObject({
            status: 'investigating',
            operatorNote: 'Review the request burst.',
        })
        expect(() => updateSecurityCenterEventStatusSchema.parse({
            status: 'resolved',
            operatorNote: 'x'.repeat(1_001),
        })).toThrow()
    })

    it('requires a valid, unique locale set for market updates', () => {
        expect(updateSuperAdminAutoCareMarketSchema.parse({
            defaultLocale: 'ru',
            supportedLocales: ['ru', 'en', 'es'],
            timezone: 'Europe/Samara',
            currencyCode: 'RUB',
            launchReady: true,
        })).toMatchObject({ defaultLocale: 'ru', currencyCode: 'RUB', launchReady: true })
        expect(() => updateSuperAdminAutoCareMarketSchema.parse({
            defaultLocale: 'ru',
            supportedLocales: ['ru', 'RU'],
            timezone: 'Europe/Samara',
            currencyCode: 'RUB',
            launchReady: true,
        })).toThrow(/duplicates/)
        expect(() => updateSuperAdminAutoCareMarketSchema.parse({
            defaultLocale: 'de',
            supportedLocales: ['ru', 'en'],
            timezone: 'Europe/Samara',
            currencyCode: 'RUB',
            launchReady: true,
        })).toThrow(/included/)
    })
})
