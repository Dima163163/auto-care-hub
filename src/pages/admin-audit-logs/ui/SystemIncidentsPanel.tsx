import { CircleAlert, ClipboardCheck, Copy, Search, ServerCrash } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
    useGetSystemIncidentsPageQuery,
    useLazyGetSystemIncidentsPageQuery,
    useUpdateSystemIncidentStatusMutation,
    type SystemIncident,
    type SystemIncidentStatus,
} from '@/features/admin/api/adminApi'
import { copyToClipboard } from '@/shared/lib/copyToClipboard'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'
import { StateCard } from '@/shared/ui/state-card'
import { QueryRefreshStatus } from '@/shared/ui/query-refresh-status'
import { QueryRefreshError, RetryButton } from '@/shared/ui/query-refresh-error'
import { toast } from 'sonner'

const statusTranslationKeys = {
    acknowledged: 'systemIncidents.statusAcknowledged',
    open: 'systemIncidents.statusOpen',
    resolved: 'systemIncidents.statusResolved',
} as const

const severityTranslationKeys = {
    critical: 'systemIncidents.severityCritical',
    warning: 'systemIncidents.severityWarning',
} as const

const incidentStatusClassName: Record<SystemIncidentStatus, string> = {
    open: 'border-status-danger-border bg-status-danger-surface text-status-danger-foreground',
    acknowledged: 'border-status-warning-border bg-status-warning-surface text-status-warning-foreground',
    resolved: 'border-status-success-border bg-status-success-surface text-status-success-foreground',
}

const INCIDENT_PAGE_SIZE = 25

function formatTimestamp(value: string) {
    return new Date(value).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    })
}

