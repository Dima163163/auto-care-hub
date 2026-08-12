import { describe, expect, it } from 'vitest'

import { BookingStatus } from '../../entities/booking/booking.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { assertBookAgainSource } from './book-again-policy.js'

const baseInput = {
    experiment: 'book_again' as const,
    sourceBookingId: 'source-booking',
    sourceStatus: BookingStatus.Completed,
    sourceCabinetId: 'cabinet-1',
    sourceServiceId: 'service-1',
    cabinetId: 'cabinet-1',
    serviceId: 'service-1',
}

describe('Book again source policy', () => {
    it('accepts only the same client-owned cabinet and service in a terminal status', () => {
        expect(() => assertBookAgainSource(baseInput)).not.toThrow()
        expect(() => assertBookAgainSource({ ...baseInput, sourceStatus: BookingStatus.Pending }))
            .toThrowError(AppError)
        expect(() => assertBookAgainSource({ ...baseInput, sourceCabinetId: 'cabinet-2' }))
            .toThrowError(AppError)
    })

    it('rejects missing or mismatched experiment source fields', () => {
        expect(() => assertBookAgainSource({
            ...baseInput,
            experiment: undefined,
            sourceBookingId: undefined,
        })).not.toThrow()
        expect(() => assertBookAgainSource({ ...baseInput, sourceBookingId: undefined }))
            .toThrowError(AppError)
        expect(() => assertBookAgainSource({
            ...baseInput,
            experiment: undefined,
        })).toThrowError(AppError)
    })
})
