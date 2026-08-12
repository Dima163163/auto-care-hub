import { describe, expect, it } from 'vitest'

import {
    createClientBookingSchema,
    createOwnerBookingSchema,
} from './bookingFormValidation'

const messages = {
    clientRequired: 'Client is required.',
    cabinetRequired: 'Cabinet is required.',
    serviceRequired: 'Service is required.',
    dateRequired: 'Date is required.',
    startTimeRequired: 'Start time is required.',
    endTimeRequired: 'End time is required.',
    endTimeAfterStart: 'End time must be after start time.',
}

describe('booking form validation', () => {
    it('requires client booking fields', () => {
        const result = createClientBookingSchema(messages).safeParse({
            serviceId: '',
            date: '',
            startTime: '',
            endTime: '',
            comment: '',
        })

        expect(result.success).toBe(false)

        if (!result.success) {
            expect(result.error.flatten().fieldErrors).toMatchObject({
                serviceId: [messages.serviceRequired],
                date: [messages.dateRequired],
                startTime: [messages.startTimeRequired],
                endTime: [messages.endTimeRequired],
            })
        }
    })

    it('requires owner booking relation fields', () => {
        const result = createOwnerBookingSchema(messages).safeParse({
            clientId: '',
            cabinetId: '',
            serviceId: '',
            date: '2026-05-23',
            startTime: '10:00',
            endTime: '11:00',
            comment: '',
        })

        expect(result.success).toBe(false)

        if (!result.success) {
            expect(result.error.flatten().fieldErrors).toMatchObject({
                clientId: [messages.clientRequired],
                cabinetId: [messages.cabinetRequired],
                serviceId: [messages.serviceRequired],
            })
        }
    })

    it('requires end time to be after start time', () => {
        const result = createClientBookingSchema(messages).safeParse({
            serviceId: 'service-1',
            date: '2026-05-23',
            startTime: '12:00',
            endTime: '11:00',
            comment: '',
        })

        expect(result.success).toBe(false)

        if (!result.success) {
            expect(result.error.flatten().fieldErrors.endTime).toEqual([
                messages.endTimeAfterStart,
            ])
        }
    })
})
