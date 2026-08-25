import { Activity, ArrowRight, CircleAlert, Clock3, ShieldAlert, UserRound } from 'lucide-react'
import { Link } from 'react-router'

import { useGetMeQuery } from '@/features/auth'
import {
    useGetOutboxHealthQuery,
    useGetSecurityCenterSummaryQuery,
    useGetSystemIncidentsPageQuery,
} from '@/features/admin/api/adminApi'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { ROUTES } from '@/shared/constants/routes'
import type { TranslationKey } from '@/shared/lib/i18n'
import { useTranslation } from '@/shared/lib/useTranslation'
import { buttonVariants } from '@/components/ui/button-variants'
import { QueryRefreshError } from '@/shared/ui/query-refresh-error'
import { QueryRefreshStatus } from '@/shared/ui/query-refresh-status'
import { RetryButton } from '@/shared/ui/query-refresh-error'
import { StateCard } from '@/shared/ui/state-card'
import { formatDateTime } from '@/shared/lib/formatDateTime'

import {
    buildOperatorActionItems,
    buildOperatorQueueMetrics,
    type OperatorActionKind,
    type OperatorActionPriority,
    type OperatorActionStatus,
} from '../lib/operator-action-items'

const priorityTranslationKeys: Record<OperatorActionPriority, TranslationKey> = {
    critical: 'adminDashboard.operatorCenter.priorityCritical',
    high: 'adminDashboard.operatorCenter.priorityHigh',
    warning: 'adminDashboard.operatorCenter.priorityWarning',
}

const kindTranslationKeys: Record<OperatorActionKind, TranslationKey> = {
    security: 'adminDashboard.operatorCenter.kindSecurity',
    incident: 'adminDashboard.operatorCenter.kindIncident',
    outbox: 'adminDashboard.operatorCenter.kindOutbox',
}

const statusTranslationKeys: Record<OperatorActionStatus, TranslationKey> = {
    open: 'adminDashboard.operatorCenter.statusOpen',
    acknowledged: 'adminDashboard.operatorCenter.statusAcknowledged',
    investigating: 'adminDashboard.operatorCenter.statusInvestigating',
    failed: 'adminDashboard.operatorCenter.statusFailed',
}

const priorityClassNames: Record<OperatorActionPriority, string> = {
    critical: 'border-severity-critical-border bg-severity-critical-surface text-severity-critical-foreground',
    high: 'border-severity-high-border bg-severity-high-surface text-severity-high-foreground',
    warning: 'border-status-warning-border bg-status-warning-surface text-status-warning-foreground',
}

