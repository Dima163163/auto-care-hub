import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import type { User } from '@/entities/user'
import type { Notification } from '@/entities/notification/model/types'
import {
    automotiveServices,
    providerPreviews,
    supportsVehicleBrand,
    type AutoCareApiProvider,
} from '@/entities/automotive-service'

import {
    mockBookings,
    mockCabinets,
    mockReviews,
    mockServices,
    mockUsers,
} from './data'
import { mockSession, clearMockSession, setMockSession } from './session'
import { parseMockJson } from './parseMockJson'

const loginRequestSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
})

const registerRequestSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(1),
    role: z.enum(['client', 'owner']),
})

const bookingRequestSchema = z.object({
    clientId: z.string().min(1).optional(),
    cabinetId: z.string().min(1),
    serviceId: z.string().min(1),
    date: z.string().min(1),
    startTime: z.string().min(1),
    endTime: z.string().min(1),
    status: z.enum(['pending', 'confirmed']),
    comment: z.string().optional(),
})

const ownerActionCenterEventSchema = z.object({
    action: z.enum([
        'pending_bookings',
        'reschedule_requests',
        'draft_cabinets',
        'blocked_cabinets',
        'readiness',
    ]),
})

const clientExperimentEventSchema = z.object({
    event: z.enum([
        'book_again_clicked',
        'preference_shortcut_used',
        'preference_shortcut_reset',
        'catalog_filter_used',
        'catalog_filter_reset',
        'catalog_search_to_detail',
        'catalog_search_to_book',
        'catalog_no_results',
    ]),
})

function invalidMockBodyResponse() {
    return HttpResponse.json(
        { code: 'INVALID_REQUEST_BODY', message: 'Invalid request body.' },
        { status: 400 },
    )
}

const mockFavoritesByUser = new Map<string, string[]>()
const mockOAuthIdentitiesByUser = new Map<string, Set<'google' | 'yandex'>>()

const autoCareMarket = {
    id: 'market-moscow',
    countryCode: 'RU',
    countryName: 'Россия',
    cityCode: 'moscow',
    cityName: 'Москва',
    currencyCode: 'RUB',
    defaultLocale: 'ru',
    supportedLocales: ['ru', 'en', 'es', 'ro'],
    timezone: 'Europe/Moscow',
    launchReady: true,
}

const autoCareDefinitions = automotiveServices.map((service) => ({
    id: `definition-${service.id}`,
    slug: service.id,
    categorySlug: service.id,
    labels: service.labels,
    priceType: 'from' as const,
    comparisonAttributes: ['price', 'rating', 'distance', 'nextSlot'],
    active: true,
}))

const mockFeaturedAutoCareReviews = [
    { id: 'featured-review-1', providerId: 'api-proservice-moscow', authorName: 'Алексей С.', vehicleLabel: 'BMW X5', rating: 5, text: 'Быстро приняли машину, заранее объяснили стоимость и прислали понятный фотоотчёт.', avatarUrl: '/images/autocare/avatars/alexey.webp', createdAt: '2026-08-12T10:00:00.000Z' },
    { id: 'featured-review-2', providerId: 'api-autolux-moscow', authorName: 'Мария К.', vehicleLabel: 'Toyota RAV4', rating: 4, text: 'Удобная запись и внимательный мастер. Итоговая цена совпала с предварительной оценкой.', avatarUrl: '/images/autocare/avatars/maria.webp', createdAt: '2026-08-05T10:00:00.000Z' },
    { id: 'featured-review-3', providerId: 'api-formula-moscow', authorName: 'Игорь П.', vehicleLabel: 'Skoda Octavia', rating: 3, text: 'Работу выполнили, но пришлось немного подождать. Специалист подробно ответил на вопросы.', avatarUrl: '/images/autocare/avatars/igor.webp', createdAt: '2026-07-29T10:00:00.000Z' },
    { id: 'featured-review-4', providerId: 'api-proservice-moscow', authorName: 'Ольга Н.', vehicleLabel: 'Volkswagen Tiguan', rating: 2, text: 'Цена оказалась выше ожиданий, зато сервис оперативно объяснил состав работ и предложил решение.', avatarUrl: null, createdAt: '2026-07-21T10:00:00.000Z' },
] as const

function toAutoCareOffer(providerId: string, serviceId: string, price: number, priceType: 'fixed' | 'from' | 'range' | 'quote_required' = 'from') {
    const service = autoCareDefinitions.find((item) => item.slug === serviceId) ?? autoCareDefinitions[0]
    return {
        id: `offer-${providerId}-${service?.slug ?? serviceId}`,
        serviceDefinitionId: service?.id ?? `definition-${serviceId}`,
        serviceSlug: service?.slug ?? serviceId,
        serviceLabels: service?.labels ?? {},
        priceFromMinor: price * 100,
        priceToMinor: priceType === 'range' ? Math.round(price * 1.2 * 100) : null,
        currencyCode: 'RUB',
        durationMinutes: 60,
        inclusions: ['Предварительная оценка', 'Фотоотчёт по запросу'],
        warrantyText: 'Гарантия на работы по условиям сервиса',
        active: true,
        priceType,
    }
}

function toAutoCareProvider(provider: typeof providerPreviews[number]) {
    return {
        id: `api-${provider.id}`,
        name: provider.name,
        description: 'Проверенный сервис с понятными ценами, фотоотчётом и гарантией на выполненные работы.',
        status: 'active' as const,
        verified: provider.verified,
        yearsActive: provider.id === 'proservice-moscow' ? 8 : 5,
        staffCount: provider.id === 'proservice-moscow' ? 24 : 12,
        rating: provider.rating,
        reviewCount: provider.reviewCount,
        bonusSummary: provider.bonus ?? null,
        brandSpecializations: [...provider.brandSpecializations],
        isMultibrand: provider.isMultibrand,
        coverImageUrl: provider.image ?? null,
        galleryImageUrls: provider.image ? [provider.image] : [],
        amenityIds: ['waiting_room', 'customer_parking', 'wifi', 'online_booking', 'coffee', 'card_payment'],
        location: {
            id: `location-${provider.id}`,
            marketId: autoCareMarket.id,
            address: provider.id === 'proservice-moscow' ? 'Москва, ул. Льва Толстого, 18' : 'Москва, Комсомольский пр-т, 45',
            hours: 'Пн–Вс: 08:00–21:00',
            latitude: provider.mapPosition?.[0] ?? 55.75,
            longitude: provider.mapPosition?.[1] ?? 37.61,
        },
        serviceIds: provider.serviceIds ?? automotiveServices.map((service) => service.id),
        servicePrices: provider.servicePrices ?? { [automotiveServices[0]?.id ?? 'oil-change']: provider.price },
    }
}

const autoCareProviders = providerPreviews.map(toAutoCareProvider)
type OwnerAutoCareProviderMock = AutoCareApiProvider & {
    serviceIds: string[]
    servicePrices: Record<string, number>
}
const ownerAutoCareProviders: OwnerAutoCareProviderMock[] = []

type MockAutoCareServiceRequest = {
    id: string
    providerId: string
    providerName: string
    locationId: string
    address: string
    definitionId: string
    serviceSlug: string
    serviceLabels: Record<string, string>
    offeringId: string | null
    priceFromMinor: number | null
    currencyCode: string | null
    preferredAt: string | null
    vehicleSnapshot: Record<string, string | number | null> | null
    contactSnapshot: Record<string, string | number | null> | null
    note: string | null
    quote: { amountMinor: number; currencyCode: string; note: string | null; createdAt: string } | null
    idempotencyKey: string | null
    idempotencyFingerprint: string
    status: 'draft' | 'open' | 'awaiting_reply' | 'estimate_shared' | 'accepted' | 'declined' | 'closed'
    clientId: string
    clientConfirmedAt: string | null
    providerConfirmedAt: string | null
    createdAt: string
    updatedAt: string
}

const mockAutoCareServiceRequests: MockAutoCareServiceRequest[] = []
const mockAutoCareMessages = new Map<string, Array<{ id: string; senderId: string; kind: 'text'; body: string; createdAt: string }>>()
const mockAutoCareAttachments = new Map<string, Array<{ id: string; uploadedById: string; contentType: string; bytes: number; status: 'ready'; url: string; createdAt: string; contentBase64: string }>>()

function currentMockUser() {
    return mockUsers.find((user) => user.id === mockSession.currentUserId)
}

