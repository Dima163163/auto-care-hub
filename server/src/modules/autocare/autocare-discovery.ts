import type { AutomotiveMarketEntity, AutomotiveServiceLocationEntity } from '../../entities/index.js'
import { getScheduleForDate, isValidTimeZone, localDateTimeParts } from './availability.js'

type DiscoverySlot = {
    availableToday: boolean
    nextSlot: string | null
}

function toMinutes(value: string) {
    const match = /^(\d{1,2}):(\d{2})$/.exec(value)
    if (!match) return null
    const hour = Number(match[1])
    const minute = Number(match[2])
    if (hour > 23 || minute > 59) return null
    return hour * 60 + minute
}

export function getDiscoverySlot(
    location: Pick<AutomotiveServiceLocationEntity, 'timezone' | 'hours' | 'weeklySchedule'>,
    market: Pick<AutomotiveMarketEntity, 'timezone'> | null,
    now = new Date(),
): DiscoverySlot {
    const timezone = [location.timezone, market?.timezone, 'UTC'].find((value) => Boolean(value && isValidTimeZone(value))) ?? 'UTC'
    const local = localDateTimeParts(now, timezone)
    const schedule = getScheduleForDate(local.date, location.hours, location.weeklySchedule)
    const closeMinutes = toMinutes(schedule.close)

    if (schedule.closed || closeMinutes === null || local.minutes > closeMinutes) {
        return { availableToday: false, nextSlot: null }
    }

    return { availableToday: true, nextSlot: `Today, ${schedule.open}` }
}
