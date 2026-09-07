import { useState } from 'react'
import { CalendarCheck, CheckCircle2, CircleX, Clock3, History, RotateCcw, ShieldCheck, Wrench } from 'lucide-react'

import {
    ServiceRequestChat,
    useAcceptAutoCareServiceQuoteMutation,
    useCancelAutoCareServiceRequestMutation,
    useCreateAutoCareReviewMutation,
    useDecideAutoCareServiceRescheduleMutation,
    useDeclineAutoCareServiceQuoteMutation,
    useGetMyAutoCareServiceRequestsQuery,
    useGetMyAutoCareBonusAccountsQuery,
    useRedeemAutoCareBonusMutation,
    type AutoCareBonusAccount,
    type AutoCareServiceRequest,
    type RedeemAutoCareBonusInput,
} from '@/entities/automotive-service'
import { validateAutoCareReview } from '@/entities/automotive-service/lib/review-input-validation'
import { getApiErrorMessage, getApiErrorState } from '@/shared/api/getApiErrorMessage'
import { resolveQueryViewState } from '@/shared/api/query-view-state'
import type { TranslationKey } from '@/shared/lib/i18n'
import { formatCurrency, formatDateTime, formatNumber } from '@/shared/lib/locale-format'
import { useTranslation } from '@/shared/lib/useTranslation'
import { QueryRefreshStatus } from '@/shared/ui/query-refresh-status'
import { QueryStateCard } from '@/shared/ui/query-state-card'
import { CardsGridSkeleton } from '@/shared/ui/loading-skeleton'
import { StateCard } from '@/shared/ui/state-card'

export function AutoCareRequestsPanel() {
    const { t } = useTranslation()
    const requestsQuery = useGetMyAutoCareServiceRequestsQuery()
    const bonusesQuery = useGetMyAutoCareBonusAccountsQuery()
    const requests = requestsQuery.data ?? []
    const bonusAccounts = bonusesQuery.data ?? []
    const requestErrorState = getApiErrorState(requestsQuery.error)
    const requestsState = resolveQueryViewState({
        isLoading: requestsQuery.isLoading,
        isFetching: requestsQuery.isFetching,
        isError: requestsQuery.isError,
        hasData: Boolean(requestsQuery.data),
        hasResults: requests.length > 0,
        isOffline: requestErrorState === 'offline',
        isPermissionDenied: requestErrorState === 'permission-denied',
        isSuspended: requestErrorState === 'suspended',
        isStale: requestErrorState === 'stale',
        isSessionExpired: requestErrorState === 'session-expired',
    })
    const bonusErrorState = getApiErrorState(bonusesQuery.error)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [redeemBonus, redeemState] = useRedeemAutoCareBonusMutation()
    const selected = requests.find((item) => item.id === selectedId) ?? null

    const canRenderRequests = requestsState === 'success' || requestsState === 'refreshing' || requestsState === 'empty' || requestsState === 'stale-error'

    return <section className="mt-6 rounded-[var(--radius-panel)] border border-border bg-card p-4 shadow-sm sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><Wrench className="size-4 text-primary" /><h2 className="text-lg font-black text-foreground">{t('autocare.clientServiceRequestsTitle')}</h2></div><p className="mt-1 text-xs font-semibold text-muted-foreground">{t('autocare.clientServiceRequestsDescription')}</p></div><span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black text-primary">{requests.length}</span></div><QueryRefreshStatus isRefreshing={requestsState === 'refreshing'} label={t('common.refreshing')} /><BonusSummary accounts={bonusAccounts} requests={requests} onRedeem={(input) => redeemBonus(input).unwrap()} isRedeeming={redeemState.isLoading} redeemError={redeemState.error} isLoading={bonusesQuery.isLoading} />{bonusErrorState && bonusesQuery.data === undefined ? <QueryStateCard className="mt-4" state={toQueryState(bonusErrorState)} error={bonusesQuery.error} onRetry={bonusesQuery.refetch} /> : null}{requestsState === 'loading' ? <div className="mt-5"><CardsGridSkeleton label={t('common.loading')} count={2} /></div> : null}{!canRenderRequests && requestsState !== 'loading' ? <QueryStateCard className="mt-5" state={requestsState} error={requestsQuery.error} onRetry={requestsQuery.refetch} /> : null}{canRenderRequests && requestsState === 'stale-error' ? <QueryStateCard className="mt-5" state="stale-error" error={requestsQuery.error} onRetry={requestsQuery.refetch} /> : null}{canRenderRequests && requestsState === 'empty' ? <StateCard className="mt-5" variant="empty" title={t('autocare.clientServiceRequestsEmpty')} description={t('autocare.clientServiceRequestsDescription')} /> : null}{canRenderRequests && requests.length > 0 ? <div className="mt-5 grid gap-3 lg:grid-cols-2">{requests.map((request) => <RequestCard key={request.id} request={request} selected={request.id === selectedId} onSelect={() => setSelectedId(request.id)} />)}</div> : null}{selected ? <Conversation request={selected} onClose={() => setSelectedId(null)} /> : null}</section>
}

