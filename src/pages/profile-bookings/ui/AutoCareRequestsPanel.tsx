import { useState } from 'react'
import { CheckCircle2, Wrench } from 'lucide-react'

import {
    ServiceRequestChat,
    useAcceptAutoCareServiceQuoteMutation,
    useDeclineAutoCareServiceQuoteMutation,
    useGetMyAutoCareServiceRequestsQuery,
    type AutoCareServiceRequest,
} from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'
import { RetryButton } from '@/shared/ui/query-refresh-error'

export function AutoCareRequestsPanel() {
    const { t } = useTranslation()
    const { data: requests = [], isLoading, isError, error, refetch } = useGetMyAutoCareServiceRequestsQuery()
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const selected = requests.find((item) => item.id === selectedId) ?? null

    return <section className="mt-6 rounded-[var(--radius-panel)] border border-border bg-card p-4 shadow-sm sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><Wrench className="size-4 text-primary" /><h2 className="text-lg font-black text-foreground">{t('autocare.clientServiceRequestsTitle')}</h2></div><p className="mt-1 text-xs font-semibold text-muted-foreground">{t('autocare.clientServiceRequestsDescription')}</p></div><span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black text-primary">{requests.length}</span></div>{isLoading ? <p className="mt-5 text-sm text-muted-foreground">{t('common.loading')}</p> : isError ? <div className="mt-5"><p className="text-sm font-semibold text-destructive">{getApiErrorMessage(error, t('common.failedToLoad'))}</p><RetryButton className="mt-3" onRetry={refetch} label={t('common.retry')} /></div> : requests.length === 0 ? <p className="mt-5 rounded-[var(--radius-card)] bg-secondary p-4 text-sm text-muted-foreground">{t('autocare.clientServiceRequestsEmpty')}</p> : <div className="mt-5 grid gap-3 lg:grid-cols-2">{requests.map((request) => <RequestCard key={request.id} request={request} selected={request.id === selectedId} onSelect={() => setSelectedId(request.id)} />)}</div>}{selected ? <Conversation request={selected} onClose={() => setSelectedId(null)} /> : null}</section>
}

function RequestCard({ request, selected, onSelect }: { request: AutoCareServiceRequest; selected: boolean; onSelect: () => void }) {
    const { t } = useTranslation()
    return <button type="button" onClick={onSelect} className={`rounded-[var(--radius-card)] border p-4 text-left transition ${selected ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/50'}`}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-foreground">{request.serviceLabels.ru ?? request.serviceSlug}</p><p className="mt-1 text-xs font-semibold text-muted-foreground">{request.providerName}</p></div><Status status={request.status} /></div><div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold text-muted-foreground"><span>{request.preferredAt ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(request.preferredAt)) : t('autocare.clientServiceRequestsFlexible')}</span>{request.priceFromMinor !== null && request.currencyCode ? <span className="font-black text-foreground">{t('autocare.clientServiceRequestsBookedPrice')}: {formatMoney(request.priceFromMinor, request.currencyCode)}</span> : null}{request.quote ? <span className="font-black text-primary">{formatMoney(request.quote.amountMinor, request.quote.currencyCode)}</span> : null}</div><p className="mt-3 text-xs font-bold text-primary">{t('autocare.clientServiceRequestsOpen')}</p></button>
}

function Conversation({ request, onClose }: { request: AutoCareServiceRequest; onClose: () => void }) {
    const { t } = useTranslation()
    const [acceptQuote, { isLoading: isAccepting }] = useAcceptAutoCareServiceQuoteMutation()
    const [declineQuote, { isLoading: isDeclining }] = useDeclineAutoCareServiceQuoteMutation()
    return <div className="mt-5 border-t border-border pt-5"><div className="mb-3 flex items-center justify-end"><button type="button" onClick={onClose} className="text-xs font-bold text-muted-foreground hover:text-foreground">{t('common.close')}</button></div>{request.quote ? <div className="mb-4 rounded-[var(--radius-card)] bg-primary/5 p-3"><div className="flex items-center gap-3"><CheckCircle2 className="size-4 text-primary" /><p className="text-xs font-bold text-foreground">{t('autocare.clientServiceRequestsQuote')} · {formatMoney(request.quote.amountMinor, request.quote.currencyCode)}</p></div>{request.status === 'estimate_shared' ? <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={isAccepting || isDeclining} onClick={() => void acceptQuote(request.id)} className="h-9 rounded-[var(--radius-control)] bg-primary px-3 text-xs font-black text-primary-foreground">{isAccepting ? t('common.saving') : t('autocare.clientServiceRequestsAcceptQuote')}</button><button type="button" disabled={isAccepting || isDeclining} onClick={() => void declineQuote(request.id)} className="h-9 rounded-[var(--radius-control)] border border-border px-3 text-xs font-bold text-foreground">{isDeclining ? t('common.saving') : t('autocare.clientServiceRequestsDeclineQuote')}</button></div> : null}</div> : null}<ServiceRequestChat requestId={request.id} /></div>
}

function Status({ status }: { status: AutoCareServiceRequest['status'] }) { const { t } = useTranslation(); return <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-black text-muted-foreground">{t(`autocare.ownerRequestStatus.${status}` as const)}</span> }
function formatMoney(amountMinor: number, currencyCode: string) { return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode, maximumFractionDigits: 0 }).format(amountMinor / 100) }
