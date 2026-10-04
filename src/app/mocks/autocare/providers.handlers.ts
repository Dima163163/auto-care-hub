import { http, HttpResponse } from "msw"
import { automotiveServices, supportsVehicleBrand, type AutoCareApiProvider } from "@/entities/automotive-service"
import { providerPreviews } from "@/entities/automotive-service/model/autocareMockProviders"
import { mockUsers } from ".././data"
import { mockSession } from ".././session"
import { isMockEmpty, isMockPartial, mockScenarioResponse } from ".././mock-scenario"
import { currentMockUser, getMockManagedProviderAssignments, getMockScopedProviderReviews, hasMockProviderPermission, hasMockProviderRole, hasMockProviderRoleAtLocation } from './mock-access'
import { getMockNextProviderSlot, getMockProviderAvailabilitySlots } from './mock-availability'
import { autoCareDefinitions, autoCareProviders, mockAdminAutoCareModerationEvidence, mockAutoCareBonusAccounts, mockAutoCareFavorites, mockAutoCareProviderActivity, mockAutoCareProviderChangeRequests, mockAutoCareServiceRequests, mockAutoCareTrustEvidence, mockProviderLogos, mockProviderMedia, ownerAutoCareProviders, toAutoCareOffer } from './mock-fixtures'
import type { MockAutoCareProviderChangeRequest } from './mock-fixtures'
import { toMockAutoCareFavorite } from './mock-providers'
import { getMockAutoCareReviewSummary, summarizeMockAutoCareReviews } from './mock-reviews'
import { invalidMockBodyResponse } from './mock-validation'

