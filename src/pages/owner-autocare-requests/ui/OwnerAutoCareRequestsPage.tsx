import { useMemo, useState } from 'react'
import { CheckCircle2, Clock3, MessageCircle, Send, Wrench } from 'lucide-react'
import { useSearchParams } from 'react-router'

import {
    useConfirmOwnerAutoCareServiceRequestMutation,
    useCreateAutoCareServiceMessageMutation,
    useCreateAutoCareServiceQuoteMutation,
    useGetAutoCareServiceConversationQuery,
    useGetOwnerAutoCareServiceRequestsQuery,
    type AutoCareServiceRequest,
} from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'
import { PageHeader } from '@/shared/ui/page-header'
import { RetryButton } from '@/shared/ui/query-refresh-error'

export function OwnerAutoCareRequestsPage() {
    const { t } = useTranslation()
    const [searchParams] = useSearchParams()
    const { data: requests = [], isLoading, isError, error, refetch } = useGetOwnerAutoCareServiceRequestsQuery()
    const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get('request'))

    const effectiveSelectedId = selectedId && requests.some((item) => item.id === selectedId) ? selectedId : requests[0]?.id ?? null
    const selected = requests.find((item) => item.id === effectiveSelectedId) ?? null
    const counts = useMemo(() => ({
        open: requests.filter((item) => ['open', 'awaiting_reply'].includes(item.status)).length,
        estimates: requests.filter((item) => item.status === 'estimate_shared').length,
        confirmed: requests.filter((item) => item.status === 'accepted').length,
    }), [requests])

    return (
        <main className="min-h-full bg-background px-[var(--layout-gutter)] py-7 lg:py-10">
            <section className="mx-auto max-w-6xl">
                <PageHeader eyebrow={t('autocare.ownerRequestsEyebrow')} title={t('autocare.ownerRequestsTitle')} description={t('autocare.ownerRequestsDescription')} />
                <div className="mb-6 grid gap-3 sm:grid-cols-3">
                    <SummaryCard icon={Clock3} label={t('autocare.ownerRequestsOpen')} value={counts.open} />
                    <SummaryCard icon={Send} label={t('autocare.ownerRequestsEstimates')} value={counts.estimates} />
                    <SummaryCard icon={CheckCircle2} label={t('autocare.ownerRequestsConfirmed')} value={counts.confirmed} />
                </div>
                {isLoading && <div className="rounded-[var(--radius-panel)] border border-border bg-card p-8 text-sm font-semibold text-muted-foreground">{t('common.loading')}</div>}
                {isError && <div className="rounded-[var(--radius-panel)] border border-destructive/30 bg-card p-6"><p className="font-semibold text-destructive">{getApiErrorMessage(error, t('common.failedToLoad'))}</p><RetryButton className="mt-4" onRetry={refetch} label={t('common.retry')} /></div>}
                {!isLoading && !isError && requests.length === 0 && <div className="rounded-[var(--radius-panel)] border border-border bg-card p-8 text-sm text-muted-foreground">{t('autocare.ownerRequestsEmpty')}</div>}
                {!isLoading && !isError && requests.length > 0 && <div className="grid gap-5 lg:grid-cols-[minmax(270px,0.7fr)_minmax(0,1.3fr)]"><RequestList requests={requests} selectedId={effectiveSelectedId} onSelect={setSelectedId} /><RequestDetails key={selected?.id ?? 'empty'} request={selected} /></div>}
            </section>
        </main>
    )
}

function SummaryCard({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: number }) {
    return <div className="rounded-[var(--radius-panel)] border border-border bg-card p-4 shadow-sm"><Icon className="size-5 text-primary" /><p className="mt-3 text-2xl font-black text-foreground">{value}</p><p className="mt-1 text-xs font-semibold text-muted-foreground">{label}</p></div>
}

