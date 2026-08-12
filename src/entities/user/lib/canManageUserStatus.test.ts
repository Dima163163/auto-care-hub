import { describe, expect, it } from 'vitest'

import { canManageUserStatus } from './canManageUserStatus'

describe('canManageUserStatus', () => {
    it('allows super admin to manage every role', () => {
        expect(canManageUserStatus('super_admin', 'client')).toBe(true)
        expect(canManageUserStatus('super_admin', 'owner')).toBe(true)
        expect(canManageUserStatus('super_admin', 'admin')).toBe(true)
        expect(canManageUserStatus('super_admin', 'super_admin')).toBe(true)
    })

    it('allows ordinary admin to manage client and owner accounts only', () => {
        expect(canManageUserStatus('admin', 'client')).toBe(true)
        expect(canManageUserStatus('admin', 'owner')).toBe(true)
        expect(canManageUserStatus('admin', 'admin')).toBe(false)
        expect(canManageUserStatus('admin', 'super_admin')).toBe(false)
    })

    it('blocks non-admin and unknown viewer roles', () => {
        expect(canManageUserStatus('client', 'client')).toBe(false)
        expect(canManageUserStatus('owner', 'client')).toBe(false)
        expect(canManageUserStatus(undefined, 'client')).toBe(false)
    })
})
