import { AlertTriangle, BadgeCheck, BarChart3, CircleCheck, ClipboardList, Gauge, ShieldAlert } from 'lucide-react'

import { ROUTES } from '@/shared/constants/routes'
import { useGetAdminAutoCareQualityMonitoringQuery } from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { formatDateTime, formatNumber } from '@/shared/lib/locale-format'
import { useTranslation } from '@/shared/lib/useTranslation'
import { RetryButton } from '@/shared/ui/query-refresh-error'

type QualityRow = { id: string; label: string; value: string; attention: boolean; icon: typeof AlertTriangle; href: string }

export function AdminDataQualityPanel() {
    const { locale, t } = useTranslation()
    const text = {
        title: t('adminDataQuality.title'),
        description: t('adminDataQuality.description'),
        pendingReviews: t('adminDataQuality.pendingReviews'),
        reviewAnomalies: t('adminDataQuality.reviewAnomalies'),
        pendingAppeals: t('adminDataQuality.pendingAppeals'),
        bookingConflicts: t('adminDataQuality.bookingConflicts'),
        evidenceCoverage: t('adminDataQuality.evidenceCoverage'),
        priceCoverage: t('adminDataQuality.priceCoverage'),
        catalogCoverage: t('adminDataQuality.catalogCoverage'),
        suspendedProviders: t('adminDataQuality.suspendedProviders'),
        allClear: t('adminDataQuality.allClear'),
        failed: t('adminDataQuality.failed'),
        generated: t('adminDataQuality.generated'),
        needsAttention: t('adminDataQuality.needsAttention'),
        healthy: t('adminDataQuality.healthy'),
        openQueue: t('adminDataQuality.openQueue'),
    }
    const query = useGetAdminAutoCareQualityMonitoringQuery()
    const data = query.data
    const formatInteger = (value: number) => formatNumber(value, locale, { maximumFractionDigits: 0 })
    const formatPercent = (value: number) => `${formatInteger(value)}%`

    if (query.isLoading) return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><div role="status" className="h-28 animate-pulse rounded-[var(--radius-card)] bg-muted"><span className="sr-only">{t('common.loading')}</span></div></section>
    if (query.error || !data) return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><div role="alert" className="rounded-[var(--radius-card)] border border-destructive/30 bg-destructive/5 p-4"><p className="text-sm font-semibold text-destructive">{getApiErrorMessage(query.error, text.failed)}</p><RetryButton className="mt-3" onRetry={query.refetch} label={t('common.retry')} /></div></section>

    const rows: QualityRow[] = [
        { id: 'reviews', label: text.pendingReviews, value: formatInteger(data.reviews.pending), attention: data.reviews.pending > 0, icon: ClipboardList, href: '#admin-moderation-evidence' },
        { id: 'anomalies', label: text.reviewAnomalies, value: formatInteger(data.reviews.anomalyCandidates), attention: data.reviews.anomalyCandidates > 0, icon: ShieldAlert, href: '#admin-moderation-evidence' },
        { id: 'appeals', label: text.pendingAppeals, value: formatInteger(data.appeals.pending), attention: data.appeals.pending > 0, icon: AlertTriangle, href: '#admin-appeals' },
        { id: 'conflicts', label: text.bookingConflicts, value: formatInteger(data.reliability.bookingConflicts), attention: data.reliability.bookingConflicts > 0, icon: AlertTriangle, href: ROUTES.adminAuditLogs },
        { id: 'trust', label: text.evidenceCoverage, value: formatPercent(data.ranking.evidenceCoveragePercent), attention: data.ranking.evidenceCoveragePercent < 80, icon: BadgeCheck, href: '#admin-moderation-evidence' },
        { id: 'price', label: text.priceCoverage, value: formatPercent(data.catalog.priceCoveragePercent), attention: data.catalog.priceCoveragePercent < 80, icon: Gauge, href: '#admin-catalog-gap-queue' },
        { id: 'catalog', label: text.catalogCoverage, value: formatPercent(data.catalog.offerCoveragePercent), attention: data.catalog.offerCoveragePercent < 80, icon: BarChart3, href: '#admin-catalog-gap-queue' },
        { id: 'suspended', label: text.suspendedProviders, value: formatInteger(data.providers.suspended), attention: data.providers.suspended > 0, icon: ShieldAlert, href: '#admin-provider-moderation' },
    ]
    const needsAttention = rows.some((row) => row.attention)

    return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-lg font-black text-foreground">{text.title}</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{text.description}</p></div><time className="text-xs text-muted-foreground">{text.generated}: {formatDateTime(data.generatedAt, locale, { dateStyle: 'medium', timeStyle: 'short' })}</time></div><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{rows.map((row) => { const Icon = row.icon; return <article key={row.id} className="rounded-[var(--radius-card)] border border-border bg-background p-4"><div className="flex items-start justify-between gap-2"><span className={row.attention ? 'flex size-9 items-center justify-center rounded-[var(--radius-control)] bg-status-warning/15 text-status-warning-foreground' : 'flex size-9 items-center justify-center rounded-[var(--radius-control)] bg-status-success/15 text-status-success-foreground'}><Icon className="size-4" /></span><span className={row.attention ? 'text-[11px] font-black text-status-warning-foreground' : 'text-[11px] font-black text-status-success-foreground'}>{row.attention ? text.needsAttention : text.healthy}</span></div><p className="mt-4 text-2xl font-black text-foreground">{row.value}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{row.label}</p><a href={row.href} className="mt-3 inline-flex cursor-pointer text-xs font-bold text-primary hover:underline">{text.openQueue}</a></article>})}</div><p className={needsAttention ? 'mt-4 rounded-[var(--radius-card)] bg-status-warning/10 px-4 py-3 text-sm font-semibold text-status-warning-foreground' : 'mt-4 flex items-center gap-2 rounded-[var(--radius-card)] bg-status-success/10 px-4 py-3 text-sm font-semibold text-status-success-foreground'}>{!needsAttention && <CircleCheck className="size-4" />}{needsAttention ? text.needsAttention : text.allClear}</p></section>
}