function RequestList({ requests, selectedId, onSelect }: { requests: AutoCareServiceRequest[]; selectedId: string | null; onSelect: (id: string) => void }) {
    const { t } = useTranslation()
    return <div className="space-y-3">{requests.map((request) => <button key={request.id} type="button" onClick={() => onSelect(request.id)} className={`w-full rounded-[var(--radius-panel)] border p-4 text-left transition ${selectedId === request.id ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-card hover:border-primary/50'}`}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-foreground">{request.serviceLabels.ru ?? request.serviceSlug}</p><p className="mt-1 text-xs font-semibold text-muted-foreground">{request.providerName}</p></div><StatusBadge status={request.status} /></div><p className="mt-4 text-xs text-muted-foreground">{formatDate(request.createdAt)}</p><p className="mt-1 line-clamp-2 text-sm text-foreground">{request.note || t('autocare.ownerRequestsNoNote')}</p></button>)}</div>
}

function RequestDetails({ request }: { request: AutoCareServiceRequest | null }) {
    const { t } = useTranslation()
    const [confirm, { isLoading: isConfirming }] = useConfirmOwnerAutoCareServiceRequestMutation()
    const [createQuote, { isLoading: isQuoting, error: quoteError }] = useCreateAutoCareServiceQuoteMutation()
    const [amount, setAmount] = useState('')
    const [note, setNote] = useState('')
    const [message, setMessage] = useState('')
    const [sendMessage, { isLoading: isSending }] = useCreateAutoCareServiceMessageMutation()
    const { data: conversation, isLoading: isConversationLoading } = useGetAutoCareServiceConversationQuery(request?.id ?? '', { skip: !request })

    if (!request) return <div className="rounded-[var(--radius-panel)] border border-border bg-card p-8 text-sm text-muted-foreground">{t('autocare.ownerRequestsSelect')}</div>

    const send = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!message.trim()) return; await sendMessage({ requestId: request.id, body: message.trim() }).unwrap(); setMessage('') }
    const quote = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); const value = Number(amount.replace(',', '.')); if (!Number.isFinite(value) || value <= 0) return; await createQuote({ requestId: request.id, amountMinor: Math.round(value * 100), currencyCode: request.currencyCode ?? 'RUB', note: note.trim() || null }).unwrap(); setAmount(''); setNote('') }

    return <div className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-5"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{t('autocare.ownerRequestsDetailEyebrow')}</p><h2 className="mt-2 text-xl font-black text-foreground">{request.serviceLabels.ru ?? request.serviceSlug}</h2><p className="mt-1 text-sm font-semibold text-muted-foreground">{request.providerName} · {request.address}</p></div><StatusBadge status={request.status} /></div><div className="grid gap-4 border-b border-border py-5 sm:grid-cols-2"><Info label={t('autocare.ownerRequestsClient')} value={String(request.contactSnapshot?.name ?? t('common.notProvided'))} /><Info label={t('autocare.ownerRequestsVehicle')} value={vehicleText(request.vehicleSnapshot) ?? t('common.notProvided')} /><Info label={t('autocare.ownerRequestsPreferredTime')} value={request.preferredAt ? formatDate(request.preferredAt) : t('autocare.ownerRequestsFlexibleTime')} /><Info label={t('autocare.ownerRequestsNote')} value={request.note ?? t('autocare.ownerRequestsNoNote')} /></div><div className="grid gap-5 pt-5 xl:grid-cols-2"><div><div className="flex items-center gap-2 text-sm font-black text-foreground"><Wrench className="size-4 text-primary" />{t('autocare.ownerRequestsQuoteTitle')}</div>{request.quote ? <div className="mt-3 rounded-[var(--radius-card)] bg-primary/5 p-4"><p className="text-2xl font-black text-foreground">{formatMoney(request.quote.amountMinor, request.quote.currencyCode)}</p><p className="mt-1 text-sm text-muted-foreground">{request.quote.note || t('autocare.ownerRequestsQuoteSent')}</p></div> : <form className="mt-3 space-y-3" onSubmit={(event) => void quote(event)}><input required inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder={t('autocare.ownerRequestsAmountPlaceholder')} className="h-10 w-full rounded-[var(--radius-control)] border border-border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40" /><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder={t('autocare.ownerRequestsQuoteNotePlaceholder')} className="min-h-20 w-full rounded-[var(--radius-control)] border border-border bg-background p-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40" /><button disabled={isQuoting} className="h-10 rounded-[var(--radius-control)] bg-primary px-4 text-xs font-black text-primary-foreground">{isQuoting ? t('common.saving') : t('autocare.ownerRequestsSendQuote')}</button>{quoteError && <p className="text-xs font-semibold text-destructive">{getApiErrorMessage(quoteError, t('common.failedToLoad'))}</p>}</form>}</div><div><div className="flex items-center gap-2 text-sm font-black text-foreground"><MessageCircle className="size-4 text-primary" />{t('autocare.ownerRequestsConversation')}</div><div className="mt-3 max-h-48 space-y-2 overflow-y-auto rounded-[var(--radius-card)] bg-secondary p-3">{isConversationLoading ? <p className="text-xs text-muted-foreground">{t('common.loading')}</p> : conversation?.messages.length ? conversation.messages.map((item) => <p key={item.id} className="rounded-[var(--radius-control)] bg-background px-3 py-2 text-sm text-foreground">{item.body}</p>) : <p className="text-xs text-muted-foreground">{t('autocare.ownerRequestsNoMessages')}</p>}</div><form className="mt-3 flex gap-2" onSubmit={(event) => void send(event)}><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder={t('autocare.ownerRequestsMessagePlaceholder')} className="h-10 min-w-0 flex-1 rounded-[var(--radius-control)] border border-border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40" /><button type="submit" disabled={isSending} aria-label={t('autocare.ownerRequestsSendMessage')} className="inline-flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary text-primary-foreground"><Send className="size-4" /></button></form></div></div>{['open', 'awaiting_reply', 'estimate_shared'].includes(request.status) && <button type="button" disabled={isConfirming} onClick={() => void confirm(request.id)} className="mt-5 inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] border border-primary px-4 text-xs font-black text-primary hover:bg-primary/5"><CheckCircle2 className="size-4" />{isConfirming ? t('common.saving') : t('autocare.ownerRequestsConfirm')}</button>}</div>
}

function StatusBadge({ status }: { status: AutoCareServiceRequest['status'] }) { const { t } = useTranslation(); const key = `autocare.ownerRequestStatus.${status}` as const; return <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-black text-muted-foreground">{t(key)}</span> }
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold text-foreground">{value}</p></div> }
function vehicleText(vehicle: AutoCareServiceRequest['vehicleSnapshot']) { if (!vehicle) return null; return [vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ') || null }
function formatDate(value: string) { return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
function formatMoney(amountMinor: number, currencyCode: string) { return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode, maximumFractionDigits: 0 }).format(amountMinor / 100) }