function toQueryState(state: ReturnType<typeof getApiErrorState>) {
    return state === 'offline' ? 'offline' : state === 'permission-denied' ? 'permission-denied' : state === 'suspended' ? 'suspended' : state === 'session-expired' ? 'session-expired' : state === 'stale' ? 'stale-error' : 'error'
}

type BonusHistoryFilter = 'all' | AutoCareBonusAccount['entries'][number]['type']

function BonusSummary({ accounts, requests, onRedeem, isRedeeming, redeemError, isLoading }: { accounts: AutoCareBonusAccount[]; requests: AutoCareServiceRequest[]; onRedeem: (input: RedeemAutoCareBonusInput) => Promise<unknown>; isRedeeming: boolean; redeemError: unknown; isLoading: boolean }) {
    const { locale, t } = useTranslation()
    const [pointsByAccount, setPointsByAccount] = useState<Record<string, string>>({})
    const [requestByAccount, setRequestByAccount] = useState<Record<string, string>>({})
    const [filterByAccount, setFilterByAccount] = useState<Record<string, BonusHistoryFilter>>({})

    if (isLoading) return <div aria-label={t('autocare.clientBonusesLoading')} className="mt-4 h-28 animate-pulse rounded-[var(--radius-card)] bg-secondary" />
    if (accounts.length === 0) return <div className="mt-4 rounded-[var(--radius-card)] border border-border bg-background px-3 py-3"><div className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /><p className="text-sm font-black text-foreground">{t('autocare.clientBonusesEmptyTitle')}</p></div><p className="mt-1 text-xs font-semibold text-muted-foreground">{t('autocare.clientBonusesEmptyDescription')}</p></div>

    return <div className="mt-4 grid gap-3 sm:grid-cols-2">{accounts.map((account) => {
        const eligible = requests.filter((request) => request.providerId === account.providerId && request.booking && request.status === 'accepted')
        const selectedRequestId = requestByAccount[account.id] ?? eligible[0]?.id ?? ''
        const selectedRequest = eligible.find((request) => request.id === selectedRequestId) ?? eligible[0]
        const maxPoints = selectedRequest?.booking ? Math.floor((selectedRequest.booking.payableAmountMinor ?? selectedRequest.booking.amountMinor) / 100) : 0
        const points = Number(pointsByAccount[account.id] ?? '')
        const refundedPoints = account.entries.filter((entry) => entry.type === 'refund').reduce((sum, entry) => sum + Math.max(0, entry.points), 0)
        const expiredPoints = account.entries.filter((entry) => entry.type === 'expire').reduce((sum, entry) => sum + Math.abs(entry.points), 0)
        const upcomingExpiry = account.entries.filter((entry) => entry.points > 0 && entry.expiresAt && new Date(entry.expiresAt).getTime() > Date.now()).sort((left, right) => new Date(left.expiresAt!).getTime() - new Date(right.expiresAt!).getTime())[0]
        const historyFilter = filterByAccount[account.id] ?? 'all'
        const history = historyFilter === 'all' ? account.entries : account.entries.filter((entry) => entry.type === historyFilter)
        return <details key={account.id} className="group rounded-[var(--radius-card)] border border-primary/20 bg-primary/5 px-3 py-2" open={accounts.length === 1}><summary className="cursor-pointer list-none"><div className="flex items-start justify-between gap-2"><div><p className="text-[10px] font-black uppercase tracking-wide text-primary">{t('autocare.clientBonusesService')}</p><p className="mt-1 text-lg font-black text-foreground">{formatNumber(account.balancePoints, locale, { maximumFractionDigits: 0 })} <span className="text-xs font-bold text-muted-foreground">{t('autocare.clientBonusesPoints')}</span></p></div><History className="mt-1 size-4 text-primary" /></div><p className="text-[11px] font-semibold text-muted-foreground">{t('autocare.clientBonusesEarned')}: {formatNumber(account.earnedPoints, locale, { maximumFractionDigits: 0 })} · {t('autocare.clientBonusesOperations')}: {account.entries.length}</p><div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold"><span className="rounded-full bg-status-success-surface px-2 py-0.5 text-status-success-foreground">{t('autocare.clientBonusesRefunded')}: {formatNumber(refundedPoints, locale, { maximumFractionDigits: 0 })}</span><span className="rounded-full bg-status-warning-surface px-2 py-0.5 text-status-warning-foreground">{t('autocare.clientBonusesExpired')}: {formatNumber(expiredPoints, locale, { maximumFractionDigits: 0 })}</span>{upcomingExpiry ? <span className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 text-muted-foreground"><Clock3 className="size-3" />{t('autocare.clientBonusesUntil')} {formatDateTime(upcomingExpiry.expiresAt!, locale, { dateStyle: 'medium' })}</span> : null}</div></summary><div className="mt-3 border-t border-primary/15 pt-3"><div className="flex items-center justify-between gap-2"><p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">{t('autocare.clientBonusesHistory')}</p><select aria-label={t('autocare.clientBonusesFilter')} value={historyFilter} onChange={(event) => setFilterByAccount((current) => ({ ...current, [account.id]: event.target.value as BonusHistoryFilter }))} className="select-with-icon h-8 max-w-[150px] appearance-none rounded-[var(--radius-control)] border border-border bg-background px-2 pr-7 text-[10px] font-bold"><option value="all">{t('autocare.clientBonusesAllOperations')}</option><option value="earn">{t('autocare.clientBonusesEarn')}</option><option value="redeem">{t('autocare.clientBonusesRedeemed')}</option><option value="refund">{t('autocare.clientBonusesRefund')}</option><option value="expire">{t('autocare.clientBonusesExpire')}</option><option value="adjustment">{t('autocare.clientBonusesAdjustment')}</option></select></div>{history.length > 0 ? <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto pr-1">{history.map((entry) => <li key={entry.id} className="flex items-start justify-between gap-2 text-[11px]"><span className="min-w-0"><span className="block font-bold text-foreground">{entryLabel(entry.type, t)}{entry.requestId ? ` · ${entry.requestId}` : ''}</span><span className="block text-muted-foreground">{entry.reason} · {formatDateTime(entry.createdAt, locale, { dateStyle: 'medium' })}{entry.expiresAt ? ` · ${t('autocare.clientBonusesUntil')} ${formatDateTime(entry.expiresAt, locale, { dateStyle: 'medium' })}` : ''}</span></span><b className={entry.points >= 0 ? 'text-status-success-foreground' : 'text-status-danger-foreground'}>{entry.points > 0 ? '+' : ''}{formatNumber(entry.points, locale, { maximumFractionDigits: 0 })}</b></li>)}</ul> : <p className="mt-2 text-[11px] font-semibold text-muted-foreground">{t('autocare.clientBonusesNoTransactions')}</p>}</div>{eligible.length > 0 ? <div className="mt-3 grid gap-2 border-t border-primary/15 pt-3"><p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">{t('autocare.clientBonusesRedeemTitle')}</p><div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_88px_auto]"><select aria-label={t('autocare.clientBonusesBooking')} value={selectedRequestId} onChange={(event) => setRequestByAccount((current) => ({ ...current, [account.id]: event.target.value }))} className="select-with-icon min-w-0 appearance-none rounded-[var(--radius-control)] border border-border bg-background px-2 pr-7 text-xs"><option value="" disabled>{t('autocare.clientBonusesChooseBooking')}</option>{eligible.map((request) => <option key={request.id} value={request.id}>{request.serviceLabels[locale] ?? request.serviceLabels.en ?? request.serviceLabels.ru ?? request.serviceSlug}</option>)}</select><input aria-label={t('autocare.clientBonusesPointsLabel')} type="number" min="1" max={Math.min(account.balancePoints, maxPoints)} value={pointsByAccount[account.id] ?? ''} onChange={(event) => setPointsByAccount((current) => ({ ...current, [account.id]: event.target.value }))} placeholder="0" className="w-full rounded-[var(--radius-control)] border border-border bg-background px-2 text-xs" /><button type="button" disabled={isRedeeming || !selectedRequestId || !Number.isInteger(points) || points < 1 || points > account.balancePoints || points > maxPoints} onClick={() => void onRedeem({ providerId: account.providerId, requestId: selectedRequestId, points, idempotencyKey: `bonus-redeem-${account.id}-${selectedRequestId}` })} className="inline-flex items-center justify-center gap-1 rounded-[var(--radius-control)] bg-primary px-2 text-[11px] font-black text-primary-foreground disabled:opacity-50"><RotateCcw className="size-3" />{t('autocare.clientBonusesRedeem')}</button></div><p className="text-[10px] font-semibold text-muted-foreground">{t('autocare.clientBonusesLimitHint', { points: formatNumber(Math.min(account.balancePoints, maxPoints), locale, { maximumFractionDigits: 0 }) })}</p>{redeemError ? <p role="alert" className="text-[11px] font-semibold text-destructive">{t('autocare.clientBonusesRedeemError')}</p> : null}</div> : <p className="mt-3 border-t border-primary/15 pt-3 text-[11px] font-semibold text-muted-foreground">{t('autocare.clientBonusesUnavailable')}</p>}</details>
    })}</div>
}

