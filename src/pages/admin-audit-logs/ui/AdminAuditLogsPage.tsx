import { useGetMeQuery } from '@/features/auth/api/authApi'
import {
    useGetAuditLogsPageQuery,
    useLazyGetAuditLogsPageQuery,
    type AuditLog,
} from '@/features/admin/api/adminApi'
import { PageHeader } from '@/shared/ui/page-header'
import { useTranslation } from '@/shared/lib/useTranslation'
import { StateCard } from '@/shared/ui/state-card'
import { QueryRefreshStatus } from '@/shared/ui/query-refresh-status'
import { QueryRefreshError, RetryButton } from '@/shared/ui/query-refresh-error'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { Skeleton } from '@/components/ui/skeleton'
import { useDeferredValue, useMemo, useState } from 'react'
import { Activity, Bookmark, Download, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useSearchParams } from 'react-router'

import {
    clearAdminAuditFilter,
    readAdminAuditFilter,
    writeAdminAuditFilter,
} from '../model/admin-audit-filters'
import { getAuditActionLabel, getAuditTargetTypeLabel } from '@/features/admin/lib/admin-labels'

import { SystemIncidentsPanel } from './SystemIncidentsPanel'

const AUDIT_LOG_PAGE_SIZE = 25

function formatTimestamp(value: string) {
    return new Date(value).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    })
}

