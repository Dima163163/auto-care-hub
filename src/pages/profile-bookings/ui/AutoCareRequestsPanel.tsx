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
    const { locale } = useTranslation()
    const isRu = locale === 'ru'
    const [pointsByAccount, setPointsByAccount] = useState<Record<string, string>>({})
    const [requestByAccount, setRequestByAccount] = useState<Record<string, string>>({})
    const [filterByAccount, setFilterByAccount] = useState<Record<string, BonusHistoryFilter>>({})
    const dateFormatter = new Intl.DateTimeFormat(isRu ? 'ru-RU' : undefined, { dateStyle: 'medium' })

    if (isLoading) return <div aria-label={isRu ? 'Загрузка бонусов' : 'Loading bonuses'} className="mt-4 h-28 animate-pulse rounded-[var(--radius-card)] bg-secondary" />
    if (accounts.length === 0) return <div className="mt-4 rounded-[var(--radius-card)] border border-border bg-background px-3 py-3"><div className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /><p className="text-sm font-black text-foreground">{isRu ? 'Бонусы пока не начислялись' : 'No bonuses yet'}</p></div><p className="mt-1 text-xs font-semibold text-muted-foreground">{isRu ? 'Баллы появятся после завершённого визита в сервисе.' : 'Points appear after a completed visit.'}</p></div>

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
        return <details key={account.id} className="group rounded-[var(--radius-card)] border border-primary/20 bg-primary/5 px-3 py-2" open={accounts.length === 1}><summary className="cursor-pointer list-none"><div className="flex items-start justify-between gap-2"><div><p className="text-[10px] font-black uppercase tracking-wide text-primary">{isRu ? 'Бонусы сервиса' : 'Service bonuses'}</p><p className="mt-1 text-lg font-black text-foreground">{account.balancePoints.toLocaleString(locale)} <span className="text-xs font-bold text-muted-foreground">{isRu ? 'баллов' : 'points'}</span></p></div><History className="mt-1 size-4 text-primary" /></div><p className="text-[11px] font-semibold text-muted-foreground">{isRu ? 'Начислено' : 'Earned'}: {account.earnedPoints.toLocaleString(locale)} · {isRu ? 'Операций' : 'Operations'}: {account.entries.length}</p><div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold"><span className="rounded-full bg-status-success-surface px-2 py-0.5 text-status-success-foreground">{isRu ? 'Возвращено' : 'Refunded'}: {refundedPoints}</span><span className="rounded-full bg-status-warning-surface px-2 py-0.5 text-status-warning-foreground">{isRu ? 'Истекло' : 'Expired'}: {expiredPoints}</span>{upcomingExpiry ? <span className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 text-muted-foreground"><Clock3 className="size-3" />{isRu ? 'до' : 'until'} {dateFormatter.format(new Date(upcomingExpiry.expiresAt!))}</span> : null}</div></summary><div className="mt-3 border-t border-primary/15 pt-3"><div className="flex items-center justify-between gap-2"><p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">{isRu ? 'История операций' : 'Transaction history'}</p><select aria-label={isRu ? 'Фильтр операций' : 'Transaction filter'} value={historyFilter} onChange={(event) => setFilterByAccount((current) => ({ ...current, [account.id]: event.target.value as BonusHistoryFilter }))} className="select-with-icon h-8 max-w-[150px] appearance-none rounded-[var(--radius-control)] border border-border bg-background px-2 pr-7 text-[10px] font-bold"><option value="all">{isRu ? 'Все операции' : 'All operations'}</option><option value="earn">{isRu ? 'Начисления' : 'Earned'}</option><option value="redeem">{isRu ? 'Списания' : 'Redeemed'}</option><option value="refund">{isRu ? 'Возвраты' : 'Refunds'}</option><option value="expire">{isRu ? 'Истёкшие' : 'Expired'}</option><option value="adjustment">{isRu ? 'Корректировки' : 'Adjustments'}</option></select></div>{history.length > 0 ? <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto pr-1">{history.map((entry) => <li key={entry.id} className="flex items-start justify-between gap-2 text-[11px]"><span className="min-w-0"><span className="block font-bold text-foreground">{entryLabel(entry.type, isRu)}{entry.requestId ? ` · ${entry.requestId}` : ''}</span><span className="block text-muted-foreground">{entry.reason} · {dateFormatter.format(new Date(entry.createdAt))}{entry.expiresAt ? ` · ${isRu ? 'до' : 'until'} ${dateFormatter.format(new Date(entry.expiresAt))}` : ''}</span></span><b className={entry.points >= 0 ? 'text-status-success-foreground' : 'text-status-danger-foreground'}>{entry.points > 0 ? '+' : ''}{entry.points}</b></li>)}</ul> : <p className="mt-2 text-[11px] font-semibold text-muted-foreground">{isRu ? 'Нет операций этого типа.' : 'No transactions of this type.'}</p>}</div>{eligible.length > 0 ? <div className="mt-3 grid gap-2 border-t border-primary/15 pt-3"><p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">{isRu ? 'Списать бонусы в подтверждённую запись' : 'Redeem for a confirmed booking'}</p><div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_88px_auto]"><select aria-label={isRu ? 'Запись для списания бонусов' : 'Booking for bonus redemption'} value={selectedRequestId} onChange={(event) => setRequestByAccount((current) => ({ ...current, [account.id]: event.target.value }))} className="select-with-icon min-w-0 appearance-none rounded-[var(--radius-control)] border border-border bg-background px-2 pr-7 text-xs"><option value="" disabled>{isRu ? 'Выберите запись' : 'Choose booking'}</option>{eligible.map((request) => <option key={request.id} value={request.id}>{request.serviceLabels[locale] ?? request.serviceLabels.ru ?? request.serviceSlug}</option>)}</select><input aria-label={isRu ? 'Количество бонусов' : 'Bonus points'} type="number" min="1" max={Math.min(account.balancePoints, maxPoints)} value={pointsByAccount[account.id] ?? ''} onChange={(event) => setPointsByAccount((current) => ({ ...current, [account.id]: event.target.value }))} placeholder="0" className="w-full rounded-[var(--radius-control)] border border-border bg-background px-2 text-xs" /><button type="button" disabled={isRedeeming || !selectedRequestId || !Number.isInteger(points) || points < 1 || points > account.balancePoints || points > maxPoints} onClick={() => void onRedeem({ providerId: account.providerId, requestId: selectedRequestId, points, idempotencyKey: `bonus-redeem-${account.id}-${selectedRequestId}` })} className="inline-flex items-center justify-center gap-1 rounded-[var(--radius-control)] bg-primary px-2 text-[11px] font-black text-primary-foreground disabled:opacity-50"><RotateCcw className="size-3" />{isRu ? 'Списать' : 'Redeem'}</button></div><p className="text-[10px] font-semibold text-muted-foreground">{isRu ? `До ${Math.min(account.balancePoints, maxPoints).toLocaleString(locale)} баллов для этой записи. Повторный клик не создаст дубль.` : `Up to ${Math.min(account.balancePoints, maxPoints).toLocaleString(locale)} points for this booking. Repeated clicks are idempotent.`}</p>{redeemError ? <p role="alert" className="text-[11px] font-semibold text-destructive">{isRu ? 'Не удалось списать бонусы. Проверьте запись и попробуйте ещё раз.' : 'Could not redeem bonuses. Check the booking and retry.'}</p> : null}</div> : <p className="mt-3 border-t border-primary/15 pt-3 text-[11px] font-semibold text-muted-foreground">{isRu ? 'Списание доступно после подтверждения записи сервисом.' : 'Redemption is available after the service confirms your booking.'}</p>}</details>
    })}</div>
}