function entryLabel(type: AutoCareBonusAccount['entries'][number]['type'], t: (key: TranslationKey) => string) {
    const labels = {
        earn: t('autocare.clientBonusesEarn'),
        redeem: t('autocare.clientBonusesRedeemed'),
        refund: t('autocare.clientBonusesRefund'),
        expire: t('autocare.clientBonusesExpire'),
        adjustment: t('autocare.clientBonusesAdjustment'),
    }
    return labels[type]
}

function RequestCard({ request, selected, onSelect }: { request: AutoCareServiceRequest; selected: boolean; onSelect: () => void }) {
    const { locale, t } = useTranslation()
    const serviceLabel = request.serviceLabels[locale] ?? request.serviceLabels.en ?? request.serviceLabels.ru ?? request.serviceSlug
    return <button type="button" onClick={onSelect} className={`rounded-[var(--radius-card)] border p-4 text-left transition ${selected ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/50'}`}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-foreground">{serviceLabel}</p><p className="mt-1 text-xs font-semibold text-muted-foreground">{request.providerName}</p></div><Status status={request.status} /></div><div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold text-muted-foreground"><span>{request.preferredAt ? formatDateTime(request.preferredAt, locale, { dateStyle: 'medium', timeStyle: 'short' }) : t('autocare.clientServiceRequestsFlexible')}</span>{request.priceFromMinor !== null && request.currencyCode ? <span className="font-black text-foreground">{t('autocare.clientServiceRequestsBookedPrice')}: {formatMoney(request.priceFromMinor, request.currencyCode, locale)}</span> : null}{request.quote ? <span className="font-black text-primary">{formatMoney(request.quote.amountMinor, request.quote.currencyCode, locale)}</span> : null}</div>{request.booking ? <BookingSnapshot booking={request.booking} /> : null}<p className="mt-3 text-xs font-bold text-primary">{t('autocare.clientServiceRequestsOpen')}</p></button>
}

