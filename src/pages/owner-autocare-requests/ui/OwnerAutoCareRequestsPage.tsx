import { useMemo, useState, type FormEvent } from 'react'
import { CalendarCheck, CheckCircle2, Clock3, ListFilter, Phone, Send, Wrench } from 'lucide-react'
import { useSearchParams } from 'react-router'

import {
    useCompleteAutoCareServiceRequestMutation,
    useConfirmOwnerAutoCareServiceRequestMutation,
    useCreateAutoCareServiceQuoteMutation,
    useGetOwnerAutoCareServiceRequestsQuery,
    useMarkAutoCareServiceRequestNoShowMutation,
    useRequestAutoCareServiceRescheduleMutation,
    type AutoCareServiceRequest,
} from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import type { TranslationKey } from '@/shared/lib/i18n'
import { useTranslation } from '@/shared/lib/useTranslation'
import { PageHeader } from '@/shared/ui/page-header'
import { RetryButton } from '@/shared/ui/query-refresh-error'
import { SplitListSkeleton } from '@/shared/ui/loading-skeleton'
import { StateCard } from '@/shared/ui/state-card'

import { OwnerCapacityCalendar } from './OwnerCapacityCalendar'

const emptyRequests: AutoCareServiceRequest[] = []

export function OwnerAutoCareRequestsPage() {
    const { locale, t } = useTranslation()
    const [searchParams] = useSearchParams()
    const [queue, setQueue] = useState<'all' | 'urgent' | 'awaiting_reply' | 'estimate_shared' | 'accepted'>('all')
    const query = useGetOwnerAutoCareServiceRequestsQuery()
    const requests = query.data ?? emptyRequests
    const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get('request'))
    const effectiveSelectedId = selectedId && requests.some((item) => item.id === selectedId) ? selectedId : requests[0]?.id ?? null
    const selected = requests.find((item) => item.id === effectiveSelectedId) ?? null
    const queueRequests = useMemo(() => {
        const sorted = [...requests].sort((a, b) => {
            const aTime = a.preferredAt ? new Date(a.preferredAt).getTime() : Number.MAX_SAFE_INTEGER
            const bTime = b.preferredAt ? new Date(b.preferredAt).getTime() : Number.MAX_SAFE_INTEGER
            return aTime - bTime || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        })
        if (queue === 'urgent') return sorted.filter((item) => ['open', 'awaiting_reply'].includes(item.status))
        if (queue === 'all') return sorted
        return sorted.filter((item) => item.status === queue)
    }, [queue, requests])
    const counts = useMemo(() => ({
        open: requests.filter((item) => ['open', 'awaiting_reply'].includes(item.status)).length,
        estimates: requests.filter((item) => item.status === 'estimate_shared').length,
        confirmed: requests.filter((item) => item.status === 'accepted').length,
    }), [requests])

    return <main className="min-h-full bg-background px-[var(--layout-gutter)] py-7 lg:py-10"><section className="mx-auto max-w-6xl"><PageHeader eyebrow={t('autocare.ownerRequestsEyebrow')} title={t('autocare.ownerRequestsTitle')} description={t('autocare.ownerRequestsDescription')} /><div className="mb-6 grid gap-3 sm:grid-cols-3"><SummaryCard icon={Clock3} label={t('autocare.ownerRequestsOpen')} value={counts.open} /><SummaryCard icon={Send} label={t('autocare.ownerRequestsEstimates')} value={counts.estimates} /><SummaryCard icon={CheckCircle2} label={t('autocare.ownerRequestsConfirmed')} value={counts.confirmed} /></div>{!query.isLoading && !query.error && <OwnerCapacityCalendar requests={requests} locale={locale} />}{query.isLoading && <SplitListSkeleton label={t('common.loading')} />}{query.error && <StateCard className="mt-5" variant="error" title={t('common.failedToLoad')} description={getApiErrorMessage(query.error, t('common.failedToLoad'))} action={<RetryButton onRetry={query.refetch} label={t('common.retry')} />} />}{!query.isLoading && !query.error && requests.length === 0 && <StateCard className="mt-5" variant="empty" title={t('autocare.ownerRequestsEmpty')} description={t('autocare.ownerRequestsDescription')} />}{!query.isLoading && !query.error && requests.length > 0 && <><WorkQueue active={queue} requests={requests} onChange={setQueue} locale={locale} /><div className="grid gap-5 lg:grid-cols-[minmax(270px,0.7fr)_minmax(0,1.3fr)]"><RequestList requests={queueRequests} selectedId={effectiveSelectedId} onSelect={setSelectedId} /><RequestDetails key={selected?.id ?? 'empty'} request={selected} /></div></>}</section></main>
}

