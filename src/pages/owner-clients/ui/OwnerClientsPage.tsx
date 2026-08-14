import { Mail, MapPin, Phone, Wrench } from 'lucide-react'

import { useGetOwnerAutoCareServiceRequestsQuery, type AutoCareServiceRequest } from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'
import { PageHeader } from '@/shared/ui/page-header'
import { RetryButton } from '@/shared/ui/query-refresh-error'

type OwnerClient = { id: string; name: string; email: string | null; phone: string | null; requests: AutoCareServiceRequest[] }

function readSnapshotValue(snapshot: AutoCareServiceRequest['contactSnapshot'], key: 'name' | 'email' | 'phone') {
    const value = snapshot?.[key]
    return typeof value === 'string' && value.trim() ? value.trim() : null
}

function getClients(requests: AutoCareServiceRequest[]) {
    const clients = new Map<string, OwnerClient>()
    for (const request of requests) {
        const email = readSnapshotValue(request.contactSnapshot, 'email')
        const phone = readSnapshotValue(request.contactSnapshot, 'phone')
        const name = readSnapshotValue(request.contactSnapshot, 'name') ?? 'Клиент AutoCare'
        const id = email ?? phone ?? `${name}:${request.id}`
        const current = clients.get(id)
        clients.set(id, { id, name, email: email ?? current?.email ?? null, phone: phone ?? current?.phone ?? null, requests: [...(current?.requests ?? []), request] })
    }
    return [...clients.values()].sort((left, right) => new Date(right.requests[0]?.updatedAt ?? 0).getTime() - new Date(left.requests[0]?.updatedAt ?? 0).getTime())
}

export function OwnerClientsPage() {
    const { locale, t } = useTranslation()
    const query = useGetOwnerAutoCareServiceRequestsQuery()
    const clients = getClients(query.data ?? [])
    return <main className="min-h-full bg-background px-[var(--layout-gutter)] py-7 lg:py-10"><section className="mx-auto max-w-6xl"><PageHeader eyebrow={locale === 'ru' ? 'Рабочая область владельца' : 'Service owner workspace'} title={locale === 'ru' ? 'Клиенты сервиса' : 'Service customers'} description={locale === 'ru' ? 'Контакты и история обращений собраны только из заявок AutoCare.' : 'Contacts and request history are shown only from AutoCare service requests.'} />{query.isLoading && <div className="rounded-[var(--radius-panel)] border border-border bg-card p-8 text-sm text-muted-foreground">{t('common.loading')}</div>}{query.error && <div className="rounded-[var(--radius-panel)] border border-destructive/30 bg-card p-6"><p className="font-semibold text-destructive">{getApiErrorMessage(query.error, t('common.failedToLoad'))}</p><RetryButton className="mt-4" onRetry={query.refetch} label={t('common.retry')} /></div>}{!query.isLoading && !query.error && (clients.length ? <div className="grid gap-4 lg:grid-cols-2">{clients.map((client) => { const recent = client.requests[0]; return <article key={client.id} className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><div><h2 className="font-black text-foreground">{client.name}</h2><p className="mt-1 text-sm font-semibold text-muted-foreground">{locale === 'ru' ? `Заявок: ${client.requests.length}` : `Requests: ${client.requests.length}`}</p></div><span className="flex size-10 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><Wrench className="size-4" /></span></div><div className="mt-5 space-y-2 text-sm text-muted-foreground">{client.email && <a className="flex items-center gap-2 hover:text-foreground" href={`mailto:${client.email}`}><Mail className="size-4 text-primary" />{client.email}</a>}{client.phone && <a className="flex items-center gap-2 hover:text-foreground" href={`tel:${client.phone}`}><Phone className="size-4 text-primary" />{client.phone}</a>}</div>{recent && <div className="mt-5 rounded-[var(--radius-card)] bg-secondary p-3 text-xs font-semibold text-muted-foreground"><p className="font-black text-foreground">{recent.serviceLabels[locale] ?? recent.serviceLabels.en ?? recent.serviceSlug}</p><p className="mt-1 flex items-center gap-1"><MapPin className="size-3 text-primary" />{recent.address}</p></div>}</article> })}</div> : <div className="rounded-[var(--radius-panel)] border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">{locale === 'ru' ? 'Клиенты появятся после первых заявок в сервис.' : 'Customers will appear after the first service requests.'}</div>)}</section></main>
}