function BookingSnapshot({ booking }: { booking: NonNullable<AutoCareServiceRequest['booking']> }) {
    const { locale, t } = useTranslation()
    const date = formatDateTime(booking.scheduledAt, locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: booking.timezone })
    const payableAmount = booking.payableAmountMinor ?? booking.amountMinor
    const hasBonusDiscount = typeof booking.bonusDiscountMinor === 'number' && booking.bonusDiscountMinor > 0
    const vehicle = booking.vehicleSnapshot
    const vehicleLabel = vehicle && typeof vehicle.make === 'string' && typeof vehicle.model === 'string' ? `${vehicle.make} ${vehicle.model} · ${vehicle.year ?? ''}` : null
    const vehicleMeta = vehicle ? [vehicle.licensePlate, vehicle.internalNumber, vehicle.vin ? `${t('autocare.clientBookingVin')} ${vehicle.vin}` : null].filter(Boolean).join(' · ') : ''
    return <div className="mt-3 flex items-start gap-2 rounded-[var(--radius-control)] border border-status-success-border bg-status-success-surface px-3 py-2 text-xs text-status-success-foreground"><CalendarCheck className="mt-0.5 size-3.5 shrink-0" /><span><strong className="font-black">{t('autocare.clientBookingConfirmed')}</strong><span className="mt-0.5 block font-semibold">{date} · {hasBonusDiscount ? <><s className="mr-1 opacity-70">{formatMoney(booking.amountMinor, booking.currencyCode, locale)}</s><span>{formatMoney(payableAmount, booking.currencyCode, locale)}</span><span className="ml-1 text-status-success-foreground">(-{formatMoney(booking.bonusDiscountMinor!, booking.currencyCode, locale)})</span></> : formatMoney(payableAmount, booking.currencyCode, locale)}</span>{vehicleLabel ? <span className="mt-1 block font-semibold">{vehicleLabel}{vehicleMeta ? ` · ${vehicleMeta}` : ''}</span> : null}</span></div>
}

