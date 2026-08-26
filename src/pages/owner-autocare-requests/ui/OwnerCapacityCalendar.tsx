import { useMemo, useState, type FormEvent } from 'react'
import { CalendarDays, UsersRound } from 'lucide-react'

import { useCreateOwnerAutoCareCapacityResourceMutation, useGetOwnerAutoCareCapacityReservationsQuery, useGetOwnerAutoCareCapacityResourcesQuery, useGetOwnerAutoCareProvidersQuery, useUpdateOwnerAutoCareCapacityResourceMutation, type AutoCareServiceRequest } from '@/entities/automotive-service'
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
        <div className="rounded-[var(--radius-card)] bg-secondary/50 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black text-foreground">{new Intl.DateTimeFormat(ru ? 'ru-RU' : 'en-US', { dateStyle: 'full' }).format(selectedDay)}</p><p className="mt-1 text-xs text-muted-foreground">{ru ? `${selected.length} подтверждённых записей` : `${selected.length} confirmed appointments`}</p></div><UsersRound className="size-5 text-primary" /></div>{providers.isLoading ? <div className="mt-5 h-20 animate-pulse rounded-[var(--radius-card)] bg-card" /> : branches.length === 0 ? <p className="mt-5 rounded-[var(--radius-card)] bg-card p-4 text-sm text-muted-foreground">{ru ? 'Нет доступных точек сервиса.' : 'No service locations are available.'}</p> : <div className="mt-5 space-y-3">{branches.map(({ provider, requests: branchRequests, capacity }) => <div key={provider.location.id} className="rounded-[var(--radius-card)] bg-card p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black text-foreground">{provider.name}</p><p className="mt-1 text-xs text-muted-foreground">{provider.location.address}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-black ${branchRequests.length >= capacity ? 'bg-status-warning-surface text-status-warning-foreground' : 'bg-status-success-surface text-status-success-foreground'}`}>{branchRequests.length} / {capacity}</span></div>{branchRequests.length === 0 ? <p className="mt-3 text-xs text-muted-foreground">{ru ? 'Подтверждённых записей нет.' : 'No confirmed appointments.'}</p> : <div className="mt-3 grid gap-2 sm:grid-cols-2">{branchRequests.map((request) => <button key={request.id} type="button" className="rounded-[var(--radius-control)] border border-border px-3 py-2 text-left text-xs font-semibold text-foreground hover:border-primary">{new Intl.DateTimeFormat(ru ? 'ru-RU' : 'en-US', { timeStyle: 'short' }).format(new Date(request.preferredAt!))} · {request.serviceLabels.ru ?? request.serviceSlug}</button>)}</div>}<BranchResourceSummary providerId={provider.id} locationId={provider.location.id} selectedDay={selectedDay} locale={locale} /></div>)}</div>}</div>
    </section>
}

function BranchResourceSummary({ providerId, locationId, selectedDay, locale }: { providerId: string; locationId: string; selectedDay: Date; locale: string }) {
    const ru = locale === 'ru'
    const [resourceType, setResourceType] = useState<'specialist' | 'bay' | 'lift' | 'equipment'>('specialist')
    const [resourceName, setResourceName] = useState('')
    const [resourceCapacity, setResourceCapacity] = useState('1')
    const range = useMemo(() => {
        const from = new Date(selectedDay)
        from.setHours(0, 0, 0, 0)
        const to = new Date(from)
        to.setDate(to.getDate() + 1)
        return { from: from.toISOString(), to: to.toISOString() }
    }, [selectedDay])
    const resources = useGetOwnerAutoCareCapacityResourcesQuery({ providerId, locationId })
    const reservations = useGetOwnerAutoCareCapacityReservationsQuery({ providerId, locationId, ...range })
    const [createResource, createState] = useCreateOwnerAutoCareCapacityResourceMutation()
    const [updateResource, updateState] = useUpdateOwnerAutoCareCapacityResourceMutation()
    if (resources.isLoading) return <div className="mt-3 h-12 animate-pulse rounded-[var(--radius-control)] bg-secondary" />
    if (!resources.data?.length) return null
    const addResource = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const name = resourceName.trim()
        const capacity = Number(resourceCapacity)
        if (!name || !Number.isInteger(capacity) || capacity < 1 || capacity > 100) return
        await createResource({ providerId, locationId, type: resourceType, name, capacity, active: true, metadata: {} }).unwrap()
        setResourceName('')
        setResourceCapacity('1')
    }
    const toggleResource = async (resource: NonNullable<typeof resources.data>[number]) => {
        await updateResource({ providerId, resourceId: resource.id, active: !resource.active }).unwrap()
    }
    const typeLabels = ru ? { specialist: 'Специалисты', bay: 'Посты', lift: 'Подъёмники', equipment: 'Оборудование' } : { specialist: 'Specialists', bay: 'Bays', lift: 'Lifts', equipment: 'Equipment' }
    return <div className="mt-3 rounded-[var(--radius-control)] border border-border bg-background p-3"><div className="flex items-center justify-between gap-2"><p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">{ru ? 'Ресурсы точки' : 'Branch resources'}</p><span className="text-[10px] text-muted-foreground">{resources.data.filter((resource) => resource.active).length} {ru ? 'активных' : 'active'}</span></div><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">{(['specialist', 'bay', 'lift', 'equipment'] as const).map((type) => { const activeResources = resources.data.filter((resource) => resource.type === type && resource.active); const occupied = reservations.data?.filter((reservation) => activeResources.some((resource) => resource.id === reservation.resourceId)).length ?? 0; return <div key={type} className="rounded-[var(--radius-control)] bg-secondary px-2.5 py-2"><p className="text-[10px] font-bold uppercase text-muted-foreground">{typeLabels[type]}</p><p className="mt-1 text-sm font-black text-foreground">{occupied} / {activeResources.reduce((total, resource) => total + resource.capacity, 0)}</p></div> })}</div><div className="mt-3 grid gap-1.5 sm:grid-cols-2">{resources.data.map((resource) => <button key={resource.id} type="button" onClick={() => void toggleResource(resource)} disabled={updateState.isLoading} className="flex items-center justify-between gap-2 rounded-[var(--radius-control)] border border-border px-2.5 py-2 text-left text-[11px] hover:border-primary disabled:opacity-60"><span className="truncate text-foreground">{resource.name} · {resource.capacity}</span><span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${resource.active ? 'bg-status-success-surface text-status-success-foreground' : 'bg-secondary text-muted-foreground'}`}>{resource.active ? (ru ? 'включён' : 'active') : (ru ? 'выключен' : 'off')}</span></button>)}</div><form onSubmit={(event) => void addResource(event)} className="mt-3 grid gap-2 sm:grid-cols-[1fr_130px_72px_auto]"><input aria-label={ru ? 'Название ресурса' : 'Resource name'} value={resourceName} onChange={(event) => setResourceName(event.target.value)} placeholder={ru ? 'Новый ресурс' : 'New resource'} className="h-8 min-w-0 rounded-[var(--radius-control)] border border-border bg-card px-2 text-xs text-foreground" /><select aria-label={ru ? 'Тип ресурса' : 'Resource type'} value={resourceType} onChange={(event) => setResourceType(event.target.value as typeof resourceType)} className="h-8 rounded-[var(--radius-control)] border border-border bg-card px-2 text-xs text-foreground">{(['specialist', 'bay', 'lift', 'equipment'] as const).map((type) => <option key={type} value={type}>{typeLabels[type]}</option>)}</select><input aria-label={ru ? 'Вместимость ресурса' : 'Resource capacity'} type="number" min="1" max="100" value={resourceCapacity} onChange={(event) => setResourceCapacity(event.target.value)} className="h-8 rounded-[var(--radius-control)] border border-border bg-card px-2 text-xs text-foreground" /><button type="submit" disabled={createState.isLoading} className="h-8 rounded-[var(--radius-control)] bg-primary px-3 text-[11px] font-black text-primary-foreground disabled:opacity-60">{createState.isLoading ? '…' : (ru ? 'Добавить' : 'Add')}</button></form>{createState.error ? <p className="mt-2 text-[10px] font-semibold text-destructive">{ru ? 'Не удалось добавить ресурс.' : 'Could not add resource.'}</p> : null}</div>
}