function WorkQueue({ active, requests, onChange, locale }: { active: 'all' | 'urgent' | 'awaiting_reply' | 'estimate_shared' | 'accepted'; requests: AutoCareServiceRequest[]; onChange: (value: 'all' | 'urgent' | 'awaiting_reply' | 'estimate_shared' | 'accepted') => void; locale: string }) {
    const labels = locale === 'ru'
        ? { all: 'Все', urgent: 'Нужно ответить', awaiting_reply: 'Ждут ответа', estimate_shared: 'Смета', accepted: 'Подтверждены' }
        : { all: 'All', urgent: 'Needs attention', awaiting_reply: 'Awaiting reply', estimate_shared: 'Estimate', accepted: 'Confirmed' }
    const options = Object.keys(labels) as Array<keyof typeof labels>
    return <section className="mb-5 rounded-[var(--radius-panel)] border border-border bg-card p-4 shadow-sm"><div className="flex flex-wrap items-center gap-2"><ListFilter className="size-4 text-primary" /><p className="mr-2 text-sm font-black text-foreground">{locale === 'ru' ? 'Рабочая очередь' : 'Work queue'}</p>{options.map((option) => <button key={option} type="button" onClick={() => onChange(option)} className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${active === option ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground hover:border-primary/50'}`}>{labels[option]} <span className="ml-1 opacity-70">{option === 'all' ? requests.length : option === 'urgent' ? requests.filter((item) => ['open', 'awaiting_reply'].includes(item.status)).length : requests.filter((item) => item.status === option).length}</span></button>)}</div></section>
}

function SummaryCard({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: number }) {
    return <div className="rounded-[var(--radius-panel)] border border-border bg-card p-4 shadow-sm"><Icon className="size-5 text-primary" /><p className="mt-3 text-2xl font-black text-foreground">{value}</p><p className="mt-1 text-xs font-semibold text-muted-foreground">{label}</p></div>
}

function RequestList({ requests, selectedId, onSelect }: { requests: AutoCareServiceRequest[]; selectedId: string | null; onSelect: (id: string) => void }) {
    const { t } = useTranslation()
    return <div className="space-y-3">{requests.map((request) => <button key={request.id} type="button" onClick={() => onSelect(request.id)} className={`w-full rounded-[var(--radius-panel)] border bg-card p-4 text-left transition ${selectedId === request.id ? 'border-primary shadow-sm' : 'border-border hover:border-primary/50'}`}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-foreground">{request.serviceLabels.ru ?? request.serviceSlug}</p><p className="mt-1 text-xs font-semibold text-muted-foreground">{request.providerName}</p></div><StatusBadge status={request.status} /></div><div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground"><span>{formatDate(request.createdAt)}</span>{request.priceFromMinor !== null && request.currencyCode ? <span className="font-black text-foreground">{formatMoney(request.priceFromMinor, request.currencyCode)}</span> : null}</div><p className="mt-1 line-clamp-2 text-sm text-foreground">{request.note || t('autocare.ownerRequestsNoNote')}</p></button>)}</div>
}

function RequestDetails({ request }: { request: AutoCareServiceRequest | null }) {
    const { locale, t } = useTranslation()
    const [confirm, { isLoading: isConfirming }] = useConfirmOwnerAutoCareServiceRequestMutation()
    const [createQuote, { isLoading: isQuoting, error: quoteError }] = useCreateAutoCareServiceQuoteMutation()
    const [amount, setAmount] = useState('')
    const [partsAmount, setPartsAmount] = useState('')
    const [labourAmount, setLabourAmount] = useState('')
    const [priceLocked, setPriceLocked] = useState(true)
    const [note, setNote] = useState('')
    const [rescheduleAt, setRescheduleAt] = useState('')
    const [requestReschedule, { isLoading: isRescheduling, error: rescheduleError }] = useRequestAutoCareServiceRescheduleMutation()
    const [markNoShow, { isLoading: isMarkingNoShow, error: noShowError }] = useMarkAutoCareServiceRequestNoShowMutation()
    const [complete, { isLoading: isCompleting, error: completionError }] = useCompleteAutoCareServiceRequestMutation()

    if (!request) return <div className="rounded-[var(--radius-panel)] border border-border bg-card p-8 text-sm text-muted-foreground">{t('autocare.ownerRequestsSelect')}</div>

    const quote = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const total = Number(amount.replace(',', '.'))
        const parts = Number(partsAmount.replace(',', '.')) || 0
        const labour = Number(labourAmount.replace(',', '.')) || 0
        if (!Number.isFinite(total) || total <= 0) return
        const lineItems = [
            { kind: 'part' as const, title: 'Запчасти и материалы', quantity: 1, unitPriceMinor: Math.round(parts * 100) },
            { kind: 'labour' as const, title: 'Работа мастера', quantity: 1, unitPriceMinor: Math.round(labour * 100) },
        ].filter((item) => item.unitPriceMinor > 0)
        await createQuote({ requestId: request.id, amountMinor: Math.round(total * 100), currencyCode: request.currencyCode ?? 'RUB', note: note.trim() || null, lineItems, priceLocked }).unwrap()
        setAmount(''); setPartsAmount(''); setLabourAmount(''); setNote('')
    }
    const submitReschedule = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!rescheduleAt) return; await requestReschedule({ requestId: request.id, proposedAt: new Date(rescheduleAt).toISOString() }).unwrap(); setRescheduleAt('') }
    const canMarkNoShow = request.status === 'accepted' && Boolean(request.providerConfirmedAt && request.preferredAt)
    const canComplete = request.status === 'accepted' && Boolean(request.clientConfirmedAt && request.providerConfirmedAt && request.preferredAt)
    const quoteErrorMessage = quoteError ? getApiErrorMessage(quoteError, t('common.failedToLoad')) : null

    return <div className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-5"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{t('autocare.ownerRequestsDetailEyebrow')}</p><h2 className="mt-2 text-xl font-black text-foreground">{request.serviceLabels.ru ?? request.serviceSlug}</h2><p className="mt-1 text-sm font-semibold text-muted-foreground">{request.providerName} · {request.address}</p></div><div className="flex items-center gap-2"><StatusBadge status={request.status} /><ContactClientLink request={request} locale={locale} /></div></div><div className="grid gap-4 border-b border-border py-5 sm:grid-cols-2"><Info label={t('autocare.ownerRequestsClient')} value={String(request.contactSnapshot?.name ?? t('common.notProvided'))} /><Info label={t('autocare.ownerRequestsVehicle')} value={vehicleText(request.vehicleSnapshot) ?? t('common.notProvided')} /><Info label={t('autocare.ownerRequestsPreferredTime')} value={request.preferredAt ? formatDate(request.preferredAt) : t('autocare.ownerRequestsFlexibleTime')} /><Info label={t('autocare.ownerRequestsNote')} value={request.note ?? t('common.notProvided')} /></div>{request.booking ? <BookingSnapshot booking={request.booking} locale={locale} /> : null}<div className="grid gap-5 pt-5"><QuoteEditor request={request} amount={amount} partsAmount={partsAmount} labourAmount={labourAmount} note={note} priceLocked={priceLocked} isQuoting={isQuoting} quoteErrorMessage={quoteErrorMessage} onSubmit={quote} onAmount={setAmount} onPartsAmount={setPartsAmount} onLabourAmount={setLabourAmount} onNote={setNote} onPriceLocked={setPriceLocked} t={t} /></div>{request.status === 'accepted' && !request.reschedule && <form className="mt-5 rounded-[var(--radius-card)] border border-border bg-background p-4" onSubmit={(event) => void submitReschedule(event)}><p className="text-sm font-black text-foreground">{t('autocare.ownerRequestsRescheduleTitle')}</p><label className="mt-3 block text-xs font-semibold text-muted-foreground">{t('autocare.ownerRequestsRescheduleDate')}<input required type="datetime-local" value={rescheduleAt} onChange={(event) => setRescheduleAt(event.target.value)} className="mt-1 h-10 w-full rounded-[var(--radius-control)] border border-border bg-card px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40" /></label><button disabled={isRescheduling} className="mt-3 h-10 rounded-[var(--radius-control)] bg-primary px-4 text-xs font-black text-primary-foreground">{isRescheduling ? t('common.saving') : t('autocare.ownerRequestsRescheduleSend')}</button>{rescheduleError ? <p className="mt-2 text-xs font-semibold text-destructive">{getApiErrorMessage(rescheduleError, t('common.failedToLoad'))}</p> : null}</form>}{canMarkNoShow ? <button type="button" disabled={isMarkingNoShow} onClick={() => void markNoShow({ requestId: request.id }).unwrap()} className="mt-5 inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] border border-destructive/40 px-4 text-xs font-black text-destructive hover:bg-destructive/5">{isMarkingNoShow ? t('common.saving') : t('autocare.ownerRequestsNoShow')}</button> : null}{noShowError ? <p className="mt-2 text-xs font-semibold text-destructive">{getApiErrorMessage(noShowError, t('common.failedToLoad'))}</p> : null}{canComplete ? <button type="button" disabled={isCompleting} onClick={() => void complete({ requestId: request.id }).unwrap()} className="mt-5 inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] border border-primary px-4 text-xs font-black text-primary hover:bg-primary/5"><CheckCircle2 className="size-4" />{isCompleting ? t('common.saving') : t('autocare.ownerRequestsComplete')}</button> : null}{completionError ? <p className="mt-2 text-xs font-semibold text-destructive">{getApiErrorMessage(completionError, t('common.failedToLoad'))}</p> : null}{['open', 'awaiting_reply', 'estimate_shared'].includes(request.status) && <button type="button" disabled={isConfirming} onClick={() => void confirm(request.id)} className="mt-5 inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] border border-primary px-4 text-xs font-black text-primary hover:bg-primary/5"><CheckCircle2 className="size-4" />{isConfirming ? t('common.saving') : t('autocare.ownerRequestsConfirm')}</button>}</div>
}

