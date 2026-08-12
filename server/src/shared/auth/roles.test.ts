import { describe, expect, it } from 'vitest'

import { UserRole } from '../../entities/user/user.entity'
import { canManageUserStatus, isAdminRole } from './roles'

describe('auth role helpers', () => {
    it('treats admin and super admin as admin roles', () => {
        expect(isAdminRole(UserRole.Admin)).toBe(true)
        expect(isAdminRole(UserRole.SuperAdmin)).toBe(true)
        expect(isAdminRole(UserRole.Owner)).toBe(false)
        expect(isAdminRole(UserRole.Client)).toBe(false)
    })

    it('allows super admin to manage every user status', () => {
        expect(canManageUserStatus(UserRole.SuperAdmin, UserRole.Client)).toBe(true)
        expect(canManageUserStatus(UserRole.SuperAdmin, UserRole.Owner)).toBe(true)
        expect(canManageUserStatus(UserRole.SuperAdmin, UserRole.Admin)).toBe(true)
        expect(canManageUserStatus(UserRole.SuperAdmin, UserRole.SuperAdmin)).toBe(true)
    })

    it('allows ordinary admin to manage only client and owner statuses', () => {
        expect(canManageUserStatus(UserRole.Admin, UserRole.Client)).toBe(true)
        expect(canManageUserStatus(UserRole.Admin, UserRole.Owner)).toBe(true)
        expect(canManageUserStatus(UserRole.Admin, UserRole.Admin)).toBe(false)
        expect(canManageUserStatus(UserRole.Admin, UserRole.SuperAdmin)).toBe(false)
    })

    it('blocks non-admin roles from managing statuses', () => {
        expect(canManageUserStatus(UserRole.Client, UserRole.Client)).toBe(false)
        expect(canManageUserStatus(UserRole.Owner, UserRole.Client)).toBe(false)
    })
})