function Conversation({ request, onClose }: { request: AutoCareServiceRequest; onClose: () => void }) {
    const { locale, t } = useTranslation()
    const [acceptQuote, { isLoading: isAccepting }] = useAcceptAutoCareServiceQuoteMutation()
    const [declineQuote, { isLoading: isDeclining }] = useDeclineAutoCareServiceQuoteMutation()
    const [cancelRequest, { isLoading: isCancelling, error: cancelError }] = useCancelAutoCareServiceRequestMutation()
    const [decideReschedule, { isLoading: isDecidingReschedule, error: rescheduleError }] = useDecideAutoCareServiceRescheduleMutation()
    const [quoteActionError, setQuoteActionError] = useState<string | null>(null)
    const [rescheduleActionError, setRescheduleActionError] = useState<string | null>(null)
    const quoteRevision = request.quoteHistory.at(-1)
    const canCancel = ['draft', 'open', 'awaiting_reply', 'estimate_shared', 'accepted'].includes(request.status)
    const handleQuoteDecision = async (decision: 'accept' | 'decline') => {
        setQuoteActionError(null)
        setRescheduleActionError(null)
        try {
            const input = { requestId: request.id, quoteId: quoteRevision?.id ?? '', quoteVersion: quoteRevision?.version ?? 0 }
            await (decision === 'accept' ? acceptQuote(input) : declineQuote(input)).unwrap()
        } catch (error) {
            setQuoteActionError(getApiErrorMessage(error, t('autocare.clientServiceRequestsQuoteError')))
        }
    }
    const handleRescheduleDecision = async (decision: 'accept' | 'reject') => {
        setRescheduleActionError(null)
        setQuoteActionError(null)
        try {
            await decideReschedule({ requestId: request.id, decision }).unwrap()
        } catch (error) {
            setRescheduleActionError(getApiErrorMessage(error, t('autocare.clientServiceRequestsRescheduleError')))
        }
    }
    const handleCancel = () => {
        if (!window.confirm(t('autocare.clientServiceRequestsCancelConfirm'))) return
        void cancelRequest({ requestId: request.id }).unwrap().catch(() => undefined)
    }
    return <div className="mt-5 border-t border-border pt-5"><div className="mb-3 flex items-center justify-end"><button type="button" onClick={onClose} className="text-xs font-bold text-muted-foreground hover:text-foreground">{t('common.close')}</button></div>{request.quoteHistory.length > 0 ? <QuoteHistory quotes={request.quoteHistory} /> : null}{request.quote ? <div className="mb-4 rounded-[var(--radius-card)] bg-primary/5 p-3"><div className="flex items-center gap-3"><CheckCircle2 className="size-4 text-primary" /><p className="text-xs font-bold text-foreground">{t('autocare.clientServiceRequestsQuote')} · {formatMoney(request.quote.amountMinor, request.quote.currencyCode, locale)}</p></div>{request.status === 'estimate_shared' && (request.quote.status ?? 'pending') === 'pending' ? <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={isAccepting || isDeclining} onClick={() => void handleQuoteDecision('accept')} className="h-9 rounded-[var(--radius-control)] bg-primary px-3 text-xs font-black text-primary-foreground">{isAccepting ? t('common.saving') : t('autocare.clientServiceRequestsAcceptQuote')}</button><button type="button" disabled={isAccepting || isDeclining} onClick={() => void handleQuoteDecision('decline')} className="h-9 rounded-[var(--radius-control)] border border-border px-3 text-xs font-bold text-foreground">{isDeclining ? t('common.saving') : t('autocare.clientServiceRequestsDeclineQuote')}</button>{quoteActionError ? <p role="alert" className="basis-full text-xs font-semibold text-destructive">{quoteActionError}</p> : null}</div> : request.quote.status === 'expired' ? <p className="mt-3 text-xs font-semibold text-destructive">{t('autocare.clientServiceRequestsQuoteExpired')}</p> : null}</div> : null}{request.reschedule?.status === 'pending' ? <div className="mb-4 rounded-[var(--radius-card)] border border-primary/30 bg-primary/5 p-3"><p className="text-xs font-black text-foreground">{t('autocare.clientServiceRequestsReschedule')}</p><p className="mt-1 text-sm font-bold text-foreground">{formatDateTime(request.reschedule.proposedAt, locale, { dateStyle: 'medium', timeStyle: 'short' })}</p>{request.reschedule.reason ? <p className="mt-1 text-xs text-muted-foreground">{request.reschedule.reason}</p> : null}<div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={isDecidingReschedule} onClick={() => void handleRescheduleDecision('accept')} className="h-9 rounded-[var(--radius-control)] bg-primary px-3 text-xs font-black text-primary-foreground">{isDecidingReschedule ? t('common.saving') : t('autocare.clientServiceRequestsRescheduleAccept')}</button><button type="button" disabled={isDecidingReschedule} onClick={() => void handleRescheduleDecision('reject')} className="h-9 rounded-[var(--radius-control)] border border-border px-3 text-xs font-bold text-foreground">{t('autocare.clientServiceRequestsRescheduleReject')}</button></div>{rescheduleActionError ? <p role="alert" className="mt-2 text-xs font-semibold text-destructive">{rescheduleActionError}</p> : rescheduleError ? <p className="mt-2 text-xs font-semibold text-destructive">{getApiErrorMessage(rescheduleError, t('autocare.clientServiceRequestsRescheduleError'))}</p> : null}</div> : null}{request.status === 'closed' ? <ReviewComposer requestId={request.id} /> : null}<ServiceRequestChat requestId={request.id} />{canCancel ? <div className="mt-4 border-t border-border pt-4"><button type="button" disabled={isCancelling} onClick={handleCancel} className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-control)] border border-destructive/40 px-3 text-xs font-black text-destructive hover:bg-destructive/5"><CircleX className="size-3.5" />{isCancelling ? t('common.saving') : t('autocare.clientServiceRequestsCancel')}</button>{cancelError ? <p className="mt-2 text-xs font-semibold text-destructive">{getApiErrorMessage(cancelError, t('autocare.clientServiceRequestsCancelError'))}</p> : null}</div> : null}</div>
}