function BookingSnapshot({ booking, locale }: { booking: NonNullable<AutoCareServiceRequest['booking']>; locale: string }) {
    const date = new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: booking.timezone }).format(new Date(booking.scheduledAt))
    return <div className="mt-5 flex items-start gap-2 rounded-[var(--radius-card)] border border-status-success-border bg-status-success-surface p-4 text-sm text-status-success-foreground"><CalendarCheck className="mt-0.5 size-4 shrink-0" /><div><p className="font-black">{locale === 'ru' ? 'Подтверждённая запись' : 'Confirmed booking'}</p><p className="mt-1 text-xs font-semibold">{date} · {formatMoney(booking.amountMinor, booking.currencyCode)}</p></div></div>
}

type QuoteEditorProps = { request: AutoCareServiceRequest; amount: string; partsAmount: string; labourAmount: string; note: string; priceLocked: boolean; isQuoting: boolean; quoteErrorMessage: string | null; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onAmount: (value: string) => void; onPartsAmount: (value: string) => void; onLabourAmount: (value: string) => void; onNote: (value: string) => void; onPriceLocked: (value: boolean) => void; t: (key: TranslationKey) => string }
function QuoteEditor({ request, amount, partsAmount, labourAmount, note, priceLocked, isQuoting, quoteErrorMessage, onSubmit, onAmount, onPartsAmount, onLabourAmount, onNote, onPriceLocked, t }: QuoteEditorProps) {
    return <div><div className="flex items-center gap-2 text-sm font-black text-foreground"><Wrench className="size-4 text-primary" />{t('autocare.ownerRequestsQuoteTitle')}</div>{request.quote ? <div className="mt-3 rounded-[var(--radius-card)] border border-border bg-background p-4"><p className="text-2xl font-black text-foreground">{formatMoney(request.quote.amountMinor, request.quote.currencyCode)}</p>{request.quote.lineItems?.map((item) => <p key={`${item.kind}-${item.title}`} className="mt-1 text-xs text-muted-foreground">{item.title}: {formatMoney(item.totalMinor, request.quote?.currencyCode ?? 'RUB')}</p>)}<p className="mt-1 text-sm text-muted-foreground">{request.quote.note || t('autocare.ownerRequestsQuoteSent')}</p></div> : <form className="mt-3 space-y-3" onSubmit={onSubmit}><div className="grid gap-3 sm:grid-cols-3"><input required inputMode="decimal" value={amount} onChange={(event) => onAmount(event.target.value)} placeholder="Итого" className="h-10 rounded-[var(--radius-control)] border border-border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40" /><input inputMode="decimal" value={partsAmount} onChange={(event) => onPartsAmount(event.target.value)} placeholder="Запчасти" className="h-10 rounded-[var(--radius-control)] border border-border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40" /><input inputMode="decimal" value={labourAmount} onChange={(event) => onLabourAmount(event.target.value)} placeholder="Работа" className="h-10 rounded-[var(--radius-control)] border border-border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40" /></div><label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><input type="checkbox" checked={priceLocked} onChange={(event) => onPriceLocked(event.target.checked)} />Зафиксировать цену для этой заявки</label><textarea value={note} onChange={(event) => onNote(event.target.value)} placeholder={t('autocare.ownerRequestsQuoteNotePlaceholder')} className="min-h-20 w-full rounded-[var(--radius-control)] border border-border bg-background p-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40" /><button disabled={isQuoting} className="h-10 rounded-[var(--radius-control)] bg-primary px-4 text-xs font-black text-primary-foreground">{isQuoting ? t('common.saving') : t('autocare.ownerRequestsSendQuote')}</button>{quoteErrorMessage && <p className="text-xs font-semibold text-destructive">{quoteErrorMessage}</p>}</form>}</div>
}

