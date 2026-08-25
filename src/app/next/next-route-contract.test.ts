import { describe, expect, it } from 'vitest'

import { ROUTES } from '@/shared/constants/routes'

import { getNextRoutePath, isNextRoutePath } from './next-route-contract'

describe('Next route contract', () => {
    it('accepts the public and protected routes served by the App Router shell', () => {
        expect(isNextRoutePath('/')).toBe(true)
        expect(isNextRoutePath('/services')).toBe(true)
        expect(isNextRoutePath('/profile/bookings')).toBe(true)
        expect(isNextRoutePath('/owner/autocare-providers/provider-1/reviews')).toBe(true)
        expect(isNextRoutePath('/admin/security-center')).toBe(true)
        expect(isNextRoutePath('/super-admin/dashboard')).toBe(true)
    })

    it('accepts dynamic provider and legacy cabinet redirect routes', () => {
        expect(isNextRoutePath('/services/provider-1')).toBe(true)
        expect(isNextRoutePath('/services/provider-1/request')).toBe(true)
        expect(isNextRoutePath('/cabinets/cabinet-1')).toBe(true)
        expect(isNextRoutePath('/owner/cabinets/provider-1/edit')).toBe(true)
    })

    it('normalizes query strings and trailing slashes without widening the contract', () => {
        expect(getNextRoutePath('/services/?service=oil-change')).toBe('/services')
        expect(isNextRoutePath('/services/?service=oil-change')).toBe(true)
        expect(isNextRoutePath('/services/provider-1/?market=samara')).toBe(true)
        expect(isNextRoutePath('/service-provider/provider-1')).toBe(false)
        expect(isNextRoutePath('/admin/unknown')).toBe(false)
    })

    it('rejects empty dynamic segments and unknown paths', () => {
        expect(isNextRoutePath('/services/')).toBe(true)
        expect(isNextRoutePath('/services//request')).toBe(false)
        expect(isNextRoutePath('/this-route-does-not-exist')).toBe(false)
    })

    it('covers every dynamic route declared by the feature router', () => {
        const routeExamples = [
            [ROUTES.serviceProviderDetails, '/services/provider-1'],
            [ROUTES.serviceRequest, '/services/provider-1/request'],
            [ROUTES.cabinetDetails, '/cabinets/cabinet-1'],
            [ROUTES.ownerAutoCareProviderDetails, '/owner/autocare-providers/provider-1'],
            [ROUTES.ownerAutoCareProviderReviews, '/owner/autocare-providers/provider-1/reviews'],
            [ROUTES.ownerCabinetEdit, '/owner/cabinets/provider-1/edit'],
        ] as const

        for (const [routePattern, example] of routeExamples) {
            expect(routePattern).toContain(':id')
            expect(isNextRoutePath(example), routePattern).toBe(true)
        }
    })
})
