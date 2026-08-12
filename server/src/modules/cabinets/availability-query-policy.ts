export const MAX_AVAILABLE_TODAY_CANDIDATES = 1_000
export const MAX_AVAILABILITY_SERVICES = 2_000
export const MAX_AVAILABILITY_BOOKINGS = 10_000
export const MAX_AVAILABILITY_SCHEDULES = 500

export function getAvailabilityQueryLimits() {
    return {
        candidates: MAX_AVAILABLE_TODAY_CANDIDATES,
        services: MAX_AVAILABILITY_SERVICES,
        bookings: MAX_AVAILABILITY_BOOKINGS,
        schedules: MAX_AVAILABILITY_SCHEDULES,
    }
}