function QuoteHistory({ quotes }: { quotes: AutoCareServiceRequest['quoteHistory'] }) {
    const { locale, t } = useTranslation()
    return <details className="mb-4 rounded-[var(--radius-card)] border border-border bg-background px-3 py-2"><summary className="cursor-pointer text-xs font-black text-foreground">{t('autocare.clientQuoteHistory', { count: quotes.length })}</summary><ol className="mt-3 grid gap-2 border-t border-border pt-3">{[...quotes].sort((a, b) => b.version - a.version).map((quote) => <li key={quote.id} className="flex items-center justify-between gap-3 text-xs"><span className="font-semibold text-muted-foreground">v{quote.version} · {formatDateTime(quote.createdAt, locale, { dateStyle: 'medium' })}</span><strong className="text-foreground">{formatMoney(quote.amountMinor, quote.currencyCode, locale)}</strong></li>)}</ol></details>
}

function ReviewComposer({ requestId }: { requestId: string }) {
    const { t } = useTranslation()
    const [rating, setRating] = useState('5')
    const [text, setText] = useState('')
    const [createReview, state] = useCreateAutoCareReviewMutation()
    const [submitted, setSubmitted] = useState(false)
    const [validationError, setValidationError] = useState<'rating' | 'text' | null>(null)
    const submit = async () => {
        const validation = validateAutoCareReview(rating, text)
        if (!validation.valid) {
            setValidationError(validation.reason)
            return
        }
        setValidationError(null)
        try {
            await createReview({ requestId, rating: validation.rating, text: validation.text }).unwrap()
            setSubmitted(true)
        } catch {
            // RTK Query state exposes the retryable error below.
        }
    }
    if (submitted) return <p className="mb-4 rounded-[var(--radius-card)] bg-status-success-surface px-3 py-2 text-xs font-bold text-status-success-foreground">{t('autocare.clientReviewSubmitted')}</p>
    return <div className="mb-4 rounded-[var(--radius-card)] border border-primary/20 bg-primary/5 p-4"><p className="text-sm font-black text-foreground">{t('autocare.clientReviewTitle')}</p><div className="mt-3 grid gap-2 sm:grid-cols-[120px_1fr_auto]"><select value={rating} onChange={(event) => { setValidationError(null); setRating(event.target.value) }} aria-label={t('autocare.clientReviewRating')} aria-invalid={validationError === 'rating' || undefined} className="select-with-icon h-10 appearance-none rounded-[var(--radius-control)] border border-border bg-background px-3 pr-8 text-sm font-bold"><option value="5">5 ★</option><option value="4">4 ★</option><option value="3">3 ★</option><option value="2">2 ★</option><option value="1">1 ★</option></select><textarea value={text} onChange={(event) => { setValidationError(null); setText(event.target.value) }} rows={2} minLength={10} maxLength={1000} aria-label={t('autocare.clientReviewText')} aria-invalid={validationError === 'text' || undefined} aria-describedby={validationError ? 'autocare-review-validation' : undefined} placeholder={t('autocare.clientReviewPlaceholder')} className="min-h-10 rounded-[var(--radius-control)] border border-border bg-background px-3 py-2 text-sm" /><button type="button" disabled={state.isLoading} onClick={() => void submit()} className="h-10 rounded-[var(--radius-control)] bg-primary px-3 text-xs font-black text-primary-foreground disabled:opacity-60">{t('autocare.clientReviewSubmit')}</button></div>{validationError ? <p id="autocare-review-validation" role="alert" className="mt-2 text-xs font-semibold text-destructive">{validationError === 'rating' ? t('autocare.clientReviewRatingValidation') : t('autocare.clientReviewTextValidation')}</p> : null}{state.isError ? <p role="alert" className="mt-2 text-xs font-semibold text-destructive">{t('autocare.clientReviewSubmitError')}</p> : null}</div>
}

function Status({ status }: { status: AutoCareServiceRequest['status'] }) { const { t } = useTranslation(); return <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-black text-muted-foreground">{t(`autocare.ownerRequestStatus.${status}` as const)}</span> }
function formatMoney(amountMinor: number, currencyCode: string, locale: string) { return formatCurrency(amountMinor / 100, currencyCode, locale) }
