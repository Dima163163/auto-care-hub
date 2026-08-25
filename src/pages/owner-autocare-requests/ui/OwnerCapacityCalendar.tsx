import { useMemo, useState } from 'react'
import { CalendarDays, UsersRound } from 'lucide-react'

import { useGetOwnerAutoCareProvidersQuery, type AutoCareServiceRequest } from '@/entities/automotive-service'
import { Calendar } from '@/shared/ui/calendar'

type Props = { requests: AutoCareServiceRequest[]; locale: string }

function dayKey(value: Date | string) {
    const date = typeof value === 'string' ? new Date(value) : value
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

export function OwnerCapacityCalendar({ requests, locale }: Props) {
    const [selectedDay, setSelectedDay] = useState<Date>(() => new Date())
    const providers = useGetOwnerAutoCareProvidersQuery()
    const scheduled = useMemo(() => requests.filter((request) => request.status === 'accepted' && request.preferredAt), [requests])
    const datesWithBookings = useMemo(() => [...new Set(scheduled.map((request) => dayKey(request.preferredAt!)))].map((key) => {
        const [year, month, day] = key.split('-').map(Number)
        return new Date(year, month - 1, day)
    }), [scheduled])
    const selected = scheduled.filter((request) => dayKey(request.preferredAt!) === dayKey(selectedDay))
    const capacityByLocation = new Map((providers.data ?? []).map((provider) => [provider.location.id, provider.location.appointmentCapacity ?? 1]))
    const occupancy = new Map<string, AutoCareServiceRequest[]>()
    for (const request of selected) occupancy.set(request.locationId, [...(occupancy.get(request.locationId) ?? []), request])
    const branches = (providers.data ?? []).map((provider) => ({
        provider,
        requests: occupancy.get(provider.location.id) ?? [],
        capacity: capacityByLocation.get(provider.location.id) ?? 1,
    }))
    const ru = locale === 'ru'

    return <section className="mb-6 grid gap-4 rounded-[var(--radius-panel)] border border-border bg-card p-4 shadow-sm lg:grid-cols-[320px_minmax(0,1fr)]">
        <div><div className="flex items-center gap-2"><CalendarDays className="size-4 text-primary" /><h2 className="text-base font-black text-foreground">{ru ? 'Календарь и загрузка' : 'Calendar and capacity'}</h2></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{ru ? 'Выберите дату: система показывает подтверждённые записи и загрузку каждой точки.' : 'Select a date to review confirmed appointments and branch capacity.'}</p><Calendar mode="single" selected={selectedDay} onSelect={(day) => day && setSelectedDay(day)} modifiers={{ booked: datesWithBookings }} modifiersClassNames={{ booked: '[&>button]:bg-primary/10 [&>button]:font-black [&>button]:text-primary' }} /></div>
        <div className="rounded-[var(--radius-card)] bg-secondary/50 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black text-foreground">{new Intl.DateTimeFormat(ru ? 'ru-RU' : 'en-US', { dateStyle: 'full' }).format(selectedDay)}</p><p className="mt-1 text-xs text-muted-foreground">{ru ? `${selected.length} подтверждённых записей` : `${selected.length} confirmed appointments`}</p></div><UsersRound className="size-5 text-primary" /></div>{providers.isLoading ? <div className="mt-5 h-20 animate-pulse rounded-[var(--radius-card)] bg-card" /> : branches.length === 0 ? <p className="mt-5 rounded-[var(--radius-card)] bg-card p-4 text-sm text-muted-foreground">{ru ? 'Нет доступных точек сервиса.' : 'No service locations are available.'}</p> : <div className="mt-5 space-y-3">{branches.map(({ provider, requests: branchRequests, capacity }) => <div key={provider.location.id} className="rounded-[var(--radius-card)] bg-card p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black text-foreground">{provider.name}</p><p className="mt-1 text-xs text-muted-foreground">{provider.location.address}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-black ${branchRequests.length >= capacity ? 'bg-status-warning-surface text-status-warning-foreground' : 'bg-status-success-surface text-status-success-foreground'}`}>{branchRequests.length} / {capacity}</span></div>{branchRequests.length === 0 ? <p className="mt-3 text-xs text-muted-foreground">{ru ? 'Подтверждённых записей нет.' : 'No confirmed appointments.'}</p> : <div className="mt-3 grid gap-2 sm:grid-cols-2">{branchRequests.map((request) => <button key={request.id} type="button" className="rounded-[var(--radius-control)] border border-border px-3 py-2 text-left text-xs font-semibold text-foreground hover:border-primary">{new Intl.DateTimeFormat(ru ? 'ru-RU' : 'en-US', { timeStyle: 'short' }).format(new Date(request.preferredAt!))} · {request.serviceLabels.ru ?? request.serviceSlug}</button>)}</div>}</div>)}</div>}</div>
    </section>
}
