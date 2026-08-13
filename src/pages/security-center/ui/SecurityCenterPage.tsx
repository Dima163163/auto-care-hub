import { useMemo, useState } from 'react'
import { Activity, Download, RefreshCw, Search, ShieldAlert, ShieldOff, UserCheck, UserX, XCircle } from 'lucide-react'

import { useGetMeQuery } from '@/features/auth/api/authApi'
import {
    useGetSecurityCenterEventsPageQuery,
    useGetSecurityCenterEventQuery,
    useGetSecurityCenterSummaryQuery,
    useLazyGetSecurityCenterEventsPageQuery,
    useLazyGetSecurityCenterExportQuery,
    useRevokeSecurityCenterUserSessionsMutation,
    useUpdateSecurityCenterEventStatusMutation,
    type SecurityCenterEvent,
    type SecurityEventSeverity,
    type SecurityEventStatus,
} from '@/features/admin/api/adminApi'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import type { TranslationKey } from '@/shared/lib/i18n'
import { useTranslation } from '@/shared/lib/useTranslation'
import { PageHeader } from '@/shared/ui/page-header'
import { StateCard } from '@/shared/ui/state-card'
import { StatusBadge, type StatusBadgeVariant } from '@/shared/ui/status-badge'
import { RetryButton } from '@/shared/ui/query-refresh-error'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { SecurityMitigationsPanel } from './SecurityMitigationsPanel'
import { getAuditActionLabel, getAuditTargetTypeLabel } from '@/features/admin/lib/admin-labels'

const eventTypes: SecurityCenterEvent['type'][] = [
    'login_failed', 'account_locked', 'refresh_token_reuse', 'rate_limit_exceeded',
    'invalid_token', 'csrf_violation', 'route_scan', 'malformed_request',
    'oversized_request', 'privilege_denied', 'webhook_abuse', 'mutation_burst',
]
const severities: SecurityEventSeverity[] = ['info', 'warning', 'high', 'critical']
const statuses: SecurityEventStatus[] = ['open', 'acknowledged', 'investigating', 'resolved', 'suppressed']
const actorRoles: NonNullable<SecurityCenterEvent['actorRole']>[] = ['client', 'owner', 'admin', 'super_admin']
const PAGE_SIZE = 25

const typeKeys: Record<SecurityCenterEvent['type'], TranslationKey> = {
    login_failed: 'securityCenter.types.login_failed',
    account_locked: 'securityCenter.types.account_locked',
    refresh_token_reuse: 'securityCenter.types.refresh_token_reuse',
    rate_limit_exceeded: 'securityCenter.types.rate_limit_exceeded',
    invalid_token: 'securityCenter.types.invalid_token',
    csrf_violation: 'securityCenter.types.csrf_violation',
    route_scan: 'securityCenter.types.route_scan',
    malformed_request: 'securityCenter.types.malformed_request',
    oversized_request: 'securityCenter.types.oversized_request',
    privilege_denied: 'securityCenter.types.privilege_denied',
    webhook_abuse: 'securityCenter.types.webhook_abuse',
    mutation_burst: 'securityCenter.types.mutation_burst',
}

const severityKeys: Record<SecurityEventSeverity, TranslationKey> = {
    info: 'securityCenter.severities.info',
    warning: 'securityCenter.severities.warning',
    high: 'securityCenter.severities.high',
    critical: 'securityCenter.severities.critical',
}

const statusKeys: Record<SecurityEventStatus, TranslationKey> = {
    open: 'securityCenter.statuses.open',
    acknowledged: 'securityCenter.statuses.acknowledged',
    investigating: 'securityCenter.statuses.investigating',
    resolved: 'securityCenter.statuses.resolved',
    suppressed: 'securityCenter.statuses.suppressed',
}

const actorRoleKeys: Record<NonNullable<SecurityCenterEvent['actorRole']>, TranslationKey> = {
    client: 'securityCenter.actorRoles.client',
    owner: 'securityCenter.actorRoles.owner',
    admin: 'securityCenter.actorRoles.admin',
    super_admin: 'securityCenter.actorRoles.super_admin',
}

const authOutcomeKeys: Record<SecurityCenterEvent['authOutcome'], TranslationKey> = {
    unknown: 'securityCenter.authOutcomes.unknown',
    anonymous: 'securityCenter.authOutcomes.anonymous',
    authenticated: 'securityCenter.authOutcomes.authenticated',
    failed: 'securityCenter.authOutcomes.failed',
}

const rateLimitResultKeys: Record<SecurityCenterEvent['rateLimitResult'], TranslationKey> = {
    not_checked: 'securityCenter.rateLimitResults.not_checked',
    allowed: 'securityCenter.rateLimitResults.allowed',
    blocked: 'securityCenter.rateLimitResults.blocked',
}

