import { describe, expect, it } from 'vitest'

import { UserProvider, UserRole, UserStatus, UserEntity } from '../../entities/user/user.entity.js'
import { FavoriteCabinetEntity } from '../../entities/favorite-cabinet/favorite-cabinet.entity.js'
import {
    MAX_EXPORT_RECORDS,
    serializeUserDataExport,
} from './data-export.serializer.js'

const user = {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Export User',
    email: 'export@example.com',
    passwordHash: 'must-not-be-exported',
    phone: null,
    role: UserRole.Client,
    status: UserStatus.Active,
    avatarUrl: null,
    provider: UserProvider.Email,
    emailVerifiedAt: null,
    emailNotifications: true,
    bookingEmailNotifications: true,
    preferredCity: null,
    preferredCategories: [],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
} as UserEntity

describe('serializeUserDataExport', () => {
    it('bounds collections and reports which collections were truncated', () => {
        const favorites = Array.from({ length: MAX_EXPORT_RECORDS + 1 }, (_, index) => ({
            id: `favorite-${index}`,
            cabinetId: '00000000-0000-0000-0000-000000000002',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
        } as FavoriteCabinetEntity))

        const result = serializeUserDataExport(user, {
            favorites,
            bookings: [],
            notifications: [],
            cabinets: [],
            vehicles: [],
        }, '2026-01-02T00:00:00.000Z')

        expect(result.generatedAt).toBe('2026-01-02T00:00:00.000Z')
        expect(result.limits.maxRecordsPerCollection).toBe(MAX_EXPORT_RECORDS)
        expect(result.favorites).toHaveLength(MAX_EXPORT_RECORDS)
        expect(result.truncated).toEqual({
            favorites: true,
            bookings: false,
            notifications: false,
            cabinets: false,
            vehicles: false,
        })
        expect(result.user).not.toHaveProperty('passwordHash')
    })
})
