import { http, HttpResponse } from "msw"
import { mockBookings, mockCabinets, mockServices, mockUsers } from ".././data"
import { mockSession } from ".././session"
import { parseMockJson } from ".././parseMockJson"
import { currentMockUser } from './mock-access'
import { bookingRequestSchema } from './mock-fixtures'
import { toClientBooking, toOwnerBooking } from './mock-legacy-bookings'
import { addMockNotification } from './mock-notifications'
import { invalidMockBodyResponse } from './mock-validation'

export const legacyBookingsHandlers = [
{ order: 191, handler: http.get('/api/bookings/occupied', ({ request }) => {
        const url = new URL(request.url)
        const cabinetId = url.searchParams.get('cabinetId')
        const date = url.searchParams.get('date')
        const user = currentMockUser()

        if (!user) {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        if (user.role !== 'client' && user.role !== 'owner') {
            return HttpResponse.json({ message: 'Only clients and cabinet owners can view occupied slots.' }, { status: 403 })
        }

        if (!date) {
            return HttpResponse.json(
                { message: 'Cabinet and date are required' },
                { status: 400 },
            )
        }

        const cabinet = mockCabinets.find((item) => item.id === cabinetId && item.status === 'active')
        if (!cabinet || (user.role === 'owner' && cabinet.ownerId !== user.id)) {
            return HttpResponse.json({ message: 'Cabinet not found' }, { status: 404 })
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
    }) },
{ order: 192, handler: http.get('/api/owner/bookings', () => {
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
    }) },
{ order: 193, handler: http.get('/api/owner/bookings/reschedule-requests', () => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)

        if (!currentUser) {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        if (currentUser.role !== 'owner') {
            return HttpResponse.json({ message: 'Only owners can use this booking endpoint.' }, { status: 403 })
        }

        return HttpResponse.json([])
    }) },
{ order: 194, handler: http.post('/api/owner/bookings', async ({ request }) => {
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
    }) },
{ order: 227, handler: http.post('/api/bookings', async ({ request }) => {
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
    }) },
{ order: 228, handler: http.get('/api/bookings/my', () => {
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
    }) },
{ order: 229, handler: http.get('/api/bookings/:id/history', ({ params }) => {
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
    }) },
{ order: 230, handler: http.patch('/api/bookings/:id/status', async ({ params, request }) => {
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
    }) },
{ order: 231, handler: http.patch('/api/bookings/:id/cancel', ({ params }) => {
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
    }) }
]
