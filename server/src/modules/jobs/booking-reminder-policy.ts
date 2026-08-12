export const DEFAULT_BOOKING_REMINDER_HOURS = 24
export const MAX_BOOKING_REMINDER_HOURS = 168

export function normalizeBookingReminderHours(value: number) {
    if (!Number.isInteger(value) || value < 1 || value > MAX_BOOKING_REMINDER_HOURS) {
        throw new Error(
            `Booking reminder hours must be an integer between 1 and ${MAX_BOOKING_REMINDER_HOURS}.`,
        )
    }

    return value
}

export function getBookingReminderWindowMs(hours: number) {
    return normalizeBookingReminderHours(hours) * 60 * 60 * 1000
}

export function getBookingReminderDateRangeDays(hours: number) {
    return Math.ceil(normalizeBookingReminderHours(hours) / 24) + 1
}
