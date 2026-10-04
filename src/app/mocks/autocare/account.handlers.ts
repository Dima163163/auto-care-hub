import { http, HttpResponse } from "msw"
import { getVehicleImage, type ClientVehicle, type CreateClientVehicleInput } from "@/entities/user/model/vehicles"
import { mockCabinets, mockUsers } from ".././data"
import { mockSession } from ".././session"
import { currentMockUser, getMockUserConsentState } from './mock-access'
import { getMockVehicles } from './mock-account'
import { mockAccountDeletionRequests, mockFavoritesByUser, mockLegalDocumentVersions, mockOptionalConsents } from './mock-fixtures'
import type { MockAccountDeletionRequest } from './mock-fixtures'
import { invalidMockBodyResponse } from './mock-validation'

export const accountHandlers = [
{ order: 1, handler: http.get('/api/users/me/consents', () => {
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })

        return HttpResponse.json(getMockUserConsentState(user.id), {
            headers: { 'cache-control': 'no-store', pragma: 'no-cache' },
        })
    }) },
{ order: 2, handler: http.patch('/api/users/me/consents', async ({ request }) => {
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })

        const body = await request.json().catch(() => null) as Record<string, unknown> | null
        if (!body || typeof body !== 'object' || Array.isArray(body)) return invalidMockBodyResponse()
        if ((body.analytics !== undefined && typeof body.analytics !== 'boolean') || (body.marketing !== undefined && typeof body.marketing !== 'boolean')) return invalidMockBodyResponse()
        if (body.analytics === undefined && body.marketing === undefined) return invalidMockBodyResponse()

        const current = mockOptionalConsents.get(user.id) ?? {
            analytics: { granted: false, version: null, recordedAt: null },
            marketing: { granted: false, version: null, recordedAt: null },
        }
        const recordedAt = new Date().toISOString()
        const updateConsent = (granted: boolean) => ({
            granted,
            version: mockLegalDocumentVersions.privacy,
            recordedAt,
        })
        const next = {
            analytics: body.analytics === undefined ? current.analytics : updateConsent(body.analytics),
            marketing: body.marketing === undefined ? current.marketing : updateConsent(body.marketing),
        }
        mockOptionalConsents.set(user.id, next)

        return HttpResponse.json(getMockUserConsentState(user.id), {
            headers: { 'cache-control': 'no-store', pragma: 'no-cache' },
        })
    }) },
{ order: 15, handler: http.get('/api/users/me/favorites', () => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        const favoriteIds = mockFavoritesByUser.get(mockSession.currentUserId) ?? []
        const items = favoriteIds
            .map((id) => mockCabinets.find((cabinet) => cabinet.id === id && cabinet.status === 'active'))
            .filter((cabinet): cabinet is typeof mockCabinets[number] => Boolean(cabinet))

        return HttpResponse.json({ items })
    }) },
{ order: 16, handler: http.post('/api/users/me/favorites/sync', async ({ request }) => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json() as { cabinetIds?: unknown }
        const cabinetIds = Array.isArray(body.cabinetIds)
            ? body.cabinetIds.filter((id): id is string => typeof id === 'string')
            : []
        const currentIds = mockFavoritesByUser.get(mockSession.currentUserId) ?? []
        const acceptedCabinets = cabinetIds
            .map((id) => mockCabinets.find((cabinet) => cabinet.id === id && cabinet.status === 'active'))
            .filter((cabinet): cabinet is typeof mockCabinets[number] => Boolean(cabinet))

        mockFavoritesByUser.set(
            mockSession.currentUserId,
            [...new Set([...currentIds, ...acceptedCabinets.map((cabinet) => cabinet.id)])],
        )

        return HttpResponse.json({ items: acceptedCabinets })
    }) },
{ order: 17, handler: http.post('/api/users/me/favorites/:cabinetId', ({ params }) => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        const cabinetId = String(params.cabinetId)
        const cabinet = mockCabinets.find(
            (item) => item.id === cabinetId && item.status === 'active',
        )

        if (!cabinet) {
            return HttpResponse.json({ message: 'Cabinet not found' }, { status: 404 })
        }

        const currentIds = mockFavoritesByUser.get(mockSession.currentUserId) ?? []
        mockFavoritesByUser.set(
            mockSession.currentUserId,
            [...new Set([cabinetId, ...currentIds])],
        )

        return HttpResponse.json(cabinet)
    }) },
{ order: 18, handler: http.delete('/api/users/me/favorites/:cabinetId', ({ params }) => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        const cabinetId = String(params.cabinetId)
        const currentIds = mockFavoritesByUser.get(mockSession.currentUserId) ?? []
        mockFavoritesByUser.set(
            mockSession.currentUserId,
            currentIds.filter((id) => id !== cabinetId),
        )

        return HttpResponse.json({ success: true })
    }) },
{ order: 234, handler: http.patch('/api/users/me/preferences', async ({ request }) => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            )
        }

        const body = await request.json() as {
            emailNotifications?: boolean
            bookingEmailNotifications?: boolean
            preferredCity?: string | null
            preferredCategories?: string[]
            locale?: import('@/shared/config/i18n').SupportedLocale | null
        }

        const user = mockUsers.find(
            (item) => item.id === mockSession.currentUserId
        )

        if (user) {
            if (body.emailNotifications !== undefined) {
                user.emailNotifications = body.emailNotifications
            }
            if (body.bookingEmailNotifications !== undefined) {
                user.bookingEmailNotifications = body.bookingEmailNotifications
            }
            if (body.preferredCity !== undefined) {
                user.preferredCity = body.preferredCity
            }
            if (body.preferredCategories !== undefined) {
                user.preferredCategories = body.preferredCategories
            }
            if (body.locale !== undefined) {
                user.locale = body.locale
            }
        }

        return HttpResponse.json(user)
    }) },
{ order: 235, handler: http.get('/api/users/me/vehicles', () => {
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (user.role !== 'client') return HttpResponse.json({ message: 'Only clients can manage vehicles.' }, { status: 403 })
        return HttpResponse.json(getMockVehicles(user.id))
    }) },
{ order: 236, handler: http.post('/api/users/me/vehicles', async ({ request }) => {
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (user.role !== 'client') return HttpResponse.json({ message: 'Only clients can manage vehicles.' }, { status: 403 })

        const body = await request.json() as CreateClientVehicleInput
        const vehicles = getMockVehicles(user.id)
        if (vehicles.length >= 20) return HttpResponse.json({ message: 'A client can save up to 20 vehicles.' }, { status: 409 })

        const vehicle: ClientVehicle = {
            ...body,
            id: `mock-vehicle-${Date.now()}`,
            imageUrl: getVehicleImage(body.brandId, body.model),
            isPrimary: vehicles.length === 0,
            createdAt: new Date().toISOString(),
        }
        vehicles.push(vehicle)
        return HttpResponse.json(vehicle, { status: 201 })
    }) },
{ order: 237, handler: http.patch('/api/users/me/vehicles/:id', async ({ params, request }) => {
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (user.role !== 'client') return HttpResponse.json({ message: 'Only clients can manage vehicles.' }, { status: 403 })

        const vehicle = getMockVehicles(user.id).find((item) => item.id === String(params.id))
        if (!vehicle) return HttpResponse.json({ message: 'Vehicle not found.' }, { status: 404 })

        const patch = await request.json() as Partial<CreateClientVehicleInput>
        Object.assign(vehicle, patch)
        if (patch.brandId || patch.model) vehicle.imageUrl = getVehicleImage(patch.brandId ?? vehicle.brandId, patch.model ?? vehicle.model)
        return HttpResponse.json(vehicle)
    }) },
{ order: 238, handler: http.delete('/api/users/me/vehicles/:id', ({ params }) => {
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (user.role !== 'client') return HttpResponse.json({ message: 'Only clients can manage vehicles.' }, { status: 403 })

        const vehicles = getMockVehicles(user.id)
        const index = vehicles.findIndex((item) => item.id === String(params.id))
        if (index < 0) return HttpResponse.json({ message: 'Vehicle not found.' }, { status: 404 })
        vehicles.splice(index, 1)
        if (vehicles.length > 0 && !vehicles.some((item) => item.isPrimary)) vehicles[0]!.isPrimary = true
        return HttpResponse.json({ success: true })
    }) },
{ order: 239, handler: http.get('/api/users/me/export', () => {
        const user = mockUsers.find((item) => item.id === mockSession.currentUserId)

        if (!user) {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        return HttpResponse.json({
            schemaVersion: 1,
            generatedAt: new Date().toISOString(),
            user,
            favorites: [],
            bookings: [],
            notifications: [],
            cabinets: [],
            vehicles: getMockVehicles(user.id),
            appeals: [],
            integrity: {
                algorithm: 'sha256',
                checksum: 'mock-export-checksum',
            },
        })
    }) },
{ order: 240, handler: http.get('/api/users/me/deletion-request', () => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        const request = mockAccountDeletionRequests.get(mockSession.currentUserId)

        return HttpResponse.json(request?.status === 'pending' ? request : null)
    }) },
{ order: 241, handler: http.post('/api/users/me/deletion-request', async ({ request }) => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        const current = mockAccountDeletionRequests.get(mockSession.currentUserId)
        if (current?.status === 'pending') return HttpResponse.json(current)

        const nextRequest: MockAccountDeletionRequest = {
            id: `mock-deletion-${Date.now()}`,
            status: 'pending',
            requestedAt: new Date().toISOString(),
            cancelledAt: null,
            completedAt: null,
        }
        mockAccountDeletionRequests.set(mockSession.currentUserId, nextRequest)
        await request.json().catch(() => null)

        return HttpResponse.json(nextRequest)
    }) },
{ order: 242, handler: http.delete('/api/users/me/deletion-request', () => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        const current = mockAccountDeletionRequests.get(mockSession.currentUserId)
        if (!current || current.status !== 'pending') return HttpResponse.json(null)

        const cancelledRequest = {
            ...current,
            status: 'cancelled' as const,
            cancelledAt: new Date().toISOString(),
        }
        mockAccountDeletionRequests.set(mockSession.currentUserId, cancelledRequest)

        return HttpResponse.json(cancelledRequest)
    }) }
]
