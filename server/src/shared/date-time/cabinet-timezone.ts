type ZonedDateTime = {
    date: string
    minutes: number
}

export function isValidTimeZone(timeZone: string) {
    try {
        new Intl.DateTimeFormat('en-US', { timeZone }).format()
        return true
    } catch {
        return false
    }
}

export function getZonedDateTime(
    timeZone: string,
    instant = new Date(),
): ZonedDateTime {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(instant)
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))

    return {
        date: `${values.year}-${values.month}-${values.day}`,
        minutes: Number(values.hour) * 60 + Number(values.minute),
    }
}

export function addDays(date: string, days: number) {
    const value = new Date(`${date}T00:00:00Z`)
    value.setUTCDate(value.getUTCDate() + days)
    return value.toISOString().slice(0, 10)
}

export function getWeekday(date: string) {
    return new Date(`${date}T00:00:00Z`).getUTCDay()
}

export function zonedDateTimeToInstant(date: string, time: string, timeZone: string) {
    const [year = 0, month = 1, day = 1] = date.split('-').map(Number)
    const [hours = 0, minutes = 0] = time.split(':').map(Number)
    const targetUtc = Date.UTC(year, month - 1, day, hours, minutes)
    let candidate = new Date(targetUtc)

    for (let attempt = 0; attempt < 2; attempt += 1) {
        const zoned = getZonedDateTime(timeZone, candidate)
        const [zonedYear = 0, zonedMonth = 1, zonedDay = 1] = zoned.date.split('-').map(Number)
        const zonedUtc = Date.UTC(
            zonedYear,
            zonedMonth - 1,
            zonedDay,
            Math.floor(zoned.minutes / 60),
            zoned.minutes % 60,
        )
        candidate = new Date(candidate.getTime() + targetUtc - zonedUtc)
    }

    return candidate
}
