import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'

function parseBookingTime(value: string, label: string) {
    const match = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/.exec(value)
    if (!match) {
        throw new AppError({
            statusCode: 400,
            code: ERROR_CODES.ValidationError,
            message: `Booking ${label} format is invalid.`,
        })
    }

    const hours = Number(match[1])
    const minutes = Number(match[2])
    const seconds = Number(match[3] ?? '0')

    if (hours > 23 || minutes > 59 || seconds > 59) {
        throw new AppError({
            statusCode: 400,
            code: ERROR_CODES.ValidationError,
            message: `Booking ${label} range is invalid.`,
        })
    }

    return hours * 60 + minutes + seconds / 60
}

export function assertBookingTimeRange(startTime: string, endTime: string) {
    const startMinutes = parseBookingTime(startTime, 'start time')
    const endMinutes = parseBookingTime(endTime, 'end time')

    if (startMinutes > 1_439 || endMinutes < 1 || endMinutes > 1_440 || endMinutes <= startMinutes) {
        throw new AppError({
            statusCode: 400,
            code: ERROR_CODES.ValidationError,
            message: 'Booking time range is invalid.',
        })
    }

    return { startMinutes, endMinutes }
}
