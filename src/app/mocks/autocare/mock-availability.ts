import { type AutoCareApiProvider } from "@/entities/automotive-service"
import { mockBookings, mockServices } from ".././data"
import { mockAutoCareServiceRequests } from './mock-fixtures'

function mockZonedWallTimeToIso(date: string, time: string, timezone: string) {
    const wallTime = Date.parse(`${date}T${time}:00.000Z`)
    if (!Number.isFinite(wallTime)) return null

    let estimate = new Date(wallTime)
    for (let iteration = 0; iteration < 3; iteration += 1) {
        const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(estimate)
        const values = Object.fromEntries(parts.filter(({ type }) => type !== 'literal').map(({ type, value }) => [type, Number(value)])) as Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', number>
        const asUtc = Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute, values.second)
        estimate = new Date(wallTime - (asUtc - estimate.getTime()))
    }

    return estimate.toISOString()
}

export function getMockZonedDateTimeParts(instant: Date, timezone: string) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(instant)
    const values = Object.fromEntries(parts.filter(({ type }) => type !== 'literal').map(({ type, value }) => [type, value]))
    return {
        date: `${values.year}-${values.month}-${values.day}`,
        time: `${values.hour}:${values.minute}`,
    }
}

function addMockCalendarDays(date: string, days: number) {
    const next = new Date(`${date}T12:00:00.000Z`)
    next.setUTCDate(next.getUTCDate() + days)
    return next.toISOString().slice(0, 10)
}

export function getMockProviderAvailabilitySlots(provider: AutoCareApiProvider, date: string, now = Date.now(), durationMinutes = 60) {
    const timezone = provider.location.timezone ?? 'UTC'
    if (provider.location.blackoutDates?.includes(date)) return []

    const weekday = new Date(`${date}T12:00:00.000Z`).getUTCDay()
    const weekdayKey = (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const)[weekday]
    const schedule = provider.location.weeklySchedule?.[weekdayKey]
    if (!schedule || schedule.closed) return []

    const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))
    const openMinutes = toMinutes(schedule.open)
    const closeMinutes = toMinutes(schedule.close)
    const reserved = new Set(mockAutoCareServiceRequests
        .filter((request) => request.providerId === provider.id && request.locationId === provider.location.id && request.status !== 'declined' && request.status !== 'closed' && request.preferredAt)
        .map((request) => getMockZonedDateTimeParts(new Date(request.preferredAt!), timezone))
        .filter((parts) => parts.date === date)
        .map((parts) => parts.time))
    const slots: Array<{ startTime: string; endTime: string; startsAt: string }> = []

    for (let start = openMinutes; start + durationMinutes <= closeMinutes; start += 30) {
        const startTime = `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`
        if (reserved.has(startTime)) continue
        const startsAt = mockZonedWallTimeToIso(date, startTime, timezone)
        if (!startsAt || Date.parse(startsAt) <= now) continue
        const end = start + durationMinutes
        slots.push({
            startTime,
            endTime: `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`,
            startsAt,
        })
    }

    return slots
}

export function getMockNextProviderSlot(provider: AutoCareApiProvider, now = Date.now()) {
    const timezone = provider.location.timezone ?? 'UTC'
    const today = getMockZonedDateTimeParts(new Date(now), timezone).date
    for (let offset = 0; offset <= 1; offset += 1) {
        const date = addMockCalendarDays(today, offset)
        const firstAvailable = getMockProviderAvailabilitySlots(provider, date, now)[0]
        if (firstAvailable) return `${offset === 0 ? 'Today' : 'Tomorrow'}, ${firstAvailable.startTime}`
    }

    return null
}

export function getMockAvailabilityPreview(
    cabinetId: string,
    options?: { date?: string; durationMinutes?: number },
) {
    const durations = mockServices
        .filter((service) => service.cabinetId === cabinetId && service.isActive)
        .map((service) => service.durationMinutes)
    const durationMinutes = options?.durationMinutes ?? Math.min(...durations)

    if (!Number.isFinite(durationMinutes)) {
        return null
    }

    const now = new Date()
    const today = new Date()
    const todayString = today.toISOString().slice(0, 10)
    const dateString = options?.date ?? todayString
    const isPastDate = dateString < todayString
    let firstSlot: { date: string; startTime: string; endTime: string } | null = null
    let freeSlots = 0
    const slots: Array<{ startTime: string; endTime: string }> = []

    const occupied = mockBookings
            .filter((booking) =>
                booking.cabinetId === cabinetId &&
                booking.date === dateString &&
                (booking.status === 'pending' || booking.status === 'confirmed')
            )
            .map((booking) => ({ start: booking.startTime, end: booking.endTime }))

    for (let start = 8 * 60; start + durationMinutes <= 22 * 60; start += 30) {
            const startTime = `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`
            const end = start + durationMinutes
            const endTime = `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`
            const isPast = isPastDate || (dateString === todayString && start <= now.getHours() * 60 + now.getMinutes())
            const isOccupied = occupied.some((slot) => startTime < slot.end && endTime > slot.start)

            if (!isPast && !isOccupied) {
                freeSlots += 1
                if (slots.length < 4) {
                    slots.push({ startTime, endTime })
                }
                firstSlot ??= { date: dateString, startTime, endTime }
            }
    }

    return firstSlot ? { ...firstSlot, freeSlots, slots } : null
}
