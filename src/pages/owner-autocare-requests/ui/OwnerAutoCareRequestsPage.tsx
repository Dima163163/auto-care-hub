import { useMemo, useState } from 'react'
import { CheckCircle2, Clock3, MessageCircle, Send, Wrench } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'

import {
    useConfirmOwnerAutoCareServiceRequestMutation,
    useCreateAutoCareServiceQuoteMutation,
    useGetOwnerAutoCareServiceRequestsQuery,
    type AutoCareServiceRequest,
} from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { ROUTES } from '@/shared/constants/routes'
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
    return <div className="space-y-3">{requests.map((request) => <button key={request.id} type="button" onClick={() => onSelect(request.id)} className={`w-full rounded-[var(--radius-panel)] border bg-card p-4 text-left transition ${selectedId === request.id ? 'border-primary shadow-sm' : 'border-border hover:border-primary/50'}`}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-foreground">{request.serviceLabels.ru ?? request.serviceSlug}</p><p className="mt-1 text-xs font-semibold text-muted-foreground">{request.providerName}</p></div><StatusBadge status={request.status} /></div><div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground"><span>{formatDate(request.createdAt)}</span>{request.priceFromMinor !== null && request.currencyCode ? <span className="font-black text-foreground">{formatMoney(request.priceFromMinor, request.currencyCode)}</span> : null}</div><p className="mt-1 line-clamp-2 text-sm text-foreground">{request.note || t('autocare.ownerRequestsNoNote')}</p></button>)}</div>
}