function entryLabel(type: AutoCareBonusAccount['entries'][number]['type'], isRu: boolean) {
    const labels = isRu ? { earn: 'Начисление', redeem: 'Списание', refund: 'Возврат', expire: 'Истечение срока', adjustment: 'Корректировка' } : { earn: 'Earned', redeem: 'Redeemed', refund: 'Refund', expire: 'Expired', adjustment: 'Adjustment' }
    return labels[type]
}

function RequestCard({ request, selected, onSelect }: { request: AutoCareServiceRequest; selected: boolean; onSelect: () => void }) {
    const { t } = useTranslation()
    return <button type="button" onClick={onSelect} className={`rounded-[var(--radius-card)] border p-4 text-left transition ${selected ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/50'}`}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-foreground">{request.serviceLabels.ru ?? request.serviceSlug}</p><p className="mt-1 text-xs font-semibold text-muted-foreground">{request.providerName}</p></div><Status status={request.status} /></div><div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold text-muted-foreground"><span>{request.preferredAt ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(request.preferredAt)) : t('autocare.clientServiceRequestsFlexible')}</span>{request.priceFromMinor !== null && request.currencyCode ? <span className="font-black text-foreground">{t('autocare.clientServiceRequestsBookedPrice')}: {formatMoney(request.priceFromMinor, request.currencyCode)}</span> : null}{request.quote ? <span className="font-black text-primary">{formatMoney(request.quote.amountMinor, request.quote.currencyCode)}</span> : null}</div>{request.booking ? <BookingSnapshot booking={request.booking} /> : null}<p className="mt-3 text-xs font-bold text-primary">{t('autocare.clientServiceRequestsOpen')}</p></button>
}