export function AdminAuditLogsPage() {
    const { t } = useTranslation()
    const { data: currentUser } = useGetMeQuery()
    const [loadAuditPage, { isFetching: isLoadingMore }] = useLazyGetAuditLogsPageQuery()
    const [query, setQuery] = useState(() => readAdminAuditFilter()?.query ?? '')
    const deferredQuery = useDeferredValue(query)
    const auditQuery = useMemo(() => ({
        limit: AUDIT_LOG_PAGE_SIZE,
        search: deferredQuery.trim() || undefined,
    }), [deferredQuery])
    const {
        data: auditPage,
        error: currentAuditError,
        isFetching: isCurrentAuditFetching,
        isLoading: isCurrentAuditLoading,
        refetch: refetchCurrentAudit,
    } = useGetAuditLogsPageQuery(auditQuery)
    const auditFilterKey = auditQuery.search ?? ''
    const [loadedAuditState, setLoadedAuditState] = useState<{
        filterKey: string
        items: AuditLog[]
        nextCursor: string | null | undefined
    }>({ filterKey: '', items: [], nextCursor: undefined })
    const [searchParams] = useSearchParams()
    const [activeTab, setActiveTab] = useState<'audit' | 'incidents'>(() => (
        searchParams.get('tab') === 'incidents' ? 'incidents' : 'audit'
    ))
    const [savedFilterQuery, setSavedFilterQuery] = useState(() => readAdminAuditFilter()?.query ?? '')
    const canViewSystemIncidents = currentUser?.role === 'super_admin'
    const additionalLogs = loadedAuditState.filterKey === auditFilterKey
        ? loadedAuditState.items
        : []
    const loadedNextCursor = loadedAuditState.filterKey === auditFilterKey
        ? loadedAuditState.nextCursor
        : undefined
    const logs = [
        ...(auditPage?.items ?? []),
        ...additionalLogs,
    ]
    const nextCursor = loadedNextCursor === undefined
        ? auditPage?.nextCursor ?? null
        : loadedNextCursor
    const hasStaleLogs = logs.length > 0
    const isAuditLoading = isCurrentAuditLoading
    const isAuditFetching = isCurrentAuditFetching
    const auditError = currentAuditError

    const handleRefresh = () => {
        setLoadedAuditState({ filterKey: auditFilterKey, items: [], nextCursor: undefined })
        return refetchCurrentAudit()
    }

    const handleLoadMore = async () => {
        if (!nextCursor || isLoadingMore) return

        try {
            const nextPage = await loadAuditPage({
                ...auditQuery,
                cursor: nextCursor,
            }).unwrap()

            setLoadedAuditState((current) => {
                const currentItems = current.filterKey === auditFilterKey ? current.items : []
                return {
                    filterKey: auditFilterKey,
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

    const saveFilter = () => {
        if (!writeAdminAuditFilter(query)) return
        setSavedFilterQuery(query.trim())
        toast.success(t('adminAuditLogs.filterSaved'))
    }

    const clearSavedFilter = () => {
        clearAdminAuditFilter()
        setSavedFilterQuery('')
        setQuery('')
        toast.success(t('adminAuditLogs.filterCleared'))
    }

    const exportCsv = () => {
        const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
        const rows = logs.map((log) => [
            log.createdAt,
            log.actor?.name ?? t('common.system'),
            log.action,
            log.targetType ?? '',
            log.targetId ?? '',
            JSON.stringify(log.metadata),
        ].map(escape).join(','))
        const blob = new Blob([[['createdAt', 'actor', 'action', 'targetType', 'targetId', 'metadata'].join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = 'autocarehub-audit-logs.csv'
        link.click()
        URL.revokeObjectURL(url)
    }

    if (auditError && !hasStaleLogs) {
        return (
            <main className="min-h-screen bg-background px-4 py-8 lg:px-8">
                <section className="mx-auto max-w-6xl">
                    <PageHeader
                        eyebrow={t('workspace.admin')}
                        title={t('adminAuditLogs.title')}
                        description={t('adminAuditLogs.description')}
                    />
                    <div className="mt-8">
                        <StateCard
                            variant="error"
                            title={t('common.failedToLoad')}
                            description={t('common.tryAgainLater')}
                            action={
                                <RetryButton onRetry={handleRefresh} label={t('common.retry')} />
                            }
                        />
                    </div>
                </section>
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-background px-4 py-8 lg:px-8">
            <section
                className="mx-auto max-w-6xl"
                aria-busy={isAuditLoading || isAuditFetching}
            >
                <PageHeader
                    eyebrow={t('workspace.admin')}
                    title={t('adminAuditLogs.title')}
                    description={t('adminAuditLogs.description')}
                />

                <QueryRefreshStatus
                    isRefreshing={isAuditFetching && !isAuditLoading}
                    label={t('common.refreshing')}
                />

                {auditError && hasStaleLogs && (
                    <QueryRefreshError
                        message={getApiErrorMessage(auditError, t('common.tryAgainLater'))}
                        onRetry={handleRefresh}
                        retryLabel={t('common.retry')}
                    />
                )}

                <div className="mt-8 flex gap-2 border-b">
                    <Button
                        type="button"
                        size="sm"
                        variant={activeTab === 'audit' ? 'default' : 'ghost'}
                        onClick={() => setActiveTab('audit')}
                    >
                        {t('adminAuditLogs.auditTab')}
                    </Button>
                    {canViewSystemIncidents && (
                        <Button
                            type="button"
                            size="sm"
                            variant={activeTab === 'incidents' ? 'default' : 'ghost'}
                            onClick={() => setActiveTab('incidents')}
                        >
                            {t('systemIncidents.tab')}
                        </Button>
                    )}
                </div>

                {activeTab === 'incidents' && canViewSystemIncidents ? (
                    <div className="mt-4">
                        <SystemIncidentsPanel />
                    </div>
                ) : (
                <div className="mt-4 rounded-xl border bg-card/40 p-4 shadow-xl shadow-primary/5 ring-1 ring-white/10 backdrop-blur-xl">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-2">
                        <div className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-full border bg-background/50 px-4 py-2 ring-1 ring-primary/10 sm:flex-none">
                            <Search className="size-4 text-muted-foreground" />
                            <input 
                                type="text" 
                                aria-label={t('adminAuditLogs.searchPlaceholder')}
                                placeholder={t('adminAuditLogs.searchPlaceholder')}
                                className="bg-transparent text-sm outline-none placeholder:text-muted-foreground w-full sm:w-64"
                                disabled={isAuditLoading}
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="min-h-11"
                                disabled={!query.trim() || query.trim() === savedFilterQuery}
                                onClick={saveFilter}
                            >
                                <Bookmark className="size-4" />
                                {t('adminAuditLogs.saveFilter')}
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="min-h-11"
                                disabled={!savedFilterQuery}
                                onClick={clearSavedFilter}
                            >
                                <Trash2 className="size-4" />
                                {t('adminAuditLogs.clearFilter')}
                            </Button>
                            <Button variant="outline" size="sm" className="min-h-11" disabled={isAuditLoading || logs.length === 0} onClick={exportCsv}>
                            <Download className="size-4" />
                            {t('adminAuditLogs.export')}
                            </Button>
                        </div>
                    </div>

                    {savedFilterQuery && (
                        <p className="mb-4 px-2 text-xs text-muted-foreground">
                            {t('adminAuditLogs.savedFilter', { query: savedFilterQuery })}
                        </p>
                    )}

                    <div className="overflow-hidden rounded-xl border bg-background/50">
                        <div className="touch-pan-x overscroll-x-contain overflow-x-auto">
                            <table className="min-w-[720px] w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-muted/50 text-xs font-black uppercase tracking-widest text-muted-foreground">
                                    <tr>
                                        <th className="px-6 py-4">{t('adminAuditLogs.timestamp')}</th>
                                        <th className="px-6 py-4">{t('adminAuditLogs.actor')}</th>
                                        <th className="px-6 py-4">{t('adminAuditLogs.action')}</th>
                                        <th className="px-6 py-4">{t('adminAuditLogs.target')}</th>
                                        <th className="px-6 py-4">{t('adminAuditLogs.metadata')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {isAuditLoading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <tr key={i}>
                                                <td className="px-6 py-4"><Skeleton className="h-5 w-32 rounded-md" /></td>
                                                <td className="px-6 py-4"><Skeleton className="h-5 w-24 rounded-md" /></td>
                                                <td className="px-6 py-4"><Skeleton className="h-6 w-28 rounded-full" /></td>
                                                <td className="px-6 py-4"><Skeleton className="h-5 w-36 rounded-md" /></td>
                                                <td className="px-6 py-4"><Skeleton className="h-5 w-48 rounded-md" /></td>
                                            </tr>
                                        ))
                                    ) : logs.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-20 text-center">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="flex size-12 items-center justify-center rounded-xl bg-muted/50 mb-4">
                                                        <Activity className="size-6 text-muted-foreground" />
                                                    </div>
                                                    <p className="text-lg font-bold">{t('adminAuditLogs.noLogs')}</p>
                                                    <p className="text-sm text-muted-foreground mt-1">{t('adminAuditLogs.emptyDescription')}</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        logs.map((log) => (
                                            <tr
                                                key={log.id} 
                                                className="autocarehub-motion-table-row group transition-colors hover:bg-muted/40"
                                            >
                                                <td className="px-6 py-4 text-xs font-medium text-foreground">
                                                    {formatTimestamp(log.createdAt)}
                                                </td>
                                                <td className="px-6 py-4 font-bold text-foreground">
                                                    {log.actor?.name ?? t('common.system')}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-primary ring-1 ring-inset ring-primary/20">
                                                        {getAuditActionLabel(log.action, t)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        {log.targetType && (
                                                            <span className="text-xs font-bold uppercase tracking-widest text-foreground">{getAuditTargetTypeLabel(log.targetType, t)}</span>
                                                        )}
                                                        <span className="font-mono text-xs font-semibold">{log.targetId}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <details className="max-w-[240px]">
                                                        <summary className="cursor-pointer truncate font-mono text-xs text-muted-foreground transition-colors group-hover:text-foreground">
                                                            {t('adminAuditLogs.showMetadata')}
                                                        </summary>
                                                        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-3 font-mono text-[10px] leading-4 text-foreground">
                                                            {JSON.stringify(log.metadata, null, 2)}
                                                        </pre>
                                                    </details>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {nextCursor && (
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-2">
                            <span className="text-xs text-muted-foreground">
                                {t('adminAuditLogs.loadedCount', { count: logs.length })}
                            </span>
                            <Button
                                type="button"
                                variant="outline"
                                className="min-h-11"
                                loading={isLoadingMore}
                                onClick={() => void handleLoadMore()}
                            >
                                {isLoadingMore
                                    ? t('adminAuditLogs.loadingMore')
                                    : t('adminAuditLogs.loadMore')}
                            </Button>
                        </div>
                    )}
                </div>
                )}
            </section>
        </main>
    )
}
