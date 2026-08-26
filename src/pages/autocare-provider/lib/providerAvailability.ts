import type { ProviderProfile, ProviderScheduleDay } from '@/entities/automotive-service'

const weekdayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

function getDateParts(date: Date, timezone?: string) {
    try {
        const values = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).formatToParts(date).map(({ type, value }) => [type, value]))
        return { year: Number(values.year), month: Number(values.month), day: Number(values.day) }
    } catch {
        return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() }
    }
}

export function getProviderDateInputValue(offset = 0, timezone?: string) {
    const parts = getDateParts(new Date(), timezone)
    return new Date(Date.UTC(parts.year, parts.month - 1, parts.day + offset)).toISOString().slice(0, 10)
}

function getWeekdayKey(date: string) {
    const instant = new Date(`${date}T12:00:00Z`)
    if (Number.isNaN(instant.getTime())) return null
    return weekdayKeys[instant.getUTCDay()]
}

export function isProviderDateAvailable(date: string, provider: Pick<ProviderProfile, 'weeklySchedule' | 'blackoutDates'>) {
    if (provider.blackoutDates?.includes(date)) return false
    const weekday = getWeekdayKey(date)
    if (!weekday) return false
    const schedule = provider.weeklySchedule?.[weekday] as ProviderScheduleDay | undefined
    return !schedule?.closed
}

export function getProviderContactPresentation(provider: Pick<ProviderProfile, 'communicationMode' | 'chatEnabled'>) {
    const communicationMode = provider.communicationMode ?? 'online'
    return {
        communicationMode,
        usesOnlineSlots: communicationMode === 'online',
        allowsRequest: communicationMode !== 'phone_only',
        requiresPhone: communicationMode === 'phone_only' || communicationMode === 'request_then_confirm',
        showChat: communicationMode !== 'phone_only' && provider.chatEnabled !== false,
    } as const
}