function BookingSnapshot({ booking }: { booking: NonNullable<AutoCareServiceRequest['booking']> }) {
    const { locale } = useTranslation()
    const date = new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: booking.timezone }).format(new Date(booking.scheduledAt))
    const payableAmount = booking.payableAmountMinor ?? booking.amountMinor
    const hasBonusDiscount = typeof booking.bonusDiscountMinor === 'number' && booking.bonusDiscountMinor > 0
    const vehicle = booking.vehicleSnapshot
    const vehicleLabel = vehicle && typeof vehicle.make === 'string' && typeof vehicle.model === 'string' ? `${vehicle.make} ${vehicle.model} · ${vehicle.year ?? ''}` : null
    const vehicleMeta = vehicle ? [vehicle.licensePlate, vehicle.internalNumber, vehicle.vin ? `VIN ${vehicle.vin}` : null].filter(Boolean).join(' · ') : ''
    return <div className="mt-3 flex items-start gap-2 rounded-[var(--radius-control)] border border-status-success-border bg-status-success-surface px-3 py-2 text-xs text-status-success-foreground"><CalendarCheck className="mt-0.5 size-3.5 shrink-0" /><span><strong className="font-black">{locale === 'ru' ? 'Запись подтверждена' : 'Booking confirmed'}</strong><span className="mt-0.5 block font-semibold">{date} · {hasBonusDiscount ? <><s className="mr-1 opacity-70">{formatMoney(booking.amountMinor, booking.currencyCode)}</s><span>{formatMoney(payableAmount, booking.currencyCode)}</span><span className="ml-1 text-status-success-foreground">(-{formatMoney(booking.bonusDiscountMinor!, booking.currencyCode)})</span></> : formatMoney(payableAmount, booking.currencyCode)}</span>{vehicleLabel ? <span className="mt-1 block font-semibold">{vehicleLabel}{vehicleMeta ? ` · ${vehicleMeta}` : ''}</span> : null}</span></div>
}