function pushMockAutoCareNotification(input: { userId: string; requestId: string; title: string; message: string; role: 'client' | 'owner' }) {
    mockNotifications.unshift({
        id: `notification-autocare-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        category: 'booking',
        title: input.title,
        message: input.message,
        link: input.role === 'owner' ? `/owner/autocare-requests?request=${input.requestId}` : `/profile/bookings?request=${input.requestId}`,
        metadata: { serviceRequestId: input.requestId, domain: 'autocare' },
        readAt: null,
        createdAt: new Date().toISOString(),
        userId: input.userId,
    } as Notification & { userId: string })
}

function getMockOAuthIdentities(user: User) {
    const existing = mockOAuthIdentitiesByUser.get(user.id)

    if (existing) {
        return existing
    }

    const identities = new Set<'google' | 'yandex'>()

    if (user.provider === 'google' || user.provider === 'yandex') {
        identities.add(user.provider)
    }

    mockOAuthIdentitiesByUser.set(user.id, identities)

    return identities
}

function getMockAvailabilityPreview(
    cabinetId: string,
    options?: { date?: string; durationMinutes?: number },
) {
    const durations = mockServices
        .filter((service) => service.cabinetId === cabinetId && service.isActive)
        .map((service) => service.durationMinutes)
    const durationMinutes = options?.durationMinutes ?? Math.min(...durations)

    if (!Number.isFinite(durationMinutes)) {
        return null
    }

    const now = new Date()
    const today = new Date()
    const todayString = today.toISOString().slice(0, 10)
    const dateString = options?.date ?? todayString
    const isPastDate = dateString < todayString
    let firstSlot: { date: string; startTime: string; endTime: string } | null = null
    let freeSlots = 0
    const slots: Array<{ startTime: string; endTime: string }> = []

    const occupied = mockBookings
            .filter((booking) =>
                booking.cabinetId === cabinetId &&
                booking.date === dateString &&
                (booking.status === 'pending' || booking.status === 'confirmed')
            )
            .map((booking) => ({ start: booking.startTime, end: booking.endTime }))

    for (let start = 8 * 60; start + durationMinutes <= 22 * 60; start += 30) {
            const startTime = `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`
            const end = start + durationMinutes
            const endTime = `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`
            const isPast = isPastDate || (dateString === todayString && start <= now.getHours() * 60 + now.getMinutes())
            const isOccupied = occupied.some((slot) => startTime < slot.end && endTime > slot.start)

            if (!isPast && !isOccupied) {
                freeSlots += 1
                if (slots.length < 4) {
                    slots.push({ startTime, endTime })
                }
                firstSlot ??= { date: dateString, startTime, endTime }
            }
    }

    return firstSlot ? { ...firstSlot, freeSlots, slots } : null
}

const mockNotifications: Notification[] = [
    {
        id: 'notification-1',
        userId: 'user-client-1',
        category: 'booking',
        title: 'Booking confirmed',
        message: 'Your booking in Cabinet 1 was confirmed.',
        link: '/profile/bookings',
        metadata: {},
        readAt: null,
        createdAt: '2026-02-01T10:00:00.000Z',
    } as Notification & { userId: string },
    {
        id: 'notification-2',
        userId: 'user-owner-1',
        category: 'booking',
        title: 'New booking request',
        message: 'A client requested a booking in Cabinet 1.',
        link: '/owner/bookings',
        metadata: {},
        readAt: '2026-02-01T12:00:00.000Z',
        createdAt: '2026-02-01T09:30:00.000Z',
    } as Notification & { userId: string },
]

type MockSystemIncident = {
    id: string
    type: 'server_error' | 'health_check' | 'background_job' | 'payment_webhook'
    severity: 'warning' | 'critical'
    status: 'open' | 'acknowledged' | 'resolved'
    title: string
    requestId: string | null
    metadata: Record<string, unknown>
    occurrenceCount: number
    firstOccurredAt: string
    lastOccurredAt: string
    acknowledgedAt: string | null
    resolvedAt: string | null
}

const mockSystemIncidents: MockSystemIncident[] = [
    {
        id: 'incident-1',
        type: 'server_error',
        severity: 'critical',
        status: 'open',
        title: 'Unhandled server error',
        requestId: 'mock-request-0001',
        metadata: { route: '/bookings', statusCode: 500 },
        occurrenceCount: 2,
        firstOccurredAt: '2026-07-16T08:00:00.000Z',
        lastOccurredAt: '2026-07-16T08:10:00.000Z',
        acknowledgedAt: null,
        resolvedAt: null,
    },
]

type MockSecurityEvent = {
    id: string
    userId: string | null
    type: 'login_failed' | 'account_locked' | 'refresh_token_reuse' | 'rate_limit_exceeded' | 'invalid_token' | 'csrf_violation' | 'route_scan' | 'malformed_request' | 'oversized_request' | 'privilege_denied' | 'webhook_abuse' | 'mutation_burst'
    severity: 'info' | 'warning' | 'high' | 'critical'
    status: 'open' | 'acknowledged' | 'investigating' | 'resolved' | 'suppressed'
    assigneeId: string | null
    failedLoginAttempts: number | null
    lockedUntil: string | null
    ipAddress: string | null
    userAgent: string | null
    correlationId: string | null
    requestId: string | null
    method: string | null
    route: string | null
    statusCode: number | null
    actorRole: 'client' | 'owner' | 'admin' | 'super_admin' | null
    authOutcome: 'unknown' | 'anonymous' | 'authenticated' | 'failed'
    rateLimitResult: 'not_checked' | 'allowed' | 'blocked'
    requestSizeBytes: number | null
    reasonCode: string | null
    proxyProvenance: 'unknown' | 'direct' | 'trusted_proxy' | 'forwarded_header_untrusted'
    metadata: Record<string, unknown>
    createdAt: string
    lastAction: {
        status: 'acknowledged' | 'investigating' | 'resolved' | 'suppressed'
        operatorNote: string | null
        actorId: string
        assigneeId: string | null
        createdAt: string
    } | null
    actionTimeline: Array<{
        id: string
        status: 'acknowledged' | 'investigating' | 'resolved' | 'suppressed'
        operatorNote: string | null
        actorId: string
        assigneeId: string | null
        createdAt: string
    }>
    relatedAuditLogs: Array<{
        id: string
        action: string
        targetType: string | null
        correlationId: string | null
        createdAt: string
    }>
    relatedSystemIncidents: Array<{
        id: string
        type: 'server_error' | 'health_check' | 'background_job' | 'payment_webhook'
        severity: 'warning' | 'critical'
        status: 'open' | 'acknowledged' | 'resolved'
        title: string
        requestId: string | null
        occurrenceCount: number
        firstOccurredAt: string
        lastOccurredAt: string
    }>
}

type MockSecurityMitigation = {
    id: string
    kind: 'ip_block'
    displayValue: string
    reason: string
    expiresAt: string
    revokedAt: string | null
    createdBy: string
    revokedBy: string | null
    createdAt: string
    status: 'active' | 'expired' | 'revoked'
}

const mockSecurityEvents: MockSecurityEvent[] = [
    {
        id: 'security-event-1',
        userId: 'mock-user-1',
        type: 'login_failed',
        severity: 'warning',
        status: 'open',
        assigneeId: null,
        failedLoginAttempts: 2,
        lockedUntil: null,
        ipAddress: '192.0.2.*',
        userAgent: 'AutoCare Hub mock browser',
        correlationId: 'mock-request-security-1',
        requestId: 'mock-request-security-1',
        method: 'POST',
        route: '/auth/login',
        statusCode: 401,
        actorRole: null,
        authOutcome: 'failed',
        rateLimitResult: 'not_checked',
        requestSizeBytes: 96,
        reasonCode: 'invalid_credentials',
        proxyProvenance: 'direct',
        metadata: { errorCode: 'UNAUTHORIZED', failedLoginAttempts: 2 },
        createdAt: '2026-07-16T08:20:00.000Z',
        lastAction: null,
        actionTimeline: [],
        relatedAuditLogs: [],
        relatedSystemIncidents: [],
    },
]

const mockSecurityMitigations: MockSecurityMitigation[] = []

type MockAccountDeletionRequest = {
    id: string
    status: 'pending' | 'cancelled' | 'completed'
    requestedAt: string
    cancelledAt: string | null
    completedAt: string | null
}

const mockAccountDeletionRequests = new Map<string, MockAccountDeletionRequest>()

function addMockNotification(input: Omit<Notification, 'id' | 'createdAt' | 'readAt'> & { userId: string }) {
    mockNotifications.unshift({
        ...input,
        id: `notification-${Date.now()}-${mockNotifications.length + 1}`,
        readAt: null,
        createdAt: new Date().toISOString(),
    } as Notification & { userId: string })
}

function toClientBooking(booking: typeof mockBookings[number]) {
    const cabinet = mockCabinets.find(
        (item) => item.id === booking.cabinetId
    )

    const service = mockServices.find(
        (item) => item.id === booking.serviceId
    )

    return {
        ...booking,
        cabinet: {
            id: cabinet?.id ?? booking.cabinetId,
            title: cabinet?.title ?? 'Unknown cabinet',
            address: cabinet?.address ?? '',
            city: cabinet?.city ?? '',
        },
        service: {
            id: service?.id ?? booking.serviceId,
            title: service?.title ?? 'Unknown service',
            durationMinutes: service?.durationMinutes ?? 0,
            price: service?.price ?? 0,
        },
    }
}

function toOwnerBooking(booking: typeof mockBookings[number]) {
    const client = mockUsers.find(
        (user) => user.id === booking.clientId
    )

    return {
        ...toClientBooking(booking),
        client: {
            id: client?.id ?? booking.clientId,
            name: client?.name ?? 'Unknown client',
            email: client?.email ?? '',
            phone: client?.phone ?? null,
        },
        ownerNote: null,
        paymentLedger: null,
    }
}

function toPublicReview(review: typeof mockReviews[number]) {
    return {
        id: review.id,
        cabinetId: review.cabinetId,
        clientId: review.clientId,
        rating: review.rating,
        text: review.text,
        status: review.status,
        createdAt: review.createdAt,
        client: review.client,
    }
}

function toClientReview(review: typeof mockReviews[number]) {
    const cabinet = mockCabinets.find((item) => item.id === review.cabinetId)

    return {
        ...toPublicReview(review),
        cabinet: {
            id: review.cabinetId,
            title: cabinet?.title ?? review.cabinet?.title ?? 'Unknown cabinet',
        },
    }
}

export const handlers = [
    http.get('/api/auth/me', () => {
       const currentUser = mockUsers.find(
           (user) => user.id === mockSession.currentUserId
       )

        if (!currentUser) {
            return HttpResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            )
        }

        return HttpResponse.json(currentUser)
    }),

    http.post('/api/auth/refresh', () => {
        const currentUser = mockUsers.find(
            (user) => user.id === mockSession.currentUserId,
        )

        if (!currentUser) {
            return HttpResponse.json(
                { message: 'Unauthorized' },
                { status: 401 },
            )
        }

        return HttpResponse.json({
            accessToken: `mock-access-token-${currentUser.id}`,
        })
    }),

    http.get('/api/auth/oauth/identities', () => {
        const currentUser = mockUsers.find(
            (user) => user.id === mockSession.currentUserId
        )

        if (!currentUser) {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        const identities = getMockOAuthIdentities(currentUser)

        return HttpResponse.json(
            (['google', 'yandex'] as const).map((provider) => ({
                provider,
                isLinked: identities.has(provider),
                identityCount: identities.has(provider) ? 1 : 0,
                createdAt: identities.has(provider)
                    ? currentUser.createdAt
                    : null,
                canUnlink: identities.has(provider) && identities.size > 1,
            }))
        )
    }),

    http.post('/api/auth/oauth/:provider/link/start', ({ params }) => {
        const currentUser = mockUsers.find(
            (user) => user.id === mockSession.currentUserId
        )
        const provider = params.provider

        if (!currentUser) {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        if (provider !== 'google' && provider !== 'yandex') {
            return HttpResponse.json({ message: 'Invalid provider' }, { status: 400 })
        }

        getMockOAuthIdentities(currentUser).add(provider)

        return HttpResponse.json({
            provider,
            authUrl: `/profile?tab=security&oauth=linked&provider=${provider}`,
        })
    }),

    http.post('/api/auth/oauth/:provider/unlink/start', ({ params }) => {
        const currentUser = mockUsers.find(
            (user) => user.id === mockSession.currentUserId
        )
        const provider = params.provider

        if (!currentUser) {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        if (provider !== 'google' && provider !== 'yandex') {
            return HttpResponse.json({ message: 'Invalid provider' }, { status: 400 })
        }

        const identities = getMockOAuthIdentities(currentUser)

        if (!identities.has(provider)) {
            return HttpResponse.json(
                {
                    code: 'OAUTH_IDENTITY_NOT_LINKED',
                    message: 'This OAuth provider is not linked to the account.',
                },
                { status: 409 }
            )
        }

        if (identities.size <= 1) {
            return HttpResponse.json(
                {
                    code: 'OAUTH_LAST_LOGIN_METHOD',
                    message: 'The last available login method cannot be removed.',
                },
                { status: 409 }
            )
        }

        identities.delete(provider)

        return HttpResponse.json({
            provider,
            authUrl: `/profile?tab=security&oauth=unlinked&provider=${provider}`,
        })
    }),

    http.post('/api/auth/login', async ({ request }) => {
        const body = await parseMockJson(request, loginRequestSchema)

        if (!body) return invalidMockBodyResponse()

        const user = mockUsers.find(
            (user) => user.email.toLowerCase() === body.email.toLowerCase()
        )

        if (!user) {
            return HttpResponse.json(
                { message: 'Invalid email or password' },
                { status: 401 }
            )
        }

        if (user.status === 'blocked') {
            return HttpResponse.json(
                { message: 'User is blocked' },
                { status: 403 }
            )
        }

        setMockSession({
            currentUserId: user.id,
            currentRole: user.role,
        })

        return HttpResponse.json(user)
    }),

    http.post('/api/auth/logout', () => {
        clearMockSession()

        return HttpResponse.json({
            message: 'Logged out'
        })
    }),

    http.get('/api/users/me/favorites', () => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        const favoriteIds = mockFavoritesByUser.get(mockSession.currentUserId) ?? []
        const items = favoriteIds
            .map((id) => mockCabinets.find((cabinet) => cabinet.id === id && cabinet.status === 'active'))
            .filter((cabinet): cabinet is typeof mockCabinets[number] => Boolean(cabinet))

        return HttpResponse.json({ items })
    }),

    http.post('/api/users/me/favorites/sync', async ({ request }) => {
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
    }),

    http.post('/api/users/me/favorites/:cabinetId', ({ params }) => {
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
    }),

    http.delete('/api/users/me/favorites/:cabinetId', ({ params }) => {
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
    }),

    http.get('/api/notifications', ({ request }) => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            )
        }

        const url = new URL(request.url)
        const userNotifications = mockNotifications.filter(
            (notification) =>
                (notification as Notification & { userId: string }).userId === mockSession.currentUserId
        )
        const limit = Number(url.searchParams.get('limit'))

        if (!Number.isInteger(limit) || limit <= 0) {
            return HttpResponse.json(userNotifications)
        }

        const offset = Number(url.searchParams.get('cursor') ?? '0')
        const items = userNotifications.slice(offset, offset + limit)
        const nextOffset = offset + items.length

        return HttpResponse.json({
            items,
            nextCursor: nextOffset < userNotifications.length ? String(nextOffset) : null,
        })
    }),

    http.get('/api/notifications/unread-count', () => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            )
        }

        return HttpResponse.json({
            count: mockNotifications.filter(
                (notification) =>
                    (notification as Notification & { userId: string }).userId === mockSession.currentUserId &&
                    !notification.readAt
            ).length,
        })
    }),

    http.patch('/api/notifications/:id/read', ({ params }) => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            )
        }

        const notification = mockNotifications.find(
            (item) =>
                item.id === String(params.id) &&
                (item as Notification & { userId: string }).userId === mockSession.currentUserId
        )

        if (!notification) {
            return HttpResponse.json(
                { message: 'Notification not found' },
                { status: 404 }
            )
        }

        notification.readAt ??= new Date().toISOString()

        return HttpResponse.json(notification)
    }),

    http.patch('/api/notifications/read-all', () => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            )
        }

        let updated = 0
        mockNotifications.forEach((notification) => {
            if (
                (notification as Notification & { userId: string }).userId === mockSession.currentUserId &&
                !notification.readAt
            ) {
                notification.readAt = new Date().toISOString()
                updated += 1
            }
        })

        return HttpResponse.json({ updated })
    }),

    http.post('/api/auth/register', async ({ request }) => {
        const body = await parseMockJson(request, registerRequestSchema)

        if (!body) return invalidMockBodyResponse()
        const existingUser = mockUsers.find(
            (user) => user.email.toLowerCase() === body.email.toLowerCase()
        )

        if (existingUser) {
            return HttpResponse.json(
                { message: 'User with this email already exists' },
                { status: 409 }
            )
        }

        const newUser: User = {
            id: `user-${Date.now()}`,
            name: body.name,
            email: body.email,
            phone: null,
            role: body.role,
            status: 'active' as const,
            avatarUrl: null,
            provider: 'email' as const,
            locale: null,
            emailVerifiedAt: null,
            emailNotifications: true,
            bookingEmailNotifications: true,
            preferredCity: null,
            preferredCategories: [],
            createdAt: new Date().toISOString(),
        }

        mockUsers.push(newUser)

        setMockSession({
            currentUserId: newUser.id,
            currentRole: newUser.role,
        })

        return HttpResponse.json(newUser, {
            status: 201
        })
    }),

    http.post('/api/auth/password/setup/verify', async ({ request }) => {
        const body = await request.json() as {
            token: string
        }

        if (body.token !== 'mock-password-setup-token-1234567890') {
            return HttpResponse.json(
                {
                    message: 'Password setup link is invalid or expired.',
                },
                {
                    status: 400,
                }
            )
        }

        return HttpResponse.json({
            email: 'admin@autocarehub.test',
            expiresAt: '2026-12-31T23:59:59.000Z',
        })
    }),

    http.post('/api/auth/password/setup/complete', async ({ request }) => {
        const body = await request.json() as {
            token: string
            password: string
        }

        if (
            body.token !== 'mock-password-setup-token-1234567890' ||
            body.password.length < 6
        ) {
            return HttpResponse.json(
                {
                    message: 'Password setup link is invalid or expired.',
                },
                {
                    status: 400,
                }
            )
        }

        const user = mockUsers.find(
            (item) => item.email === 'admin@autocarehub.test'
        )

        if (!user) {
            return HttpResponse.json(
                {
                    message: 'User not found.',
                },
                {
                    status: 404,
                }
            )
        }

        setMockSession({
            currentUserId: user.id,
            currentRole: user.role,
        })

        return HttpResponse.json(user)
    }),

    http.post('/api/auth/password/reset/request', () => {
        return HttpResponse.json({
            success: true,
        })
    }),

    http.post('/api/auth/password/reset/verify', async ({ request }) => {
        const body = await request.json() as {
            token: string
        }

        if (body.token !== 'mock-password-reset-token-1234567890') {
            return HttpResponse.json(
                {
                    message: 'Password reset link is invalid or expired.',
                },
                {
                    status: 400,
                }
            )
        }

        return HttpResponse.json({
            email: 'emily.carter@example.com',
            expiresAt: '2026-12-31T23:59:59.000Z',
        })
    }),

    http.post('/api/auth/password/reset/complete', async ({ request }) => {
        const body = await request.json() as {
            token: string
            password: string
        }

        if (
            body.token !== 'mock-password-reset-token-1234567890' ||
            body.password.length < 6
        ) {
            return HttpResponse.json(
                {
                    message: 'Password reset link is invalid or expired.',
                },
                {
                    status: 400,
                }
            )
        }

        clearMockSession()

        return HttpResponse.json({
            success: true,
        })
    }),

    http.post('/api/auth/email-verification/request', () => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            )
        }

        return HttpResponse.json({
            success: true,
        })
    }),

    http.post('/api/auth/email-verification/verify', async ({ request }) => {
        const body = await request.json() as {
            token: string
        }

        if (body.token !== 'mock-email-verification-token-1234567890') {
            return HttpResponse.json(
                {
                    message: 'Email verification link is invalid or expired.',
                },
                {
                    status: 400,
                }
            )
        }

        const user = mockUsers.find(
            (item) => item.id === mockSession.currentUserId
        )

        return HttpResponse.json({
            email: user?.email ?? 'user@example.com',
            expiresAt: '2026-12-31T23:59:59.000Z',
        })
    }),

    http.post('/api/auth/email-verification/complete', async ({ request }) => {
        const body = await request.json() as {
            token: string
        }

        if (body.token !== 'mock-email-verification-token-1234567890') {
            return HttpResponse.json(
                {
                    message: 'Email verification link is invalid or expired.',
                },
                {
                    status: 400,
                }
            )
        }

        const user = mockUsers.find(
            (item) => item.id === mockSession.currentUserId
        )

        if (user) {
            user.emailVerifiedAt = new Date().toISOString()
        }

        return HttpResponse.json({
            success: true,
        })
    }),

    http.post('/api/auth/change-password', () => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            )
        }

        return HttpResponse.json({
            success: true,
        })
    }),

    http.get('/api/auth/sessions', () => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            )
        }

        return HttpResponse.json([
            {
                id: 'mock-session-1',
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                ipAddress: '127.0.0.1',
                lastActiveAt: new Date().toISOString(),
                isCurrent: true,
            },
            {
                id: 'mock-session-2',
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
                ipAddress: '192.168.1.5',
                lastActiveAt: new Date(Date.now() - 86400000).toISOString(),
                isCurrent: false,
            },
        ])
    }),

    http.delete('/api/auth/sessions/:id', () => {
        return HttpResponse.json({
            success: true,
        })
    }),

    http.post('/api/auth/sessions/revoke-all', () => {
        return HttpResponse.json({
            success: true,
        })
    }),

    http.post('/api/admin/admins', async ({ request }) => {
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
    }),

    http.get('/api/admin/payments', () => {
        return HttpResponse.json([])
    }),

    http.get('/api/admin/payments/attention', () => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)

        if (!currentUser) {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        if (currentUser.role !== 'super_admin') {
            return HttpResponse.json({ message: 'Only super admins can view payment attention.' }, { status: 403 })
        }

        return HttpResponse.json({
            failedPaymentCount: 0,
            openDisputeCount: 0,
            fundsWithdrawnDisputeCount: 0,
        })
    }),

    http.get('/api/admin/payments/:id/disputes', () => {
        return HttpResponse.json([])
    }),

    http.get('/api/admin/audit-logs', ({ request }) => {
        const url = new URL(request.url)
        const search = url.searchParams.get('search')?.trim().toLowerCase()
        const auditLogs = [
            {
                id: 'log-1',
                actor: { id: 'admin-1', name: 'Super Admin' },
                action: 'admin_created',
                targetId: 'admin-2',
                targetType: 'user',
                metadata: { email: 'new.admin@example.com' },
                ipAddress: '127.0.0.1',
                createdAt: new Date().toISOString(),
            },
            {
                id: 'log-2',
                actor: { id: 'admin-1', name: 'Super Admin' },
                action: 'user_status_updated',
                targetId: 'user-123',
                targetType: 'user',
                metadata: { oldStatus: 'active', newStatus: 'blocked' },
                ipAddress: '127.0.0.1',
                createdAt: new Date(Date.now() - 3600000).toISOString(),
            },
        ]
        const filteredLogs = search
            ? auditLogs.filter((log) => JSON.stringify(log).toLowerCase().includes(search))
            : auditLogs

        if (url.searchParams.has('limit') || url.searchParams.has('cursor')) {
            return HttpResponse.json({ items: filteredLogs, nextCursor: null })
        }

        return HttpResponse.json(filteredLogs)
    }),

    http.get('/api/admin/security-events', ({ request }) => {
        const url = new URL(request.url)
        const type = url.searchParams.get('type')
        const userId = url.searchParams.get('userId')
        const filteredEvents = mockSecurityEvents.filter((event) => (
            (!type || event.type === type) &&
            (!userId || event.userId === userId)
        ))

        if (url.searchParams.has('limit') || url.searchParams.has('cursor')) {
            return HttpResponse.json({ items: filteredEvents, nextCursor: null })
        }

        return HttpResponse.json(filteredEvents)
    }),

    http.get('/api/admin/security-center/summary', () => {
        const byType = new Map<string, number>()
        const bySeverity = new Map<string, number>()
        const ips = new Map<string, number>()
        const routes = new Map<string, number>()
        for (const event of mockSecurityEvents) {
            byType.set(event.type, (byType.get(event.type) ?? 0) + 1)
            bySeverity.set(event.severity, (bySeverity.get(event.severity) ?? 0) + 1)
            if (event.ipAddress) ips.set(event.ipAddress, (ips.get(event.ipAddress) ?? 0) + 1)
            if (event.route) routes.set(event.route, (routes.get(event.route) ?? 0) + 1)
        }
        return HttpResponse.json({
            windowMinutes: 1440,
            sampled: false,
            totalEvents: mockSecurityEvents.length,
            openEvents: mockSecurityEvents.filter((event) => event.status === 'open').length,
            highSeverityEvents: mockSecurityEvents.filter((event) => event.severity === 'high').length,
            criticalSeverityEvents: mockSecurityEvents.filter((event) => event.severity === 'critical').length,
            blockedSignals: mockSecurityEvents.filter((event) => event.type === 'rate_limit_exceeded' || event.type === 'privilege_denied').length,
            byType: [...byType.entries()].map(([type, count]) => ({ type, count })),
            bySeverity: [...bySeverity.entries()].map(([severity, count]) => ({ severity, count })),
            topIps: [...ips.entries()].map(([ipAddress, count]) => ({ ipAddress, count })),
            topRoutes: [...routes.entries()].map(([route, count]) => ({ route, count })),
            uniqueIpCount: new Set(mockSecurityEvents.map((event) => event.ipAddress).filter(Boolean)).size,
            affectedAccountCount: new Set(mockSecurityEvents.map((event) => event.userId).filter(Boolean)).size,
            repeatedFailedLoginCount: mockSecurityEvents.filter((event) => event.type === 'login_failed' && (event.failedLoginAttempts ?? 0) > 1).length,
            requestBursts: [],
            topUserAgents: [{ userAgent: 'AutoCare Hub mock', count: mockSecurityEvents.length }],
            rateLimitEffectiveness: {
                blocked: mockSecurityEvents.filter((event) => event.rateLimitResult === 'blocked').length,
                allowed: mockSecurityEvents.filter((event) => event.rateLimitResult === 'allowed').length,
                notChecked: mockSecurityEvents.filter((event) => event.rateLimitResult === 'not_checked').length,
                blockedSharePercent: 0,
            },
            recentEvents: mockSecurityEvents.slice(0, 12),
        })
    }),

    http.get('/api/admin/security-center/events', ({ request }) => {
        const url = new URL(request.url)
        const type = url.searchParams.get('type')
        const severity = url.searchParams.get('severity')
        const status = url.searchParams.get('status')
        const ip = url.searchParams.get('ip')
        const route = url.searchParams.get('route')
        const actorRole = url.searchParams.get('actorRole')
        const requestId = url.searchParams.get('requestId')
        const authOutcome = url.searchParams.get('authOutcome')
        const rateLimitResult = url.searchParams.get('rateLimitResult')
        const filteredEvents = mockSecurityEvents.filter((event) => (
            (!type || event.type === type) &&
            (!severity || event.severity === severity) &&
            (!status || event.status === status) &&
            (!ip || event.ipAddress === ip) &&
            (!route || event.route?.includes(route)) &&
            (!actorRole || event.actorRole === actorRole) &&
            (!requestId || event.requestId === requestId) &&
            (!authOutcome || event.authOutcome === authOutcome) &&
            (!rateLimitResult || event.rateLimitResult === rateLimitResult)
        ))
        return HttpResponse.json({ items: filteredEvents, nextCursor: null })
    }),

    http.get('/api/admin/security-center/events/export', ({ request }) => {
        const url = new URL(request.url)
        const filters = {
            type: url.searchParams.get('type'),
            severity: url.searchParams.get('severity'),
            status: url.searchParams.get('status'),
            ip: url.searchParams.get('ip'),
            route: url.searchParams.get('route'),
            actorRole: url.searchParams.get('actorRole'),
            requestId: url.searchParams.get('requestId'),
            authOutcome: url.searchParams.get('authOutcome'),
            rateLimitResult: url.searchParams.get('rateLimitResult'),
        }
        const filteredEvents = mockSecurityEvents.filter((event) => (
            (!filters.type || event.type === filters.type) &&
            (!filters.severity || event.severity === filters.severity) &&
            (!filters.status || event.status === filters.status) &&
            (!filters.ip || event.ipAddress === filters.ip) &&
            (!filters.route || event.route?.includes(filters.route)) &&
            (!filters.actorRole || event.actorRole === filters.actorRole) &&
            (!filters.requestId || event.requestId === filters.requestId) &&
            (!filters.authOutcome || event.authOutcome === filters.authOutcome) &&
            (!filters.rateLimitResult || event.rateLimitResult === filters.rateLimitResult)
        )).slice(0, 100)
        const cell = (value: unknown) => `"${String(value ?? '').replace(/^[=+\-@]/, (prefix) => `'${prefix}`).replaceAll('"', '""')}"`
        const header = ['createdAt', 'type', 'severity', 'status', 'ipAddress', 'requestId', 'method', 'route', 'statusCode', 'actorRole', 'authOutcome', 'rateLimitResult', 'requestSizeBytes', 'reasonCode', 'proxyProvenance', 'userAgent', 'metadata']
        const rows = filteredEvents.map((event) => [
            event.createdAt, event.type, event.severity, event.status, event.ipAddress, event.requestId,
            event.method, event.route, event.statusCode, event.actorRole, event.authOutcome,
            event.rateLimitResult, event.requestSizeBytes, event.reasonCode, event.proxyProvenance,
            event.userAgent, '[redacted]',
        ])
        const csv = [header, ...rows].map((row) => row.map(cell).join(',')).join('\n') + '\n'
        return new HttpResponse(csv, {
            headers: {
                'cache-control': 'no-store',
                'content-disposition': `attachment; filename="autocarehub-security-events-${new Date().toISOString().slice(0, 10)}.csv"`,
                'content-type': 'text/csv; charset=utf-8',
            },
        })
    }),

    http.get('/api/admin/security-center/mitigations', ({ request }) => {
        const url = new URL(request.url)
        const status = url.searchParams.get('status') ?? 'active'
        const ipAddress = url.searchParams.get('ipAddress')
        const now = Date.now()
        const items = mockSecurityMitigations
            .map((item) => item.status === 'active' && item.revokedAt === null && Date.parse(item.expiresAt) <= now
                ? { ...item, status: 'expired' as const }
                : item)
            .filter((item) => (
                item.status === status &&
                (!ipAddress || item.displayValue === ipAddress)
            ))
        return HttpResponse.json(items)
    }),

    http.post('/api/admin/security-center/mitigations', async ({ request }) => {
        const body = await request.json() as {
            kind?: 'ip_block'
            ipAddress?: string
            reason?: string
            ttlMinutes?: number
        }
        const ttlMinutes = body.ttlMinutes
        if (!body.ipAddress || !body.reason || typeof ttlMinutes !== 'number' || !Number.isInteger(ttlMinutes)) {
            return invalidMockBodyResponse()
        }
        const now = new Date()
        const mitigation: MockSecurityMitigation = {
            id: `mock-mitigation-${Date.now()}`,
            kind: 'ip_block',
            displayValue: body.ipAddress.trim(),
            reason: body.reason.trim(),
            expiresAt: new Date(now.getTime() + ttlMinutes * 60_000).toISOString(),
            revokedAt: null,
            createdBy: 'user-admin-1',
            revokedBy: null,
            createdAt: now.toISOString(),
            status: 'active',
        }
        mockSecurityMitigations.unshift(mitigation)
        return HttpResponse.json(mitigation)
    }),

    http.delete('/api/admin/security-center/mitigations/:id', ({ params }) => {
        const mitigation = mockSecurityMitigations.find((item) => item.id === params.id)
        if (!mitigation) return HttpResponse.json({ message: 'Security mitigation not found.' }, { status: 404 })
        mitigation.status = 'revoked'
        mitigation.revokedAt = new Date().toISOString()
        mitigation.revokedBy = 'user-admin-1'
        return HttpResponse.json(mitigation)
    }),

    http.patch('/api/admin/security-center/mitigations/:id', async ({ params, request }) => {
        const mitigation = mockSecurityMitigations.find((item) => item.id === params.id)
        if (!mitigation) return HttpResponse.json({ message: 'Security mitigation not found.' }, { status: 404 })
        const body = await request.json() as { extensionMinutes?: number }
        const extensionMinutes = body.extensionMinutes
        if (
            mitigation.status !== 'active'
            || mitigation.revokedAt !== null
            || typeof extensionMinutes !== 'number'
            || !Number.isInteger(extensionMinutes)
            || extensionMinutes < 1
            || extensionMinutes > 1_440
        ) {
            return invalidMockBodyResponse()
        }
        const nextExpiry = Date.parse(mitigation.expiresAt) + extensionMinutes * 60_000
        if (nextExpiry > Date.now() + 1_440 * 60_000) {
            return HttpResponse.json({ message: 'The extension would exceed the 24-hour recovery window.' }, { status: 409 })
        }
        mitigation.expiresAt = new Date(nextExpiry).toISOString()
        return HttpResponse.json(mitigation, { headers: { 'cache-control': 'no-store' } })
    }),

    http.post('/api/admin/security-center/users/:id/revoke-sessions', ({ params }) => (
        HttpResponse.json(
            {
                userId: params.id,
                revokedAt: new Date().toISOString(),
            },
            { headers: { 'cache-control': 'no-store' } },
        )
    )),

    http.get('/api/admin/security-center/events/:id', ({ params }) => {
        const event = mockSecurityEvents.find((item) => item.id === params.id)
        return event
            ? HttpResponse.json(event)
            : HttpResponse.json({ message: 'Security event not found.' }, { status: 404 })
    }),

    http.patch('/api/admin/security-center/events/:id/status', async ({ params, request }) => {
        const event = mockSecurityEvents.find((item) => item.id === params.id)
        if (!event) return HttpResponse.json({ message: 'Security event not found.' }, { status: 404 })
        const body = await request.json() as {
            status: MockSecurityEvent['status']
            operatorNote?: string
            assigneeId?: string | null
        }
        event.status = body.status
        const action = {
            status: body.status === 'open' ? 'acknowledged' : body.status,
            operatorNote: body.operatorNote ?? null,
            actorId: 'user-admin-1',
            assigneeId: body.assigneeId === undefined ? event.assigneeId : body.assigneeId,
            createdAt: new Date().toISOString(),
        }
        event.assigneeId = action.assigneeId
        event.lastAction = action
        event.actionTimeline.unshift({ id: `mock-security-action-${Date.now()}`, ...action })
        return HttpResponse.json(event)
    }),

    http.get('/api/admin/system-incidents', ({ request }) => {
        const url = new URL(request.url)
        const search = url.searchParams.get('search')?.trim().toLowerCase()
        const status = url.searchParams.get('status')
        const filteredIncidents = mockSystemIncidents.filter((incident) => (
            (!search || incident.title.toLowerCase().includes(search)) &&
            (!status || incident.status === status)
        ))

        if (url.searchParams.has('limit') || url.searchParams.has('cursor')) {
            return HttpResponse.json({ items: filteredIncidents, nextCursor: null })
        }

        return HttpResponse.json(filteredIncidents)
    }),

    http.get('/api/admin/outbox/health', () => HttpResponse.json({
        counts: {
            pending: 0,
            processing: 0,
            completed: 0,
            failed: 0,
            dead_letter: 0,
        },
        abandonedCount: 0,
        deadLetterCount: 0,
        failedEvents: [],
    })),

    http.patch('/api/admin/system-incidents/:id/status', async ({ params, request }) => {
        const body = await request.json() as { status: 'open' | 'acknowledged' | 'resolved' }
        const incident = mockSystemIncidents.find((item) => item.id === params.id)

        if (!incident) {
            return HttpResponse.json({ message: 'System incident not found.' }, { status: 404 })
        }

        incident.status = body.status
        incident.acknowledgedAt = body.status === 'acknowledged'
            ? new Date().toISOString()
            : incident.acknowledgedAt
        incident.resolvedAt = body.status === 'resolved'
            ? new Date().toISOString()
            : null

        return HttpResponse.json(incident)
    }),

    http.get('/api/cabinets', ({ request }) => {
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
    }),

    http.get('/api/v1/markets', () => HttpResponse.json([autoCareMarket])),

    http.get('/api/v1/service-definitions', () => HttpResponse.json(autoCareDefinitions)),

    http.get('/api/v1/discovery/providers', ({ request }) => {
        const url = new URL(request.url)
        const serviceId = url.searchParams.get('serviceId') ?? 'oil-change'
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
        const definition = autoCareDefinitions.find((item) => item.slug === serviceId) ?? autoCareDefinitions[0]
        const items = autoCareProviders.map((provider, index) => ({
            provider,
            offer: toAutoCareOffer(provider.id, definition?.slug ?? serviceId, provider.servicePrices?.[definition?.slug ?? serviceId] ?? providerPreviews[index]?.price ?? 0, providerPreviews[index]?.priceType ?? definition?.priceType),
            distanceKm: providerPreviews[index]?.distance ? Number.parseFloat(providerPreviews[index]!.distance) : index + 1,
            nextSlot: providerPreviews[index]?.nextSlot ?? null,
        })).filter((item) => {
            const hasService = item.provider.serviceIds?.includes(definition?.slug ?? serviceId) ?? true
            const price = item.offer.priceFromMinor / 100
            const available = item.nextSlot?.toLowerCase().includes('today') ?? false
            const source = providerPreviews.find((preview) => `api-${preview.id}` === item.provider.id)
            const matchesInclusion = !inclusion || (source?.inclusions ?? []).some((value) => value.toLowerCase().includes(inclusion))
            const matchesBrand = !source || supportsVehicleBrand(source, brandId)
            const matchesWarranty = !warrantyOnly || (source?.warrantyMonths ?? 0) > 0
            const matchesPriceType = !priceType || source?.priceType === priceType
            return hasService && item.distanceKm <= radiusKm && price >= minPrice && price <= maxPrice && item.provider.rating >= minRating && (!availableToday || available) && (!verifiedOnly || item.provider.verified) && matchesWarranty && (!hasBonus || Boolean(item.provider.bonusSummary)) && matchesPriceType && matchesInclusion && matchesBrand
        })

        if (sort === 'price_asc') items.sort((left, right) => left.offer.priceFromMinor - right.offer.priceFromMinor)
        if (sort === 'rating_desc') items.sort((left, right) => right.provider.rating - left.provider.rating)
        if (sort === 'distance_asc') items.sort((left, right) => left.distanceKm - right.distanceKm)

        return HttpResponse.json({ items, nextCursor: null })
    }),

    http.get('/api/v1/providers/:providerId', ({ params }) => {
        const provider = [...autoCareProviders, ...ownerAutoCareProviders].find((item) => item.id === params.providerId || item.id.replace('api-', '') === params.providerId)
        if (!provider) return HttpResponse.json({ message: 'Automotive provider not found.' }, { status: 404 })

        const source = providerPreviews.find((item) => item.id === provider.id.replace('api-', ''))
        const offers = source
            ? automotiveServices.map((service) => toAutoCareOffer(provider.id, service.id, source.servicePrices?.[service.id] ?? source.price, source.priceType ?? 'from'))
            : []

        return HttpResponse.json({ ...provider, offers })
    }),

    http.get('/api/v1/providers/:providerId/availability', ({ params, request }) => {
        const provider = [...autoCareProviders, ...ownerAutoCareProviders].find((item) => item.id === params.providerId || item.id.replace('api-', '') === params.providerId)
        const url = new URL(request.url)
        const date = url.searchParams.get('date')
        const locationId = url.searchParams.get('locationId')
        const offeringId = url.searchParams.get('offeringId')
        const source = provider ? providerPreviews.find((item) => item.id === provider.id.replace('api-', '')) : undefined
        if (!provider || !date || !locationId || !offeringId) return HttpResponse.json({ message: 'Invalid availability request.' }, { status: 400 })
        const durationMinutes = 60
        const reserved = mockAutoCareServiceRequests.filter((item) => item.providerId === provider.id && item.locationId === locationId && item.preferredAt?.slice(0, 10) === date && item.status !== 'declined' && item.status !== 'closed').map((item) => item.preferredAt?.slice(11, 16))
        const slots = Array.from({ length: 20 }, (_, index) => 8 * 60 + index * 30).map((start) => ({ startTime: `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`, endTime: `${String(Math.floor((start + durationMinutes) / 60)).padStart(2, '0')}:${String((start + durationMinutes) % 60).padStart(2, '0')}` })).filter((slot) => !reserved.includes(slot.startTime))
        return HttpResponse.json({ date, durationMinutes, slots, source: source?.name ?? null })
    }),

    http.post('/api/v1/service-requests', async ({ request }) => {
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (user.role !== 'client') return HttpResponse.json({ message: 'Only clients can create service requests.' }, { status: 403 })
        const body = await request.json() as {
            providerId?: string
            locationId?: string
            offeringId?: string
            preferredAt?: string
            vehicleSnapshot?: Record<string, string | number | null> | null
            contactSnapshot?: Record<string, string | number | null>
            note?: string | null
        }
        const idempotencyKey = request.headers.get('Idempotency-Key')
        const fingerprint = JSON.stringify({ providerId: body.providerId, locationId: body.locationId, offeringId: body.offeringId, preferredAt: body.preferredAt, vehicleSnapshot: body.vehicleSnapshot ?? null, contactSnapshot: body.contactSnapshot, note: body.note ?? null })
        if (idempotencyKey) {
            if (!/^[a-zA-Z0-9_-]{8,128}$/.test(idempotencyKey)) return HttpResponse.json({ message: 'Invalid Idempotency-Key.' }, { status: 400 })
            const existing = mockAutoCareServiceRequests.find((item) => item.clientId === user.id && item.idempotencyKey === idempotencyKey)
            if (existing) {
                if (existing.idempotencyFingerprint !== fingerprint) return HttpResponse.json({ message: 'Idempotency key was already used for another service request.' }, { status: 409 })
                const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = existing
                return HttpResponse.json(response)
            }
        }
        const provider = autoCareProviders.find((item) => item.id === body.providerId || item.id.replace('api-', '') === body.providerId)
        const source = provider ? providerPreviews.find((item) => item.id === provider.id.replace('api-', '')) : undefined
        const service = automotiveServices.find((item) => body.offeringId?.endsWith(`-${item.id}`)) ?? automotiveServices[0]
        const definition = autoCareDefinitions.find((item) => item.slug === service?.id) ?? autoCareDefinitions[0]
        if (!provider || !body.locationId || !body.offeringId || !body.preferredAt || !body.contactSnapshot || !definition) {
            return HttpResponse.json({ message: 'Invalid service request.' }, { status: 400 })
        }
        const now = new Date().toISOString()
        const result: MockAutoCareServiceRequest = {
            id: `mock-request-${Date.now()}`,
            providerId: provider.id,
            providerName: provider.name,
            locationId: body.locationId,
            address: provider.location.address,
            definitionId: definition.id,
            serviceSlug: definition.slug,
            serviceLabels: definition.labels,
            offeringId: body.offeringId,
            priceFromMinor: source?.price ? source.price * 100 : null,
            currencyCode: 'RUB',
            preferredAt: body.preferredAt,
            vehicleSnapshot: body.vehicleSnapshot ?? null,
            contactSnapshot: body.contactSnapshot,
            note: body.note ?? null,
            quote: null,
            idempotencyKey,
            idempotencyFingerprint: fingerprint,
            status: 'awaiting_reply',
            clientId: user.id,
            clientConfirmedAt: now,
            providerConfirmedAt: null,
            createdAt: now,
            updatedAt: now,
        }
        mockAutoCareServiceRequests.unshift(result)
        pushMockAutoCareNotification({ userId: user.id, requestId: result.id, role: 'client', title: 'Заявка отправлена', message: 'Заявка передана автосервису и появится в переписке.' })
        const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = result
        return HttpResponse.json(response, { status: 201 })
    }),

    http.get('/api/v1/service-requests/my', () => {
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        const items = mockAutoCareServiceRequests.filter((item) => item.clientId === user.id).map(({ clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...item }) => item)
        return HttpResponse.json(items)
    }),

    http.get('/api/v1/service-requests/:requestId', ({ params }) => {
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((request) => request.id === params.requestId)
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (!item) return HttpResponse.json({ message: 'Service request not found.' }, { status: 404 })
        const provider = autoCareProviders.find((candidate) => candidate.id === item.providerId)
        const allowed = item.clientId === user.id || (user.role === 'owner' && provider?.id === item.providerId)
        if (!allowed) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = item
        return HttpResponse.json(response)
    }),

    http.get('/api/v1/service-requests/:requestId/conversation', ({ params }) => {
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((request) => request.id === params.requestId)
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        const provider = item ? autoCareProviders.find((candidate) => candidate.id === item.providerId) : undefined
        const allowed = Boolean(item && (item.clientId === user.id || (user.role === 'owner' && provider?.id === item.providerId)))
        if (!allowed || !item) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = item
        return HttpResponse.json({ request: response, messages: mockAutoCareMessages.get(item.id) ?? [], attachments: mockAutoCareAttachments.get(item.id) ?? [] })
    }),

    http.post('/api/v1/service-requests/:requestId/messages', async ({ params, request }) => {
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((candidate) => candidate.id === params.requestId)
        const provider = item ? autoCareProviders.find((candidate) => candidate.id === item.providerId) : undefined
        const allowed = Boolean(item && (item.clientId === user?.id || (user?.role === 'owner' && provider?.id === item.providerId)))
        if (!user || !item || !allowed) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const body = await request.json() as { body?: string }
        if (!body.body?.trim()) return HttpResponse.json({ message: 'Message is required.' }, { status: 400 })
        const message = { id: `mock-message-${Date.now()}`, senderId: user.id, kind: 'text' as const, body: body.body.trim(), createdAt: new Date().toISOString() }
        mockAutoCareMessages.set(item.id, [...(mockAutoCareMessages.get(item.id) ?? []), message])
        pushMockAutoCareNotification({ userId: user.id === item.clientId ? 'user-owner-1' : item.clientId, requestId: item.id, role: user.id === item.clientId ? 'owner' : 'client', title: 'Новое сообщение по заявке', message: 'В переписке по услуге появилось новое сообщение.' })
        return HttpResponse.json(message, { status: 201 })
    }),

    http.post('/api/v1/service-requests/:requestId/attachments', async ({ params, request }) => {
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((candidate) => candidate.id === params.requestId)
        if (!user || !item || item.clientId !== user.id) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const body = await request.json() as { fileName?: string; contentType?: string; size?: number; contentBase64?: string }
        if (!body.fileName || !body.contentType || !body.size || !body.contentBase64) return HttpResponse.json({ message: 'Invalid attachment.' }, { status: 400 })
        const attachment = { id: `mock-attachment-${Date.now()}`, uploadedById: user.id, contentType: body.contentType, bytes: body.size, status: 'ready' as const, url: `/api/v1/service-requests/${item.id}/attachments/mock`, createdAt: new Date().toISOString(), contentBase64: body.contentBase64 }
        mockAutoCareAttachments.set(item.id, [...(mockAutoCareAttachments.get(item.id) ?? []), attachment])
        const { contentBase64: _contentBase64, ...response } = attachment
        return HttpResponse.json(response, { status: 201 })
    }),

    http.post('/api/v1/service-requests/:requestId/confirm', ({ params }) => {
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((request) => request.id === params.requestId)
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (!item || item.clientId !== user.id) return HttpResponse.json({ message: 'Service request not found.' }, { status: 404 })
        item.clientConfirmedAt ??= new Date().toISOString()
        item.updatedAt = new Date().toISOString()
        const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = item
        return HttpResponse.json(response)
    }),

    http.post('/api/v1/service-requests/:requestId/quote/accept', ({ params }) => {
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((request) => request.id === params.requestId)
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (!item || item.clientId !== user.id) return HttpResponse.json({ message: 'Service request not found.' }, { status: 404 })
        if (item.status !== 'estimate_shared' || !item.quote) return HttpResponse.json({ message: 'There is no pending estimate.' }, { status: 409 })
        item.status = 'accepted'
        item.clientConfirmedAt = new Date().toISOString()
        item.updatedAt = new Date().toISOString()
        pushMockAutoCareNotification({ userId: 'user-owner-1', requestId: item.id, role: 'owner', title: 'Клиент принял смету', message: 'Клиент подтвердил предварительную стоимость услуги.' })
        const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = item
        return HttpResponse.json(response)
    }),

    http.post('/api/v1/service-requests/:requestId/quote/decline', ({ params }) => {
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((request) => request.id === params.requestId)
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (!item || item.clientId !== user.id) return HttpResponse.json({ message: 'Service request not found.' }, { status: 404 })
        if (item.status !== 'estimate_shared' || !item.quote) return HttpResponse.json({ message: 'There is no pending estimate.' }, { status: 409 })
        item.status = 'declined'
        item.clientConfirmedAt = new Date().toISOString()
        item.updatedAt = new Date().toISOString()
        pushMockAutoCareNotification({ userId: 'user-owner-1', requestId: item.id, role: 'owner', title: 'Клиент отклонил смету', message: 'Клиент попросил не продолжать по этой смете.' })
        const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = item
        return HttpResponse.json(response)
    }),

    http.get('/api/owner/service-requests', () => {
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (user.role !== 'owner') return HttpResponse.json({ message: 'Only owners can view service requests.' }, { status: 403 })
        const items = mockAutoCareServiceRequests.filter((item) => autoCareProviders.some((provider) => provider.id === item.providerId)).map(({ clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...item }) => item)
        return HttpResponse.json(items)
    }),

    http.post('/api/owner/service-requests/:requestId/confirm', ({ params }) => {
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((request) => request.id === params.requestId)
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (user.role !== 'owner' || !item) return HttpResponse.json({ message: 'Service request not found.' }, { status: 404 })
        item.providerConfirmedAt ??= new Date().toISOString()
        item.status = 'accepted'
        item.updatedAt = new Date().toISOString()
        pushMockAutoCareNotification({ userId: item.clientId, requestId: item.id, role: 'client', title: 'Сервис подтвердил заявку', message: 'Сервис подтвердил заявку и готов перейти к следующему шагу.' })
        const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = item
        return HttpResponse.json(response)
    }),

    http.post('/api/owner/service-requests/:requestId/quote', async ({ params, request }) => {
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((candidate) => candidate.id === params.requestId)
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (user.role !== 'owner' || !item) return HttpResponse.json({ message: 'Service request not found.' }, { status: 404 })
        if (item.status === 'accepted' || item.status === 'declined' || item.status === 'closed') return HttpResponse.json({ message: 'This service request cannot receive a new estimate.' }, { status: 409 })
        const body = await request.json() as { amountMinor?: number; currencyCode?: string; note?: string | null }
        const amountMinor = body.amountMinor
        const currencyCode = body.currencyCode
        if (typeof amountMinor !== 'number' || !Number.isInteger(amountMinor) || amountMinor <= 0 || !/^[A-Z]{3}$/.test(currencyCode ?? '')) return invalidMockBodyResponse()
        const now = new Date().toISOString()
        item.quote = { amountMinor, currencyCode: currencyCode!, note: body.note?.trim() || null, createdAt: now }
        item.status = 'estimate_shared'
        item.updatedAt = now
        pushMockAutoCareNotification({ userId: item.clientId, requestId: item.id, role: 'client', title: 'Сервис прислал предварительную смету', message: 'Проверьте предварительную стоимость услуги.' })
        const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = item
        return HttpResponse.json(response)
    }),

    http.get('/api/owner/autocare-providers', () => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)

        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'owner') return HttpResponse.json({ message: 'Only owners can manage automotive service profiles.' }, { status: 403 })

        return HttpResponse.json(ownerAutoCareProviders)
    }),

    http.post('/api/owner/autocare-providers', async ({ request }) => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)

        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'owner') return HttpResponse.json({ message: 'Only owners can manage automotive service profiles.' }, { status: 403 })

        const body = await request.json() as {
            name?: string
            description?: string
            marketId?: string
            address?: string
            hours?: string
            yearsActive?: number
            staffCount?: number
            isMultibrand?: boolean
            brandSpecializations?: string[]
            amenityIds?: string[]
        }

        if (!body.name?.trim() || !body.marketId || !body.address?.trim() || !body.hours?.trim()) {
            return HttpResponse.json({ message: 'Invalid service profile.' }, { status: 400 })
        }

        const id = `owner-provider-${Date.now()}`
        const provider = {
            id,
            name: body.name.trim(),
            description: body.description?.trim() || null,
            status: 'draft' as const,
            verified: false,
            yearsActive: Math.max(0, Number(body.yearsActive) || 0),
            staffCount: Math.max(0, Number(body.staffCount) || 0),
            rating: 0,
            reviewCount: 0,
            bonusSummary: null,
            brandSpecializations: body.isMultibrand ? [] : [...new Set(body.brandSpecializations ?? [])],
            isMultibrand: Boolean(body.isMultibrand),
            coverImageUrl: null,
            galleryImageUrls: [],
            amenityIds: [...new Set(body.amenityIds ?? [])],
            location: {
                id: `location-${id}`,
                marketId: body.marketId,
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
    }),

    http.get('/api/cabinets/all', () => {
        return HttpResponse.json(mockCabinets)
    }),

    http.get('/api/v1/reviews/featured', ({ request }) => {
        const limit = Number(new URL(request.url).searchParams.get('limit') ?? 6)
        return HttpResponse.json(mockFeaturedAutoCareReviews.slice(0, Number.isFinite(limit) ? limit : 6))
    }),

    http.get('/api/cabinets/:id', ({ params }) => {
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
    }),

    http.get('/api/cabinets/:id/reviews', ({ params }) => {
        const cabinetId = String(params.id)
        const reviews = mockReviews
            .filter((review) =>
                review.cabinetId === cabinetId &&
                review.status === 'approved'
            )
            .map(toPublicReview)

        return HttpResponse.json(reviews)
    }),

    http.get('/api/reviews/my', () => {
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
    }),

    http.post('/api/cabinets/:id/reviews', async ({ params, request }) => {
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
    }),

    http.patch('/api/reviews/:id', async ({ params, request }) => {
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
    }),

    http.delete('/api/cabinets/:id', ({ params }) => {
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
    }),

    http.get('/api/services', ({ request }) => {
        const url = new URL(request.url)
        const cabinetId = url.searchParams.get('cabinetId')

        const services = cabinetId
            ? mockServices.filter(service => service.cabinetId === cabinetId)
            : mockServices

        return HttpResponse.json(services)
    }),

    http.patch('/api/services/:id/status', async ({ params, request }) => {
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
    }),

    http.patch('/api/services/:id', async ({ params, request }) => {
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
    }),

    http.delete('/api/services/:id', ({ params }) => {
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
    }),

    http.get('/api/owner/cabinets', () => {
        const ownerCabinets = mockCabinets.filter(
            (cabinet) => cabinet.ownerId === mockSession.currentUserId
        )

        return HttpResponse.json(ownerCabinets)
    }),

    http.get('/api/owner/readiness', () => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)

        if (!currentUser) {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        if (currentUser.role !== 'owner') {
            return HttpResponse.json({ message: 'Only owners can view owner readiness.' }, { status: 403 })
        }

        const ownerCabinets = mockCabinets.filter((cabinet) => cabinet.ownerId === currentUser.id)
        const activeCabinet = ownerCabinets.some((cabinet) => cabinet.status === 'active')
        const activeCabinetIds = new Set(ownerCabinets.filter((cabinet) => cabinet.status === 'active').map((cabinet) => cabinet.id))
        const activeService = mockServices.some((service) => activeCabinetIds.has(service.cabinetId) && service.isActive)
        const payoutAccount: 'not_connected' | 'ready' = 'not_connected'
        const checks = {
            emailVerified: Boolean(currentUser.emailVerifiedAt),
            activeCabinet,
            activeService,
            scheduleConfigured: false,
            payoutAccount,
        }
        const blockers = [
            ...(!checks.emailVerified ? ['email_verification' as const] : []),
            ...(!checks.activeCabinet ? ['active_cabinet' as const] : []),
            ...(!checks.activeService ? ['active_service' as const] : []),
            ...(!checks.scheduleConfigured ? ['schedule' as const] : []),
            'payout_account' as const,
        ]

        return HttpResponse.json({ ready: blockers.length === 0, blockers, checks })
    }),

    http.post('/api/owner/action-center/events', async ({ request }) => {
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
    }),

    http.post('/api/client/experiment-events', async ({ request }) => {
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
    }),

    http.get('/api/owner/cabinets/:id', ({ params }) => {
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
    }),

    http.patch('/api/cabinets/:id', async ({ params, request }) => {
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
    }),

    http.get('/api/owner/services', () => {
        const ownerCabinetIds = mockCabinets
            .filter((cabinet) => cabinet.ownerId === mockSession.currentUserId)
            .map((cabinet) => cabinet.id)

        const ownerServices = mockServices.filter((service) =>
            ownerCabinetIds.includes(service.cabinetId)
        )

        return HttpResponse.json(ownerServices)
    }),

    http.get('/api/bookings/occupied', ({ request }) => {
        const url = new URL(request.url)
        const cabinetId = url.searchParams.get('cabinetId')
        const date = url.searchParams.get('date')

        if (!cabinetId || !date) {
            return HttpResponse.json(
                { message: 'Cabinet and date are required' },
                { status: 400 },
            )
        }

        const occupiedSlots = mockBookings
            .filter(
                (booking) =>
                    booking.cabinetId === cabinetId &&
                    booking.date === date &&
                    (booking.status === 'pending' ||
                        booking.status === 'confirmed'),
            )
            .map((booking) => ({
                start: booking.startTime,
                end: booking.endTime,
            }))

        return HttpResponse.json(occupiedSlots)
    }),

    http.get('/api/owner/bookings', () => {
        const currentUser = mockUsers.find(
            (user) => user.id === mockSession.currentUserId
        )

        if (!currentUser) {
            return HttpResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            )
        }

        if (currentUser.role !== 'owner') {
            return HttpResponse.json(
                { message: 'Only owners can use this booking endpoint.' },
                { status: 403 }
            )
        }

        const ownerCabinetIds = new Set(
            mockCabinets
                .filter((cabinet) => cabinet.ownerId === currentUser.id)
                .map((cabinet) => cabinet.id)
        )

        const ownerBookings = mockBookings
            .filter((booking) => ownerCabinetIds.has(booking.cabinetId))
            .map(toOwnerBooking)

        return HttpResponse.json(ownerBookings)
    }),

    http.get('/api/owner/bookings/reschedule-requests', () => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)

        if (!currentUser) {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        if (currentUser.role !== 'owner') {
            return HttpResponse.json({ message: 'Only owners can use this booking endpoint.' }, { status: 403 })
        }

        return HttpResponse.json([])
    }),

    http.post('/api/owner/bookings', async ({ request }) => {
        const body = await request.json() as {
            clientId: string
            cabinetId: string
            serviceId: string
            date: string
            startTime: string
            endTime: string
            comment?: string
        }

        const client = mockUsers.find(
            (user) =>
                user.id === body.clientId &&
                user.role === 'client' &&
                user.status === 'active'
        )

        if (!client) {
            return HttpResponse.json(
                { message: 'Client not found' },
                { status: 404 }
            )
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

        const service = mockServices.find(
            (item) =>
                item.id === body.serviceId &&
                item.cabinetId === body.cabinetId &&
                item.isActive
        )

        if (!service) {
            return HttpResponse.json(
                { message: 'Service not found' },
                { status: 404 }
            )
        }

        const newBooking = {
            id: `booking-${Date.now()}`,
            clientId: body.clientId,
            cabinetId: body.cabinetId,
            serviceId: body.serviceId,
            date: body.date,
            startTime: body.startTime,
            endTime: body.endTime,
            status: 'confirmed' as const,
            comment: body.comment ?? null,
            createdAt: new Date().toISOString(),
        }

        mockBookings.push(newBooking)

        addMockNotification({
            userId: client.id,
            category: 'booking',
            title: 'Booking confirmed',
            message: `Booking for ${service.title} in ${cabinet.title} was created by the owner.`,
            link: '/profile/bookings',
            metadata: {
                bookingId: newBooking.id,
            },
        })

        return HttpResponse.json(
            {
                ...toClientBooking(newBooking),
                client: {
                    id: client.id,
                    name: client.name,
                    email: client.email,
                    phone: client.phone ?? null,
                },
            },
            { status: 201 }
        )
    }),

    http.get('/api/admin/users', () => {
        return HttpResponse.json(mockUsers)
    }),

    http.get('/api/admin/cabinets', () => {
        return HttpResponse.json(mockCabinets)
    }),

    http.get('/api/admin/reviews', () => {
        return HttpResponse.json(mockReviews)
    }),

    http.patch('/api/admin/reviews/:id/status', async ({ params, request }) => {
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
    }),

    http.delete('/api/admin/reviews/:id', ({ params }) => {
        const reviewId = String(params.id)
        const reviewIndex = mockReviews.findIndex((item) => item.id === reviewId)

        if (reviewIndex === -1) {
            return HttpResponse.json({ message: 'Review not found' }, { status: 404 })
        }

        mockReviews.splice(reviewIndex, 1)

        return HttpResponse.json({ success: true })
    }),

    http.get('/api/owner/clients', () => {
        const clients = mockUsers.filter(
            (user) => user.role === 'client' && user.status === 'active'
        )

        return HttpResponse.json(clients)
    }),

    http.patch('/api/admin/cabinets/:id/status', async ({ params, request }) => {
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
    }),

    http.post('/api/cabinets', async ({ request }) => {
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
    }),

    http.post('/api/cabinet-images', async ({ request }) => {
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
    }),

    http.post('/api/services', async ({ request }) => {
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
    }),

    http.patch('/api/admin/users/:id/status', async ({ params, request }) => {
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
    }),

    http.post('/api/bookings', async ({ request }) => {
        const body = await parseMockJson(request, bookingRequestSchema)

        if (!body) return invalidMockBodyResponse()

        const isOwnerManualBooking = Boolean(body.clientId)
        const clientId = body.clientId ?? mockSession.currentUserId

        if (!clientId) {
            return HttpResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            )
        }

        const client = mockUsers.find(
            (user) =>
                user.id === clientId &&
                user.role === 'client' &&
                user.status === 'active'
        )

        if (!client) {
            return HttpResponse.json(
                { message: 'Client not found' },
                { status: 404 }
            )
        }

        const cabinet = mockCabinets.find(
            (cabinet) =>
                cabinet.id === body.cabinetId
        )

        if (!cabinet) {
            return HttpResponse.json(
                { message: 'Cabinet not found' },
                { status: 404 }
            )
        }

        if (isOwnerManualBooking && cabinet.ownerId !== mockSession.currentUserId) {
            return HttpResponse.json(
                { message: 'Cabinet not found' },
                { status: 404 }
            )
        }

        if (!isOwnerManualBooking && cabinet.status !== 'active') {
            return HttpResponse.json(
                { message: 'Cabinet is not available for booking' },
                { status: 400 }
            )
        }

        const service = mockServices.find(
            (service) =>
                service.id === body.serviceId &&
                service.cabinetId === body.cabinetId
        )

        if (!service) {
            return HttpResponse.json(
                { message: 'Service not found' },
                { status: 404 }
            )
        }

        if (!service.isActive) {
            return HttpResponse.json(
                { message: 'Service is not available for booking' },
                { status: 400 }
            )
        }

        const newBooking = {
            id: `booking-${Date.now()}`,
            clientId,
            cabinetId: body.cabinetId,
            serviceId: body.serviceId,
            date: body.date,
            startTime: body.startTime,
            endTime: body.endTime,
            status: body.status,
            comment: body.comment ?? null,
            createdAt: new Date().toISOString(),
        }

        mockBookings.push(newBooking)

        addMockNotification({
            userId: client.id,
            category: 'booking',
            title: isOwnerManualBooking ? 'Booking confirmed' : 'Booking request sent',
            message: isOwnerManualBooking
                ? `Booking for ${service.title} in ${cabinet.title} was created by the owner.`
                : `Your booking request for ${service.title} in ${cabinet.title} was sent.`,
            link: '/profile/bookings',
            metadata: {
                bookingId: newBooking.id,
            },
        })

        if (!isOwnerManualBooking) {
            addMockNotification({
                userId: cabinet.ownerId,
                category: 'booking',
                title: 'New booking request',
                message: `${client.name} requested ${service.title} in ${cabinet.title}.`,
                link: '/owner/bookings',
                metadata: {
                    bookingId: newBooking.id,
                },
            })
        }

        return HttpResponse.json(newBooking, {
            status: 201
        })
    }),

    http.get('/api/bookings/my', () => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            )
        }

        const clientBookings = mockBookings
            .filter((booking) => booking.clientId === mockSession.currentUserId)
            .map(toClientBooking)

        return HttpResponse.json(clientBookings)
    }),

    http.get('/api/bookings/:id/payment/status', ({ params, request }) => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        const booking = mockBookings.find(
            (item) => item.id === String(params.id) && item.clientId === mockSession.currentUserId,
        )
        if (!booking) {
            return HttpResponse.json({ message: 'Booking not found' }, { status: 404 })
        }

        const requestedTestStatus = request.headers.get('x-autocarehub-test-payment-status')

        return HttpResponse.json({
            status: requestedTestStatus === 'paid' ? 'paid' : null,
            grossAmount: requestedTestStatus === 'paid'
                ? mockServices.find((service) => service.id === booking.serviceId)?.price ?? null
                : null,
            refundedAmountMinor: 0,
            remainingAmountMinor: requestedTestStatus === 'paid'
                ? (mockServices.find((service) => service.id === booking.serviceId)?.price ?? 0) * 100
                : null,
            currency: requestedTestStatus === 'paid' ? 'rub' : null,
            createdAt: null,
            invoice: requestedTestStatus === 'paid'
                ? {
                    invoiceId: `inv_${booking.id}`,
                    amount: mockServices.find((service) => service.id === booking.serviceId)?.price ?? 0,
                    currency: 'rub',
                    status: 'paid',
                    issuedAt: new Date().toISOString(),
                }
                : null,
            attempts: [],
        })
    }),

    http.get('/api/bookings/:id/history', ({ params }) => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        const booking = mockBookings.find((item) => item.id === String(params.id))
        if (!booking) {
            return HttpResponse.json({ message: 'Booking not found' }, { status: 404 })
        }

        const cabinet = mockCabinets.find((item) => item.id === booking.cabinetId)
        if (booking.clientId !== mockSession.currentUserId && cabinet?.ownerId !== mockSession.currentUserId) {
            return HttpResponse.json({ message: 'Booking not found' }, { status: 404 })
        }

        return HttpResponse.json([
            {
                id: `${booking.id}-status`,
                status: booking.status,
                changedById: booking.clientId,
                reason: booking.cancellationReason ?? null,
                createdAt: booking.createdAt,
            },
        ])
    }),

    http.patch('/api/bookings/:id/status', async ({ params, request }) => {
        const bookingId = String(params.id)

        const body = await request.json() as {
            status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
        }

        const booking = mockBookings.find((item) => item.id === bookingId)

        if (!booking) {
            return HttpResponse.json(
                { message: 'Booking not found' },
                { status: 404 }
            )
        }

        const cabinet = mockCabinets.find(
            (item) =>
                item.id === booking.cabinetId &&
                item.ownerId === mockSession.currentUserId
        )

        if (!cabinet) {
            return HttpResponse.json(
                { message: 'Booking not found' },
                { status: 404 }
            )
        }

        booking.status = body.status
        addMockNotification({
            userId: booking.clientId,
            category: 'booking',
            title: 'Booking status updated',
            message: `Your booking status changed to ${body.status}.`,
            link: '/profile/bookings',
            metadata: {
                bookingId: booking.id,
                status: body.status,
            },
        })

        return HttpResponse.json(booking)
    }),

    http.patch('/api/bookings/:id/cancel', ({ params }) => {
        const bookingId = String(params.id)

        if (!mockSession.currentUserId) {
            return HttpResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            )
        }

        const booking = mockBookings.find(
            (item) =>
                item.id === bookingId &&
                item.clientId === mockSession.currentUserId
        )

        if (!booking) {
            return HttpResponse.json(
                { message: 'Booking not found' },
                { status: 404 }
            )
        }

        if (booking.status !== 'pending' && booking.status !== 'confirmed') {
            return HttpResponse.json(
                { message: 'Booking cannot be cancelled' },
                { status: 400 }
            )
        }

        booking.status = 'cancelled'
        addMockNotification({
            userId: booking.clientId,
            category: 'booking',
            title: 'Booking cancelled',
            message: 'Your booking was cancelled.',
            link: '/profile/bookings',
            metadata: {
                bookingId: booking.id,
            },
        })

        return HttpResponse.json(booking)
    }),

    http.post('/api/auth/google/mock', () => {
        const user = mockUsers.find(
            (user) => user.provider === 'google'
        )

        if (!user) {
            return HttpResponse.json(
                { message: 'Google mock user not found' },
                { status: 404 }
            )
        }

        if (user.status === 'blocked') {
            return HttpResponse.json(
                { message: 'User is blocked' },
                { status: 403 }
            )
        }

        setMockSession({
            currentUserId: user.id,
            currentRole: user.role,
        })

        return HttpResponse.json(user)
    }),

    http.post('/api/auth/yandex/mock', () => {
        const user = mockUsers.find(
            (user) => user.provider === 'yandex'
        )

        if (!user) {
            return HttpResponse.json(
                { message: 'Yandex mock user not found' },
                { status: 404 }
            )
        }

        if (user.status === 'blocked') {
            return HttpResponse.json(
                { message: 'User is blocked' },
                { status: 403 }
            )
        }

        setMockSession({
            currentUserId: user.id,
            currentRole: user.role,
        })

        return HttpResponse.json(user)
    }),

    http.patch('/api/users/me/preferences', async ({ request }) => {
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
    }),

    http.get('/api/users/me/export', () => {
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
            integrity: {
                algorithm: 'sha256',
                checksum: 'mock-export-checksum',
            },
        })
    }),

    http.get('/api/users/me/deletion-request', () => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        const request = mockAccountDeletionRequests.get(mockSession.currentUserId)

        return HttpResponse.json(request?.status === 'pending' ? request : null)
    }),

    http.post('/api/users/me/deletion-request', async ({ request }) => {
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
    }),

    http.delete('/api/users/me/deletion-request', () => {
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
    }),

    http.patch('/api/admin/users/:id/role', async ({ params, request }) => {
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
    }),

]
