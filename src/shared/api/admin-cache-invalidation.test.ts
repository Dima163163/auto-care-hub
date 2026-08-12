import { configureStore } from '@reduxjs/toolkit'
import { waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { cabinetsApi } from '@/entities/cabinet/api/cabinetsApi'
import { reviewsApi } from '@/entities/review/api/reviewsApi'
import { usersApi } from '@/entities/user/api/usersApi'

import { baseApi } from './baseApi'

const adminUser = {
    id: 'user-1',
    name: 'Admin User',
    email: 'admin@example.com',
    phone: null,
    role: 'admin',
    status: 'active',
    avatarUrl: null,
    provider: 'email',
    locale: null,
    emailVerifiedAt: null,
    emailNotifications: true,
    bookingEmailNotifications: true,
    preferredCity: null,
    preferredCategories: [],
    createdAt: '2026-01-01T00:00:00.000Z',
} as const

const cabinet = {
    id: 'cabinet-1',
    ownerId: 'owner-1',
    title: 'Demo cabinet',
    description: 'A demo cabinet',
    address: 'Main Street 1',
    city: 'Berlin',
    pricePerHour: 50,
    status: 'active',
    photos: [],
    createdAt: '2026-01-01T00:00:00.000Z',
} as const

const review = {
    id: 'review-1',
    cabinetId: cabinet.id,
    clientId: 'client-1',
    rating: 5,
    text: 'Great space',
    status: 'pending',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    bookingId: 'booking-1',
    client: { id: 'client-1', name: 'Client User' },
    cabinet: { id: cabinet.id, title: cabinet.title },
} as const

function createStore() {
    return configureStore({
        reducer: {
            [baseApi.reducerPath]: baseApi.reducer,
        },
        middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
    })
}

function installFetchMock() {
    const requestCounts = new Map<string, number>()
    const NativeRequest = globalThis.Request

    vi.stubGlobal('Request', class extends NativeRequest {
        constructor(input: RequestInfo | URL, init?: RequestInit) {
            const resolvedInput = typeof input === 'string' && input.startsWith('/')
                ? `http://localhost${input}`
                : input
            super(resolvedInput, init)
        }
    })

    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string'
            ? input
            : input instanceof URL
                ? input.href
                : input.url
        const pathname = new URL(url, 'http://localhost').pathname
        const method = init?.method ?? (typeof input === 'object' && 'method' in input ? input.method : 'GET')
        const requestKey = `${method} ${pathname}`
        requestCounts.set(requestKey, (requestCounts.get(requestKey) ?? 0) + 1)

        let payload: unknown = {}
        if (method === 'GET' && pathname === '/api/admin/users') payload = []
        if (method === 'GET' && pathname === '/api/admin/cabinets') payload = []
        if (method === 'GET' && pathname === '/api/admin/reviews') payload = []
        if (method === 'PATCH' && pathname === '/api/admin/users/user-1/status') payload = adminUser
        if (method === 'POST' && pathname === '/api/admin/admins') {
            payload = {
                user: adminUser,
                passwordSetupToken: 'setup-token',
                passwordSetupExpiresAt: '2026-01-02T00:00:00.000Z',
            }
        }
        if (method === 'PATCH' && pathname === '/api/admin/cabinets/cabinet-1/status') payload = cabinet
        if (method === 'PATCH' && pathname === '/api/admin/reviews/review-1/status') payload = review
        if (method === 'DELETE' && pathname === '/api/admin/reviews/review-1') payload = { success: true }

        return new Response(JSON.stringify(payload), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        })
    }))

    return requestCounts
}

describe('admin cache invalidation', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('refreshes the admin user list after status changes and admin creation', async () => {
        const requestCounts = installFetchMock()
        const store = createStore()

        await store.dispatch(usersApi.endpoints.getAdminUsers.initiate()).unwrap()
        await store.dispatch(usersApi.endpoints.updateAdminUserStatus.initiate({
            id: adminUser.id,
            status: 'blocked',
        })).unwrap()

        await waitFor(() => expect(requestCounts.get('GET /api/admin/users')).toBe(2))

        await store.dispatch(usersApi.endpoints.createAdminUser.initiate({
            name: 'New Admin',
            email: 'new-admin@example.com',
        })).unwrap()

        await waitFor(() => expect(requestCounts.get('GET /api/admin/users')).toBe(3))
    })

    it('refreshes admin cabinets after a status change', async () => {
        const requestCounts = installFetchMock()
        const store = createStore()

        await store.dispatch(cabinetsApi.endpoints.getAdminCabinets.initiate()).unwrap()
        await store.dispatch(cabinetsApi.endpoints.updateAdminCabinetStatus.initiate({
            id: cabinet.id,
            status: 'blocked',
        })).unwrap()

        await waitFor(() => expect(requestCounts.get('GET /api/admin/cabinets')).toBe(2))
    })

    it('refreshes admin reviews after moderation and deletion', async () => {
        const requestCounts = installFetchMock()
        const store = createStore()

        await store.dispatch(reviewsApi.endpoints.getAdminReviews.initiate()).unwrap()
        await store.dispatch(reviewsApi.endpoints.updateAdminReviewStatus.initiate({
            id: review.id,
            status: 'approved',
        })).unwrap()

        await waitFor(() => expect(requestCounts.get('GET /api/admin/reviews')).toBe(2))

        await store.dispatch(reviewsApi.endpoints.deleteAdminReview.initiate({
            id: review.id,
            cabinetId: review.cabinetId,
        })).unwrap()

        await waitFor(() => expect(requestCounts.get('GET /api/admin/reviews')).toBe(3))
    })
})
