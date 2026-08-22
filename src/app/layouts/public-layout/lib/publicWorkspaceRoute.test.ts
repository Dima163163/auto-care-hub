import { describe, expect, it } from 'vitest'

import { ROUTES } from '@/shared/constants/routes'

import { isPublicWorkspaceRoute } from './publicWorkspaceRoute'

describe('isPublicWorkspaceRoute', () => {
    it('recognizes protected client cabinet tabs before auth resolves', () => {
        expect(isPublicWorkspaceRoute(ROUTES.profile)).toBe(true)
        expect(isPublicWorkspaceRoute(ROUTES.profileVehicles)).toBe(true)
        expect(isPublicWorkspaceRoute(ROUTES.profileBookings)).toBe(true)
        expect(isPublicWorkspaceRoute(ROUTES.profileReviews)).toBe(true)
        expect(isPublicWorkspaceRoute(ROUTES.notifications)).toBe(true)
    })

    it('keeps public pages outside the workspace shell', () => {
        expect(isPublicWorkspaceRoute(ROUTES.home)).toBe(false)
        expect(isPublicWorkspaceRoute(ROUTES.serviceDiscovery)).toBe(false)
        expect(isPublicWorkspaceRoute(`${ROUTES.profile}/nested`)).toBe(false)
    })
})
