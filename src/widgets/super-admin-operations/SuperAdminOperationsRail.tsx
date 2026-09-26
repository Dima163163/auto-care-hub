import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Database,
    Gauge,
    RefreshCw,
    ShieldAlert,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'

import { useGetMeQuery } from '@/features/auth'
import {
    useGetAdminOperationsOverviewQuery,
    type AdminOperationsOverview,
} from '@/features/admin/api/adminApi'
import { IS_MOCK_API } from '@/shared/config/api'
import { ROUTES } from '@/shared/constants/routes'
import { formatDateTime } from '@/shared/lib/formatDateTime'
import { useTranslation } from '@/shared/lib/useTranslation'

function formatRatio(value: number | null) {
    return value === null ? '—' : `${Math.round(value * 100)}%`
}

function formatAge(value: number | null) {
    if (value === null) return '—'
    if (value < 60_000) return `${Math.round(value / 1_000)}s`
    if (value < 3_600_000) return `${Math.round(value / 60_000)}m`
    return `${(value / 3_600_000).toFixed(1)}h`
}

function getSchemaObjectCount(schema: AdminOperationsOverview['database']['schema']) {
    return [
        schema.missingTables,
        schema.missingColumns,
        schema.missingIndexes,
        schema.missingConstraints,
        schema.missingMigrations,
        schema.aheadMigrations,
    ].reduce((total, items) => total + items.length, 0)
}

function statusTone(status: AdminOperationsOverview['overallStatus'] | 'ok' | 'failed' | 'disabled' | 'unavailable') {
    if (status === 'healthy' || status === 'ok') return 'text-status-success-foreground'
    if (status === 'disabled') return 'text-muted-foreground'
    if (status === 'failed' || status === 'unavailable') return 'text-status-danger-foreground'
    return 'text-status-warning-foreground'
}

function StatusIcon({ status }: { status: AdminOperationsOverview['overallStatus'] }) {
    if (status === 'healthy') return <CheckCircle2 className="size-4" aria-hidden="true" />
    if (status === 'unavailable') return <Database className="size-4" aria-hidden="true" />
    return <AlertTriangle className="size-4" aria-hidden="true" />
}

function MetricRow({
    icon,
    label,
    value,
    tone = 'text-foreground',
}: {
    icon: ReactNode
    label: string
    value: string
    tone?: string
}) {
    return (
        <div className="flex items-center justify-between gap-3 text-xs">
            <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
                <span aria-hidden="true" className="text-muted-foreground">{icon}</span>
                <span className="truncate">{label}</span>
            </div>
            <span className={`shrink-0 font-semibold ${tone}`}>{value}</span>
        </div>
    )
}