function Conversation({ request, onClose }: { request: AutoCareServiceRequest; onClose: () => void }) {
    const { t } = useTranslation()
    const [acceptQuote, { isLoading: isAccepting }] = useAcceptAutoCareServiceQuoteMutation()
    const [declineQuote, { isLoading: isDeclining }] = useDeclineAutoCareServiceQuoteMutation()
    const [cancelRequest, { isLoading: isCancelling, error: cancelError }] = useCancelAutoCareServiceRequestMutation()
    const [decideReschedule, { isLoading: isDecidingReschedule, error: rescheduleError }] = useDecideAutoCareServiceRescheduleMutation()
    const canCancel = ['draft', 'open', 'awaiting_reply', 'estimate_shared', 'accepted'].includes(request.status)
    const handleCancel = () => {
        if (!window.confirm(t('autocare.clientServiceRequestsCancelConfirm'))) return
        void cancelRequest({ requestId: request.id }).unwrap().catch(() => undefined)
    }
    return <div className="mt-5 border-t border-border pt-5"><div className="mb-3 flex items-center justify-end"><button type="button" onClick={onClose} className="text-xs font-bold text-muted-foreground hover:text-foreground">{t('common.close')}</button></div>{request.quoteHistory.length > 0 ? <QuoteHistory quotes={request.quoteHistory} /> : null}{request.quote ? <div className="mb-4 rounded-[var(--radius-card)] bg-primary/5 p-3"><div className="flex items-center gap-3"><CheckCircle2 className="size-4 text-primary" /><p className="text-xs font-bold text-foreground">{t('autocare.clientServiceRequestsQuote')} · {formatMoney(request.quote.amountMinor, request.quote.currencyCode)}</p></div>{request.status === 'estimate_shared' && (request.quote.status ?? 'pending') === 'pending' ? <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={isAccepting || isDeclining} onClick={() => void acceptQuote(request.id)} className="h-9 rounded-[var(--radius-control)] bg-primary px-3 text-xs font-black text-primary-foreground">{isAccepting ? t('common.saving') : t('autocare.clientServiceRequestsAcceptQuote')}</button><button type="button" disabled={isAccepting || isDeclining} onClick={() => void declineQuote(request.id)} className="h-9 rounded-[var(--radius-control)] border border-border px-3 text-xs font-bold text-foreground">{isDeclining ? t('common.saving') : t('autocare.clientServiceRequestsDeclineQuote')}</button></div> : request.quote.status === 'expired' ? <p className="mt-3 text-xs font-semibold text-destructive">{t('autocare.clientServiceRequestsQuoteExpired')}</p> : null}</div> : null}{request.reschedule?.status === 'pending' ? <div className="mb-4 rounded-[var(--radius-card)] border border-primary/30 bg-primary/5 p-3"><p className="text-xs font-black text-foreground">{t('autocare.clientServiceRequestsReschedule')}</p><p className="mt-1 text-sm font-bold text-foreground">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(request.reschedule.proposedAt))}</p>{request.reschedule.reason ? <p className="mt-1 text-xs text-muted-foreground">{request.reschedule.reason}</p> : null}<div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={isDecidingReschedule} onClick={() => void decideReschedule({ requestId: request.id, decision: 'accept' })} className="h-9 rounded-[var(--radius-control)] bg-primary px-3 text-xs font-black text-primary-foreground">{isDecidingReschedule ? t('common.saving') : t('autocare.clientServiceRequestsRescheduleAccept')}</button><button type="button" disabled={isDecidingReschedule} onClick={() => void decideReschedule({ requestId: request.id, decision: 'reject' })} className="h-9 rounded-[var(--radius-control)] border border-border px-3 text-xs font-bold text-foreground">{t('autocare.clientServiceRequestsRescheduleReject')}</button></div>{rescheduleError ? <p className="mt-2 text-xs font-semibold text-destructive">{getApiErrorMessage(rescheduleError, t('autocare.clientServiceRequestsRescheduleError'))}</p> : null}</div> : null}{request.status === 'closed' ? <ReviewComposer requestId={request.id} /> : null}<ServiceRequestChat requestId={request.id} />{canCancel ? <div className="mt-4 border-t border-border pt-4"><button type="button" disabled={isCancelling} onClick={handleCancel} className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-control)] border border-destructive/40 px-3 text-xs font-black text-destructive hover:bg-destructive/5"><CircleX className="size-3.5" />{isCancelling ? t('common.saving') : t('autocare.clientServiceRequestsCancel')}</button>{cancelError ? <p className="mt-2 text-xs font-semibold text-destructive">{getApiErrorMessage(cancelError, t('autocare.clientServiceRequestsCancelError'))}</p> : null}</div> : null}</div>
}

