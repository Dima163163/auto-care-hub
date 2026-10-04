import { http, HttpResponse } from "msw"
import { type AutoCareCapacityResource } from "@/entities/automotive-service"
import { currentMockUser, hasMockProviderRole } from './mock-access'
import { mockCapacityResources } from './mock-fixtures'
import { getMockCapacityReservations, getMockCapacityResources } from './mock-resources'
import { invalidMockBodyResponse } from './mock-validation'

export const resourcesHandlers = [
{ order: 132, handler: http.get('/api/owner/autocare-providers/:providerId/resources', ({ params, request }) => {
        const currentUser = currentMockUser()
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        const providerId = String(params.providerId)
        const locationId = new URL(request.url).searchParams.get('locationId') ?? undefined
        if (currentUser.role !== 'owner' || !hasMockProviderRole(currentUser.id, providerId, ['owner', 'manager', 'staff'], locationId)) return HttpResponse.json({ message: 'You do not have access to this provider.' }, { status: 403 })
        return HttpResponse.json(getMockCapacityResources(providerId, locationId))
    }) },
{ order: 133, handler: http.get('/api/owner/autocare-providers/:providerId/resource-reservations', ({ params, request }) => {
        const currentUser = currentMockUser()
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        const providerId = String(params.providerId)
        const search = new URL(request.url).searchParams
        const locationId = search.get('locationId') ?? undefined
        if (currentUser.role !== 'owner' || !hasMockProviderRole(currentUser.id, providerId, ['owner', 'manager', 'staff'], locationId)) return HttpResponse.json({ message: 'You do not have access to this provider.' }, { status: 403 })
        return HttpResponse.json(getMockCapacityReservations(providerId, locationId, search.get('from') ?? undefined, search.get('to') ?? undefined))
    }) },
{ order: 134, handler: http.post('/api/owner/autocare-providers/:providerId/resources', async ({ params, request }) => {
        const currentUser = currentMockUser()
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        const providerId = String(params.providerId)
        if (currentUser.role !== 'owner' || !hasMockProviderRole(currentUser.id, providerId, ['owner'])) return HttpResponse.json({ message: 'Only provider owners can manage capacity resources.' }, { status: 403 })
        const body = await request.json() as Partial<AutoCareCapacityResource>
        if (typeof body.locationId !== 'string' || typeof body.name !== 'string' || !body.name.trim() || !['specialist', 'bay', 'lift', 'equipment'].includes(String(body.type)) || !Number.isInteger(body.capacity) || Number(body.capacity) < 1 || Number(body.capacity) > 100) return invalidMockBodyResponse()
        const resources = getMockCapacityResources(providerId)
        if (resources.some((resource) => resource.locationId === body.locationId && resource.name.toLowerCase() === body.name!.trim().toLowerCase())) return HttpResponse.json({ message: 'A resource with this name already exists.' }, { status: 409 })
        const now = new Date().toISOString()
        const created: AutoCareCapacityResource = { id: `mock-resource-${providerId}-${Date.now()}`, providerId, locationId: body.locationId, type: body.type as AutoCareCapacityResource['type'], name: body.name.trim(), capacity: Number(body.capacity), active: body.active !== false, metadata: body.metadata ?? {}, createdAt: now, updatedAt: now }
        const next = [...resources, created]
        mockCapacityResources.set(providerId, next)
        return HttpResponse.json(created, { status: 201 })
    }) },
{ order: 135, handler: http.patch('/api/owner/autocare-providers/:providerId/resources/:resourceId', async ({ params, request }) => {
        const currentUser = currentMockUser()
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        const providerId = String(params.providerId)
        const resources = getMockCapacityResources(providerId)
        const index = resources.findIndex((resource) => resource.id === String(params.resourceId))
        if (index < 0) return HttpResponse.json({ message: 'Capacity resource not found.' }, { status: 404 })
        if (currentUser.role !== 'owner' || !hasMockProviderRole(currentUser.id, providerId, ['owner'], resources[index]!.locationId)) return HttpResponse.json({ message: 'Only provider owners can manage capacity resources.' }, { status: 403 })
        const body = await request.json() as Partial<AutoCareCapacityResource>
        if (body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim())) return invalidMockBodyResponse()
        if (body.capacity !== undefined && (!Number.isInteger(body.capacity) || body.capacity < 1 || body.capacity > 100)) return invalidMockBodyResponse()
        if (body.type !== undefined && !['specialist', 'bay', 'lift', 'equipment'].includes(String(body.type))) return invalidMockBodyResponse()
        const updated: AutoCareCapacityResource = { ...resources[index]!, ...(body.name === undefined ? {} : { name: body.name.trim() }), ...(body.capacity === undefined ? {} : { capacity: body.capacity }), ...(body.active === undefined ? {} : { active: body.active }), ...(body.type === undefined ? {} : { type: body.type as AutoCareCapacityResource['type'] }), ...(body.metadata === undefined ? {} : { metadata: body.metadata }), updatedAt: new Date().toISOString() }
        if (resources.some((resource, resourceIndex) => resourceIndex !== index && resource.locationId === updated.locationId && resource.name.toLowerCase() === updated.name.toLowerCase())) return HttpResponse.json({ message: 'A resource with this name already exists.' }, { status: 409 })
        const next = [...resources]
        next[index] = updated
        mockCapacityResources.set(providerId, next)
        return HttpResponse.json(updated)
    }) }
]
