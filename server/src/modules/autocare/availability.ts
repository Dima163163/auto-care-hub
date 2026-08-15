type ScheduleDay = { open: string; close: string; closed: boolean }

const weekdayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

function partsFor(instant: Date, timezone: string) {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(instant)
    return Object.fromEntries(parts.filter(({ type }) => type !== 'literal').map(({ type, value }) => [type, Number(value)])) as Record<'year' | 'month' | 'day' | 'hour' | 'minute', number>
}

export function isValidTimeZone(timezone: string) {
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format()
        return true
    } catch {
        return false
    }
}

function timezoneOffsetMs(instant: Date, timezone: string) {
    const parts = partsFor(instant, timezone)
    const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, instant.getUTCSeconds(), instant.getUTCMilliseconds())
    return asUtc - instant.getTime()
}

export function zonedWallTimeToUtc(date: string, clock: string, timezone: string) {
    const wallTime = Date.parse(`${date}T${clock}:00.000Z`)
    if (!Number.isFinite(wallTime)) return null
    let estimate = new Date(wallTime)
    for (let iteration = 0; iteration < 3; iteration += 1) estimate = new Date(wallTime - timezoneOffsetMs(estimate, timezone))
    return estimate
}

export function localDateRangeToUtc(date: string, timezone: string) {
    const start = zonedWallTimeToUtc(date, '00:00', timezone)
    const nextDate = new Date(`${date}T12:00:00.000Z`)
    if (!start || Number.isNaN(nextDate.getTime())) return null
    nextDate.setUTCDate(nextDate.getUTCDate() + 1)
    const next = zonedWallTimeToUtc(nextDate.toISOString().slice(0, 10), '00:00', timezone)
    return next ? { start, end: new Date(next.getTime() - 1) } : null
}

export function localDateTimeParts(instant: Date, timezone: string) {
    const parts = partsFor(instant, timezone)
    return { date: `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`, minutes: parts.hour * 60 + parts.minute }
}

export function weekdayFor(date: string) {
    const instant = new Date(`${date}T12:00:00.000Z`)
    return Number.isNaN(instant.getTime()) ? null : weekdayKeys[instant.getUTCDay()]
}

export function legacySchedule(hours: string): ScheduleDay {
    const match = /(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/.exec(hours)
    if (!match) return { open: '08:00', close: '21:00', closed: false }
    const [, openHour = '08', openMinute = '00', closeHour = '21', closeMinute = '00'] = match
    return { open: `${openHour.padStart(2, '0')}:${openMinute}`, close: `${closeHour.padStart(2, '0')}:${closeMinute}`, closed: false }
}

export function getScheduleForDate(date: string, hours: string, weeklySchedule: Record<string, ScheduleDay> | null | undefined) {
    const weekday = weekdayFor(date)
    const configured = weekday ? weeklySchedule?.[weekday] : undefined
    return configured ?? legacySchedule(hours)
}