function ContactClientLink({ request, locale }: { request: AutoCareServiceRequest; locale: string }) {
    const phone = request.contactSnapshot?.phone
    const label = locale === 'ru' ? 'Связаться с клиентом' : 'Contact customer'
    return typeof phone === 'string' && phone.trim() ? <a href={`tel:${phone}`} className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-control)] border border-primary/30 px-3 text-xs font-black text-primary transition hover:bg-primary/10"><Phone className="size-3.5" />{label}</a> : <span className="inline-flex h-9 items-center rounded-[var(--radius-control)] border border-border px-3 text-xs font-black text-muted-foreground">{locale === 'ru' ? 'Контакт недоступен' : 'Contact unavailable'}</span>
}

function StatusBadge({ status }: { status: AutoCareServiceRequest['status'] }) { const { t } = useTranslation(); const key = `autocare.ownerRequestStatus.${status}` as const; return <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-black text-muted-foreground">{t(key)}</span> }
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold text-foreground">{value}</p></div> }
function vehicleText(vehicle: AutoCareServiceRequest['vehicleSnapshot']) { if (!vehicle) return null; return [vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ') || null }
function formatDate(value: string) { return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
function formatMoney(amountMinor: number, currencyCode: string) { return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode, maximumFractionDigits: 0 }).format(amountMinor / 100) }
