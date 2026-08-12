import { z } from 'zod'

import type {
    CabinetBlockedPeriod,
    CabinetScheduleException,
    CabinetScheduleItem,
} from '../api/cabinetsApi'

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const scheduleItemSchema = z.object({
    weekday: z.number().int().min(0).max(6),
    openTime: timeSchema,
    closeTime: timeSchema,
    isOpen: z.boolean(),
}).refine((item) => !item.isOpen || item.openTime < item.closeTime)

const scheduleResponseSchema = z.object({
    items: z.array(scheduleItemSchema).length(7),
}) satisfies z.ZodType<{ items: CabinetScheduleItem[] }>

const scheduleExceptionSchema = z.object({
    date: dateSchema,
    openTime: timeSchema.nullable(),
    closeTime: timeSchema.nullable(),
    isClosed: z.boolean(),
}).refine((item) => item.isClosed || (
    item.openTime !== null
    && item.closeTime !== null
    && item.openTime < item.closeTime
))

const scheduleExceptionsResponseSchema = z.object({
    items: z.array(scheduleExceptionSchema).max(200),
}) satisfies z.ZodType<{ items: CabinetScheduleException[] }>

const blockedPeriodSchema = z.object({
    id: z.string().optional(),
    date: dateSchema,
    startTime: timeSchema.nullable(),
    endTime: timeSchema.nullable(),
    kind: z.enum(['blocked', 'holiday']),
    reason: z.string().nullable(),
}).refine((item) => {
    const isAllDay = item.startTime === null && item.endTime === null
    const isValidRange = item.startTime !== null
        && item.endTime !== null
        && item.startTime < item.endTime
    return (isAllDay || isValidRange) && (item.kind !== 'holiday' || isAllDay)
})

const blockedPeriodsResponseSchema = z.object({
    items: z.array(blockedPeriodSchema).max(200),
}) satisfies z.ZodType<{ items: CabinetBlockedPeriod[] }>

export function normalizeCabinetScheduleResponse(value: unknown) {
    return scheduleResponseSchema.parse(value)
}

export function normalizeCabinetScheduleExceptionsResponse(value: unknown) {
    return scheduleExceptionsResponseSchema.parse(value)
}

export function normalizeCabinetBlockedPeriodsResponse(value: unknown) {
    return blockedPeriodsResponseSchema.parse(value)
}
