const REQUEST_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const MIN_REQUEST_YEAR = 2000
const MAX_REQUEST_YEAR = 2100

function dateParts(value: string) {
    const match = REQUEST_DATE_PATTERN.exec(value)
    if (!match) return null

    const [, yearValue, monthValue, dayValue] = match
    const year = Number(yearValue)
    const month = Number(monthValue)
    const day = Number(dayValue)
    if (year < MIN_REQUEST_YEAR || year > MAX_REQUEST_YEAR) return null

    const timestamp = Date.parse(`${value}T00:00:00.000Z`)
    if (!Number.isFinite(timestamp)) return null

    const date = new Date(timestamp)
    return date.toISOString().slice(0, 10) === value ? { year, month, day } : null
}

export function parseRequestDate(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const normalized = value.normalize('NFKC').trim()
    return dateParts(normalized) ? normalized : null
}

function isValidTimeZone(timeZone: string | undefined): timeZone is string {
    if (!timeZone) return false

    try {
        new Intl.DateTimeFormat('en-US', { timeZone }).format()
        return true
    } catch {
        return false
    }
}

function formatCalendarDate(value: Date, timeZone?: string) {
    const parts = new Intl.DateTimeFormat('en-US', {
        day: '2-digit',
        month: '2-digit',
        timeZone: isValidTimeZone(timeZone) ? timeZone : 'UTC',
        year: 'numeric',
    }).formatToParts(value)
    const values = Object.fromEntries(parts.filter(({ type }) => type !== 'literal').map(({ type, value: partValue }) => [type, partValue]))
    return `${values.year}-${values.month}-${values.day}`
}

export function getRequestDateInputValue(offset: number, timeZone?: string, now = new Date()) {
    const baseDate = formatCalendarDate(now, timeZone)
    const timestamp = Date.parse(`${baseDate}T12:00:00.000Z`)
    if (!Number.isFinite(timestamp)) return baseDate

    const date = new Date(timestamp)
    date.setUTCDate(date.getUTCDate() + offset)
    return date.toISOString().slice(0, 10)
}

export function formatRequestDate(value: string, locale: string) {
    const normalized = parseRequestDate(value)
    if (!normalized) return ''

    return new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
    }).format(new Date(`${normalized}T12:00:00.000Z`))
}

export function formatRequestLongDate(value: string, locale: string) {
    const normalized = parseRequestDate(value)
    if (!normalized) return ''

    return new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'long',
        timeZone: 'UTC',
    }).format(new Date(`${normalized}T12:00:00.000Z`))
}
