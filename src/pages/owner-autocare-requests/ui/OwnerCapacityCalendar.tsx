import { CalendarDays, UsersRound } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

import { useGetOwnerAutoCareProvidersQuery } from '@/entities/automotive-service'
import type { AutoCareServiceRequest } from '@/entities/automotive-service'
import { formatDateTime } from '@/shared/lib/locale-format'
import { useTranslation } from '@/shared/lib/useTranslation'
import { Calendar } from '@/shared/ui/calendar'

type Props = { requests: AutoCareServiceRequest[]; onSelectRequest: (requestId: string) => void }

function localDayKey(date: Date) {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

function timeZoneDayKey(value: string, timeZone?: string) {
    const date = new Date(value)
    if (!Number.isFinite(date.getTime())) return null
    try {
        const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(date)
        const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value
        const year = part('year')
        const month = part('month')
        const day = part('day')
        return year && month && day ? `${Number(year)}-${Number(month)}-${Number(day)}` : localDayKey(date)
    } catch {
        return localDayKey(date)
    }
}

function formatInTimeZone(value: string, locale: string, options: Intl.DateTimeFormatOptions, timeZone?: string) {
    const date = new Date(value)
    if (!Number.isFinite(date.getTime())) return ''
    try {
        return formatDateTime(date, locale, { ...options, timeZone })
    } catch {
        return formatDateTime(date, locale, options)
    }
}

export function OwnerCapacityCalendar({ requests, onSelectRequest }: Props) {
    const [selectedDay, setSelectedDay] = useState<Date>(() => new Date())
    const { locale, t } = useTranslation()
    const providers = useGetOwnerAutoCareProvidersQuery()
    const scheduled = useMemo(() => requests.filter((request) => request.status === 'accepted' && request.preferredAt && Number.isFinite(new Date(request.preferredAt).getTime())), [requests])
    const branches = useMemo(() => (providers.data ?? []).flatMap((provider) => (provider.locations?.length ? provider.locations : [{ location: provider.location, offers: provider.offers ?? [] }]).map(({ location }) => ({ provider, location }))), [providers.data])
    const locationTimeZone = useCallback((locationId: string) => branches.find(({ location }) => location.id === locationId)?.location.timezone, [branches])
    const selectedDayKey = localDayKey(selectedDay)
    const datesWithBookings = useMemo(() => [...new Set(scheduled.map((request) => timeZoneDayKey(request.preferredAt!, locationTimeZone(request.locationId)) ?? ''))].filter(Boolean).map((key) => {
        const [year, month, day] = key.split('-').map(Number)
        return new Date(year, month - 1, day)
    }), [locationTimeZone, scheduled])
    const selected = scheduled.filter((request) => timeZoneDayKey(request.preferredAt!, locationTimeZone(request.locationId)) === selectedDayKey)
    const occupancyByLocation = new Map<string, AutoCareServiceRequest[]>()
    for (const request of selected) occupancyByLocation.set(request.locationId, [...(occupancyByLocation.get(request.locationId) ?? []), request])

    return <section data-testid="owner-capacity-calendar" className="mb-6 grid gap-4 rounded-[var(--radius-panel)] border border-border bg-card p-4 shadow-sm lg:grid-cols-[280px_minmax(0,1fr)]">
        <div>
            <div className="flex items-center gap-2"><CalendarDays className="size-4 text-primary" /><h2 className="text-base font-black text-foreground">{t('autocare.ownerCapacityCalendarTitle')}</h2></div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{t('autocare.ownerCapacityCalendarDescription')}</p>
            <Calendar mode="single" selected={selectedDay} onSelect={(day) => day && setSelectedDay(day)} modifiers={{ booked: datesWithBookings }} modifiersClassNames={{ booked: '[&>button]:bg-primary/10 [&>button]:font-black [&>button]:text-primary' }} />
        </div>
        <div className="rounded-[var(--radius-card)] bg-secondary/50 p-4">
            <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black text-foreground">{formatDateTime(selectedDay, locale, { dateStyle: 'full' })}</p><p className="mt-1 text-xs text-muted-foreground">{t('autocare.ownerCapacityCalendarConfirmedCount', { count: selected.length })}</p></div><UsersRound className="size-5 text-primary" /></div>
            {providers.isLoading ? <div className="mt-5 h-24 animate-pulse rounded-[var(--radius-card)] bg-card" aria-label={t('autocare.ownerCapacityCalendarLoadingBranches')} /> : providers.isError ? <div className="mt-5 rounded-[var(--radius-card)] border border-status-danger-border bg-status-danger-surface p-4 text-sm text-status-danger-foreground" role="alert">{t('autocare.ownerCapacityCalendarLoadError')}</div> : branches.length === 0 ? <p className="mt-5 rounded-[var(--radius-card)] bg-card p-4 text-sm text-muted-foreground">{t('autocare.ownerCapacityCalendarEmptyBranches')}</p> : <div className="mt-5 space-y-3">{branches.map(({ provider, location }) => { const branchRequests = occupancyByLocation.get(location.id) ?? []; const capacity = location.appointmentCapacity ?? 1; const isFull = branchRequests.length >= capacity; return <div key={location.id} className="rounded-[var(--radius-card)] bg-card p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-black text-foreground">{provider.name}</p><p className="mt-1 truncate text-xs text-muted-foreground">{location.address}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${isFull ? 'bg-status-warning-surface text-status-warning-foreground' : 'bg-status-success-surface text-status-success-foreground'}`}>{branchRequests.length} / {capacity}</span></div>{branchRequests.length === 0 ? <p className="mt-3 text-xs text-muted-foreground">{t('autocare.ownerCapacityCalendarNoConfirmed')}</p> : <div className="mt-3 grid gap-2 sm:grid-cols-2">{branchRequests.map((request) => <button key={request.id} type="button" onClick={() => onSelectRequest(request.id)} className="rounded-[var(--radius-control)] border border-border px-3 py-2 text-left text-xs font-semibold text-foreground transition-colors hover:border-primary">{formatInTimeZone(request.preferredAt!, locale, { timeStyle: 'short' }, location.timezone)} · {request.serviceLabels[locale] ?? request.serviceLabels.en ?? request.serviceSlug}</button>)}</div>}</div> })}</div>}
        </div>
    </section>
}