function QuoteHistory({ quotes }: { quotes: AutoCareServiceRequest['quoteHistory'] }) {
    const { locale } = useTranslation()
    return <details className="mb-4 rounded-[var(--radius-card)] border border-border bg-background px-3 py-2"><summary className="cursor-pointer text-xs font-black text-foreground">{locale === 'ru' ? `История смет (${quotes.length})` : `Quote history (${quotes.length})`}</summary><ol className="mt-3 grid gap-2 border-t border-border pt-3">{[...quotes].sort((a, b) => b.version - a.version).map((quote) => <li key={quote.id} className="flex items-center justify-between gap-3 text-xs"><span className="font-semibold text-muted-foreground">v{quote.version} · {new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : undefined, { dateStyle: 'medium' }).format(new Date(quote.createdAt))}</span><strong className="text-foreground">{formatMoney(quote.amountMinor, quote.currencyCode)}</strong></li>)}</ol></details>
}

function ReviewComposer({ requestId }: { requestId: string }) {
    const { locale } = useTranslation()
    const [rating, setRating] = useState('5')
    const [text, setText] = useState('')
    const [createReview, state] = useCreateAutoCareReviewMutation()
    const [submitted, setSubmitted] = useState(false)
    const [validationError, setValidationError] = useState<'rating' | 'text' | null>(null)
    const isRu = locale === 'ru'
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
    if (submitted) return <p className="mb-4 rounded-[var(--radius-card)] bg-status-success-surface px-3 py-2 text-xs font-bold text-status-success-foreground">{isRu ? 'Спасибо! Отзыв отправлен на проверку.' : 'Thank you! Your review is pending moderation.'}</p>
    return <div className="mb-4 rounded-[var(--radius-card)] border border-primary/20 bg-primary/5 p-4"><p className="text-sm font-black text-foreground">{isRu ? 'Расскажите о визите' : 'Share your visit experience'}</p><div className="mt-3 grid gap-2 sm:grid-cols-[120px_1fr_auto]"><select value={rating} onChange={(event) => { setValidationError(null); setRating(event.target.value) }} aria-label={isRu ? 'Оценка' : 'Rating'} aria-invalid={validationError === 'rating' || undefined} className="select-with-icon h-10 appearance-none rounded-[var(--radius-control)] border border-border bg-background px-3 pr-8 text-sm font-bold"><option value="5">5 ★</option><option value="4">4 ★</option><option value="3">3 ★</option><option value="2">2 ★</option><option value="1">1 ★</option></select><textarea value={text} onChange={(event) => { setValidationError(null); setText(event.target.value) }} rows={2} minLength={10} maxLength={1000} aria-label={isRu ? 'Текст отзыва' : 'Review text'} aria-invalid={validationError === 'text' || undefined} aria-describedby={validationError ? 'autocare-review-validation' : undefined} placeholder={isRu ? 'Что понравилось или что можно улучшить?' : 'What went well or could improve?'} className="min-h-10 rounded-[var(--radius-control)] border border-border bg-background px-3 py-2 text-sm" /><button type="button" disabled={state.isLoading} onClick={() => void submit()} className="h-10 rounded-[var(--radius-control)] bg-primary px-3 text-xs font-black text-primary-foreground disabled:opacity-60">{isRu ? 'Отправить' : 'Submit'}</button></div>{validationError ? <p id="autocare-review-validation" role="alert" className="mt-2 text-xs font-semibold text-destructive">{validationError === 'rating' ? (isRu ? 'Оценка должна быть от 1 до 5.' : 'Rating must be between 1 and 5.') : (isRu ? 'Текст отзыва должен содержать от 10 до 1 000 символов.' : 'Review text must contain 10 to 1,000 characters.')}</p> : null}{state.isError ? <p role="alert" className="mt-2 text-xs font-semibold text-destructive">{isRu ? 'Не удалось отправить отзыв. Попробуйте ещё раз.' : 'Could not submit the review. Please retry.'}</p> : null}</div>
}

function Status({ status }: { status: AutoCareServiceRequest['status'] }) { const { t } = useTranslation(); return <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-black text-muted-foreground">{t(`autocare.ownerRequestStatus.${status}` as const)}</span> }
function formatMoney(amountMinor: number, currencyCode: string) { return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode, maximumFractionDigits: 0 }).format(amountMinor / 100) }