export function SystemIncidentsPanel() {
    const { t } = useTranslation()
    const [search, setSearch] = useState('')
    const deferredSearch = useDeferredValue(search)
    const [status, setStatus] = useState<SystemIncidentStatus | ''>('')
    const incidentQuery = useMemo(() => ({
        limit: INCIDENT_PAGE_SIZE,
        search: deferredSearch.trim() || undefined,
        status: status || undefined,
    }), [deferredSearch, status])
    const {
        data: incidentPage,
        error,
        isFetching,
        isLoading,
        refetch,
    } = useGetSystemIncidentsPageQuery(incidentQuery)
    const [loadIncidentPage, { isFetching: isLoadingMore }] = useLazyGetSystemIncidentsPageQuery()
    const incidentFilterKey = `${incidentQuery.search ?? ''}:${incidentQuery.status ?? ''}`
    const [loadedIncidentState, setLoadedIncidentState] = useState<{
        filterKey: string
        items: SystemIncident[]
        nextCursor: string | null | undefined
    }>({ filterKey: '', items: [], nextCursor: undefined })
    const [updateStatus, { isLoading: isUpdating, originalArgs: updatingIncident }] = useUpdateSystemIncidentStatusMutation()
    const additionalIncidents = loadedIncidentState.filterKey === incidentFilterKey
        ? loadedIncidentState.items
        : []
    const loadedNextCursor = loadedIncidentState.filterKey === incidentFilterKey
        ? loadedIncidentState.nextCursor
        : undefined
    const incidents = [
        ...(incidentPage?.items ?? []),
        ...additionalIncidents,
    ]
    const nextCursor = loadedNextCursor === undefined
        ? incidentPage?.nextCursor ?? null
        : loadedNextCursor
    const hasStaleIncidents = incidents.length > 0

    const copyValue = async (value: string, successMessage: string) => {
        if (await copyToClipboard(value)) {
            toast.success(successMessage)
            return
        }

        toast.error(t('systemIncidents.copyFailed'))
    }

    const handleStatusUpdate = (id: string, status: SystemIncidentStatus) => {
        updateStatus({ id, status }).unwrap().catch(() => toast.error(t('common.tryAgainLater')))
    }

    const handleRefresh = () => {
        setLoadedIncidentState({ filterKey: incidentFilterKey, items: [], nextCursor: undefined })
        return refetch()
    }

    const handleLoadMore = async () => {
        if (!nextCursor || isLoadingMore) return

        try {
            const nextPage = await loadIncidentPage({
                ...incidentQuery,
                cursor: nextCursor,
            }).unwrap()

            setLoadedIncidentState((current) => {
                const currentItems = current.filterKey === incidentFilterKey ? current.items : []
                return {
                    filterKey: incidentFilterKey,
                    items: [
                        ...currentItems,
                        ...nextPage.items.filter((item) => !currentItems.some((existing) => existing.id === item.id)),
                    ],
                    nextCursor: nextPage.nextCursor,
                }
            })
        } catch (loadError) {
            toast.error(getApiErrorMessage(loadError, t('common.tryAgainLater')))
        }
    }

    if (error && !hasStaleIncidents) {
        return (
            <StateCard
                variant="error"
                title={t('common.failedToLoad')}
                description={t('common.tryAgainLater')}
                action={
                    <RetryButton onRetry={handleRefresh} label={t('common.retry')} />
                }
            />
        )
    }

    return (
        <div
            className="rounded-xl border bg-card/40 p-4 shadow-xl shadow-primary/5 ring-1 ring-white/10 backdrop-blur-xl"
            aria-busy={isLoading || isFetching}
        >
            <QueryRefreshStatus
                isRefreshing={isFetching && !isLoading}
                label={t('common.refreshing')}
            />
            {error && hasStaleIncidents && (
                <QueryRefreshError
                    message={getApiErrorMessage(error, t('common.tryAgainLater'))}
                    onRetry={handleRefresh}
                    retryLabel={t('common.retry')}
                />
            )}
            <div className="mb-4 flex items-start gap-3 px-2">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                    <ServerCrash className="size-5" />
                </div>
                <div>
                    <p className="font-semibold">{t('systemIncidents.title')}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {t('systemIncidents.description')}
                    </p>
                </div>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3 px-2">
                <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-full border bg-background/50 px-4 py-2 sm:flex-none">
                    <Search className="size-4 text-muted-foreground" />
                    <span className="sr-only">{t('systemIncidents.searchPlaceholder')}</span>
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder={t('systemIncidents.searchPlaceholder')}
                        className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground sm:w-64"
                        disabled={isLoading}
                    />
                </label>
                <label className="flex min-h-11 items-center gap-2 rounded-full border bg-background/50 px-4 py-2 text-sm">
                    <span className="text-muted-foreground">{t('systemIncidents.statusFilter')}</span>
                    <select
                        aria-label={t('systemIncidents.statusFilter')}
                        value={status}
                        onChange={(event) => setStatus(event.target.value as SystemIncidentStatus | '')}
                        className="bg-transparent font-semibold outline-none"
                        disabled={isLoading}
                    >
                        <option value="">{t('systemIncidents.allStatuses')}</option>
                        <option value="open">{t(statusTranslationKeys.open)}</option>
                        <option value="acknowledged">{t(statusTranslationKeys.acknowledged)}</option>
                        <option value="resolved">{t(statusTranslationKeys.resolved)}</option>
                    </select>
                </label>
            </div>

            <div className="overflow-hidden rounded-xl border bg-background/50">
                <div className="touch-pan-x overscroll-x-contain overflow-x-auto">
                    <table className="min-w-[960px] w-full whitespace-nowrap text-left text-sm">
                        <thead className="bg-muted/50 text-xs font-black uppercase tracking-widest text-muted-foreground">
                            <tr>
                                <th className="px-6 py-4">{t('systemIncidents.incident')}</th>
                                <th className="px-6 py-4">{t('systemIncidents.severity')}</th>
                                <th className="px-6 py-4">{t('common.status')}</th>
                                <th className="px-6 py-4">{t('systemIncidents.occurrences')}</th>
                                <th className="px-6 py-4">{t('systemIncidents.lastSeen')}</th>
                                <th className="px-6 py-4">{t('systemIncidents.requestId')}</th>
                                <th className="px-6 py-4">{t('systemIncidents.metadata')}</th>
                                <th className="px-6 py-4">{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {isLoading ? (
                                Array.from({ length: 4 }).map((_, index) => (
                                    <tr key={index} aria-hidden="true">
                                        {Array.from({ length: 8 }, (_, cellIndex) => (
                                            <td key={cellIndex} className="px-6 py-5">
                                                <Skeleton className={cellIndex === 0 ? 'h-4 w-44' : 'h-4 w-24'} />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : incidents.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center">
                                            <ClipboardCheck className="size-10 text-status-success-foreground" />
                                            <p className="mt-4 text-lg font-bold">{t('systemIncidents.emptyTitle')}</p>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                {t('systemIncidents.emptyDescription')}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : incidents.map((incident) => (
                                <tr key={incident.id} className="transition-colors hover:bg-muted/40">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 font-semibold">
                                            <CircleAlert className="size-4 text-destructive" />
                                            {incident.title}
                                        </div>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {t('systemIncidents.firstSeen')}: {formatTimestamp(incident.firstOccurredAt)}
                                        </p>
                                        {incident.acknowledgedAt && (
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {t('systemIncidents.acknowledgedAt')}: {formatTimestamp(incident.acknowledgedAt)}
                                            </p>
                                        )}
                                        {incident.resolvedAt && (
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {t('systemIncidents.resolvedAt')}: {formatTimestamp(incident.resolvedAt)}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={incident.severity === 'critical'
                                            ? 'inline-flex rounded-full border border-severity-critical-border bg-severity-critical-surface px-3 py-1 text-xs font-black uppercase tracking-wider text-severity-critical-foreground'
                                            : 'inline-flex rounded-full border border-severity-warning-border bg-severity-warning-surface px-3 py-1 text-xs font-black uppercase tracking-wider text-severity-warning-foreground'}
                                        >
                                            {t(severityTranslationKeys[incident.severity])}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${incidentStatusClassName[incident.status]}`}>
                                            {t(statusTranslationKeys[incident.status])}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs">{incident.occurrenceCount}</td>
                                    <td className="px-6 py-4 text-xs text-muted-foreground">
                                        {formatTimestamp(incident.lastOccurredAt)}
                                    </td>
                                    <td className="px-6 py-4">
                                        {incident.requestId ? (
                                            <div className="flex items-center gap-1">
                                                <code className="max-w-36 truncate rounded bg-muted px-2 py-1 text-xs" title={incident.requestId}>
                                                    {incident.requestId}
                                                </code>
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="ghost"
                                                    className="size-9 shrink-0"
                                                    aria-label={t('systemIncidents.copyRequestId')}
                                                    title={t('systemIncidents.copyRequestId')}
                                                    onClick={() => void copyValue(incident.requestId!, t('systemIncidents.copied'))}
                                                >
                                                    <Copy className="size-4" />
                                                </Button>
                                            </div>
                                        ) : <span className="text-muted-foreground">-</span>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <details className="max-w-64">
                                            <summary className="cursor-pointer text-xs font-semibold text-primary">
                                                {t('systemIncidents.showMetadata')}
                                            </summary>
                                            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-3 text-xs leading-4">
                                                {JSON.stringify(incident.metadata, null, 2)}
                                            </pre>
                                        </details>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
                                            {incident.status === 'open' && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        loading={isUpdating && updatingIncident?.id === incident.id && updatingIncident.status === 'acknowledged'}
                                                        disabled={isUpdating}
                                                        className="min-h-11 whitespace-normal text-left"
                                                    onClick={() => handleStatusUpdate(incident.id, 'acknowledged')}
                                                >
                                                    {t('systemIncidents.acknowledge')}
                                                </Button>
                                            )}
                                            {incident.status !== 'resolved' && (
                                                <Button
                                                    size="sm"
                                                    loading={isUpdating && updatingIncident?.id === incident.id && updatingIncident.status === 'resolved'}
                                                    disabled={isUpdating}
                                                    className="min-h-11 whitespace-normal text-left"
                                                    onClick={() => handleStatusUpdate(incident.id, 'resolved')}
                                                >
                                                    {t('systemIncidents.resolve')}
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {nextCursor && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-2">
                    <span className="text-xs text-muted-foreground">
                        {t('systemIncidents.loadedCount', { count: incidents.length })}
                    </span>
                    <Button
                        type="button"
                        variant="outline"
                        className="min-h-11"
                        loading={isLoadingMore}
                        onClick={() => void handleLoadMore()}
                    >
                        {isLoadingMore
                            ? t('systemIncidents.loadingMore')
                            : t('systemIncidents.loadMore')}
                    </Button>
                </div>
            )}
        </div>
    )
}
