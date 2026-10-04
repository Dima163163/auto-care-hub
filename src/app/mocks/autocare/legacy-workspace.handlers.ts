import { http, HttpResponse } from "msw"
import type { User } from "@/entities/user"
import { mockBookings, mockCabinets, mockReviews, mockServices, mockUsers } from ".././data"
import { mockSession } from ".././session"
import { mockScenarioResponse } from ".././mock-scenario"
import { currentMockUser } from './mock-access'
import { getMockAvailabilityPreview } from './mock-availability'
import { clientExperimentEventSchema, mockAutoCareAppeals, mockAutoCareChatBlocks, mockAutoCareChatReports, ownerActionCenterEventSchema } from './mock-fixtures'
import type { MockAutoCareAppeal } from './mock-fixtures'
import { toClientReview, toPublicReview } from './mock-reviews'
import { invalidMockBodyResponse } from './mock-validation'

export const legacyWorkspaceHandlers = [
{ order: 36, handler: http.post('/api/admin/admins', async ({ request }) => {
        const body = await request.json() as {
            name: string
            email: string
        }

        const newAdmin = {
            id: `admin-${Date.now()}`,
            name: body.name,
            email: body.email,
            phone: null,
            role: 'admin',
            status: 'active',
            avatarUrl: null,
            provider: 'email',
            locale: null,
            emailVerifiedAt: new Date().toISOString(),
            emailNotifications: true,
            bookingEmailNotifications: true,
            preferredCity: null,
            preferredCategories: [],
            createdAt: new Date().toISOString(),
        } satisfies User

        mockUsers.push(newAdmin)

        return HttpResponse.json({
            user: newAdmin,
            passwordSetupToken: 'mock-setup-token-123',
            passwordSetupExpiresAt: new Date(Date.now() + 3600000).toISOString(),
        })
    }) },
{ order: 53, handler: http.get('/api/cabinets', ({ request }) => {
        const url = new URL(request.url)
        const search = url.searchParams.get('search')?.toLowerCase()
        const sortBy = url.searchParams.get('sortBy')
        const city = url.searchParams.get('city')?.toLowerCase()
        const category = url.searchParams.get('category')?.toLowerCase()
        const service = url.searchParams.get('service')?.toLowerCase()
        const parseNumericParam = (value: string | null) => value === null ? undefined : Number(value)
        const minPrice = parseNumericParam(url.searchParams.get('minPrice'))
        const maxPrice = parseNumericParam(url.searchParams.get('maxPrice'))
        const minRating = parseNumericParam(url.searchParams.get('minRating'))
        const availableToday = url.searchParams.get('availableToday') === 'true'
        const availabilityDate = url.searchParams.get('availabilityDate') || undefined
        const durationMinutes = parseNumericParam(url.searchParams.get('durationMinutes'))
        const page = Number(url.searchParams.get('page')) || 1
        const limit = Number(url.searchParams.get('limit')) || 12

        let activeCabinets = mockCabinets.filter(
            (cabinet) => cabinet.status === 'active'
        )

        if (search) {
            activeCabinets = activeCabinets.filter(
                (cabinet) =>
                    cabinet.title.toLowerCase().includes(search) ||
                    cabinet.city.toLowerCase().includes(search)
            )
        }

        if (city) {
            activeCabinets = activeCabinets.filter((cabinet) => cabinet.city.toLowerCase().includes(city))
        }

        if (category) {
            activeCabinets = activeCabinets.filter((cabinet) => {
                const cabinetText = [cabinet.title, cabinet.description, ...(cabinet.amenities ?? [])]
                    .join(' ')
                    .toLowerCase()
                const serviceText = mockServices
                    .filter((item) => item.cabinetId === cabinet.id && item.isActive)
                    .map((item) => item.title)
                    .join(' ')
                    .toLowerCase()

                return cabinetText.includes(category) || serviceText.includes(category)
            })
        }

        if (service) {
            activeCabinets = activeCabinets.filter((cabinet) =>
                mockServices.some((item) =>
                    item.cabinetId === cabinet.id &&
                    item.isActive &&
                    item.title.toLowerCase().includes(service)
                )
            )
        }

        if (minPrice !== undefined && Number.isFinite(minPrice)) {
            activeCabinets = activeCabinets.filter((cabinet) => cabinet.pricePerHour >= minPrice)
        }

        if (maxPrice !== undefined && Number.isFinite(maxPrice)) {
            activeCabinets = activeCabinets.filter((cabinet) => cabinet.pricePerHour <= maxPrice)
        }

        if (minRating !== undefined && Number.isFinite(minRating)) {
            activeCabinets = activeCabinets.filter((cabinet) => {
                const approvedRatings = mockReviews
                    .filter((review) => review.cabinetId === cabinet.id && review.status === 'approved')
                    .map((review) => review.rating)
                const averageRating = approvedRatings.length === 0
                    ? 0
                    : approvedRatings.reduce((sum, rating) => sum + rating, 0) / approvedRatings.length

                return averageRating >= minRating
            })
        }

        if (sortBy === 'popular') {
            activeCabinets.sort((a, b) => b.pricePerHour - a.pricePerHour)
        } else if (sortBy === 'price_asc') {
            activeCabinets.sort((a, b) => a.pricePerHour - b.pricePerHour)
        } else if (sortBy === 'price_desc') {
            activeCabinets.sort((a, b) => b.pricePerHour - a.pricePerHour)
        } else {
            activeCabinets.reverse()
        }

        const needsAvailability = availableToday || Boolean(availabilityDate || durationMinutes)
        const cabinetsWithAvailability = activeCabinets.map((cabinet) => ({
            cabinet,
            availabilityPreview: getMockAvailabilityPreview(cabinet.id, {
                date: availabilityDate,
                durationMinutes,
            }),
        }))
        const filteredCabinets = needsAvailability
            ? cabinetsWithAvailability.filter(({ availabilityPreview }) => (availabilityPreview?.freeSlots ?? 0) > 0)
            : cabinetsWithAvailability
        const total = filteredCabinets.length
        const totalPages = Math.ceil(total / limit)
        const items = filteredCabinets
            .slice((page - 1) * limit, page * limit)
            .map(({ cabinet, availabilityPreview }) => ({
                ...cabinet,
                availabilityPreview,
            }))

        return HttpResponse.json({
            items,
            total,
            page,
            totalPages
        })
    }) },
{ order: 165, handler: http.get('/api/cabinets/all', () => {
        return HttpResponse.json(mockCabinets.filter((cabinet) => cabinet.status === 'active'))
    }) },
{ order: 175, handler: http.get('/api/cabinets/:id', ({ params }) => {
        const cabinetId = String(params.id)

        const cabinet = mockCabinets.find(
            (item) => item.id === cabinetId
        )

        if (!cabinet) {
            return HttpResponse.json({ message: 'Cabinet not found' }, { status: 404 })
        }

        return HttpResponse.json({
            ...cabinet,
            availabilityPreview: getMockAvailabilityPreview(cabinet.id),
        })
    }) },
{ order: 176, handler: http.get('/api/cabinets/:id/reviews', ({ params }) => {
        const cabinetId = String(params.id)
        const reviews = mockReviews
            .filter((review) =>
                review.cabinetId === cabinetId &&
                review.status === 'approved'
            )
            .map(toPublicReview)

        return HttpResponse.json(reviews)
    }) },
{ order: 177, handler: http.get('/api/reviews/my', () => {
        const client = mockUsers.find(
            (user) =>
                user.id === mockSession.currentUserId &&
                user.role === 'client',
        )

        if (!client) {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        const reviews = mockReviews
            .filter((review) => review.clientId === client.id)
            .map(toClientReview)

        return HttpResponse.json(reviews)
    }) },
{ order: 178, handler: http.post('/api/cabinets/:id/reviews', async ({ params, request }) => {
        const cabinetId = String(params.id)
        const client = mockUsers.find(
            (user) =>
                user.id === mockSession.currentUserId &&
                user.role === 'client'
        )

        if (!client) {
            return HttpResponse.json(
                { message: 'Only clients can create reviews.' },
                { status: 403 }
            )
        }

        const eligibleBooking = mockBookings.find((booking) =>
            booking.clientId === client.id &&
            booking.cabinetId === cabinetId &&
            booking.status === 'completed' &&
            !mockReviews.some((review) => review.bookingId === booking.id)
        )

        if (!eligibleBooking) {
            return HttpResponse.json(
                { message: 'A completed booking for this cabinet is required before leaving a review.' },
                { status: 409 }
            )
        }

        const body = await request.json() as {
            rating: number
            text: string
        }
        const cabinet = mockCabinets.find((item) => item.id === cabinetId)

        if (!cabinet) {
            return HttpResponse.json(
                { message: 'Cabinet not found' },
                { status: 404 }
            )
        }

        const newReview = {
            id: `review-${Date.now()}`,
            cabinetId,
            clientId: client.id,
            bookingId: eligibleBooking.id,
            rating: body.rating,
            text: body.text,
            status: 'pending' as const,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            client: {
                id: client.id,
                name: client.name,
            },
            cabinet: {
                id: cabinet.id,
                title: cabinet.title,
            },
        }

        mockReviews.push(newReview)

        return HttpResponse.json(toPublicReview(newReview), {
            status: 201,
        })
    }) },
{ order: 179, handler: http.patch('/api/reviews/:id', async ({ params, request }) => {
        const reviewId = String(params.id)
        const client = mockUsers.find(
            (user) =>
                user.id === mockSession.currentUserId &&
                user.role === 'client',
        )
        const review = mockReviews.find(
            (item) => item.id === reviewId && item.clientId === client?.id,
        )

        if (!client || !review) {
            return HttpResponse.json({ message: 'Review not found' }, { status: 404 })
        }

        const body = await request.json() as { rating?: number; text?: string }
        const rating = body.rating
        if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5 || typeof body.text !== 'string') {
            return HttpResponse.json({ message: 'Invalid review' }, { status: 400 })
        }

        review.rating = rating
        review.text = body.text
        review.status = 'pending'
        review.updatedAt = new Date().toISOString()

        return HttpResponse.json(toClientReview(review))
    }) },
{ order: 180, handler: http.delete('/api/cabinets/:id', ({ params }) => {
        const cabinetId = String(params.id)

        const cabinetIndex = mockCabinets.findIndex(
            (item) =>
                item.id === cabinetId &&
                item.ownerId === mockSession.currentUserId
        )

        if (cabinetIndex === -1) {
            return HttpResponse.json(
                { message: 'Cabinet not found' },
                { status: 404 }
            )
        }

        const hasBookings = mockBookings.some(
            (booking) => booking.cabinetId === cabinetId
        )

        if (hasBookings) {
            return HttpResponse.json(
                { message: 'Cabinet has bookings and cannot be deleted' },
                { status: 400 }
            )
        }

        for (let index = mockServices.length - 1; index >= 0; index -= 1) {
            if (mockServices[index]?.cabinetId === cabinetId) {
                mockServices.splice(index, 1)
            }
        }

        mockCabinets.splice(cabinetIndex, 1)

        return HttpResponse.json({
            success: true,
        })
    }) },
{ order: 181, handler: http.get('/api/services', ({ request }) => {
        const url = new URL(request.url)
        const cabinetId = url.searchParams.get('cabinetId')

        const services = cabinetId
            ? mockServices.filter(service => service.cabinetId === cabinetId)
            : mockServices

        return HttpResponse.json(services)
    }) },
{ order: 182, handler: http.patch('/api/services/:id/status', async ({ params, request }) => {
        const serviceId = String(params.id)

        const body = await request.json() as {
            isActive: boolean
        }

        if (typeof body.isActive !== 'boolean') {
            return HttpResponse.json(
                { message: 'Invalid service status' },
                { status: 400 }
            )
        }

        const service = mockServices.find(
            (item) => item.id === serviceId
        )

        if (!service) {
            return HttpResponse.json(
                { message: 'Service not found' },
                { status: 404 }
            )
        }

        const cabinet = mockCabinets.find(
            (item) =>
                item.id === service.cabinetId &&
                item.ownerId === mockSession.currentUserId
        )

        if (!cabinet) {
            return HttpResponse.json(
                { message: 'Service not found' },
                { status: 404 }
            )
        }

        service.isActive = body.isActive

        return HttpResponse.json(service)
    }) },
{ order: 183, handler: http.patch('/api/services/:id', async ({ params, request }) => {
        const serviceId = String(params.id)

        const body = await request.json() as {
            title: string
            description?: string
            durationMinutes: number
            price: number
        }

        const service = mockServices.find(
            (item) => item.id === serviceId
        )

        if (!service) {
            return HttpResponse.json(
                { message: 'Service not found' },
                { status: 404 }
            )
        }

        const cabinet = mockCabinets.find(
            (item) =>
                item.id === service.cabinetId &&
                item.ownerId === mockSession.currentUserId
        )

        if (!cabinet) {
            return HttpResponse.json(
                { message: 'Service not found' },
                { status: 404 }
            )
        }

        service.title = body.title
        service.description = body.description ?? ''
        service.durationMinutes = body.durationMinutes
        service.price = body.price

        return HttpResponse.json(service)
    }) },
{ order: 184, handler: http.delete('/api/services/:id', ({ params }) => {
        const serviceId = String(params.id)

        const serviceIndex = mockServices.findIndex(
            (item) => item.id === serviceId
        )

        if (serviceIndex === -1) {
            return HttpResponse.json(
                { message: 'Service not found' },
                { status: 404 }
            )
        }

        const service = mockServices[serviceIndex]

        if (!service) {
            return HttpResponse.json(
                { message: 'Service not found' },
                { status: 404 }
            )
        }

        const cabinet = mockCabinets.find(
            (item) =>
                item.id === service.cabinetId &&
                item.ownerId === mockSession.currentUserId
        )

        if (!cabinet) {
            return HttpResponse.json(
                { message: 'Service not found' },
                { status: 404 }
            )
        }

        mockServices.splice(serviceIndex, 1)

        return HttpResponse.json({
            success: true,
        })
    }) },
{ order: 185, handler: http.get('/api/owner/cabinets', () => {
        const ownerCabinets = mockCabinets.filter(
            (cabinet) => cabinet.ownerId === mockSession.currentUserId
        )

        return HttpResponse.json(ownerCabinets)
    }) },
{ order: 186, handler: http.post('/api/owner/action-center/events', async ({ request }) => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)

        if (!currentUser) {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        if (currentUser.role !== 'owner') {
            return HttpResponse.json({ message: 'Only owners can record owner workspace events.' }, { status: 403 })
        }

        const parsed = ownerActionCenterEventSchema.safeParse(await request.json())

        if (!parsed.success) {
            return HttpResponse.json({ message: 'Invalid request body.' }, { status: 400 })
        }

        return HttpResponse.json({ accepted: true })
    }) },
{ order: 187, handler: http.post('/api/client/experiment-events', async ({ request }) => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)

        if (!currentUser) {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        if (currentUser.role !== 'client') {
            return HttpResponse.json({ message: 'Only clients can record client experiment events.' }, { status: 403 })
        }

        const parsed = clientExperimentEventSchema.safeParse(await request.json())

        if (!parsed.success) {
            return invalidMockBodyResponse()
        }

        return HttpResponse.json({ accepted: true })
    }) },
{ order: 188, handler: http.get('/api/owner/cabinets/:id', ({ params }) => {
        const cabinetId = String(params.id)

        const cabinet = mockCabinets.find(
            (item) =>
                item.id === cabinetId &&
                item.ownerId === mockSession.currentUserId
        )

        if (!cabinet) {
            return HttpResponse.json(
                { message: 'Cabinet not found' },
                { status: 404 }
            )
        }

        return HttpResponse.json(cabinet)
    }) },
{ order: 189, handler: http.patch('/api/cabinets/:id', async ({ params, request }) => {
        const cabinetId = String(params.id)

        const body = await request.json() as {
            title: string
            description: string
            address: string
            city: string
            pricePerHour: number
            photos?: string[]
        }

        const cabinet = mockCabinets.find(
            (item) =>
                item.id === cabinetId &&
                item.ownerId === mockSession.currentUserId
        )

        if (!cabinet) {
            return HttpResponse.json(
                { message: 'Cabinet not found' },
                { status: 404 }
            )
        }

        cabinet.title = body.title
        cabinet.description = body.description
        cabinet.address = body.address
        cabinet.city = body.city
        cabinet.pricePerHour = body.pricePerHour
        if (body.photos) {
            cabinet.photos = body.photos
        }

        return HttpResponse.json(cabinet)
    }) },
{ order: 190, handler: http.get('/api/owner/services', () => {
        const ownerCabinetIds = mockCabinets
            .filter((cabinet) => cabinet.ownerId === mockSession.currentUserId)
            .map((cabinet) => cabinet.id)

        const ownerServices = mockServices.filter((service) =>
            ownerCabinetIds.includes(service.cabinetId)
        )

        return HttpResponse.json(ownerServices)
    }) },
{ order: 195, handler: http.get('/api/admin/users', () => {
        return HttpResponse.json(mockUsers)
    }) },
{ order: 209, handler: http.get('/api/v1/autocare-appeals/my', ({ request }) => {
        const scenario = mockScenarioResponse(request)
        if (scenario) return scenario
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        return HttpResponse.json(mockAutoCareAppeals.filter((appeal) => appeal.submittedById === user.id))
    }) },
{ order: 210, handler: http.post('/api/v1/autocare-appeals', async ({ request }) => {
        const scenario = mockScenarioResponse(request)
        if (scenario) return scenario
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        const body = await request.json() as Partial<MockAutoCareAppeal>
        if (!body.subject || !body.subjectId || typeof body.reason !== 'string' || body.reason.trim().length < 20) return HttpResponse.json({ message: 'Appeal reason must be at least 20 characters.' }, { status: 422 })
        if (!['provider', 'review', 'suspension', 'catalog', 'chat_restriction'].includes(body.subject)) return HttpResponse.json({ message: 'Appeal subject is invalid.' }, { status: 422 })
        if (body.subject === 'chat_restriction') {
            const block = mockAutoCareChatBlocks.find((candidate) => candidate.id === body.subjectId && candidate.blockedUserId === user.id && candidate.sourceReportId && candidate.status === 'active')
            if (!block?.sourceReportId) return HttpResponse.json({ message: 'You can appeal only an active chat restriction applied to your account.' }, { status: 403 })
            const sourceReport = mockAutoCareChatReports.find((report) => report.id === block.sourceReportId && report.threadId === block.threadId && report.reportedUserId === user.id && report.status === 'resolved')
            if (!sourceReport) return HttpResponse.json({ message: 'The moderation decision for this restriction is no longer available.' }, { status: 404 })
        }
        const duplicate = mockAutoCareAppeals.find((appeal) => appeal.submittedById === user.id && appeal.subject === body.subject && appeal.subjectId === body.subjectId && appeal.status === 'pending')
        if (duplicate) return HttpResponse.json(duplicate)
        const appeal: MockAutoCareAppeal = { id: `appeal-${Date.now()}`, subject: body.subject as MockAutoCareAppeal['subject'], subjectId: body.subjectId, submittedById: user.id, providerId: body.providerId ?? null, reason: body.reason.trim(), evidenceIds: Array.isArray(body.evidenceIds) ? body.evidenceIds : [], status: 'pending', decidedById: null, decisionReason: null, createdAt: new Date().toISOString(), decidedAt: null }
        mockAutoCareAppeals.unshift(appeal)
        return HttpResponse.json(appeal, { status: 201 })
    }) },
{ order: 211, handler: http.delete('/api/v1/autocare-appeals/:appealId', ({ params }) => {
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        const appeal = mockAutoCareAppeals.find((item) => item.id === params.appealId && item.submittedById === user.id)
        if (!appeal) return HttpResponse.json({ message: 'Appeal not found.' }, { status: 404 })
        if (appeal.status !== 'pending') return HttpResponse.json({ message: 'Only a pending appeal can be withdrawn.' }, { status: 409 })
        appeal.status = 'withdrawn'
        return HttpResponse.json(appeal)
    }) },
{ order: 217, handler: http.get('/api/admin/cabinets', () => {
        return HttpResponse.json(mockCabinets)
    }) },
{ order: 218, handler: http.get('/api/admin/reviews', () => {
        return HttpResponse.json(mockReviews)
    }) },
{ order: 219, handler: http.patch('/api/admin/reviews/:id/status', async ({ params, request }) => {
        const reviewId = String(params.id)
        const body = await request.json() as {
            status: 'pending' | 'approved' | 'rejected'
        }
        const review = mockReviews.find((item) => item.id === reviewId)

        if (!review) {
            return HttpResponse.json(
                { message: 'Review not found' },
                { status: 404 }
            )
        }

        review.status = body.status
        review.updatedAt = new Date().toISOString()

        return HttpResponse.json(review)
    }) },
{ order: 220, handler: http.delete('/api/admin/reviews/:id', ({ params }) => {
        const reviewId = String(params.id)
        const reviewIndex = mockReviews.findIndex((item) => item.id === reviewId)

        if (reviewIndex === -1) {
            return HttpResponse.json({ message: 'Review not found' }, { status: 404 })
        }

        mockReviews.splice(reviewIndex, 1)

        return HttpResponse.json({ success: true })
    }) },
{ order: 221, handler: http.get('/api/owner/clients', () => {
        const clients = mockUsers.filter(
            (user) => user.role === 'client' && user.status === 'active'
        )

        return HttpResponse.json(clients)
    }) },
{ order: 222, handler: http.patch('/api/admin/cabinets/:id/status', async ({ params, request }) => {
        const cabinetId = String(params.id)

        const body = await request.json() as {
            status: 'draft' | 'active' | 'blocked'
        }

        const cabinet = mockCabinets.find((item) => item.id === cabinetId)


        if (!cabinet) {
            return HttpResponse.json(
                { message: 'Cabinet not found' },
                { status: 404 }
            )
        }

        cabinet.status = body.status

        return HttpResponse.json(cabinet)
    }) },
{ order: 223, handler: http.post('/api/cabinets', async ({ request }) => {
        const body = await request.json() as {
            title: string
            description: string
            address: string
            city: string
            pricePerHour: number
            photos?: string[]
        }

        const newCabinet = {
            id: `cabinet-${Date.now()}`,
            ownerId: mockSession.currentUserId!,
            title: body.title,
            description: body.description,
            address: body.address,
            city: body.city,
            pricePerHour: body.pricePerHour,
            status: 'draft' as const,
            photos: body.photos ?? [],
            createdAt: new Date().toISOString(),
        }

        mockCabinets.push(newCabinet)

        return HttpResponse.json(newCabinet, {
            status: 201
        })
    }) },
{ order: 224, handler: http.post('/api/cabinet-images', async ({ request }) => {
        const body = await request.json() as {
            mimeType: string
            size: number
            contentBase64: string
        }

        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp']

        if (!allowedMimeTypes.includes(body.mimeType)) {
            return HttpResponse.json(
                {
                    code: 'CABINET_IMAGE_UNSUPPORTED_TYPE',
                    message: 'Cabinet image must be JPEG, PNG, or WebP.',
                },
                { status: 400 }
            )
        }

        if (body.size > 1024 * 1024) {
            return HttpResponse.json(
                {
                    code: 'CABINET_IMAGE_TOO_LARGE',
                    message: 'Cabinet image must be 1048576 bytes or smaller.',
                },
                { status: 400 }
            )
        }

        return HttpResponse.json({
            url: `data:${body.mimeType};base64,${body.contentBase64}`,
        })
    }) },
{ order: 225, handler: http.post('/api/services', async ({ request }) => {
        const body = await request.json() as {
            cabinetId: string
            title: string
            description: string
            durationMinutes: number
            price: number
            isActive: boolean
        }

        const cabinet = mockCabinets.find(
            (item) =>
                item.id === body.cabinetId &&
                item.ownerId === mockSession.currentUserId
        )

        if (!cabinet) {
            return HttpResponse.json(
                { message: 'Cabinet not found' },
                { status: 404 }
            )
        }

        const newService = {
            id: `service-${Date.now()}`,
            cabinetId: body.cabinetId,
            title: body.title,
            description: body.description,
            durationMinutes: body.durationMinutes,
            price: body.price,
            isActive: body.isActive,
        }

        mockServices.push(newService)

        return HttpResponse.json(newService, { status: 201 })
    }) },
{ order: 226, handler: http.patch('/api/admin/users/:id/status', async ({ params, request }) => {
        const userId = String(params.id)

        const body = await request.json() as {
            status: 'active' | 'blocked'
        }

        const user = mockUsers.find((item) => item.id === userId)

        if (!user) {
            return HttpResponse.json(
                {
                    message: 'User not found',
                },
                {
                    status: 404,
                },
            )
        }

        user.status = body.status

        return HttpResponse.json(user)
    }) },
{ order: 243, handler: http.patch('/api/admin/users/:id/role', async ({ params, request }) => {
        const userId = String(params.id)

        const body = await request.json() as {
            role: 'client' | 'owner' | 'admin' | 'super_admin'
        }

        const user = mockUsers.find((item) => item.id === userId)

        if (!user) {
            return HttpResponse.json(
                {
                    message: 'User not found',
                },
                {
                    status: 404,
                },
            )
        }

        user.role = body.role

        return HttpResponse.json(user)
    }) }
]
