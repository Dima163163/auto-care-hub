import { z } from 'zod'

import { CabinetBlockedPeriodKind } from '../../entities/cabinet/cabinet-blocked-period.entity.js'

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)
const calendarDateSchema = z.string().date()

const scheduleItemSchema = z.object({
    weekday: z.number().int().min(0).max(6),
    openTime: timeSchema,
    closeTime: timeSchema,
    isOpen: z.boolean(),
}).refine((item) => !item.isOpen || item.openTime < item.closeTime, {
    message: 'Open time must be before close time.',
})

export const scheduleSchema = z.object({ items: z.array(scheduleItemSchema).length(7) }).refine(
    (value) => new Set(value.items.map((item) => item.weekday)).size === value.items.length,
    {
        message: 'Provide exactly one schedule entry per weekday.',
        path: ['items'],
    },
)

const exceptionSchema = z.object({
    date: calendarDateSchema,
    openTime: timeSchema.nullable(),
    closeTime: timeSchema.nullable(),
    isClosed: z.boolean(),
}).refine((item) => item.isClosed || Boolean(item.openTime && item.closeTime && item.openTime < item.closeTime), {
    message: 'Provide valid hours or mark the date as closed.',
})

export const exceptionsSchema = z.object({ items: z.array(exceptionSchema).max(200) }).refine(
    (value) => new Set(value.items.map((item) => item.date)).size === value.items.length,
    {
        message: 'Provide at most one exception per date.',
        path: ['items'],
    },
)

const blockedPeriodSchema = z.object({
    date: calendarDateSchema,
    startTime: timeSchema.nullable(),
    endTime: timeSchema.nullable(),
    kind: z.enum(CabinetBlockedPeriodKind),
    reason: z.string().trim().max(160).nullable(),
}).refine((item) => {
    const isAllDay = item.startTime === null && item.endTime === null
    const isValidRange = item.startTime !== null && item.endTime !== null && item.startTime < item.endTime
    return (isAllDay || isValidRange) &&
        (item.kind !== CabinetBlockedPeriodKind.Holiday || isAllDay)
}, {
    message: 'Provide a valid blocked interval; holidays must cover the full day.',
})

export const blockedPeriodsSchema = z.object({ items: z.array(blockedPeriodSchema).max(200) })