function RequestDetails({ request }: { request: AutoCareServiceRequest | null }) {
    const { t } = useTranslation()
    const [confirm, { isLoading: isConfirming }] = useConfirmOwnerAutoCareServiceRequestMutation()
    const [createQuote, { isLoading: isQuoting, error: quoteError }] = useCreateAutoCareServiceQuoteMutation()
    const [amount, setAmount] = useState('')
    const [partsAmount, setPartsAmount] = useState('')
    const [labourAmount, setLabourAmount] = useState('')
    const [priceLocked, setPriceLocked] = useState(true)
    const [note, setNote] = useState('')

    if (!request) return <div className="rounded-[var(--radius-panel)] border border-border bg-card p-8 text-sm text-muted-foreground">{t('autocare.ownerRequestsSelect')}</div>

    const quote = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); const total = Number(amount.replace(',', '.')); const parts = Number(partsAmount.replace(',', '.')) || 0; const labour = Number(labourAmount.replace(',', '.')) || 0; if (!Number.isFinite(total) || total <= 0) return; const lineItems = [{ kind: 'part' as const, title: 'Запчасти и материалы', quantity: 1, unitPriceMinor: Math.round(parts * 100) }, { kind: 'labour' as const, title: 'Работа мастера', quantity: 1, unitPriceMinor: Math.round(labour * 100) }].filter((item) => item.unitPriceMinor > 0); await createQuote({ requestId: request.id, amountMinor: Math.round(total * 100), currencyCode: request.currencyCode ?? 'RUB', note: note.trim() || null, lineItems, priceLocked }).unwrap(); setAmount(''); setPartsAmount(''); setLabourAmount(''); setNote('') }

    return <div className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-5"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{t('autocare.ownerRequestsDetailEyebrow')}</p><h2 className="mt-2 text-xl font-black text-foreground">{request.serviceLabels.ru ?? request.serviceSlug}</h2><p className="mt-1 text-sm font-semibold text-muted-foreground">{request.providerName} · {request.address}</p></div><div className="flex items-center gap-2"><StatusBadge status={request.status} /><Link to={`${ROUTES.ownerChats}?request=${request.id}`} className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-control)] bg-primary px-3 text-xs font-black text-primary-foreground"><MessageCircle className="size-3.5" />{t('autocare.chatWorkspaceOpenRequest')}</Link></div></div><div className="grid gap-4 border-b border-border py-5 sm:grid-cols-2"><Info label={t('autocare.ownerRequestsClient')} value={String(request.contactSnapshot?.name ?? t('common.notProvided'))} /><Info label={t('autocare.ownerRequestsVehicle')} value={vehicleText(request.vehicleSnapshot) ?? t('common.notProvided')} /><Info label={t('autocare.ownerRequestsPreferredTime')} value={request.preferredAt ? formatDate(request.preferredAt) : t('autocare.ownerRequestsFlexibleTime')} /><Info label={t('autocare.ownerRequestsNote')} value={request.note ?? t('common.notProvided')} /></div><div className="grid gap-5 pt-5"><div><div className="flex items-center gap-2 text-sm font-black text-foreground"><Wrench className="size-4 text-primary" />{t('autocare.ownerRequestsQuoteTitle')}</div>{request.quote ? <div className="mt-3 rounded-[var(--radius-card)] border border-border bg-background p-4"><p className="text-2xl font-black text-foreground">{formatMoney(request.quote.amountMinor, request.quote.currencyCode)}</p>{request.quote.lineItems?.map((item) => <p key={`${item.kind}-${item.title}`} className="mt-1 text-xs text-muted-foreground">{item.title}: {formatMoney(item.totalMinor, request.quote?.currencyCode ?? 'RUB')}</p>)}<p className="mt-1 text-sm text-muted-foreground">{request.quote.note || t('autocare.ownerRequestsQuoteSent')}</p></div> : <form className="mt-3 space-y-3" onSubmit={(event) => void quote(event)}><div className="grid gap-3 sm:grid-cols-3"><input required inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Итого" className="h-10 rounded-[var(--radius-control)] border border-border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40" /><input inputMode="decimal" value={partsAmount} onChange={(event) => setPartsAmount(event.target.value)} placeholder="Запчасти" className="h-10 rounded-[var(--radius-control)] border border-border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40" /><input inputMode="decimal" value={labourAmount} onChange={(event) => setLabourAmount(event.target.value)} placeholder="Работа" className="h-10 rounded-[var(--radius-control)] border border-border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40" /></div><label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><input type="checkbox" checked={priceLocked} onChange={(event) => setPriceLocked(event.target.checked)} />Зафиксировать цену для этой заявки</label><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder={t('autocare.ownerRequestsQuoteNotePlaceholder')} className="min-h-20 w-full rounded-[var(--radius-control)] border border-border bg-background p-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40" /><button disabled={isQuoting} className="h-10 rounded-[var(--radius-control)] bg-primary px-4 text-xs font-black text-primary-foreground">{isQuoting ? t('common.saving') : t('autocare.ownerRequestsSendQuote')}</button>{quoteError && <p className="text-xs font-semibold text-destructive">{getApiErrorMessage(quoteError, t('common.failedToLoad'))}</p>}</form>}</div></div>{['open', 'awaiting_reply', 'estimate_shared'].includes(request.status) && <button type="button" disabled={isConfirming} onClick={() => void confirm(request.id)} className="mt-5 inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] border border-primary px-4 text-xs font-black text-primary hover:bg-primary/5"><CheckCircle2 className="size-4" />{isConfirming ? t('common.saving') : t('autocare.ownerRequestsConfirm')}</button>}</div>
}

function StatusBadge({ status }: { status: AutoCareServiceRequest['status'] }) { const { t } = useTranslation(); const key = `autocare.ownerRequestStatus.${status}` as const; return <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-black text-muted-foreground">{t(key)}</span> }
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold text-foreground">{value}</p></div> }
function vehicleText(vehicle: AutoCareServiceRequest['vehicleSnapshot']) { if (!vehicle) return null; return [vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ') || null }
function formatDate(value: string) { return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
function formatMoney(amountMinor: number, currencyCode: string) { return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode, maximumFractionDigits: 0 }).format(amountMinor / 100) }
