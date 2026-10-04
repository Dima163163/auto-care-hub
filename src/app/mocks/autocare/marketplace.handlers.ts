import { http, HttpResponse } from "msw"
import { isMockBroadcastOffer } from ".././broadcast-access-policy"
import { mockScenarioResponse } from ".././mock-scenario"
import { currentMockUser, getMockManagedProviderAssignments, hasMockProviderPermission } from './mock-access'
import { autoCareDefinitions, autoCareMarket, mockAutoCareBroadcastRequests, mockAutoCareExpertQuestions, mockAutoCareFleets, mockAutoCareGuaranteeClaims, mockAutoCareRepairEvents, mockAutoCareServiceRequests, ownerAutoCareProviders } from './mock-fixtures'
import { getMockBroadcastResponse } from './mock-marketplace'
import { invalidMockBodyResponse } from './mock-validation'

export const marketplaceHandlers = [
{ order: 81, handler: http.get('/api/v1/service-requests/:requestId/timeline', ({ params, request }) => {
        const scenario = mockScenarioResponse(request)
        if (scenario) return scenario
        const user = currentMockUser()
        const requestItem = mockAutoCareServiceRequests.find((item) => item.id === params.requestId)
        if (!user || !requestItem || (requestItem.clientId !== user.id && user.role !== 'owner')) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const existing = mockAutoCareRepairEvents.get(requestItem.id)
        if (!existing) {
            const events = [
                { id: `repair-event-${requestItem.id}-created`, requestId: requestItem.id, eventType: 'request_created', actorId: requestItem.clientId, title: 'Заявка создана', notes: requestItem.note, metadata: {}, createdAt: requestItem.createdAt },
                ...(requestItem.quote ? [{ id: `repair-event-${requestItem.id}-quote`, requestId: requestItem.id, eventType: 'quote_shared', actorId: 'user-owner-1', title: 'Смета отправлена сервисом', notes: requestItem.quote.note, metadata: { amountMinor: requestItem.quote.amountMinor }, createdAt: requestItem.quote.createdAt }] : []),
            ]
            mockAutoCareRepairEvents.set(requestItem.id, events)
        }
        return HttpResponse.json(mockAutoCareRepairEvents.get(requestItem.id) ?? [])
    }) },
{ order: 82, handler: http.post('/api/v1/broadcast-requests', async ({ request }) => {
        const user = currentMockUser()
        if (!user || user.role !== 'client') return HttpResponse.json({ message: 'Only clients can create broadcast requests.' }, { status: 403 })
        const body = await request.json() as { serviceDefinitionId?: string; marketId?: string | null; issueDescription?: string; vehicleSnapshot?: Record<string, string | number | null> | null; photoUrls?: string[]; preferredAt?: string | null; maxProviders?: number }
        if (!body.serviceDefinitionId || !body.issueDescription?.trim()) return invalidMockBodyResponse()
        const now = new Date().toISOString()
        const item = { id: `broadcast-${Date.now()}`, clientId: user.id, serviceDefinitionId: body.serviceDefinitionId, serviceSlug: autoCareDefinitions.find((definition) => definition.id === body.serviceDefinitionId || definition.slug === body.serviceDefinitionId)?.slug ?? body.serviceDefinitionId, marketId: body.marketId ?? autoCareMarket.id, issueDescription: body.issueDescription.trim(), vehicleSnapshot: body.vehicleSnapshot ?? null, preferredAt: body.preferredAt ?? null, status: 'open', maxProviders: body.maxProviders ?? 5, expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), createdAt: now, offers: [] }
        mockAutoCareBroadcastRequests.unshift(item)
        return HttpResponse.json(item, { status: 201 })
    }) },
{ order: 83, handler: http.get('/api/v1/broadcast-requests/my', () => {
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        return HttpResponse.json(mockAutoCareBroadcastRequests.filter((item) => item.clientId === user.id))
    }) },
{ order: 84, handler: http.get('/api/v1/broadcast-requests/:broadcastId', ({ params }) => {
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        const item = mockAutoCareBroadcastRequests.find((candidate) => candidate.id === params.broadcastId)
        if (!item) return HttpResponse.json({ message: 'Broadcast request not found.' }, { status: 404 })
        const response = getMockBroadcastResponse(user, item)
        if (!response) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        return HttpResponse.json(response)
    }) },
{ order: 85, handler: http.get('/api/owner/broadcast-requests', () => {
        const user = currentMockUser()
        if (!user || !getMockManagedProviderAssignments(user.id).length) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        return HttpResponse.json(mockAutoCareBroadcastRequests
            .filter((item) => item.status === 'open' && Date.parse(String(item.expiresAt)) > Date.now())
            .flatMap((item) => { const response = getMockBroadcastResponse(user, item); return response ? [response] : [] }))
    }) },
{ order: 86, handler: http.post('/api/owner/broadcast-requests/:broadcastId/offers', async ({ params, request }) => {
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        const item = mockAutoCareBroadcastRequests.find((candidate) => candidate.id === params.broadcastId)
        const body: unknown = await request.json()
        if (!isMockBroadcastOffer(body) || typeof body.locationId !== 'string') return invalidMockBodyResponse()
        const provider = ownerAutoCareProviders.find((candidate) => candidate.location.id === body.locationId)
        if (!item || !provider || !getMockBroadcastResponse(user, item)
            || !hasMockProviderPermission(user.id, provider.id, 'requests', provider.location.id)
            || provider.location.marketId !== item.marketId
            || !provider.offers?.some((offering) => offering.active && offering.serviceDefinitionId === item.serviceDefinitionId)) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        if (item.status !== 'open' || Date.parse(String(item.expiresAt)) <= Date.now()) return HttpResponse.json({ message: 'Broadcast request is closed.' }, { status: 409 })
        const offer = { id: `broadcast-offer-${Date.now()}`, broadcastRequestId: item.id, providerId: provider.id, providerName: provider.name, locationId: provider.location.id, address: provider.location.address, offerSnapshot: body, status: 'pending', createdAt: new Date().toISOString() }
        const offers = Array.isArray(item.offers) ? item.offers : []
        offers.push(offer)
        item.offers = offers
        return HttpResponse.json(offer, { status: 201 })
    }) },
{ order: 87, handler: http.post('/api/v1/guarantee-claims', async ({ request }) => {
        const user = currentMockUser()
        if (!user || user.role !== 'client') return HttpResponse.json({ message: 'Only clients can create claims.' }, { status: 403 })
        const body = await request.json() as { requestId?: string; claimType?: string; summary?: string; evidenceUrls?: string[] }
        const evidenceUrls = body.evidenceUrls ?? []
        if (!body.requestId || !body.claimType || !body.summary?.trim() || !Array.isArray(evidenceUrls) || evidenceUrls.length > 20 || evidenceUrls.some((value) => !/^private:\/\/autocare\/claims\/[A-Za-z0-9][A-Za-z0-9_-]*(?:\/[A-Za-z0-9][A-Za-z0-9._-]*)*$/.test(value.trim()))) return invalidMockBodyResponse()
        const now = new Date().toISOString()
        const claim = { id: `guarantee-${Date.now()}`, requestId: body.requestId, claimType: body.claimType, status: 'submitted', summary: body.summary.trim(), evidenceUrls: evidenceUrls.map((value) => value.trim()), resolution: null, createdAt: now, updatedAt: now, clientId: user.id }
        mockAutoCareGuaranteeClaims.unshift(claim)
        const { clientId: _clientId, ...response } = claim
        return HttpResponse.json(response, { status: 201 })
    }) },
{ order: 88, handler: http.get('/api/v1/guarantee-claims/my', () => {
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        return HttpResponse.json(mockAutoCareGuaranteeClaims.filter((claim) => claim.clientId === user.id).map(({ clientId: _clientId, ...claim }) => claim))
    }) },
{ order: 89, handler: http.post('/api/v1/expert-questions', async ({ request }) => {
        const user = currentMockUser()
        if (!user || user.role !== 'client') return HttpResponse.json({ message: 'Only clients can ask experts.' }, { status: 403 })
        const body = await request.json() as { symptoms?: string; categorySlug?: string | null; vehicleSnapshot?: Record<string, unknown> | null }
        if (!body.symptoms?.trim()) return invalidMockBodyResponse()
        const item = { id: `expert-question-${Date.now()}`, clientId: user.id, symptoms: body.symptoms.trim(), categorySlug: body.categorySlug ?? null, vehicleSnapshot: body.vehicleSnapshot ?? null, status: 'open', answer: null, createdAt: new Date().toISOString(), answeredAt: null }
        mockAutoCareExpertQuestions.unshift(item)
        const { clientId: _clientId, ...response } = item
        return HttpResponse.json(response, { status: 201 })
    }) },
{ order: 90, handler: http.get('/api/v1/expert-questions/my', () => {
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        return HttpResponse.json(mockAutoCareExpertQuestions.filter((question) => question.clientId === user.id).map(({ clientId: _clientId, ...question }) => question))
    }) },
{ order: 91, handler: http.get('/api/owner/fleets', () => {
        const user = currentMockUser()
        if (!user || user.role !== 'owner') return HttpResponse.json({ message: 'Only owners can view fleets.' }, { status: 403 })
        return HttpResponse.json(mockAutoCareFleets.filter((fleet) => fleet.ownerId === user.id).map(({ ownerId: _ownerId, ...fleet }) => fleet))
    }) },
{ order: 92, handler: http.post('/api/owner/fleets', async ({ request }) => {
        const user = currentMockUser()
        if (!user || user.role !== 'owner') return HttpResponse.json({ message: 'Only owners can create fleets.' }, { status: 403 })
        const body = await request.json() as { name?: string; notes?: string | null }
        if (!body.name?.trim()) return invalidMockBodyResponse()
        const now = new Date().toISOString()
        const fleet = { id: `fleet-${Date.now()}`, ownerId: user.id, name: body.name.trim(), notes: body.notes?.trim() || null, vehicles: [], createdAt: now, updatedAt: now }
        mockAutoCareFleets.unshift(fleet)
        const { ownerId: _ownerId, ...response } = fleet
        return HttpResponse.json(response, { status: 201 })
    }) },
{ order: 93, handler: http.post('/api/owner/fleets/:fleetId/vehicles', async ({ params, request }) => {
        const user = currentMockUser()
        const fleet = mockAutoCareFleets.find((candidate) => candidate.id === params.fleetId && candidate.ownerId === user?.id)
        if (!user || user.role !== 'owner' || !fleet) return HttpResponse.json({ message: 'Fleet not found.' }, { status: 404 })
        const body = await request.json() as { label?: string; vehicleSnapshot?: Record<string, unknown>; approvalPolicy?: string | null }
        if (!body.label?.trim() || !body.vehicleSnapshot) return invalidMockBodyResponse()
        const vehicle = { id: `fleet-vehicle-${Date.now()}`, fleetId: fleet.id, label: body.label.trim(), vehicleSnapshot: body.vehicleSnapshot, approvalPolicy: body.approvalPolicy?.trim() || null, createdAt: new Date().toISOString() }
        ;(fleet.vehicles as Array<unknown>).push(vehicle)
        fleet.updatedAt = new Date().toISOString()
        return HttpResponse.json(vehicle, { status: 201 })
    }) }
]
