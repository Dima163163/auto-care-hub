import { AlertTriangle, BadgeCheck, BarChart3, CircleCheck, ClipboardList, Gauge, ShieldAlert } from 'lucide-react'
import { ROUTES } from '@/shared/constants/routes'

import { useGetAdminAutoCareQualityMonitoringQuery } from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'
import { RetryButton } from '@/shared/ui/query-refresh-error'

const copy = {
    ru: {
        title: 'Качество данных и рабочие очереди',
        description: 'Сводка показывает, какие процессы требуют внимания. Детальные решения фиксируются в журнале аудита.',
        pendingReviews: 'Отзывы ожидают модерации',
        reviewAnomalies: 'Сигналы качества отзывов',
        pendingAppeals: 'Апелляции ожидают решения',
        bookingConflicts: 'Конфликты записи',
        evidenceCoverage: 'Актуальность сигналов доверия',
        priceCoverage: 'Карточки услуг с ценой',
        catalogCoverage: 'Сервисы с опубликованными услугами',
        suspendedProviders: 'Приостановленные сервисы',
        allClear: 'Очереди пусты — критических отклонений не найдено.',
        failed: 'Не удалось загрузить показатели качества.',
        generated: 'Сформировано',
        needsAttention: 'Нужно внимание',
        healthy: 'В норме',
        openQueue: 'Открыть очередь',
    },
    en: {
        title: 'Data quality and work queues',
        description: 'This summary highlights processes that need attention. Detailed decisions are recorded in the audit log.',
        pendingReviews: 'Reviews awaiting moderation',
        reviewAnomalies: 'Review quality signals',
        pendingAppeals: 'Appeals awaiting decision',
        bookingConflicts: 'Booking conflicts',
        evidenceCoverage: 'Current trust signals',
        priceCoverage: 'Service offers with prices',
        catalogCoverage: 'Providers with published offers',
        suspendedProviders: 'Suspended providers',
        allClear: 'Queues are clear — no critical deviations found.',
        failed: 'Could not load quality metrics.',
        generated: 'Generated',
        needsAttention: 'Needs attention',
        healthy: 'Healthy',
        openQueue: 'Open queue',
    },
} as const

type QualityRow = { id: string; label: string; value: string; attention: boolean; icon: typeof AlertTriangle; href: string }

export function AdminDataQualityPanel() {
    const { locale, t } = useTranslation()
    const text = locale === 'ru' ? copy.ru : copy.en
    const query = useGetAdminAutoCareQualityMonitoringQuery()
    const data = query.data

    if (query.isLoading) return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><div role="status" className="h-28 animate-pulse rounded-[var(--radius-card)] bg-muted"><span className="sr-only">{t('common.loading')}</span></div></section>
    if (query.error || !data) return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><div role="alert" className="rounded-[var(--radius-card)] border border-destructive/30 bg-destructive/5 p-4"><p className="text-sm font-semibold text-destructive">{getApiErrorMessage(query.error, text.failed)}</p><RetryButton className="mt-3" onRetry={query.refetch} label={t('common.retry')} /></div></section>

    const rows: QualityRow[] = [
        { id: 'reviews', label: text.pendingReviews, value: String(data.reviews.pending), attention: data.reviews.pending > 0, icon: ClipboardList, href: '#admin-moderation-evidence' },
        { id: 'anomalies', label: text.reviewAnomalies, value: String(data.reviews.anomalyCandidates), attention: data.reviews.anomalyCandidates > 0, icon: ShieldAlert, href: '#admin-moderation-evidence' },
        { id: 'appeals', label: text.pendingAppeals, value: String(data.appeals.pending), attention: data.appeals.pending > 0, icon: AlertTriangle, href: '#admin-appeals' },
        { id: 'conflicts', label: text.bookingConflicts, value: String(data.reliability.bookingConflicts), attention: data.reliability.bookingConflicts > 0, icon: AlertTriangle, href: ROUTES.adminAuditLogs },
        { id: 'trust', label: text.evidenceCoverage, value: `${data.ranking.evidenceCoveragePercent}%`, attention: data.ranking.evidenceCoveragePercent < 80, icon: BadgeCheck, href: '#admin-moderation-evidence' },
        { id: 'price', label: text.priceCoverage, value: `${data.catalog.priceCoveragePercent}%`, attention: data.catalog.priceCoveragePercent < 80, icon: Gauge, href: '#admin-catalog-gap-queue' },
        { id: 'catalog', label: text.catalogCoverage, value: `${data.catalog.offerCoveragePercent}%`, attention: data.catalog.offerCoveragePercent < 80, icon: BarChart3, href: '#admin-catalog-gap-queue' },
        { id: 'suspended', label: text.suspendedProviders, value: String(data.providers.suspended), attention: data.providers.suspended > 0, icon: ShieldAlert, href: '#admin-provider-moderation' },
    ]
    const needsAttention = rows.some((row) => row.attention)

    return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-lg font-black text-foreground">{text.title}</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{text.description}</p></div><time className="text-xs text-muted-foreground">{text.generated}: {new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(data.generatedAt))}</time></div><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{rows.map((row) => { const Icon = row.icon; return <article key={row.id} className="rounded-[var(--radius-card)] border border-border bg-background p-4"><div className="flex items-start justify-between gap-2"><span className={row.attention ? 'flex size-9 items-center justify-center rounded-[var(--radius-control)] bg-status-warning/15 text-status-warning-foreground' : 'flex size-9 items-center justify-center rounded-[var(--radius-control)] bg-status-success/15 text-status-success-foreground'}><Icon className="size-4" /></span><span className={row.attention ? 'text-[11px] font-black text-status-warning-foreground' : 'text-[11px] font-black text-status-success-foreground'}>{row.attention ? text.needsAttention : text.healthy}</span></div><p className="mt-4 text-2xl font-black text-foreground">{row.value}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{row.label}</p><a href={row.href} className="mt-3 inline-flex cursor-pointer text-xs font-bold text-primary hover:underline">{text.openQueue}</a></article>})}</div><p className={needsAttention ? 'mt-4 rounded-[var(--radius-card)] bg-status-warning/10 px-4 py-3 text-sm font-semibold text-status-warning-foreground' : 'mt-4 flex items-center gap-2 rounded-[var(--radius-card)] bg-status-success/10 px-4 py-3 text-sm font-semibold text-status-success-foreground'}>{!needsAttention && <CircleCheck className="size-4" />}{needsAttention ? text.needsAttention : text.allClear}</p></section>
}
