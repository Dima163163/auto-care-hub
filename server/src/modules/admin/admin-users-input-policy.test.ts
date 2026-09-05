import { describe, expect, it } from 'vitest'

import { UserRole, UserStatus } from '../../entities/user/user.entity.js'
import {
    normalizeAdminUserRole,
    normalizeAdminUserStatus,
    normalizeAdminUserUuid,
    normalizeAdminUsersQuery,
} from './admin-users-input-policy.js'

describe('Admin users input policy', () => {
    it('normalizes user list filters and canonical UUIDs', () => {
        const userId = '550e8400-e29b-41d4-a716-446655440000'
        expect(normalizeAdminUsersQuery({
            search: '  Иван\n Петров ',
            role: ' OWNER ',
            status: ' ACTIVE ',
            userId,
            limit: 25,
        })).toBeNull()
        expect(normalizeAdminUsersQuery({
            search: '  Иван\n Петров ',
            role: ' OWNER ',
            status: ' ACTIVE ',
            limit: 25,
        })).toEqual({
            search: 'Иван Петров',
            role: UserRole.Owner,
            status: UserStatus.Active,
            limit: 25,
        })
        expect(normalizeAdminUserUuid(` ${userId.toUpperCase()} `)).toBe(userId)
    })

    it('rejects unknown fields and malformed query values', () => {
        expect(normalizeAdminUsersQuery(null)).toBeNull()
        expect(normalizeAdminUsersQuery({ extra: true })).toBeNull()
        expect(normalizeAdminUsersQuery({ role: 'operator' })).toBeNull()
        expect(normalizeAdminUsersQuery({ status: 'pending' })).toBeNull()
        expect(normalizeAdminUsersQuery({ search: 'x'.repeat(161) })).toBeNull()
        expect(normalizeAdminUsersQuery({ limit: 101 })).toBeNull()
    })

    it('bounds status and role mutation values', () => {
        expect(normalizeAdminUserStatus(' BLOCKED ')).toBe(UserStatus.Blocked)
        expect(normalizeAdminUserRole(' SUPER_ADMIN ')).toBe(UserRole.SuperAdmin)
        expect(normalizeAdminUserStatus('pending')).toBeNull()
        expect(normalizeAdminUserRole('operator')).toBeNull()
        expect(normalizeAdminUserUuid('user-1')).toBeNull()
    })
})
