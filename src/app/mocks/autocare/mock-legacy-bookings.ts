import { mockBookings, mockCabinets, mockServices, mockUsers } from ".././data"

export function toClientBooking(booking: typeof mockBookings[number]) {
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

export function toOwnerBooking(booking: typeof mockBookings[number]) {
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
    }
}
