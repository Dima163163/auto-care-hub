import { z } from 'zod'

type BookingTimeValidationMessages = {
    dateRequired: string
    startTimeRequired: string
    endTimeRequired: string
    endTimeAfterStart: string
}

type ClientBookingValidationMessages = BookingTimeValidationMessages & {
    serviceRequired: string
}

type OwnerBookingValidationMessages = ClientBookingValidationMessages & {
    clientRequired: string
    cabinetRequired: string
}

const createBookingTimeSchema = (messages: BookingTimeValidationMessages) =>
    z
        .object({
            date: z.string().min(1, messages.dateRequired),
            startTime: z.string().min(1, messages.startTimeRequired),
            endTime: z.string().min(1, messages.endTimeRequired),
            comment: z.string().optional(),
        })
        .refine(
            (values) =>
                !values.startTime ||
                !values.endTime ||
                values.endTime > values.startTime,
            {
                message: messages.endTimeAfterStart,
                path: ['endTime'],
            },
        )

export const createClientBookingSchema = (
    messages: ClientBookingValidationMessages,
) =>
    createBookingTimeSchema(messages).and(
        z.object({
            serviceId: z.string().min(1, messages.serviceRequired),
        }),
    )

export const createOwnerBookingSchema = (
    messages: OwnerBookingValidationMessages,
) =>
    createBookingTimeSchema(messages).and(
        z.object({
            clientId: z.string().min(1, messages.clientRequired),
            cabinetId: z.string().min(1, messages.cabinetRequired),
            serviceId: z.string().min(1, messages.serviceRequired),
        }),
    )

export type CreateClientBookingFormValues = z.infer<
    ReturnType<typeof createClientBookingSchema>
>

export type CreateOwnerBookingFormValues = z.infer<
    ReturnType<typeof createOwnerBookingSchema>
>
