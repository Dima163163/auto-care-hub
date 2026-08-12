import { BookingStatus } from '../../entities/booking/booking.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'

type BookAgainSourceInput = {
    experiment?: 'book_again'
    sourceBookingId?: string
    sourceStatus?: BookingStatus
    sourceCabinetId?: string
    sourceServiceId?: string
    cabinetId: string
    serviceId: string
}

export function assertBookAgainSource(input: BookAgainSourceInput) {
    const hasSource = input.sourceBookingId !== undefined

    if (input.experiment !== 'book_again' && hasSource) {
        throw new AppError({
            statusCode: 400,
            code: ERROR_CODES.BadRequest,
            message: 'A booking source is only valid for the Book again experiment.',
        })
    }

    if (input.experiment !== 'book_again') return

    const isAllowedStatus = input.sourceStatus === BookingStatus.Completed ||
        input.sourceStatus === BookingStatus.Cancelled
    const isSameCabinetAndService = input.sourceCabinetId === input.cabinetId &&
        input.sourceServiceId === input.serviceId

    if (!hasSource || !isAllowedStatus || !isSameCabinetAndService) {
        throw new AppError({
            statusCode: 409,
            code: ERROR_CODES.Conflict,
            message: 'The previous booking is no longer eligible for Book again.',
        })
    }
}
