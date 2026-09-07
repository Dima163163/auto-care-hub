import { ArrowRight, Clock3, MessageCircle, Wrench } from 'lucide-react'
import { Link } from 'react-router'

import type { AutoCareServiceRequest } from '@/entities/automotive-service'
import { ROUTES } from '@/shared/constants/routes'
import { formatDateTime } from '@/shared/lib/locale-format'
import { useTranslation } from '@/shared/lib/useTranslation'

type OwnerAutoCareRequestQueueProps = { locale: string; requests: AutoCareServiceRequest[] }

type RequestStatusLabels = { accepted: string; estimate: string; fallback: string; response: string }

function statusLabel(status: AutoCareServiceRequest['status'], labels: RequestStatusLabels) { if (status === 'accepted') return labels.accepted; if (status === 'estimate_shared') return labels.estimate; if (status === 'open' || status === 'awaiting_reply') return labels.response; return labels.fallback }

export function OwnerAutoCareRequestQueue({ locale, requests }: OwnerAutoCareRequestQueueProps) {
    const { t } = useTranslation()
    const statusLabels = { accepted: t('autocare.ownerDashboardRequestAccepted'), estimate: t('autocare.ownerDashboardRequestEstimate'), fallback: t('autocare.ownerDashboardRequestFallback'), response: t('autocare.ownerDashboardRequestResponse') }
    const latest = [...requests].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4)
    return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><div className="flex items-center justify-between gap-4"><div><h2 className="text-lg font-black text-foreground">{t('autocare.ownerDashboardRequestQueueTitle')}</h2><p className="mt-1 text-xs text-muted-foreground">{t('autocare.ownerDashboardRequestQueueDescription')}</p></div><Link to={ROUTES.ownerAutoCareRequests} className="inline-flex items-center gap-1 text-xs font-black text-primary hover:underline">{t('autocare.ownerDashboardRequestQueueView')}<ArrowRight className="size-3.5" /></Link></div>{latest.length ? <div className="mt-5 divide-y divide-border">{latest.map((request) => <Link key={request.id} to={ROUTES.ownerAutoCareRequests} className="flex items-center gap-3 py-4 first:pt-0 transition hover:bg-muted/40"><span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><Wrench className="size-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-black text-foreground">{request.serviceLabels[locale] ?? request.serviceLabels.en ?? request.serviceSlug}</span><span className="mt-1 flex items-center gap-2 truncate text-xs text-muted-foreground"><MessageCircle className="size-3" />{String(request.contactSnapshot?.name ?? request.providerName)}</span></span><span className="text-right"><span className="block text-xs font-black text-primary">{statusLabel(request.status, statusLabels)}</span><span className="mt-1 flex items-center justify-end gap-1 text-[11px] text-muted-foreground"><Clock3 className="size-3" />{formatDateTime(request.updatedAt, locale, { day: 'numeric', month: 'short' })}</span></span></Link>)}</div> : <p className="mt-5 rounded-[var(--radius-card)] bg-secondary p-4 text-sm text-muted-foreground">{t('autocare.ownerDashboardRequestQueueEmpty')}</p>}</section>
}
