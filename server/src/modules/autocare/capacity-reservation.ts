export type CapacityReservation = {
    startsAtMinutes: number
    durationMinutes: number
}

export function normalizeAppointmentCapacity(value: number | null | undefined) {
    return Number.isInteger(value) && value && value > 0 ? value : 1
}

export function countOverlappingCapacityReservations(
    candidate: CapacityReservation,
    reservations: readonly CapacityReservation[],
) {
    const candidateEnd = candidate.startsAtMinutes + candidate.durationMinutes

    return reservations.filter((reservation) => {
        const reservationEnd = reservation.startsAtMinutes + reservation.durationMinutes
        return candidate.startsAtMinutes < reservationEnd && candidateEnd > reservation.startsAtMinutes
    }).length
}

export function hasAvailableAppointmentCapacity(input: {
    capacity: number | null | undefined
    candidate: CapacityReservation
    reservations: readonly CapacityReservation[]
}) {
    return countOverlappingCapacityReservations(input.candidate, input.reservations)
        < normalizeAppointmentCapacity(input.capacity)
}