export function AdminOperatorActionCenter() {
    const { t } = useTranslation()
    const { data: currentUser } = useGetMeQuery()
    const isSuperAdmin = currentUser?.role === 'super_admin'
    const securitySummary = useGetSecurityCenterSummaryQuery(1_440, {
        skip: !isSuperAdmin,
        refetchOnMountOrArgChange: true,
    })
    const systemIncidents = useGetSystemIncidentsPageQuery({ limit: 50, status: 'open' }, {
        skip: !isSuperAdmin,
        refetchOnMountOrArgChange: true,
    })
    const outboxHealth = useGetOutboxHealthQuery(undefined, {
        skip: !isSuperAdmin,
        refetchOnMountOrArgChange: true,
    })
    if (!isSuperAdmin) return null

    const isLoading = securitySummary.isLoading || systemIncidents.isLoading || outboxHealth.isLoading
    const isFetching = securitySummary.isFetching || systemIncidents.isFetching || outboxHealth.isFetching
    const isError = securitySummary.isError || systemIncidents.isError || outboxHealth.isError
    const hasStaleData = Boolean(securitySummary.data || systemIncidents.data || outboxHealth.data)
    const incidents = systemIncidents.data?.items ?? []
    const refreshError = securitySummary.error ?? systemIncidents.error ?? outboxHealth.error
    const outboxAttention = (outboxHealth.data?.deadLetterCount ?? 0) + (outboxHealth.data?.abandonedCount ?? 0)
    const actionItems = buildOperatorActionItems({
        securitySummary: securitySummary.data,
        incidents,
        outboxHealth: outboxHealth.data,
    })
    const queueMetrics = buildOperatorQueueMetrics(actionItems)

    return (
        <section
            className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6"
            aria-labelledby="admin-operator-action-center-title"
            aria-busy={isLoading || isFetching}
        >
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                        {t('adminDashboard.operatorCenter.eyebrow')}
                    </p>
                    <h2 id="admin-operator-action-center-title" className="mt-1 text-lg font-bold tracking-tight">
                        {t('adminDashboard.operatorCenter.title')}
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                        {t('adminDashboard.operatorCenter.description')}
                    </p>
                </div>
                <ShieldAlert className="size-6 text-primary" aria-hidden="true" />
            </div>

            <QueryRefreshStatus
                isRefreshing={isFetching && !isLoading}
                label={t('common.refreshing')}
            />

            {isLoading && <StateCard variant="loading" description={t('adminDashboard.operatorCenter.loading')} />}

            {isError && !hasStaleData && (
                <StateCard
                    variant="error"
                    title={t('adminDashboard.operatorCenter.failedToLoad')}
                    description={getApiErrorMessage(refreshError, t('common.tryAgainLater'))}
                    action={
                            <RetryButton
                            label={t('common.retry')}
                            onRetry={() => Promise.all([
                                securitySummary.refetch(),
                                systemIncidents.refetch(),
                                outboxHealth.refetch(),
                            ])}
                        />
                    }
                />
            )}

            {isError && hasStaleData && (
                <QueryRefreshError
                    message={getApiErrorMessage(refreshError, t('common.tryAgainLater'))}
                    onRetry={() => Promise.all([
                        securitySummary.refetch(),
                        systemIncidents.refetch(),
                        outboxHealth.refetch(),
                    ])}
                    retryLabel={t('common.retry')}
                />
            )}

            {!isLoading && (!isError || hasStaleData) && (
                <>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-xl border bg-background p-4">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-medium text-muted-foreground">
                                    {t('adminDashboard.operatorCenter.openSecurityEvents')}
                                </p>
                                <ShieldAlert className="size-4 text-status-warning-foreground" aria-hidden="true" />
                            </div>
                            <p className="mt-3 text-2xl font-bold tracking-tight">
                                {securitySummary.data?.openEvents ?? 0}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {t('adminDashboard.operatorCenter.criticalEvents', {
                                    count: securitySummary.data?.criticalSeverityEvents ?? 0,
                                })}
                            </p>
                        </div>

                        <div className="rounded-xl border bg-background p-4">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-medium text-muted-foreground">
                                    {t('adminDashboard.operatorCenter.outboxAttention')}
                                </p>
                                <Activity className="size-4 text-status-warning-foreground" aria-hidden="true" />
                            </div>
                            <p className="mt-3 text-2xl font-bold tracking-tight">{outboxAttention}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {t('adminDashboard.operatorCenter.outboxAttentionDescription', {
                                    deadLetter: outboxHealth.data?.deadLetterCount ?? 0,
                                    abandoned: outboxHealth.data?.abandonedCount ?? 0,
                                })}
                            </p>
                        </div>

                        <div className="rounded-xl border bg-background p-4">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-medium text-muted-foreground">
                                    {t('adminDashboard.operatorCenter.openIncidents')}
                                </p>
                                <Activity className="size-4 text-status-warning-foreground" aria-hidden="true" />
                            </div>
                            <p className="mt-3 text-2xl font-bold tracking-tight">{incidents.length}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {t('adminDashboard.operatorCenter.incidentWindow')}
                            </p>
                        </div>

                        <div className="rounded-xl border bg-background p-4">
                            <p className="text-sm font-medium text-muted-foreground">
                                {t('adminDashboard.operatorCenter.blockedSignals')}
                            </p>
                            <p className="mt-3 text-2xl font-bold tracking-tight">
                                {securitySummary.data?.blockedSignals ?? 0}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {t('adminDashboard.operatorCenter.summaryWindow')}
                            </p>
                        </div>

                        <div className="rounded-xl border bg-background p-4">
                            <p className="text-sm font-medium text-muted-foreground">
                                {t('adminDashboard.operatorCenter.highSeverityEvents')}
                            </p>
                            <p className="mt-3 text-2xl font-bold tracking-tight">
                                {securitySummary.data?.highSeverityEvents ?? 0}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {t('adminDashboard.operatorCenter.summaryWindow')}
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 border-t pt-5" aria-labelledby="admin-operator-action-queue-title">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h3 id="admin-operator-action-queue-title" className="font-semibold">
                                    {t('adminDashboard.operatorCenter.queueTitle')}
                                </h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {t('adminDashboard.operatorCenter.queueDescription')}
                                </p>
                            </div>
                            <span className="text-xs text-muted-foreground">
                                {t('adminDashboard.operatorCenter.queueBound', { count: actionItems.length })}
                            </span>
                        </div>

                        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label={t('adminDashboard.operatorCenter.queueMetricsLabel')}>
                            <div className="rounded-lg border bg-background px-3 py-2">
                                <dt className="text-xs text-muted-foreground">{t('adminDashboard.operatorCenter.queueTotal')}</dt>
                                <dd className="mt-1 font-semibold">{queueMetrics.total}</dd>
                            </div>
                            <div className="rounded-lg border bg-background px-3 py-2">
                                <dt className="text-xs text-muted-foreground">{t('adminDashboard.operatorCenter.queueAssigned')}</dt>
                                <dd className="mt-1 font-semibold">{queueMetrics.assigned}</dd>
                            </div>
                            <div className="rounded-lg border bg-background px-3 py-2">
                                <dt className="text-xs text-muted-foreground">{t('adminDashboard.operatorCenter.queueSlaBreached')}</dt>
                                <dd className="mt-1 font-semibold">{queueMetrics.slaBreached}</dd>
                            </div>
                            <div className="rounded-lg border bg-background px-3 py-2">
                                <dt className="text-xs text-muted-foreground">{t('adminDashboard.operatorCenter.queueOldest')}</dt>
                                <dd className="mt-1 font-semibold">{t('adminDashboard.operatorCenter.ageMinutes', { count: queueMetrics.oldestAgeMinutes })}</dd>
                            </div>
                        </dl>

                        {actionItems.length === 0 ? (
                            <div className="mt-4 rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
                                {t('adminDashboard.operatorCenter.queueEmpty')}
                            </div>
                        ) : (
                            <div className="mt-4 grid gap-3 lg:grid-cols-2">
                                {actionItems.map((item) => (
                                    <article key={item.id} className="rounded-lg border bg-background p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <CircleAlert className="size-4 shrink-0 text-primary" aria-hidden="true" />
                                                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                        {t(kindTranslationKeys[item.kind])}
                                                    </span>
                                                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${priorityClassNames[item.priority]}`}>
                                                        {t(priorityTranslationKeys[item.priority])}
                                                    </span>
                                                </div>
                                                <h4 className="mt-2 truncate font-semibold" title={item.title}>
                                                    {item.titleKey ? t(item.titleKey) : item.title}
                                                </h4>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {t('adminDashboard.operatorCenter.reasonCode')}{': '}
                                                    <code className="break-all text-foreground">{item.reasonCode}</code>
                                                </p>
                                            </div>
                                            <Link
                                                to={item.href}
                                                className={buttonVariants({ variant: 'ghost', size: 'icon', className: 'size-10 shrink-0' })}
                                                aria-label={t('adminDashboard.operatorCenter.openItem')}
                                                title={t('adminDashboard.operatorCenter.openItem')}
                                            >
                                                <ArrowRight className="size-4" aria-hidden="true" />
                                            </Link>
                                        </div>

                                        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                                            <div>
                                                <dt className="text-muted-foreground">{t('adminDashboard.operatorCenter.status')}</dt>
                                                <dd className="mt-1 font-medium">{t(statusTranslationKeys[item.status])}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-muted-foreground">{t('adminDashboard.operatorCenter.assignee')}</dt>
                                                <dd className="mt-1 flex items-center gap-1 font-medium">
                                                    <UserRound className="size-3.5" aria-hidden="true" />
                                                    {item.assigneeId
                                                        ? t('adminDashboard.operatorCenter.assigned')
                                                        : t('adminDashboard.operatorCenter.unassigned')}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="text-muted-foreground">{t('adminDashboard.operatorCenter.age')}</dt>
                                                <dd className="mt-1 flex items-center gap-1 font-medium">
                                                    <Clock3 className="size-3.5" aria-hidden="true" />
                                                    {t('adminDashboard.operatorCenter.ageMinutes', { count: item.ageMinutes })}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="text-muted-foreground">{t('adminDashboard.operatorCenter.sla')}</dt>
                                                <dd className={`mt-1 font-medium ${item.slaBreached ? 'text-destructive' : 'text-status-success-foreground'}`}>
                                                    {item.slaBreached
                                                        ? t('adminDashboard.operatorCenter.slaBreached')
                                                        : t('adminDashboard.operatorCenter.slaWithin', { minutes: item.slaMinutes })}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="text-muted-foreground">{t('adminDashboard.operatorCenter.acknowledgement')}</dt>
                                                <dd className="mt-1 font-medium">
                                                    {item.acknowledgedAt
                                                        ? formatDateTime(item.acknowledgedAt)
                                                        : t('adminDashboard.operatorCenter.notAcknowledged')}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="text-muted-foreground">{t('adminDashboard.operatorCenter.history')}</dt>
                                                <dd className="mt-1 font-medium">
                                                    {t('adminDashboard.operatorCenter.historyCount', { count: item.resolutionHistoryCount })}
                                                </dd>
                                            </div>
                                        </dl>
                                    </article>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3 border-t pt-5">
                        <Link to={ROUTES.adminSecurityCenter} className={buttonVariants({ variant: 'default', size: 'sm', className: 'min-h-11' })}>
                            {t('adminDashboard.operatorCenter.openSecurityCenter')}
                            <ArrowRight className="ml-2 size-4" aria-hidden="true" />
                        </Link>
                        <Link to={ROUTES.adminAuditLogs} className={buttonVariants({ variant: 'outline', size: 'sm', className: 'min-h-11' })}>
                            {t('adminDashboard.operatorCenter.openIncidentsAction')}
                            <ArrowRight className="ml-2 size-4" aria-hidden="true" />
                        </Link>
                    </div>
                </>
            )}
        </section>
    )
}