export function SuperAdminOperationsRail() {
    const { t } = useTranslation()
    const { data: currentUser } = useGetMeQuery()
    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin'
    const overview = useGetAdminOperationsOverviewQuery(undefined, {
        skip: !isAdmin,
        pollingInterval: 30_000,
        refetchOnFocus: true,
        refetchOnReconnect: true,
    })
    const [expanded, setExpanded] = useState(false)
    const [collapsed, setCollapsed] = useState(false)

    if (!isAdmin) return null

    const status = overview.data?.overallStatus ?? 'unavailable'
    const displayedStatus = IS_MOCK_API ? 'degraded' : status
    const schema = overview.data?.database.schema
    const schemaObjectCount = schema ? getSchemaObjectCount(schema) : 0
    // Keep the status strip compact by default; admins can open the full
    // snapshot in the normal page flow when they need it.
    const shouldShowDetails = !collapsed && expanded
    const statusText = IS_MOCK_API
        ? t('adminDashboard.operationsRail.mockMode')
        : status === 'healthy'
            ? t('adminDashboard.operationsRail.healthy')
            : status === 'degraded'
                ? t('adminDashboard.operationsRail.degraded')
                : overview.isLoading
                    ? t('adminDashboard.operationsRail.loading')
                    : t('adminDashboard.operationsRail.unavailable')
    const databaseStatus = overview.data?.database.status
    const redisStatus = overview.data?.backend.redis.status
    const outbox = overview.data?.backend.outbox
    const signals = overview.data?.backend.signals

    return (
        <div data-testid="admin-operations-status-strip" className="relative z-10 shrink-0 border-b border-border/80 bg-card text-card-foreground shadow-sm">
            <aside
                className="mx-auto w-full max-w-screen-2xl overflow-hidden"
                aria-label={t('adminDashboard.operationsRail.title')}
            >
                <div className={`h-0.5 ${displayedStatus === 'healthy' ? 'bg-status-success-foreground' : displayedStatus === 'degraded' ? 'bg-status-warning-foreground' : 'bg-status-danger-foreground'}`} />
                <div className="flex items-center gap-3 px-3 py-2 md:px-5">
                    <div className={`shrink-0 rounded-full bg-muted p-1.5 ${statusTone(displayedStatus)}`}>
                        <StatusIcon status={displayedStatus} />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-0.5">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                            {t('adminDashboard.operationsRail.eyebrow')}
                        </p>
                        <h2 className="truncate text-xs font-bold">{t('adminDashboard.operationsRail.title')}</h2>
                        <p className={`text-xs font-semibold ${statusTone(displayedStatus)}`} aria-live="polite">{statusText}</p>
                        {IS_MOCK_API && <span className="rounded-full border border-status-warning-border bg-status-warning-surface px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-status-warning-foreground">Mock</span>}
                    </div>
                    <button
                        type="button"
                        className="shrink-0 rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => {
                            if (shouldShowDetails) {
                                setCollapsed(true)
                                setExpanded(false)
                            } else {
                                setCollapsed(false)
                                setExpanded(true)
                            }
                        }}
                        aria-expanded={shouldShowDetails}
                        aria-label={shouldShowDetails ? t('adminDashboard.operationsRail.hideDetails') : t('adminDashboard.operationsRail.details')}
                    >
                        {shouldShowDetails ? <ChevronDown className="size-4" aria-hidden="true" /> : <ChevronUp className="size-4" aria-hidden="true" />}
                    </button>
                </div>

                {shouldShowDetails && (
                    <div className="max-h-[min(48dvh,24rem)] space-y-3 overflow-y-auto border-t border-border/70 bg-card px-3 pb-3 pt-3 md:px-5">
                        {IS_MOCK_API && (
                            <p className="rounded-lg border border-status-warning-border bg-status-warning-surface p-3 text-xs font-medium text-status-warning-foreground">
                                {t('adminDashboard.operationsRail.mockModeDetails')}
                            </p>
                        )}
                        {!overview.data && overview.isError && (
                            <div className="rounded-xl border border-status-danger-border bg-status-danger-surface p-3 text-xs text-status-danger-foreground">
                                <div className="flex items-center justify-between gap-3">
                                    <span>{t('adminDashboard.operationsRail.unavailable')}</span>
                                    <button
                                        type="button"
                                        className="inline-flex items-center gap-1 rounded-md border border-current px-2 py-1 font-semibold hover:bg-white/50 dark:hover:bg-black/20"
                                        onClick={() => void overview.refetch()}
                                    >
                                        <RefreshCw className="size-3" aria-hidden="true" />
                                        {t('adminDashboard.operationsRail.retry')}
                                    </button>
                                </div>
                            </div>
                        )}

                        {overview.data && (
                            <>
                                <div className="grid gap-2 rounded-xl border bg-background/70 p-3">
                                    <MetricRow
                                        icon={<Database className="size-3.5" />}
                                        label={t('adminDashboard.operationsRail.database')}
                                        value={databaseStatus === 'connected'
                                            ? `${t('adminDashboard.operationsRail.connected')} · ${overview.data.database.latencyMs}ms`
                                            : databaseStatus === 'failed'
                                                ? t('adminDashboard.operationsRail.failed')
                                                : t('adminDashboard.operationsRail.notConnected')}
                                        tone={databaseStatus === 'connected' ? statusTone('ok') : statusTone('failed')}
                                    />
                                    <MetricRow
                                        icon={<Activity className="size-3.5" />}
                                        label={t('adminDashboard.operationsRail.schema')}
                                        value={schema?.status === 'complete'
                                            ? t('adminDashboard.operationsRail.schemaComplete')
                                            : schema?.status === 'incomplete'
                                                ? t('adminDashboard.operationsRail.schemaIncomplete')
                                                : t('adminDashboard.operationsRail.schemaUnavailable')}
                                        tone={schema?.status === 'complete' ? statusTone('ok') : statusTone('failed')}
                                    />
                                    <MetricRow
                                        icon={<Gauge className="size-3.5" />}
                                        label={t('adminDashboard.operationsRail.pool')}
                                        value={overview.data.database.pool.status === 'pressure'
                                            ? t('adminDashboard.operationsRail.poolPressure')
                                            : `${formatRatio(overview.data.database.pool.activeRatio)} · ${overview.data.database.pool.waiting ?? '—'} ${t('adminDashboard.operationsRail.waiting')}`}
                                        tone={overview.data.database.pool.status === 'ok' ? statusTone('ok') : statusTone('failed')}
                                    />
                                    <MetricRow
                                        icon={<Activity className="size-3.5" />}
                                        label={t('adminDashboard.operationsRail.redis')}
                                        value={redisStatus === 'ok'
                                            ? `${t('adminDashboard.operationsRail.connected')} · ${overview.data.backend.redis.latencyMs}ms`
                                            : redisStatus === 'disabled'
                                                ? t('adminDashboard.operationsRail.disabled')
                                                : redisStatus === 'failed'
                                                    ? t('adminDashboard.operationsRail.failed')
                                                    : t('adminDashboard.operationsRail.unavailableStatus')}
                                        tone={redisStatus === 'ok' || redisStatus === 'disabled' ? statusTone('ok') : statusTone('failed')}
                                    />
                                    <MetricRow
                                        icon={<Activity className="size-3.5" />}
                                        label={t('adminDashboard.operationsRail.outbox')}
                                        value={outbox?.status === 'ok'
                                            ? `${outbox.activeCount ?? 0} ${t('adminDashboard.operationsRail.active')} · ${outbox.failedCount ?? 0} ${t('adminDashboard.operationsRail.failedItems')} · ${outbox.deadLetterCount ?? 0} ${t('adminDashboard.operationsRail.deadLetter')} · ${formatAge(outbox.oldestAgeMs)}`
                                            : t('adminDashboard.operationsRail.unavailableStatus')}
                                        tone={outbox?.status === 'ok' && outbox.readiness.ok ? statusTone('ok') : statusTone('failed')}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="rounded-xl border bg-background/70 p-3">
                                        <p className="text-muted-foreground">{t('adminDashboard.operationsRail.incidents')}</p>
                                        <p className="mt-1 font-bold">{signals?.available ? signals.openIncidents : '—'} {t('adminDashboard.operationsRail.open')}</p>
                                        <p className="text-muted-foreground">{signals?.available ? signals.criticalIncidents : '—'} {t('adminDashboard.operationsRail.critical')}</p>
                                    </div>
                                    <div className="rounded-xl border bg-background/70 p-3">
                                        <p className="text-muted-foreground">{t('adminDashboard.operationsRail.security')}</p>
                                        <p className="mt-1 font-bold">{signals?.available ? signals.openSecurityEvents : '—'} {t('adminDashboard.operationsRail.open')}</p>
                                        <p className="text-muted-foreground">{signals?.available ? signals.highSecurityEvents : '—'} {t('adminDashboard.operationsRail.high')} · {signals?.available ? signals.criticalSecurityEvents : '—'} {t('adminDashboard.operationsRail.critical')}</p>
                                        <p className="text-muted-foreground">{signals?.available ? signals.blockedSecuritySignals : '—'} {t('adminDashboard.operationsRail.blocked')}</p>
                                    </div>
                                </div>

                                {(schemaObjectCount > 0 || (outbox?.readiness.reasons.length ?? 0) > 0 || overview.data.database.pool.status === 'pressure' || signals?.available === false) && (
                                    <div className="rounded-xl border border-status-warning-border bg-status-warning-surface p-3 text-xs text-status-warning-foreground">
                                        {schemaObjectCount > 0 && <p>{t('adminDashboard.operationsRail.missingObjects', { count: schemaObjectCount })}</p>}
                                        {(outbox?.readiness.reasons.length ?? 0) > 0 && <p>{t('adminDashboard.operationsRail.thresholdBreaches')}</p>}
                                        {overview.data.database.pool.status === 'pressure' && <p>{t('adminDashboard.operationsRail.poolPressure')}</p>}
                                        {signals?.available === false && <p>{t('adminDashboard.operationsRail.security')}: {t('adminDashboard.operationsRail.unavailableStatus')}</p>}
                                    </div>
                                )}

                                <div className="grid gap-1.5 rounded-xl border bg-background/70 p-3">
                                    <MetricRow
                                        icon={<Activity className="size-3.5" />}
                                        label={t('adminDashboard.operationsRail.runtime')}
                                        value={`${overview.data.backend.runtime.nodeEnv} · ${overview.data.backend.runtime.runtimeMode}`}
                                    />
                                    <MetricRow
                                        icon={<Gauge className="size-3.5" />}
                                        label={t('adminDashboard.operationsRail.metrics')}
                                        value={String(overview.data.backend.metrics.seriesCount)}
                                    />
                                    <p className="text-[11px] text-muted-foreground">
                                        {t('adminDashboard.operationsRail.runtimeDetails', {
                                            mail: overview.data.backend.runtime.mailMode,
                                            storage: overview.data.backend.runtime.attachmentStorageProvider,
                                            antivirus: overview.data.backend.runtime.attachmentAntivirusMode,
                                        })}
                                    </p>
                                    <p className="pt-1 text-[11px] text-muted-foreground">
                                        {t('adminDashboard.operationsRail.lastUpdate', { time: formatDateTime(overview.data.generatedAt) })}
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <Link className="rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition hover:bg-muted" to={ROUTES.adminDashboard}>
                                        {t('adminDashboard.operationsRail.openDashboard')}
                                    </Link>
                                    <Link className="rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition hover:bg-muted" to={ROUTES.adminSecurityCenter}>
                                        <span className="inline-flex items-center gap-1.5"><ShieldAlert className="size-3.5" aria-hidden="true" />{t('adminDashboard.operationsRail.openSecurityCenter')}</span>
                                    </Link>
                                    <Link className="rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition hover:bg-muted" to={ROUTES.adminAuditLogs}>
                                        {t('adminDashboard.operationsRail.openIncidents')}
                                    </Link>
                                </div>
                                <p className="text-[10px] leading-relaxed text-muted-foreground">
                                    {t('adminDashboard.operationsRail.protectedData')}
                                </p>
                            </>
                        )}
                    </div>
                )}
            </aside>
        </div>
    )
}