const proxyProvenanceKeys: Record<SecurityCenterEvent['proxyProvenance'], TranslationKey> = {
    unknown: 'securityCenter.proxyProvenances.unknown',
    direct: 'securityCenter.proxyProvenances.direct',
    trusted_proxy: 'securityCenter.proxyProvenances.trusted_proxy',
    forwarded_header_untrusted: 'securityCenter.proxyProvenances.forwarded_header_untrusted',
}

function formatTimestamp(value: string) {
    return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

const severityVariant: Record<SecurityEventSeverity, StatusBadgeVariant> = {
    info: 'info',
    warning: 'warning',
    high: 'danger',
    critical: 'danger',
}

const statusVariant: Record<SecurityEventStatus, StatusBadgeVariant> = {
    open: 'warning',
    acknowledged: 'info',
    investigating: 'warning',
    resolved: 'success',
    suppressed: 'neutral',
}

export function SecurityCenterPage() {
    const { t } = useTranslation()
    const { data: currentUser } = useGetMeQuery()
    const [type, setType] = useState<SecurityCenterEvent['type'] | ''>('')
    const [severity, setSeverity] = useState<SecurityEventSeverity | ''>('')
    const [status, setStatus] = useState<SecurityEventStatus | ''>('')
    const [ip, setIp] = useState('')
    const [route, setRoute] = useState('')
    const [actorRole, setActorRole] = useState<NonNullable<SecurityCenterEvent['actorRole']> | ''>('')
    const [requestId, setRequestId] = useState('')
    const [authOutcome, setAuthOutcome] = useState<SecurityCenterEvent['authOutcome'] | ''>('')
    const [rateLimitResult, setRateLimitResult] = useState<SecurityCenterEvent['rateLimitResult'] | ''>('')
    const [from, setFrom] = useState('')
    const [to, setTo] = useState('')
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [operatorNote, setOperatorNote] = useState('')
    const [loadedPages, setLoadedPages] = useState<SecurityCenterEvent[]>([])
    const [updateStatus, { isLoading: isUpdating, originalArgs: pendingAction }] = useUpdateSecurityCenterEventStatusMutation()
    const [revokeUserSessions, { isLoading: isRevokingSessions }] = useRevokeSecurityCenterUserSessionsMutation()
    const [loadPage, { isFetching: isLoadingMore }] = useLazyGetSecurityCenterEventsPageQuery()
    const [exportReport, { isFetching: isExporting }] = useLazyGetSecurityCenterExportQuery()
    const query = useMemo(() => ({
        limit: PAGE_SIZE,
        type: type || undefined,
        severity: severity || undefined,
        status: status || undefined,
        ip: ip.trim() || undefined,
        route: route.trim() || undefined,
        actorRole: actorRole || undefined,
        requestId: requestId.trim() || undefined,
        authOutcome: authOutcome || undefined,
        rateLimitResult: rateLimitResult || undefined,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to).toISOString() : undefined,
    }), [actorRole, authOutcome, from, ip, rateLimitResult, requestId, route, severity, status, to, type])
    const {
        data: summary,
        isLoading: isSummaryLoading,
        isFetching: isSummaryFetching,
        refetch: refetchSummary,
        error: summaryError,
    } = useGetSecurityCenterSummaryQuery(1_440)
    const {
        data: eventsPage,
        isLoading: isEventsLoading,
        isFetching: isEventsFetching,
        refetch: refetchEvents,
        error: eventsError,
    } = useGetSecurityCenterEventsPageQuery(query)

    const extraEvents = loadedPages
    const events = [
        ...(eventsPage?.items ?? []),
        ...extraEvents.filter((event) => !(eventsPage?.items ?? []).some((item) => item.id === event.id)),
    ]
    const selectedEvent = events.find((event) => event.id === selectedId) ?? null
    const { data: selectedEventDetails, isFetching: isDetailLoading } = useGetSecurityCenterEventQuery(selectedId ?? '', {
        skip: !selectedId,
    })
    const detailEvent = selectedEventDetails ?? selectedEvent
    const canView = currentUser?.role === 'super_admin'
    const hasError = Boolean(summaryError || eventsError)

    const refresh = () => {
        setLoadedPages([])
        return Promise.all([refetchSummary(), refetchEvents()])
    }

    const downloadReport = async () => {
        try {
            const blob = await exportReport({ ...query, limit: 100 }).unwrap()
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `autocarehub-security-events-${new Date().toISOString().slice(0, 10)}.csv`
            link.click()
            window.setTimeout(() => URL.revokeObjectURL(url), 0)
            toast.success(t('securityCenter.reportExported'))
        } catch (error) {
            toast.error(getApiErrorMessage(error, t('securityCenter.reportExportFailed')))
        }
    }

    const loadMore = async () => {
        if (!eventsPage?.nextCursor || isLoadingMore) return
        try {
            const nextPage = await loadPage({ ...query, cursor: eventsPage.nextCursor }).unwrap()
            setLoadedPages((current) => [
                ...current,
                ...nextPage.items.filter((item) => !current.some((event) => event.id === item.id)),
            ])
        } catch (error) {
            toast.error(getApiErrorMessage(error, t('common.tryAgainLater')))
        }
    }

    const changeStatus = async (nextStatus: Exclude<SecurityEventStatus, 'open'>) => {
        if (!selectedEvent || isUpdating) return
        if (nextStatus === 'suppressed' && !window.confirm(t('securityCenter.suppressConfirm'))) return
        try {
            const updated = await updateStatus({
                id: selectedEvent.id,
                status: nextStatus,
                operatorNote: operatorNote.trim() || undefined,
            }).unwrap()
            setLoadedPages((current) => current.map((event) => event.id === updated.id ? updated : event))
            setOperatorNote('')
            toast.success(t('securityCenter.statusUpdated'))
        } catch (error) {
            toast.error(getApiErrorMessage(error, t('common.tryAgainLater')))
        }
    }

    const changeAssignment = async (nextAssigneeId: string | null) => {
        if (!selectedEvent) return
        const nextStatus: Exclude<SecurityEventStatus, 'open'> = selectedEvent.status === 'open'
            ? 'acknowledged'
            : selectedEvent.status
        try {
            const updated = await updateStatus({
                id: selectedEvent.id,
                status: nextStatus,
                assigneeId: nextAssigneeId,
            }).unwrap()
            setLoadedPages((current) => current.some((event) => event.id === updated.id)
                ? current.map((event) => event.id === updated.id ? updated : event)
                : [updated, ...current])
            toast.success(t('securityCenter.assignmentUpdated'))
        } catch (error) {
            toast.error(getApiErrorMessage(error, t('securityCenter.assignmentFailed')))
        }
    }

    const revokeSelectedUserSessions = async () => {
        if (!selectedEvent?.userId || !window.confirm(t('securityCenter.revokeSessionsConfirm'))) return
        try {
            await revokeUserSessions(selectedEvent.userId).unwrap()
            toast.success(t('securityCenter.sessionsRevoked'))
        } catch (error) {
            toast.error(getApiErrorMessage(error, t('securityCenter.sessionsRevokeFailed')))
        }
    }

    if (currentUser && !canView) {
        return (
            <main className="relative z-0 min-h-full bg-background px-4 py-8 lg:px-8">
                <section className="mx-auto max-w-7xl">
                    <StateCard variant="permission-denied" title={t('securityCenter.permissionTitle')} description={t('securityCenter.permissionDescription')} />
                </section>
            </main>
        )
    }

    return (
            <main className="relative z-0 min-h-full bg-background px-4 py-8 lg:px-8">
            <section className="mx-auto max-w-7xl">
                <PageHeader
                    eyebrow={t('workspace.admin')}
                    title={t('securityCenter.title')}
                    description={t('securityCenter.description')}
                    actions={(
                        <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="outline" className="min-h-11" onClick={() => void downloadReport()} loading={isExporting}>
                                {!isExporting && <Download className="mr-2 size-4" />}
                                {isExporting ? t('securityCenter.exportingReport') : t('securityCenter.exportReport')}
                            </Button>
                            <Button type="button" variant="outline" className="min-h-11" onClick={() => void refresh()} loading={isSummaryFetching || isEventsFetching}>
                                {!(isSummaryFetching || isEventsFetching) && <RefreshCw className="mr-2 size-4" />}
                                {(isSummaryFetching || isEventsFetching) ? t('common.loading') : t('common.retry')}
                            </Button>
                            {selectedEvent?.userId && <Button type="button" variant="outline" className="min-h-11" onClick={() => void revokeSelectedUserSessions()} loading={isRevokingSessions}>
                                {!isRevokingSessions && <ShieldAlert className="mr-2 size-4" />}
                                {isRevokingSessions ? t('securityCenter.revokingSessions') : t('securityCenter.revokeSessions')}
                            </Button>}
                            {selectedEvent && selectedEvent.status !== 'suppressed' && <Button type="button" variant="outline" className="min-h-11" onClick={() => void changeStatus('suppressed')} loading={isUpdating && pendingAction?.status === 'suppressed'}>
                                <ShieldOff className="mr-2 size-4" />
                                {t('securityCenter.statuses.suppressed')}
                            </Button>}
                        </div>
                    )}
                />

                {hasError && !summary && !eventsPage ? (
                    <StateCard variant="error" title={t('common.failedToLoad')} description={t('securityCenter.loadError')} action={<RetryButton onRetry={refresh} label={t('common.retry')} />} />
                ) : (
                    <>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-8" aria-busy={isSummaryLoading}>
                            {[
                                [t('securityCenter.totalEvents'), summary?.totalEvents ?? 0, 'text-foreground'],
                                [t('securityCenter.openEvents'), summary?.openEvents ?? 0, 'text-severity-warning-foreground'],
                                [t('securityCenter.highSeverity'), summary?.highSeverityEvents ?? 0, 'text-severity-high-foreground'],
                                [t('securityCenter.criticalSeverity'), summary?.criticalSeverityEvents ?? 0, 'text-severity-critical-foreground'],
                                [t('securityCenter.blockedSignals'), summary?.blockedSignals ?? 0, 'text-severity-info-foreground'],
                                [t('securityCenter.uniqueIps'), summary?.uniqueIpCount ?? 0, 'text-foreground'],
                                [t('securityCenter.affectedAccounts'), summary?.affectedAccountCount ?? 0, 'text-foreground'],
                                [t('securityCenter.repeatedFailedLogins'), summary?.repeatedFailedLoginCount ?? 0, 'text-severity-high-foreground'],
                            ].map(([label, value, color]) => (
                                <div key={String(label)} className="rounded-lg border bg-card p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                                    <p className={`mt-2 text-2xl font-semibold ${color}`}>{value}</p>
                                </div>
                            ))}
                        </div>

                        <SecurityMitigationsPanel />

                        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
                            <section className="rounded-lg border bg-card p-5">
                                <div className="flex items-center gap-2">
                                    <ShieldAlert className="size-5 text-primary" />
                                    <h2 className="font-semibold">{t('securityCenter.topIps')}</h2>
                                </div>
                                <div className="mt-4 space-y-2">
                                    {(summary?.topIps ?? []).length === 0 && <p className="text-sm text-muted-foreground">{t('securityCenter.noSignals')}</p>}
                                    {(summary?.topIps ?? []).map((item) => <div key={item.ipAddress} className="flex items-center justify-between gap-4 text-sm"><code className="truncate text-muted-foreground">{item.ipAddress}</code><span className="font-semibold">{item.count}</span></div>)}
                                </div>
                            </section>
                            <section className="rounded-lg border bg-card p-5">
                                <div className="flex items-center gap-2"><Activity className="size-5 text-primary" /><h2 className="font-semibold">{t('securityCenter.topRoutes')}</h2></div>
                                <div className="mt-4 space-y-2">
                                    {(summary?.topRoutes ?? []).length === 0 && <p className="text-sm text-muted-foreground">{t('securityCenter.noSignals')}</p>}
                                    {(summary?.topRoutes ?? []).map((item) => <div key={item.route} className="flex items-center justify-between gap-4 text-sm"><code className="truncate text-muted-foreground">{item.route}</code><span className="font-semibold">{item.count}</span></div>)}
                                </div>
                            </section>
                        </div>

                        <div className="mt-6 grid gap-6 xl:grid-cols-3">
                            <section className="rounded-lg border bg-card p-5">
                                <div className="flex items-center gap-2"><Activity className="size-5 text-primary" /><h2 className="font-semibold">{t('securityCenter.requestBursts')}</h2></div>
                                <p className="mt-1 text-sm text-muted-foreground">{t('securityCenter.burstDescription')}</p>
                                <div className="mt-4 space-y-2">
                                    {(summary?.requestBursts ?? []).length === 0 && <p className="text-sm text-muted-foreground">{t('securityCenter.noBursts')}</p>}
                                    {(summary?.requestBursts ?? []).map((item) => <div key={item.windowStart} className="flex items-center justify-between gap-4 text-sm"><code className="truncate text-muted-foreground">{formatTimestamp(item.windowStart)}</code><span className="font-semibold">{item.count}</span></div>)}
                                </div>
                            </section>
                            <section className="rounded-lg border bg-card p-5">
                                <div className="flex items-center gap-2"><ShieldAlert className="size-5 text-primary" /><h2 className="font-semibold">{t('securityCenter.topUserAgents')}</h2></div>
                                <div className="mt-4 space-y-2">
                                    {(summary?.topUserAgents ?? []).length === 0 && <p className="text-sm text-muted-foreground">{t('securityCenter.noUserAgents')}</p>}
                                    {(summary?.topUserAgents ?? []).map((item) => <div key={item.userAgent} className="flex items-center justify-between gap-4 text-sm"><code className="truncate text-muted-foreground">{item.userAgent}</code><span className="font-semibold">{item.count}</span></div>)}
                                </div>
                            </section>
                            <section className="rounded-lg border bg-card p-5">
                                <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Activity className="size-5 text-primary" /><h2 className="font-semibold">{t('securityCenter.rateLimitEffectiveness')}</h2></div><span className="text-sm font-semibold text-primary">{summary?.rateLimitEffectiveness.blockedSharePercent ?? 0}% {t('securityCenter.blockedShare')}</span></div>
                                <dl className="mt-4 space-y-2 text-sm"><div className="flex items-center justify-between gap-4"><dt className="text-muted-foreground">{t('securityCenter.blockedRateLimit')}</dt><dd className="font-semibold">{summary?.rateLimitEffectiveness.blocked ?? 0}</dd></div><div className="flex items-center justify-between gap-4"><dt className="text-muted-foreground">{t('securityCenter.allowedRateLimit')}</dt><dd className="font-semibold">{summary?.rateLimitEffectiveness.allowed ?? 0}</dd></div><div className="flex items-center justify-between gap-4"><dt className="text-muted-foreground">{t('securityCenter.notCheckedRateLimit')}</dt><dd className="font-semibold">{summary?.rateLimitEffectiveness.notChecked ?? 0}</dd></div></dl>
                            </section>
                        </div>

                        <section className="mt-6 rounded-lg border bg-card p-5">
                            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
                                <label className="text-sm font-medium"><span className="mb-2 block">{t('securityCenter.typeFilter')}</span><select value={type} onChange={(event) => { setType(event.target.value as typeof type); setLoadedPages([]) }} className="h-10 w-full rounded-md border bg-background px-3"><option value="">{t('securityCenter.allTypes')}</option>{eventTypes.map((item) => <option key={item} value={item}>{t(typeKeys[item])}</option>)}</select></label>
                                <label className="text-sm font-medium"><span className="mb-2 block">{t('securityCenter.severityFilter')}</span><select value={severity} onChange={(event) => { setSeverity(event.target.value as typeof severity); setLoadedPages([]) }} className="h-10 w-full rounded-md border bg-background px-3"><option value="">{t('securityCenter.allSeverities')}</option>{severities.map((item) => <option key={item} value={item}>{t(severityKeys[item])}</option>)}</select></label>
                                <label className="text-sm font-medium"><span className="mb-2 block">{t('securityCenter.statusFilter')}</span><select value={status} onChange={(event) => { setStatus(event.target.value as typeof status); setLoadedPages([]) }} className="h-10 w-full rounded-md border bg-background px-3"><option value="">{t('securityCenter.allStatuses')}</option>{statuses.map((item) => <option key={item} value={item}>{t(statusKeys[item])}</option>)}</select></label>
                                <label className="text-sm font-medium"><span className="mb-2 block">{t('securityCenter.ipFilter')}</span><span className="relative block"><Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" /><input value={ip} onChange={(event) => { setIp(event.target.value); setLoadedPages([]) }} placeholder={t('securityCenter.ipPlaceholder')} className="h-10 w-full rounded-md border bg-background pl-9 pr-3" /></span></label>
                                <label className="text-sm font-medium"><span className="mb-2 block">{t('securityCenter.routeFilter')}</span><input value={route} onChange={(event) => { setRoute(event.target.value); setLoadedPages([]) }} placeholder={t('securityCenter.routePlaceholder')} className="h-10 w-full rounded-md border bg-background px-3" /></label>
                                <label className="text-sm font-medium"><span className="mb-2 block">{t('securityCenter.actorRoleFilter')}</span><select value={actorRole} onChange={(event) => { setActorRole(event.target.value as typeof actorRole); setLoadedPages([]) }} className="h-10 w-full rounded-md border bg-background px-3"><option value="">{t('securityCenter.allActorRoles')}</option>{actorRoles.map((item) => <option key={item} value={item}>{t(actorRoleKeys[item])}</option>)}</select></label>
                                <label className="text-sm font-medium"><span className="mb-2 block">{t('securityCenter.requestIdFilter')}</span><input value={requestId} onChange={(event) => { setRequestId(event.target.value); setLoadedPages([]) }} placeholder={t('securityCenter.requestIdPlaceholder')} className="h-10 w-full rounded-md border bg-background px-3" /></label>
                                <label className="text-sm font-medium"><span className="mb-2 block">{t('securityCenter.authOutcomeFilter')}</span><select value={authOutcome} onChange={(event) => { setAuthOutcome(event.target.value as typeof authOutcome); setLoadedPages([]) }} className="h-10 w-full rounded-md border bg-background px-3"><option value="">{t('securityCenter.allAuthOutcomes')}</option>{Object.keys(authOutcomeKeys).map((item) => <option key={item} value={item}>{t(authOutcomeKeys[item as SecurityCenterEvent['authOutcome']])}</option>)}</select></label>
                                <label className="text-sm font-medium"><span className="mb-2 block">{t('securityCenter.rateLimitResultFilter')}</span><select value={rateLimitResult} onChange={(event) => { setRateLimitResult(event.target.value as typeof rateLimitResult); setLoadedPages([]) }} className="h-10 w-full rounded-md border bg-background px-3"><option value="">{t('securityCenter.allRateLimitResults')}</option>{Object.keys(rateLimitResultKeys).map((item) => <option key={item} value={item}>{t(rateLimitResultKeys[item as SecurityCenterEvent['rateLimitResult']])}</option>)}</select></label>
                                <label className="text-sm font-medium"><span className="mb-2 block">{t('securityCenter.fromFilter')}</span><input type="datetime-local" value={from} onChange={(event) => { setFrom(event.target.value); setLoadedPages([]) }} className="h-10 w-full rounded-md border bg-background px-3" /></label>
                                <label className="text-sm font-medium"><span className="mb-2 block">{t('securityCenter.toFilter')}</span><input type="datetime-local" value={to} onChange={(event) => { setTo(event.target.value); setLoadedPages([]) }} className="h-10 w-full rounded-md border bg-background px-3" /></label>
                            </div>
                        </section>

                        {selectedEvent && currentUser && <section className="mt-6 hidden flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4 md:flex" aria-label={t('securityCenter.assignee')}><div><p className="text-sm font-semibold">{t('securityCenter.assignee')}</p><p className="mt-1 break-all font-mono text-xs text-muted-foreground">{selectedEvent.assigneeId ?? t('securityCenter.unassigned')}</p></div>{selectedEvent.assigneeId === currentUser.id ? <Button type="button" variant="outline" onClick={() => void changeAssignment(null)} loading={isUpdating}><UserX className="mr-2 size-4" />{t('securityCenter.removeAssignment')}</Button> : <Button type="button" variant="outline" onClick={() => void changeAssignment(currentUser.id)} loading={isUpdating}><UserCheck className="mr-2 size-4" />{t('securityCenter.assignToMe')}</Button>}</section>}
                        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                            <section className="min-w-0 rounded-lg border bg-card" aria-busy={isEventsLoading || isEventsFetching}>
                                <div className="flex items-center justify-between gap-3 border-b px-5 py-4"><div><h2 className="font-semibold">{t('securityCenter.eventsTitle')}</h2><p className="mt-1 text-sm text-muted-foreground">{t('securityCenter.eventsDescription')}</p></div><span className="text-xs text-muted-foreground">{events.length}</span></div>
                                <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="border-b bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3">{t('securityCenter.time')}</th><th className="px-5 py-3">{t('securityCenter.event')}</th><th className="px-5 py-3">{t('securityCenter.source')}</th><th className="px-5 py-3">{t('securityCenter.routeColumn')}</th><th className="px-5 py-3">{t('securityCenter.statusColumn')}</th></tr></thead><tbody className="divide-y">{events.map((event) => <tr key={event.id} tabIndex={0} aria-selected={selectedId === event.id} className={`cursor-pointer transition-colors hover:bg-muted/40 focus-visible:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${selectedId === event.id ? 'bg-primary/5' : ''}`} onClick={() => setSelectedId(event.id)} onKeyDown={(keyboardEvent) => { if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') { keyboardEvent.preventDefault(); setSelectedId(event.id) } }}><td className="whitespace-nowrap px-5 py-4 text-xs text-muted-foreground">{formatTimestamp(event.createdAt)}</td><td className="px-5 py-4"><div className="flex flex-wrap items-center gap-2"><span className="font-medium">{t(typeKeys[event.type])}</span><StatusBadge variant={severityVariant[event.severity]}>{t(severityKeys[event.severity])}</StatusBadge></div><p className="mt-1 text-xs text-muted-foreground">{event.statusCode ?? t('securityCenter.notAvailable')}</p></td><td className="px-5 py-4"><code className="text-xs">{event.ipAddress ?? t('securityCenter.notAvailable')}</code><p className="mt-1 max-w-[180px] truncate text-xs text-muted-foreground">{event.userAgent ?? t('securityCenter.notAvailable')}</p></td><td className="px-5 py-4"><code className="text-xs text-muted-foreground">{event.method ?? ''} {event.route ?? t('securityCenter.notAvailable')}</code></td><td className="px-5 py-4"><StatusBadge variant={statusVariant[event.status]}>{t(statusKeys[event.status])}</StatusBadge></td></tr>)}{events.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-muted-foreground">{t('securityCenter.empty')}</td></tr>}</tbody></table></div>
                                {eventsPage?.nextCursor && <div className="border-t px-5 py-4"><Button type="button" variant="outline" onClick={() => void loadMore()} loading={isLoadingMore}>{isLoadingMore ? t('securityCenter.loadingMore') : t('securityCenter.loadMore')}</Button></div>}
                            </section>

                            {selectedEvent && <button type="button" className="fixed inset-0 z-[1050] bg-black/40 md:hidden" aria-label={t('common.close')} onClick={() => { setSelectedId(null); setOperatorNote('') }} />}
                            <aside data-testid="security-center-detail-drawer" className={`rounded-lg border bg-card p-5 ${selectedEvent ? 'max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-[1100] max-md:max-h-[85dvh] max-md:overflow-y-auto max-md:rounded-b-none max-md:pb-[calc(1.25rem+var(--mobile-nav-height)+env(safe-area-inset-bottom))] max-md:shadow-2xl' : 'max-md:hidden'}`} aria-label={t('securityCenter.details')}>
                                {selectedEvent && currentUser && <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b pb-4 md:hidden"><div><p className="text-sm font-semibold">{t('securityCenter.assignee')}</p><p className="mt-1 break-all font-mono text-xs text-muted-foreground">{selectedEvent.assigneeId ?? t('securityCenter.unassigned')}</p></div>{selectedEvent.assigneeId === currentUser.id ? <Button type="button" variant="outline" size="sm" onClick={() => void changeAssignment(null)} loading={isUpdating}><UserX className="mr-1.5 size-4" />{t('securityCenter.removeAssignment')}</Button> : <Button type="button" variant="outline" size="sm" onClick={() => void changeAssignment(currentUser.id)} loading={isUpdating}><UserCheck className="mr-1.5 size-4" />{t('securityCenter.assignToMe')}</Button>}</div>}
                                {selectedEvent ? <><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">{t('securityCenter.details')}</p><h2 className="mt-2 font-semibold">{t(typeKeys[selectedEvent.type])}</h2></div><button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => { setSelectedId(null); setOperatorNote('') }} aria-label={t('common.close')}><XCircle className="size-5" /></button></div><dl className="mt-5 space-y-3 text-sm"><div><dt className="text-muted-foreground">{t('securityCenter.ipFilter')}</dt><dd className="mt-1 break-all font-mono">{selectedEvent.ipAddress ?? t('securityCenter.notAvailable')}</dd></div><div><dt className="text-muted-foreground">{t('securityCenter.routeColumn')}</dt><dd className="mt-1 break-all font-mono">{selectedEvent.method ?? ''} {selectedEvent.route ?? t('securityCenter.notAvailable')}</dd></div><div><dt className="text-muted-foreground">{t('securityCenter.requestId')}</dt><dd className="mt-1 break-all font-mono">{selectedEvent.requestId ?? t('securityCenter.notAvailable')}</dd></div><div><dt className="text-muted-foreground">{t('securityCenter.actorRole')}</dt><dd className="mt-1">{selectedEvent.actorRole ? t(actorRoleKeys[selectedEvent.actorRole]) : t('securityCenter.notAvailable')}</dd></div><div><dt className="text-muted-foreground">{t('securityCenter.authOutcome')}</dt><dd className="mt-1">{t(authOutcomeKeys[selectedEvent.authOutcome])}</dd></div><div><dt className="text-muted-foreground">{t('securityCenter.rateLimitResult')}</dt><dd className="mt-1">{t(rateLimitResultKeys[selectedEvent.rateLimitResult])}</dd></div><div><dt className="text-muted-foreground">{t('securityCenter.proxyProvenance')}</dt><dd className="mt-1">{t(proxyProvenanceKeys[selectedEvent.proxyProvenance])}</dd></div><div><dt className="text-muted-foreground">{t('securityCenter.requestSize')}</dt><dd className="mt-1">{selectedEvent.requestSizeBytes === null ? t('securityCenter.notAvailable') : `${selectedEvent.requestSizeBytes} ${t('securityCenter.bytes')}`}</dd></div><div><dt className="text-muted-foreground">{t('securityCenter.reasonCode')}</dt><dd className="mt-1 break-all font-mono">{selectedEvent.reasonCode ?? t('securityCenter.notAvailable')}</dd></div><div><dt className="text-muted-foreground">{t('securityCenter.userAgent')}</dt><dd className="mt-1 break-words text-muted-foreground">{selectedEvent.userAgent ?? t('securityCenter.notAvailable')}</dd></div><div><dt className="text-muted-foreground">{t('securityCenter.metadata')}</dt><dd className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-words rounded bg-muted p-2 font-mono text-xs">{JSON.stringify(selectedEvent.metadata, null, 2)}</dd></div></dl><div className="mt-5 border-t pt-4"><label className="text-sm font-medium" htmlFor="security-center-operator-note">{t('securityCenter.operatorNote')}</label><textarea id="security-center-operator-note" value={operatorNote} onChange={(event) => setOperatorNote(event.target.value)} maxLength={1_000} rows={3} placeholder={t('securityCenter.operatorNotePlaceholder')} className="mt-2 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm" /><p className="mt-1 text-xs text-muted-foreground">{operatorNote.length}/1000</p><p className="mt-3 text-sm font-medium">{t('securityCenter.changeStatus')}</p><div className="mt-3 flex flex-wrap gap-2">{(['acknowledged', 'investigating', 'resolved'] as const).map((nextStatus) => <Button key={nextStatus} type="button" variant="outline" size="sm" disabled={selectedEvent.status === nextStatus || isUpdating} loading={isUpdating && pendingAction?.status === nextStatus} onClick={() => void changeStatus(nextStatus)}>{t(statusKeys[nextStatus])}</Button>)}</div></div></> : <div className="flex min-h-52 flex-col items-center justify-center text-center"><ShieldAlert className="size-9 text-muted-foreground" /><p className="mt-3 font-medium">{t('securityCenter.selectEvent')}</p><p className="mt-1 text-sm text-muted-foreground">{t('securityCenter.selectEventDescription')}</p></div>}
                            {selectedEvent && <div className="mt-5 border-t pt-4"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">{t('securityCenter.timeline')}</h3>{isDetailLoading && <span className="text-xs text-muted-foreground">{t('securityCenter.loadingDetails')}</span>}</div>{(detailEvent?.actionTimeline ?? []).length === 0 && <p className="mt-3 text-sm text-muted-foreground">{t('securityCenter.noTimeline')}</p>}<ol className="mt-3 space-y-3">{(detailEvent?.actionTimeline ?? []).map((item) => <li key={item.id} className="border-l-2 border-primary/30 pl-3"><div className="flex flex-wrap items-center gap-2"><StatusBadge variant={statusVariant[item.status]}>{t(statusKeys[item.status])}</StatusBadge><span className="text-xs text-muted-foreground">{formatTimestamp(item.createdAt)}</span><span className="max-w-full truncate text-xs text-muted-foreground">{t('securityCenter.actor')}: {item.actorId}</span></div>{item.operatorNote && <p className="mt-1 break-words text-sm text-muted-foreground">{item.operatorNote}</p>}</li>)}</ol><div className="mt-5 grid gap-4 sm:grid-cols-2"><div><h3 className="text-sm font-semibold">{t('securityCenter.relatedAuditLogs')}</h3>{(detailEvent?.relatedAuditLogs ?? []).length === 0 ? <p className="mt-2 text-sm text-muted-foreground">{t('securityCenter.noRelatedContext')}</p> : <ul className="mt-2 space-y-2">{detailEvent?.relatedAuditLogs.map((log) => <li key={log.id} className="text-xs"><div className="flex flex-wrap items-center gap-2"><span className="font-medium">{getAuditActionLabel(log.action, t)}</span><span className="text-muted-foreground">{formatTimestamp(log.createdAt)}</span></div><p className="mt-1 break-all text-muted-foreground">{getAuditTargetTypeLabel(log.targetType, t) || t('securityCenter.notAvailable')}{log.correlationId ? ` · ${log.correlationId}` : ''}</p></li>)}</ul>}</div><div><h3 className="text-sm font-semibold">{t('securityCenter.relatedSystemIncidents')}</h3>{(detailEvent?.relatedSystemIncidents ?? []).length === 0 ? <p className="mt-2 text-sm text-muted-foreground">{t('securityCenter.noRelatedContext')}</p> : <ul className="mt-2 space-y-2">{detailEvent?.relatedSystemIncidents.map((incident) => <li key={incident.id} className="text-xs"><div className="flex flex-wrap items-center gap-2"><span className="font-medium">{incident.title}</span><StatusBadge variant={statusVariant[incident.status]}>{t(statusKeys[incident.status])}</StatusBadge><StatusBadge variant={severityVariant[incident.severity]}>{t(severityKeys[incident.severity])}</StatusBadge></div><p className="mt-1 text-muted-foreground">{incident.occurrenceCount}x · {formatTimestamp(incident.lastOccurredAt)}</p></li>)}</ul>}</div></div></div>}
                            </aside>
                        </div>
                    </>
                )}
            </section>
        </main>
    )
}
