import { describe, expect, it } from 'vitest'

import { t } from '@/shared/lib/i18n'

import { getAccountLinkTranslationKey } from './getAccountLinkTranslationKey'

describe('getAccountLinkTranslationKey', () => {
    it('returns the profile label key for clients', () => {
        expect(t(getAccountLinkTranslationKey('client'))).toBe('Profile')
    })

    it('returns dashboard label keys for workspace roles', () => {
        expect(t(getAccountLinkTranslationKey('owner'))).toBe('Owner dashboard')
        expect(t(getAccountLinkTranslationKey('admin'))).toBe('Admin dashboard')
        expect(t(getAccountLinkTranslationKey('super_admin'))).toBe('Admin dashboard')
    })

    it('supports russian account labels', () => {
        expect(t(getAccountLinkTranslationKey('client'), undefined, 'ru')).toBe('Профиль')
        expect(t(getAccountLinkTranslationKey('owner'), undefined, 'ru')).toBe('Панель владельца')
        expect(t(getAccountLinkTranslationKey('admin'), undefined, 'ru')).toBe('Панель администратора')
        expect(t(getAccountLinkTranslationKey('super_admin'), undefined, 'ru')).toBe('Панель администратора')
    })
})