export const providersHandlers = [
{ order: 73, handler: http.get('/api/v1/fair-price', ({ request }) => {
        const url = new URL(request.url)
        const serviceSlug = url.searchParams.get('serviceId') ?? 'oil-change'
        const definition = autoCareDefinitions.find((item) => item.slug === serviceSlug) ?? autoCareDefinitions[0]
        const prices = autoCareProviders.map((provider) => provider.offers?.find((offer) => offer.serviceSlug === definition?.slug)?.priceFromMinor).filter((price): price is number => typeof price === 'number').sort((left, right) => left - right)
        if (!definition || prices.length === 0) return HttpResponse.json(null)
        return HttpResponse.json({ serviceDefinitionId: definition.id, serviceSlug: definition.slug, marketId: url.searchParams.get('marketId'), makeId: url.searchParams.get('makeId'), modelId: url.searchParams.get('modelId'), minPriceMinor: prices[0], medianPriceMinor: prices[Math.floor(prices.length / 2)], maxPriceMinor: prices.at(-1), currencyCode: 'RUB', methodology: { kind: 'provider-offer-derived', sampleSize: prices.length, disclaimer: 'Ориентир по опубликованным предложениям.' }, source: 'mock-provider-offers', generatedAt: new Date().toISOString() })
    }) },
{ order: 74, handler: http.get('/api/v1/providers/:providerId/trust', ({ params }) => {
        const provider = autoCareProviders.find((item) => item.id === params.providerId)
        if (!provider) return HttpResponse.json({ message: 'Provider not found.' }, { status: 404 })
        return HttpResponse.json({ providerId: provider.id, score: provider.verified ? 91.5 : 78.2, badge: provider.verified ? 'Надёжный сервис' : null, reassessedAt: '2026-08-01T10:00:00.000Z', evidence: mockAutoCareTrustEvidence.filter((item) => item.providerId === provider.id), explanation: 'Оценка доверия складывается из документов, отзывов и соблюдения условий.' })
    }) },
{ order: 76, handler: http.get('/api/v1/discovery/providers', ({ request }) => {
        const scenario = mockScenarioResponse(request)
        if (scenario) return scenario
        if (isMockEmpty(request)) return HttpResponse.json({ items: [], nextCursor: null, totalCount: 0, totalCountIsLowerBound: false })
        const url = new URL(request.url)
        // No service filter means the catalog is unscoped: return every
        // provider using a representative published offer below.
        const serviceId = url.searchParams.get('serviceId') ?? ''
        const providerName = url.searchParams.get('providerName')?.trim().toLowerCase() ?? ''
        const radiusKm = Number(url.searchParams.get('radiusKm') ?? 25)
        const sort = url.searchParams.get('sort') ?? 'recommended'
        const minPrice = Number(url.searchParams.get('minPrice') ?? 0)
        const maxPrice = Number(url.searchParams.get('maxPrice') ?? Number.POSITIVE_INFINITY)
        const minRating = Number(url.searchParams.get('minRating') ?? 0)
        const availableToday = url.searchParams.get('availableToday') === 'true'
        const priceType = url.searchParams.get('priceType')
        const verifiedOnly = url.searchParams.get('verifiedOnly') === 'true'
        const warrantyOnly = url.searchParams.get('warrantyOnly') === 'true'
        const hasBonus = url.searchParams.get('hasBonus') === 'true'
        const inclusion = url.searchParams.get('inclusion')
        const brandId = url.searchParams.get('brandId') ?? ''
        const marketId = url.searchParams.get('marketId') ?? ''
        const zoneId = url.searchParams.get('zoneId') ?? ''
        const items = autoCareProviders.map((provider, index) => ({
            provider: { ...provider, ...getMockAutoCareReviewSummary(provider.id) },
            offer: serviceId
                ? toAutoCareOffer(provider.id, serviceId, provider.servicePrices?.[serviceId] ?? providerPreviews[index]?.price ?? 0, providerPreviews[index]?.priceType)
                : provider.offers?.[0] ?? toAutoCareOffer(provider.id, provider.serviceIds?.[0] ?? autoCareDefinitions[0]?.slug ?? 'oil-change', providerPreviews[index]?.price ?? 0, providerPreviews[index]?.priceType),
            distanceKm: providerPreviews[index]?.distance ? Number.parseFloat(providerPreviews[index]!.distance) : index + 1,
            nextSlot: getMockNextProviderSlot(provider),
        })).filter((item) => {
            const hasService = !serviceId || (item.provider.serviceIds?.includes(item.offer.serviceSlug) ?? true)
            const price = item.offer.priceFromMinor / 100
            const available = item.nextSlot?.toLowerCase().includes('today') ?? false
            const source = providerPreviews.find((preview) => `api-${preview.id}` === item.provider.id)
            const matchesInclusion = !inclusion || (source?.inclusions ?? []).some((value) => value.toLowerCase().includes(inclusion))
            const matchesBrand = !source || supportsVehicleBrand(source, brandId)
            const requestedMarket = marketId.replace(/^api-/, '').replace(/^\w+-/, '')
            const providerMarket = item.provider.location.marketId.replace(/^market-/, '')
            const matchesMarket = !marketId || item.provider.location.marketId === marketId || providerMarket === requestedMarket
            const matchesZone = !zoneId || item.provider.location.zoneId === zoneId
            const matchesWarranty = !warrantyOnly || (source?.warrantyMonths ?? 0) > 0
            const matchesPriceType = !priceType || item.offer.priceType === priceType || source?.priceType === priceType
            const matchesProvider = !providerName || item.provider.name.toLowerCase().includes(providerName)
            return matchesProvider && hasService && matchesMarket && matchesZone && item.distanceKm <= radiusKm && price >= minPrice && price <= maxPrice && item.provider.rating >= minRating && (!availableToday || available) && (!verifiedOnly || item.provider.verified) && matchesWarranty && (!hasBonus || Boolean(item.provider.bonusSummary)) && matchesPriceType && matchesInclusion && matchesBrand
        })

        if (sort === 'price_asc') items.sort((left, right) => left.offer.priceFromMinor - right.offer.priceFromMinor)
        if (sort === 'rating_desc') items.sort((left, right) => right.provider.rating - left.provider.rating)
        if (sort === 'distance_asc') items.sort((left, right) => left.distanceKm - right.distanceKm)

        items.forEach((item) => {
            const activity = mockAutoCareProviderActivity.get(item.provider.id) ?? { impressions: 0, profileOpens: 0 }
            activity.impressions += 1
            mockAutoCareProviderActivity.set(item.provider.id, activity)
        })
        const responseItems = isMockPartial(request) ? items.slice(0, Math.max(1, Math.ceil(items.length / 2))) : items
        return HttpResponse.json({ items: responseItems, nextCursor: null, totalCount: items.length, totalCountIsLowerBound: false, partial: isMockPartial(request) })
    }) },
{ order: 77, handler: http.get('/api/v1/favorites/providers', () => {
        const user = currentMockUser()
        if (!user || user.role !== 'client') return HttpResponse.json({ message: 'Only clients can view automotive favorites.' }, { status: 403 })
        const providerIds = [...(mockAutoCareFavorites.get(user.id) ?? new Set<string>())]
        return HttpResponse.json(providerIds.map((providerId) => toMockAutoCareFavorite(providerId, user.id)).filter((item): item is NonNullable<typeof item> => item !== null))
    }) },
{ order: 78, handler: http.post('/api/v1/favorites/providers/sync', async ({ request }) => {
        const user = currentMockUser()
        if (!user || user.role !== 'client') return HttpResponse.json({ message: 'Only clients can sync automotive favorites.' }, { status: 403 })
        if (!user.emailVerifiedAt) return HttpResponse.json({ code: 'EMAIL_VERIFICATION_REQUIRED', message: 'Email verification is required to perform this action.' }, { status: 403 })
        const body = await request.json() as { providerIds?: unknown }
        const providerIds = Array.isArray(body.providerIds) ? body.providerIds.filter((value): value is string => typeof value === 'string').slice(0, 100) : []
        const favorites = mockAutoCareFavorites.get(user.id) ?? new Set<string>()
        providerIds.forEach((providerId) => {
            if (autoCareProviders.some((provider) => provider.id === providerId)) favorites.add(providerId)
        })
        mockAutoCareFavorites.set(user.id, favorites)
        return HttpResponse.json([...favorites].map((providerId) => toMockAutoCareFavorite(providerId, user.id)).filter((item): item is NonNullable<typeof item> => item !== null))
    }) },
{ order: 79, handler: http.post('/api/v1/favorites/providers/:providerId', async ({ params }) => {
        const user = currentMockUser()
        if (!user || user.role !== 'client') return HttpResponse.json({ message: 'Only clients can save automotive favorites.' }, { status: 403 })
        if (!user.emailVerifiedAt) return HttpResponse.json({ code: 'EMAIL_VERIFICATION_REQUIRED', message: 'Email verification is required to perform this action.' }, { status: 403 })
        const providerId = String(params.providerId)
        if (!autoCareProviders.some((provider) => provider.id === providerId)) return HttpResponse.json({ message: 'Provider not found.' }, { status: 404 })
        const favorites = mockAutoCareFavorites.get(user.id) ?? new Set<string>()
        favorites.add(providerId)
        mockAutoCareFavorites.set(user.id, favorites)
        return HttpResponse.json(toMockAutoCareFavorite(providerId, user.id), { status: 201 })
    }) },
{ order: 80, handler: http.delete('/api/v1/favorites/providers/:providerId', ({ params }) => {
        const user = currentMockUser()
        if (!user || user.role !== 'client') return HttpResponse.json({ message: 'Only clients can remove automotive favorites.' }, { status: 403 })
        if (!user.emailVerifiedAt) return HttpResponse.json({ code: 'EMAIL_VERIFICATION_REQUIRED', message: 'Email verification is required to perform this action.' }, { status: 403 })
        const favorites = mockAutoCareFavorites.get(user.id) ?? new Set<string>()
        favorites.delete(String(params.providerId))
        mockAutoCareFavorites.set(user.id, favorites)
        return HttpResponse.json({ success: true })
    }) },
{ order: 94, handler: http.get('/api/v1/providers/:providerId', ({ params, request }) => {
        const scenario = mockScenarioResponse(request)
        if (scenario) return scenario
        const provider = [...autoCareProviders, ...ownerAutoCareProviders].find((item) => item.id === params.providerId || item.id.replace('api-', '') === params.providerId)
        if (!provider) return HttpResponse.json({ message: 'Automotive provider not found.' }, { status: 404 })

        const source = providerPreviews.find((item) => item.id === provider.id.replace('api-', ''))
        const offers = source
            ? automotiveServices.map((service) => toAutoCareOffer(provider.id, service.id, source.servicePrices?.[service.id] ?? source.price, source.priceType ?? 'from'))
            : []

        const activity = mockAutoCareProviderActivity.get(provider.id) ?? { impressions: 0, profileOpens: 0 }
        activity.profileOpens += 1
        mockAutoCareProviderActivity.set(provider.id, activity)
        return HttpResponse.json({ ...provider, ...getMockAutoCareReviewSummary(provider.id), offers, partial: isMockPartial(request) })
    }) },
{ order: 96, handler: http.get('/api/v1/providers/:providerId/availability', ({ params, request }) => {
        const scenario = mockScenarioResponse(request)
        if (scenario) return scenario
        const provider = [...autoCareProviders, ...ownerAutoCareProviders].find((item) => item.id === params.providerId || item.id.replace('api-', '') === params.providerId)
        const url = new URL(request.url)
        const date = url.searchParams.get('date')
        const locationId = url.searchParams.get('locationId')
        const offeringId = url.searchParams.get('offeringId')
        const source = provider ? providerPreviews.find((item) => item.id === provider.id.replace('api-', '')) : undefined
        if (!provider || !date || !locationId || !offeringId) return HttpResponse.json({ message: 'Invalid availability request.' }, { status: 400 })
        const durationMinutes = provider.offers?.find((offer) => offer.id === offeringId)?.durationMinutes ?? 60
        const timezone = provider.location.timezone ?? 'UTC'
        const slots = getMockProviderAvailabilitySlots(provider, date, Date.now(), durationMinutes)
        return HttpResponse.json({ date, timezone, durationMinutes, slots, source: source?.name ?? null })
    }) },
{ order: 131, handler: http.get('/api/owner/autocare-providers', ({ request }) => {
        const scenario = mockScenarioResponse(request)
        if (scenario) return scenario
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)

        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'owner') return HttpResponse.json({ message: 'Only owners can manage automotive service profiles.' }, { status: 403 })

        const providers = ownerAutoCareProviders
            .filter((provider) => hasMockProviderPermission(currentUser.id, provider.id, 'catalog', provider.location.id))
            .map((provider) => ({ ...provider, ...summarizeMockAutoCareReviews(getMockScopedProviderReviews(currentUser.id, provider.id, ['owner', 'manager'])) }))
        return HttpResponse.json(isMockEmpty(request) ? [] : providers)
    }) },
{ order: 142, handler: http.get('/api/owner/autocare-providers/:providerId/change-requests', ({ params }) => {
        const currentUser = currentMockUser()
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'owner' || !hasMockProviderRole(currentUser.id, String(params.providerId), ['owner'])) return HttpResponse.json({ message: 'Only provider owners can manage provider changes.' }, { status: 403 })
        if (!ownerAutoCareProviders.some((provider) => provider.id === params.providerId)) return HttpResponse.json({ message: 'Automotive service not found.' }, { status: 404 })
        return HttpResponse.json(mockAutoCareProviderChangeRequests.filter((request) => request.providerId === params.providerId))
    }) },
{ order: 143, handler: http.post('/api/owner/autocare-providers/:providerId/change-requests', async ({ params, request }) => {
        const currentUser = currentMockUser()
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'owner' || !hasMockProviderRole(currentUser.id, String(params.providerId), ['owner'])) return HttpResponse.json({ message: 'Only provider owners can submit provider changes.' }, { status: 403 })
        if (!ownerAutoCareProviders.some((provider) => provider.id === params.providerId)) return HttpResponse.json({ message: 'Automotive service not found.' }, { status: 404 })
        const body = await request.json() as { kind?: unknown; payload?: unknown }
        if (body.kind !== 'verification' && body.kind !== 'profile_update') return invalidMockBodyResponse()
        const payload = body.payload && typeof body.payload === 'object' && !Array.isArray(body.payload) ? body.payload as Record<string, unknown> : {}
        if (body.kind === 'verification' && Object.keys(payload).length > 0) return invalidMockBodyResponse()
        const pending = mockAutoCareProviderChangeRequests.find((candidate) => candidate.providerId === params.providerId && candidate.kind === body.kind && candidate.status === 'pending')
        if (pending) return HttpResponse.json({ message: 'A provider change request of this type is already pending.' }, { status: 409 })
        const now = new Date().toISOString()
        const changeRequest: MockAutoCareProviderChangeRequest = { id: `provider-change-${Date.now()}`, providerId: String(params.providerId), requestedById: currentUser.id, kind: body.kind, status: 'pending', payload, reviewedById: null, reviewReason: null, reviewedAt: null, createdAt: now, updatedAt: now }
        mockAutoCareProviderChangeRequests.unshift(changeRequest)
        return HttpResponse.json(changeRequest, { status: 201 })
    }) },
{ order: 144, handler: http.delete('/api/owner/autocare-providers/:providerId/change-requests/:requestId', ({ params }) => {
        const currentUser = currentMockUser()
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'owner' || !hasMockProviderRole(currentUser.id, String(params.providerId), ['owner'])) return HttpResponse.json({ message: 'Only provider owners can cancel provider changes.' }, { status: 403 })
        const changeRequest = mockAutoCareProviderChangeRequests.find((candidate) => candidate.id === params.requestId && candidate.providerId === params.providerId)
        if (!changeRequest) return HttpResponse.json({ message: 'Provider change request not found.' }, { status: 404 })
        if (changeRequest.status === 'pending') { changeRequest.status = 'cancelled'; changeRequest.updatedAt = new Date().toISOString() }
        return HttpResponse.json(changeRequest)
    }) },
{ order: 145, handler: http.get('/api/owner/autocare-providers/:providerId/analytics', ({ params, request }) => {
        const scenario = mockScenarioResponse(request)
        if (scenario) return scenario
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'owner' || !hasMockProviderRole(currentUser.id, String(params.providerId), ['owner', 'manager'])) return HttpResponse.json({ message: 'Only provider owners and managers can view automotive analytics.' }, { status: 403 })
        const provider = ownerAutoCareProviders.find((item) => item.id === params.providerId)
        if (!provider) return HttpResponse.json({ message: 'Automotive service not found.' }, { status: 404 })
        const requests = mockAutoCareServiceRequests.filter((item) => item.providerId === provider.id && hasMockProviderRoleAtLocation(currentUser.id, provider.id, ['owner', 'manager'], item.locationId))
        const confirmed = requests.filter((item) => Boolean(item.clientConfirmedAt && item.providerConfirmedAt))
        const completed = requests.filter((item) => item.status === 'closed' && item.clientConfirmedAt && item.providerConfirmedAt)
        const quoteRequests = new Set(requests.filter((item) => item.quote || item.acceptedQuoteAt).map((item) => item.id))
        const acceptedQuotes = requests.filter((item) => Boolean(item.acceptedQuoteAt)).length
        const clients = new Map<string, number>()
        requests.forEach((item) => clients.set(item.clientId, (clients.get(item.clientId) ?? 0) + 1))
        const reviews = getMockScopedProviderReviews(currentUser.id, provider.id, ['owner', 'manager'])
        const hasProviderWideAnalyticsScope = getMockManagedProviderAssignments(currentUser.id).some((assignment) =>
            assignment.providerId === provider.id
            && assignment.locationId === null
            && ['owner', 'manager'].includes(assignment.role),
        )
        const percent = (value: number, total: number) => total === 0 ? 0 : Number(((value / total) * 100).toFixed(1))
        return HttpResponse.json({
            providerId: provider.id,
            generatedAt: new Date().toISOString(),
            inquiries: requests.filter((item) => item.status !== 'draft').length,
            openRequests: requests.filter((item) => ['open', 'awaiting_reply', 'estimate_shared'].includes(item.status)).length,
            confirmedBookings: confirmed.length,
            completedVisits: completed.length,
            cancelledRequests: requests.filter((item) => item.status === 'cancelled').length,
            noShowRequests: requests.filter((item) => item.status === 'no_show').length,
            completionRate: percent(completed.length, confirmed.length),
            quoteConversionRate: percent(acceptedQuotes, quoteRequests.size),
            averageResponseMinutes: null,
            repeatCustomers: [...clients.values()].filter((count) => count > 1).length,
            reviewCount: reviews.length,
            averageRating: reviews.length ? Number((reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length).toFixed(1)) : 0,
            bonusLiabilityPoints: hasProviderWideAnalyticsScope
                ? mockAutoCareBonusAccounts.filter((item) => item.providerId === provider.id).reduce((sum, item) => sum + item.balancePoints, 0)
                : 0,
            tracking: {
                ...(mockAutoCareProviderActivity.get(provider.id) ?? { impressions: 0, profileOpens: 0 }),
                available: hasProviderWideAnalyticsScope,
            },
            privacy: { consentRequired: false, retentionDays: 365 },
        })
    }) },
{ order: 146, handler: http.get('/api/owner/autocare-providers/:providerId/evidence', ({ params }) => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'owner' || !hasMockProviderRole(currentUser.id, String(params.providerId), ['owner'])) return HttpResponse.json({ message: 'Only provider owners can view evidence.' }, { status: 403 })
        if (!ownerAutoCareProviders.some((provider) => provider.id === params.providerId)) return HttpResponse.json({ message: 'Automotive service not found.' }, { status: 404 })
        return HttpResponse.json(mockAdminAutoCareModerationEvidence.filter((item) => item.providerId === params.providerId).map((item) => ({
            id: item.id,
            providerId: item.providerId,
            kind: item.kind,
            label: item.label,
            status: item.status,
            reference: item.reference,
            notes: item.notes,
            expiresAt: item.expiresAt,
            createdAt: item.createdAt,
            verifiedAt: item.verifiedAt,
        })))
    }) },
{ order: 151, handler: http.patch('/api/owner/autocare-providers/:providerId/offers/:offerId', async ({ params, request }) => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)
        const provider = ownerAutoCareProviders.find((item) => item.id === params.providerId)
        const offer = provider?.offers?.find((item) => item.id === params.offerId)
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (!provider || !offer) return HttpResponse.json({ message: 'Automotive service offer not found.' }, { status: 404 })
        if (currentUser.role !== 'owner' || !hasMockProviderRole(currentUser.id, String(params.providerId), ['owner', 'manager'], provider.location.id)) return HttpResponse.json({ message: 'Only provider owners and managers can edit automotive service offers.' }, { status: 403 })

        const body = await request.json() as { description?: unknown; priceFromMinor?: unknown }
        if ((body.description !== null && (typeof body.description !== 'string' || body.description.length > 2_000)) || typeof body.priceFromMinor !== 'number' || !Number.isInteger(body.priceFromMinor) || body.priceFromMinor < 0 || body.priceFromMinor > 10_000_000_000) {
            return HttpResponse.json({ message: 'Invalid automotive service offer.' }, { status: 400 })
        }

        offer.description = typeof body.description === 'string' ? body.description.trim() || null : null
        offer.priceFromMinor = body.priceFromMinor
        if (offer.priceToMinor !== null && offer.priceToMinor < offer.priceFromMinor) offer.priceToMinor = offer.priceFromMinor
        return HttpResponse.json(offer)
    }) },
{ order: 159, handler: http.post('/api/owner/autocare-providers/logo', async ({ request }) => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'owner') return HttpResponse.json({ message: 'Only owners can manage automotive service profiles.' }, { status: 403 })
        const body = await request.json() as { contentBase64?: string }
        if (!body.contentBase64) return HttpResponse.json({ message: 'Invalid provider logo.' }, { status: 400 })
        const fileName = `${crypto.randomUUID()}.webp`
        mockProviderLogos.set(fileName, body.contentBase64)
        return HttpResponse.json({ url: `/uploads/autocare/logos/${fileName}` })
    }) },
{ order: 160, handler: http.get('/api/uploads/autocare/logos/:fileName', ({ params }) => {
        const contentBase64 = mockProviderLogos.get(String(params.fileName))
        if (!contentBase64) return HttpResponse.redirect('/images/autocare/placeholders/provider.svg')
        const bytes = Uint8Array.from(atob(contentBase64), (character) => character.charCodeAt(0))
        return new HttpResponse(bytes, { headers: { 'content-type': 'image/webp' } })
    }) },
{ order: 161, handler: http.post('/api/owner/autocare-providers/media', async ({ request }) => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'owner') return HttpResponse.json({ message: 'Only owners can manage automotive service profiles.' }, { status: 403 })
        const body = await request.json() as { kind?: string; contentBase64?: string }
        if ((body.kind !== 'cover' && body.kind !== 'gallery') || !body.contentBase64) return HttpResponse.json({ message: 'Invalid provider image.' }, { status: 400 })
        const fileName = `${crypto.randomUUID()}.webp`
        mockProviderMedia.set(`${body.kind}/${fileName}`, body.contentBase64)
        return HttpResponse.json({ url: `/uploads/autocare/media/${body.kind}/${fileName}` })
    }) },
{ order: 162, handler: http.get('/api/uploads/autocare/media/:kind/:fileName', ({ params }) => {
        const key = `${String(params.kind)}/${String(params.fileName)}`
        const contentBase64 = mockProviderMedia.get(key)
        if (!contentBase64) return HttpResponse.redirect('/images/autocare/placeholders/provider.svg')
        const bytes = Uint8Array.from(atob(contentBase64), (character) => character.charCodeAt(0))
        return new HttpResponse(bytes, { headers: { 'content-type': 'image/webp' } })
    }) },
{ order: 163, handler: http.post('/api/owner/autocare-providers', async ({ request }) => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)

        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'owner') return HttpResponse.json({ message: 'Only owners can manage automotive service profiles.' }, { status: 403 })

        const body = await request.json() as {
            name?: string
            description?: string
            marketId?: string
            countryCode?: string
            countryName?: string
            cityName?: string
            currencyCode?: string
            timezone?: string
            address?: string
            hours?: string
            yearsActive?: number
            staffCount?: number
            workstationCount?: number
            teamSize?: 'solo' | 'small_team' | 'team' | 'enterprise'
            businessType?: 'sole_proprietor' | 'self_employed' | 'company' | 'private_master' | 'other'
            chatEnabled?: boolean
            communicationMode?: 'online' | 'request_then_confirm' | 'phone_only'
            responseWindowMinutes?: number | null
            responseHours?: 'working_hours' | 'always_on'
            phoneBookingEnabled?: boolean
            callbackEnabled?: boolean
            requestPhotosEnabled?: boolean
            publicContactNote?: string | null
            phone?: string | null
            phones?: string[]
            email?: string | null
            websiteUrl?: string | null
            metroStation?: string | null
            warrantyText?: string | null
            bonusSummary?: string | null
            isMultibrand?: boolean
            brandSpecializations?: string[]
            amenityIds?: string[]
            logoUrl?: string | null
            coverImageUrl?: string | null
            galleryImageUrls?: string[]
        }

        if (!body.name?.trim() || (!body.marketId && (!body.countryCode?.trim() || !body.countryName?.trim() || !body.cityName?.trim())) || !body.address?.trim() || !body.hours?.trim()) {
            return HttpResponse.json({ message: 'Invalid service profile.' }, { status: 400 })
        }

        const id = `owner-provider-${Date.now()}`
        const mockMarketId = body.marketId ?? `market-${body.countryCode?.trim().toUpperCase()}-${body.cityName?.trim().toLowerCase().replace(/\s+/g, '-')}`
        const provider = {
            id,
            name: body.name.trim(),
            description: body.description?.trim() || null,
            status: 'draft' as const,
            verified: false,
            yearsActive: Math.max(0, Number(body.yearsActive) || 0),
            staffCount: Math.max(0, Number(body.staffCount) || 0),
            workstationCount: Math.max(0, Number(body.workstationCount) || 0),
            teamSize: body.teamSize ?? 'small_team',
            businessType: body.businessType ?? 'company',
            chatEnabled: body.chatEnabled ?? true,
            communicationMode: body.communicationMode ?? 'online',
            responseWindowMinutes: body.responseWindowMinutes ?? 240,
            responseHours: body.responseHours ?? 'working_hours',
            phoneBookingEnabled: body.phoneBookingEnabled ?? true,
            callbackEnabled: body.callbackEnabled ?? true,
            requestPhotosEnabled: body.requestPhotosEnabled ?? true,
            publicContactNote: body.publicContactNote ?? null,
            phone: body.phone?.trim() || null,
            phones: [...new Set([body.phone?.trim() ?? '', ...(body.phones ?? [])].map((phone) => phone.trim()).filter(Boolean))],
            email: body.email?.trim() || null,
            websiteUrl: body.websiteUrl?.trim() || null,
            metroStation: body.metroStation?.trim() || null,
            warrantyText: body.warrantyText?.trim() || null,
            bonusSummary: body.bonusSummary?.trim() || null,
            rating: 0,
            reviewCount: 0,
            logoUrl: body.logoUrl ?? null,
            brandSpecializations: body.isMultibrand ? [] : [...new Set(body.brandSpecializations ?? [])],
            isMultibrand: Boolean(body.isMultibrand),
            coverImageUrl: body.coverImageUrl ?? null,
            galleryImageUrls: [...new Set(body.galleryImageUrls ?? [])],
            amenityIds: [...new Set(body.amenityIds ?? [])],
            location: {
                id: `location-${id}`,
                marketId: mockMarketId,
                address: body.address.trim(),
                hours: body.hours.trim(),
                latitude: null,
                longitude: null,
            },
            serviceIds: [],
            servicePrices: {},
        }

        ownerAutoCareProviders.unshift(provider)
        return HttpResponse.json(provider, { status: 201 })
    }) },
{ order: 164, handler: http.patch('/api/owner/autocare-providers/:providerId/communication-settings', async ({ params, request }) => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'owner' || !hasMockProviderRole(currentUser.id, String(params.providerId), ['owner'])) return HttpResponse.json({ message: 'Only provider owners can manage automotive service profiles.' }, { status: 403 })
        const provider = ownerAutoCareProviders.find((item) => item.id === params.providerId)
        if (!provider) return HttpResponse.json({ message: 'Automotive provider not found.' }, { status: 404 })
        const body = await request.json() as Partial<Omit<AutoCareApiProvider, 'id' | 'location'>>
        Object.assign(provider, {
            teamSize: body.teamSize ?? provider.teamSize ?? 'small_team',
            businessType: body.businessType ?? provider.businessType ?? 'company',
            chatEnabled: body.chatEnabled ?? provider.chatEnabled ?? true,
            communicationMode: body.communicationMode ?? provider.communicationMode ?? 'online',
            responseWindowMinutes: body.responseWindowMinutes ?? provider.responseWindowMinutes ?? 240,
            responseHours: body.responseHours ?? provider.responseHours ?? 'working_hours',
            phoneBookingEnabled: body.phoneBookingEnabled ?? provider.phoneBookingEnabled ?? true,
            callbackEnabled: body.callbackEnabled ?? provider.callbackEnabled ?? true,
            requestPhotosEnabled: body.requestPhotosEnabled ?? provider.requestPhotosEnabled ?? true,
            publicContactNote: body.publicContactNote ?? provider.publicContactNote ?? null,
        })
        return HttpResponse.json(provider)
    }) }
]
