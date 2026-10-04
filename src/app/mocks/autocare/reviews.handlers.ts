import { http, HttpResponse } from "msw"
import { providerPreviews } from "@/entities/automotive-service/model/autocareMockProviders"
import { mockUsers } from ".././data"
import { mockSession } from ".././session"
import { mockScenarioResponse } from ".././mock-scenario"
import { currentMockUser, getMockScopedProviderReviews, hasMockProviderRole } from './mock-access'
import { autoCareProviders, mockAutoCareReviewPromos, mockAutoCareServiceRequests, mockFeaturedAutoCareReviews, mockPlatformReviews, ownerAutoCareProviders, reviewPhotoAssets } from './mock-fixtures'
import type { MockAutoCareReview, MockAutoCareReviewPromo, MockPlatformReview } from './mock-fixtures'
import { getMockPublicAutoCareReviews, summarizeMockAutoCareReviews, toMockPublicAutoCareReview } from './mock-reviews'
import { invalidMockBodyResponse } from './mock-validation'

export const reviewsHandlers = [
{ order: 95, handler: http.get('/api/v1/providers/:providerId/reviews', ({ params, request }) => {
        const scenario = mockScenarioResponse(request)
        if (scenario) return scenario
        const provider = [...autoCareProviders, ...ownerAutoCareProviders].find((item) => item.id === params.providerId || item.id.replace('api-', '') === params.providerId)
        if (!provider) return HttpResponse.json({ message: 'Automotive provider not found.' }, { status: 404 })

        const allProviderReviews = getMockPublicAutoCareReviews(provider.id)
        const reviewFixture = request.headers.get('x-autocare-review-fixture')
        const reviewFixtureItem: MockAutoCareReview | null = reviewFixture === 'one' || reviewFixture === 'photos'
            ? {
                id: `browser-review-fixture-${reviewFixture}`,
                providerId: provider.id,
                authorName: 'Тестовый клиент',
                vehicleLabel: 'Test vehicle',
                rating: 5,
                text: 'Тестовый подтверждённый отзыв о завершённом визите.',
                avatarUrl: null,
                photoUrls: reviewFixture === 'photos' ? [reviewPhotoAssets[0]!] : [],
                createdAt: '2026-08-12T10:00:00.000Z',
                serviceRequestId: 'browser-fixture-closed-request',
                serviceSlug: 'oil-change',
                verifiedVisit: true,
                status: 'approved',
            }
            : null
        const providerReviews = reviewFixture === 'empty'
            ? []
            : reviewFixtureItem
                ? [reviewFixtureItem]
                : allProviderReviews
        const distribution: Record<'1' | '2' | '3' | '4' | '5', number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
        providerReviews.forEach((review) => { distribution[String(review.rating) as keyof typeof distribution] += 1 })
        const averageRating = providerReviews.length === 0 ? 0 : Number((providerReviews.reduce((sum, review) => sum + review.rating, 0) / providerReviews.length).toFixed(1))
        const rawLimit = Number(new URL(request.url).searchParams.get('limit') ?? 20)
        const limit = Number.isFinite(rawLimit) ? Math.min(50, Math.max(1, Math.floor(rawLimit))) : 20
        return HttpResponse.json({ providerId: provider.id, totalReviews: providerReviews.length, averageRating, distribution, reviews: providerReviews.slice(0, limit).map(toMockPublicAutoCareReview) })
    }) },
{ order: 152, handler: http.get('/api/owner/autocare-providers/:providerId/reviews', ({ params }) => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)
        const providerId = String(params.providerId)
        const provider = ownerAutoCareProviders.find((item) => item.id === providerId)
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'owner' || !hasMockProviderRole(currentUser.id, providerId, ['owner', 'manager'])) return HttpResponse.json({ message: 'Only provider owners and managers can view automotive service reviews.' }, { status: 403 })
        if (!provider) return HttpResponse.json({ message: 'Automotive service provider not found.' }, { status: 404 })

        const now = Date.now()
        const reviews = getMockScopedProviderReviews(currentUser.id, providerId, ['owner', 'manager']).map((review) => ({
            ...review,
            canContact: Boolean(review.serviceRequestId),
            canEdit: Boolean(review.revisionAllowedUntil && new Date(review.revisionAllowedUntil).getTime() > now && !review.revisionUsedAt),
        }))
        const distribution = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
        for (const review of reviews) distribution[String(review.rating) as keyof typeof distribution]++
        const totalReviews = reviews.length
        const averageRating = totalReviews === 0 ? 0 : Number((reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews).toFixed(1))
        return HttpResponse.json({ providerId, totalReviews, averageRating, distribution, reviews })
    }) },
{ order: 153, handler: http.get('/api/owner/autocare-reviews', ({ request }) => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'owner') return HttpResponse.json({ message: 'Only owners can view automotive service reviews.' }, { status: 403 })
        const providerId = new URL(request.url).searchParams.get('providerId') || null
        const allowedProviders = ownerAutoCareProviders.filter((provider) => hasMockProviderRole(currentUser.id, provider.id, ['owner', 'manager']))
        const selectedProviders = providerId ? allowedProviders.filter((provider) => provider.id === providerId) : allowedProviders
        if (providerId && selectedProviders.length === 0) return HttpResponse.json({ message: 'Automotive service provider not found.' }, { status: 404 })
        const now = Date.now()
        const reviews = selectedProviders.flatMap((provider) => getMockScopedProviderReviews(currentUser.id, provider.id, ['owner', 'manager'])).map((review) => {
            const provider = selectedProviders.find((item) => item.id === review.providerId)
            return { ...review, providerName: provider?.name ?? 'AutoCare service', providerAddress: provider?.location.address ?? '', canContact: Boolean(review.serviceRequestId), canEdit: Boolean(review.revisionAllowedUntil && new Date(review.revisionAllowedUntil).getTime() > now && !review.revisionUsedAt) }
        })
        const distribution = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
        for (const review of reviews) distribution[String(review.rating) as keyof typeof distribution]++
        return HttpResponse.json({ selectedProviderId: providerId, providers: selectedProviders.map((provider) => ({ id: provider.id, name: provider.name, address: provider.location.address, ...summarizeMockAutoCareReviews(reviews.filter((review) => review.providerId === provider.id)) })), totalReviews: reviews.length, averageRating: reviews.length ? Number((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)) : 0, distribution, reviews })
    }) },
{ order: 154, handler: http.post('/api/owner/autocare-providers/:providerId/reviews/:reviewId/promos', async ({ params, request }) => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)
        const providerId = String(params.providerId)
        const reviewId = String(params.reviewId)
        const provider = ownerAutoCareProviders.find((item) => item.id === providerId)
        const review = mockFeaturedAutoCareReviews.find((item) => item.id === reviewId && item.providerId === providerId)
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'owner' || !hasMockProviderRole(currentUser.id, providerId, ['owner'])) return HttpResponse.json({ message: 'Only provider owners can issue service promos.' }, { status: 403 })
        if (!provider || !review) return HttpResponse.json({ message: 'Automotive review not found.' }, { status: 404 })
        if (!review.clientId) return HttpResponse.json({ message: 'This review is not linked to a client account yet.' }, { status: 409 })

        const body = await request.json() as { discountPercent?: unknown; serviceSlug?: unknown; expiresInDays?: unknown }
        const discountPercent = body.discountPercent
        const expiresInDays = body.expiresInDays ?? 30
        if (typeof discountPercent !== 'number' || !Number.isInteger(discountPercent) || discountPercent < 1 || discountPercent > 100 || typeof expiresInDays !== 'number' || !Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 90) {
            return HttpResponse.json({ message: 'Discount must be between 1 and 100 percent.' }, { status: 400 })
        }
        let code = `CARE-${crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`
        while (mockAutoCareReviewPromos.some((promo) => promo.code === code)) code = `CARE-${crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`
        const promo: MockAutoCareReviewPromo = {
            id: crypto.randomUUID(),
            reviewId,
            providerId,
            clientId: review.clientId,
            serviceRequestId: review.serviceRequestId ?? null,
            serviceSlug: typeof body.serviceSlug === 'string' ? body.serviceSlug.trim() || null : review.serviceSlug ?? null,
            code,
            discountPercent,
            status: 'active',
            expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1_000).toISOString(),
            redeemedAt: null,
        }
        mockAutoCareReviewPromos.unshift(promo)
        return HttpResponse.json(promo)
    }) },
{ order: 155, handler: http.get('/api/v1/autocare-reviews/my', () => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'client') return HttpResponse.json({ message: 'Only clients can view automotive reviews.' }, { status: 403 })
        const now = Date.now()
        return HttpResponse.json(mockFeaturedAutoCareReviews.filter((review) => review.clientId === currentUser.id).map((review) => ({
            ...review,
            canContact: false,
            canEdit: Boolean(review.revisionAllowedUntil && new Date(review.revisionAllowedUntil).getTime() > now && !review.revisionUsedAt),
        })))
    }) },
{ order: 156, handler: http.post('/api/v1/autocare-reviews', async ({ request }) => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'client') return HttpResponse.json({ message: 'Only clients can create automotive reviews.' }, { status: 403 })
        const body = await request.json() as { requestId?: unknown; rating?: unknown; text?: unknown }
        const serviceRequest = typeof body.requestId === 'string' ? mockAutoCareServiceRequests.find((item) => item.id === body.requestId && item.clientId === currentUser.id) : undefined
        if (!serviceRequest) return HttpResponse.json({ message: 'Service request not found.' }, { status: 404 })
        if (!['accepted', 'closed'].includes(serviceRequest.status) || !serviceRequest.clientConfirmedAt || !serviceRequest.providerConfirmedAt) return HttpResponse.json({ message: 'A completed and confirmed visit is required before leaving a review.' }, { status: 409 })
        if (mockFeaturedAutoCareReviews.some((review) => review.serviceRequestId === serviceRequest.id)) return HttpResponse.json({ message: 'This service visit already has a review.' }, { status: 409 })
        if (typeof body.rating !== 'number' || !Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5 || typeof body.text !== 'string' || body.text.trim().length < 10 || body.text.trim().length > 1_000) return HttpResponse.json({ message: 'Invalid review.' }, { status: 400 })
        const review: MockAutoCareReview = {
            id: `autocare-review-${crypto.randomUUID()}`,
            providerId: serviceRequest.providerId,
            authorName: currentUser.name,
            vehicleLabel: serviceRequest.vehicleSnapshot ? `${serviceRequest.vehicleSnapshot.make} ${serviceRequest.vehicleSnapshot.model}` : 'Автомобиль',
            rating: body.rating,
            text: body.text.trim(),
            avatarUrl: currentUser.avatarUrl ?? null,
            photoUrls: [],
            createdAt: new Date().toISOString(),
            clientId: currentUser.id,
            serviceRequestId: serviceRequest.id,
            serviceSlug: serviceRequest.serviceSlug,
        }
        mockFeaturedAutoCareReviews.unshift(review)
        return HttpResponse.json({ ...review, canContact: true, canEdit: false }, { status: 201 })
    }) },
{ order: 157, handler: http.post('/api/v1/autocare-review-promos/redeem', async ({ request }) => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'client') return HttpResponse.json({ message: 'Only clients can redeem service promos.' }, { status: 403 })
        const body = await request.json() as { code?: unknown }
        const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : ''
        const promo = mockAutoCareReviewPromos.find((item) => item.code === code && item.clientId === currentUser.id)
        if (!promo) return HttpResponse.json({ message: 'Promo code not found.' }, { status: 404 })
        if (promo.status !== 'active') return HttpResponse.json({ message: 'This promo code has already been used or revoked.' }, { status: 409 })
        if (new Date(promo.expiresAt).getTime() <= Date.now()) {
            promo.status = 'expired'
            return HttpResponse.json({ message: 'This promo code has expired.' }, { status: 409 })
        }
        promo.status = 'redeemed'
        promo.redeemedAt = new Date().toISOString()
        const review = mockFeaturedAutoCareReviews.find((item) => item.id === promo.reviewId && item.clientId === currentUser.id)
        if (!review) return HttpResponse.json({ message: 'Review linked to this promo was not found.' }, { status: 404 })
        review.revisionAllowedUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1_000).toISOString()
        review.revisionUsedAt = null
        return HttpResponse.json(promo)
    }) },
{ order: 158, handler: http.patch('/api/v1/autocare-reviews/:reviewId', async ({ params, request }) => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)
        const review = mockFeaturedAutoCareReviews.find((item) => item.id === String(params.reviewId))
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'client') return HttpResponse.json({ message: 'Only clients can edit automotive reviews.' }, { status: 403 })
        if (!review || review.clientId !== currentUser.id) return HttpResponse.json({ message: 'Automotive review not found.' }, { status: 404 })
        if (!review.revisionAllowedUntil || new Date(review.revisionAllowedUntil).getTime() <= Date.now() || review.revisionUsedAt) return HttpResponse.json({ message: 'Redeem a valid service promo before editing this review.' }, { status: 409 })
        const body = await request.json() as { rating?: unknown; text?: unknown }
        if (typeof body.rating !== 'number' || !Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5 || typeof body.text !== 'string' || body.text.trim().length < 10 || body.text.trim().length > 1_000) return HttpResponse.json({ message: 'Invalid review.' }, { status: 400 })
        review.rating = body.rating
        review.text = body.text.trim()
        review.revisionUsedAt = new Date().toISOString()
        return HttpResponse.json({ ...review, canContact: false, canEdit: false })
    }) },
{ order: 166, handler: http.get('/api/v1/platform-reviews', ({ request }) => {
        const limit = Number(new URL(request.url).searchParams.get('limit') ?? 30)
        return HttpResponse.json(mockPlatformReviews.filter((review) => review.status === 'approved').slice(0, Number.isFinite(limit) ? limit : 30))
    }) },
{ order: 167, handler: http.post('/api/v1/platform-reviews', async ({ request }) => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'client') return HttpResponse.json({ message: 'Only clients can publish platform reviews.' }, { status: 403 })
        const body = await request.json() as { rating?: unknown; text?: unknown }
        if (typeof body.rating !== 'number' || !Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5 || typeof body.text !== 'string' || body.text.trim().length < 10 || body.text.trim().length > 1_000) return HttpResponse.json({ message: 'Invalid platform review.' }, { status: 400 })
        const rawIdempotencyKey = request.headers.get('Idempotency-Key')
        const idempotencyKey = rawIdempotencyKey?.trim() || null
        if (idempotencyKey && !/^[a-zA-Z0-9_-]{8,128}$/.test(idempotencyKey)) return HttpResponse.json({ message: 'Idempotency-Key must contain 8-128 safe characters.' }, { status: 400 })
        if (idempotencyKey) {
            const existing = mockPlatformReviews.find((review) => review.clientId === currentUser.id && review.idempotencyKey === idempotencyKey)
            if (existing) {
                if (existing.rating !== body.rating || existing.text !== body.text.trim()) return HttpResponse.json({ message: 'Idempotency key was already used for another platform review.' }, { status: 409 })
                return HttpResponse.json(existing)
            }
        }
        const review: MockPlatformReview = { id: `platform-review-${Date.now()}`, authorName: currentUser.name, avatarUrl: currentUser.avatarUrl ?? null, authorRole: 'AutoCare Hub клиент', rating: body.rating, text: body.text.trim(), status: 'pending', organizationResponse: null, organizationRespondedAt: null, createdAt: new Date().toISOString(), clientId: currentUser.id, idempotencyKey }
        mockPlatformReviews.unshift(review)
        return HttpResponse.json(review, { status: 201 })
    }) },
{ order: 168, handler: http.get('/api/v1/platform-reviews/my', () => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'client') return HttpResponse.json({ message: 'Only clients can view platform reviews.' }, { status: 403 })
        return HttpResponse.json(mockPlatformReviews.filter((review) => review.clientId === currentUser.id))
    }) },
{ order: 169, handler: http.get('/api/admin/platform-reviews', () => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') return HttpResponse.json({ message: 'Only administrators can moderate platform reviews.' }, { status: 403 })
        return HttpResponse.json(mockPlatformReviews)
    }) },
{ order: 170, handler: http.post('/api/admin/platform-reviews/:reviewId/response', async ({ params, request }) => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)
        const review = mockPlatformReviews.find((item) => item.id === String(params.reviewId))
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') return HttpResponse.json({ message: 'Only administrators can respond to platform reviews.' }, { status: 403 })
        if (!review) return HttpResponse.json({ message: 'Platform review not found.' }, { status: 404 })
        const body = await request.json() as { response?: unknown }
        if (typeof body.response !== 'string' || body.response.trim().length < 5 || body.response.trim().length > 2_000) return HttpResponse.json({ message: 'Invalid organization response.' }, { status: 400 })
        review.organizationResponse = body.response.trim()
        review.organizationRespondedAt = new Date().toISOString()
        if (review.status === 'pending') review.status = 'approved'
        return HttpResponse.json(review)
    }) },
{ order: 171, handler: http.delete('/api/super-admin/platform-reviews/:reviewId', ({ params }) => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)
        const review = mockPlatformReviews.find((item) => item.id === String(params.reviewId))
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'super_admin') return HttpResponse.json({ message: 'Only a super administrator can remove platform reviews.' }, { status: 403 })
        if (!review) return HttpResponse.json({ message: 'Platform review not found.' }, { status: 404 })
        review.status = 'removed'
        return HttpResponse.json({ success: true })
    }) },
{ order: 172, handler: http.get('/api/admin/autocare-reviews', () => {
        const currentUser = currentMockUser()
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') return HttpResponse.json({ message: 'Only administrators can moderate automotive reviews.' }, { status: 403 })

        return HttpResponse.json(mockFeaturedAutoCareReviews.map((review) => ({
            ...review,
            providerName: providerPreviews.find((provider) => `api-${provider.id}` === review.providerId)?.name ?? review.providerId,
            status: review.status ?? 'approved',
        })))
    }) },
{ order: 173, handler: http.patch('/api/admin/autocare-reviews/:reviewId/status', async ({ params, request }) => {
        const currentUser = currentMockUser()
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') return HttpResponse.json({ message: 'Only administrators can moderate automotive reviews.' }, { status: 403 })

        const review = mockFeaturedAutoCareReviews.find((item) => item.id === String(params.reviewId))
        if (!review) return HttpResponse.json({ message: 'Automotive review not found.' }, { status: 404 })

        const body = await request.json() as { status?: unknown; reason?: unknown }
        if (body.status !== 'approved' && body.status !== 'rejected') return invalidMockBodyResponse()
        if (body.status === 'rejected' && (typeof body.reason !== 'string' || body.reason.trim().length === 0)) return invalidMockBodyResponse()

        review.status = body.status
        return HttpResponse.json({
            ...review,
            providerName: providerPreviews.find((provider) => `api-${provider.id}` === review.providerId)?.name ?? review.providerId,
            status: review.status,
        })
    }) },
{ order: 174, handler: http.get('/api/v1/reviews/featured', ({ request }) => {
        const limit = Number(new URL(request.url).searchParams.get('limit') ?? 6)
        const fixture = request.headers.get('x-autocare-review-fixture')
        const publicReviews = [...new Set(mockFeaturedAutoCareReviews.map((review) => review.providerId))]
            .flatMap((providerId) => getMockPublicAutoCareReviews(providerId))
        const reviews = fixture === 'empty'
            ? []
            : fixture === 'one'
                ? publicReviews.slice(0, 1)
                : fixture === 'photos'
                    ? publicReviews.filter((review) => review.photoUrls.length > 0).slice(0, 3)
                    : publicReviews
        return HttpResponse.json(reviews.filter((review) => (review.status ?? 'approved') === 'approved').slice(0, Number.isFinite(limit) ? limit : 6).map((review) => ({
            ...toMockPublicAutoCareReview(review),
            providerName: providerPreviews.find((provider) => `api-${provider.id}` === review.providerId)?.name ?? review.providerId,
        })))
    }) }
]
