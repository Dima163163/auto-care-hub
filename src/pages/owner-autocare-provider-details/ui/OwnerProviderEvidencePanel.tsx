import { AlertTriangle, BadgeCheck, FileCheck2, FileText, RefreshCw } from 'lucide-react'

import { useGetOwnerAutoCareProviderEvidenceQuery } from '@/entities/automotive-service'
import type { AutoCareApiProvider } from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { formatDateTime } from '@/shared/lib/locale-format'
import { useTranslation } from '@/shared/lib/useTranslation'
import { RetryButton } from '@/shared/ui/query-refresh-error'
import { StateCard } from '@/shared/ui/state-card'

type Props = { provider: AutoCareApiProvider; locale: string }

export function OwnerProviderEvidencePanel({ provider, locale }: Props) {
    const { t } = useTranslation()
    const query = useGetOwnerAutoCareProviderEvidenceQuery(provider.id)
    if (query.isLoading) return <StateCard variant="loading" title={t('autocare.ownerProviderEvidenceLoading')} />
    if (query.isError) return <StateCard variant="error" title={t('autocare.ownerProviderEvidenceLoadError')} description={getApiErrorMessage(query.error, '')} action={<RetryButton onRetry={query.refetch} label={t('common.retry')} />} />

    const evidence = query.data ?? []
    return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><FileCheck2 className="size-5" /></span><div><h2 className="text-base font-black text-foreground">{t('autocare.ownerProviderEvidenceTitle')}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{t('autocare.ownerProviderEvidenceDescription')}</p></div></div>
        {evidence.length === 0 ? <div className="mt-5 rounded-[var(--radius-card)] border border-dashed border-border bg-background p-5 text-sm text-muted-foreground">{t('autocare.ownerProviderEvidenceEmpty')}</div> : <div className="mt-5 grid gap-3 md:grid-cols-2">{evidence.map((item) => {
            const status = item.status.toLowerCase()
            const isApproved = status === 'approved' || status === 'verified'
            const statusLabel = isApproved ? t('autocare.ownerProviderEvidenceVerified') : status === 'rejected' ? t('autocare.ownerProviderEvidenceRejected') : t('autocare.ownerProviderEvidencePending')
            const statusClass = isApproved ? 'bg-status-success-surface text-status-success-foreground' : status === 'rejected' ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-secondary-foreground'
            const isExpired = status === 'expired'
            return <article key={item.id} className="rounded-[var(--radius-card)] border border-border bg-background p-4"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary">{item.kind.includes('document') ? <FileText className="size-4" /> : <BadgeCheck className="size-4" />}</span><p className="truncate text-sm font-black text-foreground">{item.label}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-black ${statusClass}`}>{statusLabel}</span></div><p className="mt-3 text-xs text-muted-foreground">{t('autocare.ownerProviderEvidenceAdded')}: {formatDateTime(item.createdAt, locale, { dateStyle: 'medium' })}{item.verifiedAt ? ` · ${t('autocare.ownerProviderEvidenceVerified')}: ${formatDateTime(item.verifiedAt, locale, { dateStyle: 'medium' })}` : ''}</p>{item.expiresAt && <p className={`mt-1 flex items-center gap-1 text-xs font-semibold ${isExpired ? 'text-destructive' : 'text-muted-foreground'}`}>{isExpired && <AlertTriangle className="size-3.5" />}{t('autocare.ownerProviderEvidenceExpires')}: {formatDateTime(item.expiresAt, locale, { dateStyle: 'medium' })}</p>}{item.notes && <p className="mt-2 text-sm leading-5 text-muted-foreground">{item.notes}</p>}</article>
        })}</div>}
        {query.isFetching && !query.isLoading && <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground"><RefreshCw className="size-3 animate-spin" />{t('autocare.ownerProviderEvidenceRefreshing')}</p>}
    </section>
}
