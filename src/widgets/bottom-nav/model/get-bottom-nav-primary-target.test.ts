import { describe, expect, it } from 'vitest'

import { getBottomNavPrimaryTarget } from './get-bottom-nav-primary-target'

describe('getBottomNavPrimaryTarget', () => {
    it('keeps cabinet creation as the owner primary action', () => {
        expect(getBottomNavPrimaryTarget('owner')).toEqual({
            labelKey: 'common.create',
            to: '/owner/cabinets/create',
        })
    })

    it('takes clients to their bookings instead of a misleading create route', () => {
        expect(getBottomNavPrimaryTarget('client')).toEqual({
            labelKey: 'navigation.myBookings',
            to: '/profile/bookings',
        })
    })

    it('takes administrators to the admin workspace', () => {
        expect(getBottomNavPrimaryTarget('admin').to).toBe('/admin/dashboard')
        expect(getBottomNavPrimaryTarget('super_admin').to).toBe('/super-admin/dashboard')
    })

    it('offers sign in to guests', () => {
        expect(getBottomNavPrimaryTarget(null)).toEqual({
            labelKey: 'auth.signIn',
            to: '/login',
        })
    })
})
