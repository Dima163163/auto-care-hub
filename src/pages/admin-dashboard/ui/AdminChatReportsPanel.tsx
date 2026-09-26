import { CheckCircle2, ExternalLink, Flag, ShieldBan, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'
import { useAssignAdminAutoCareChatReportMutation, useDecideAdminAutoCareChatReportMutation, useExtendAdminAutoCareChatReportAccessMutation, useGetAdminAutoCareChatReportsQuery, useLazyGetAdminAutoCareChatReportsQuery } from '@/entities/automotive-service'
import type { AutoCareChatReport } from '@/entities/automotive-service'
import { useGetMeQuery } from '@/features/auth'
import { useGetAdminUsersQuery } from '@/entities/user'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { ROUTES } from '@/shared/constants/routes'
import { formatDateTime } from '@/shared/lib/locale-format'
import { useTranslation } from '@/shared/lib/useTranslation'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { RetryButton } from '@/shared/ui/query-refresh-error'

type ReportScope = 'active' | 'archive'
type ReportAssignmentFilter = '' | 'me' | 'unassigned' | string

export function AdminChatReportsPanel() {
    const { locale, t } = useTranslation()
    const navigate = useNavigate()
    const viewer = useGetMeQuery()
    const isSuperAdmin = viewer.data?.role === 'super_admin'
    const moderatorsQuery = useGetAdminUsersQuery(undefined, { skip: !isSuperAdmin })
    const moderators = (moderatorsQuery.data ?? []).filter((user) => user.role === 'admin' && user.status === 'active')
    const [scope, setScope] = useState<ReportScope>('active')
    const [searchInput, setSearchInput] = useState('')
    const [appliedSearch, setAppliedSearch] = useState('')
    const [assignmentFilter, setAssignmentFilter] = useState<ReportAssignmentFilter>('')
    const [categoryFilter, setCategoryFilter] = useState<AutoCareChatReport['category'] | ''>('')
    const reportQuery = {
        scope,
        limit: 50,
        ...(appliedSearch ? { search: appliedSearch } : {}),
        ...(assignmentFilter ? { assignedModeratorId: assignmentFilter } : {}),
        ...(categoryFilter ? { category: categoryFilter } : {}),
    }
    const query = useGetAdminAutoCareChatReportsQuery(reportQuery, { pollingInterval: 30_000, refetchOnFocus: true, refetchOnReconnect: true })
    const [fetchReportPage, { isFetching: isLoadingMore }] = useLazyGetAdminAutoCareChatReportsQuery()
    const reportQueryKey = JSON.stringify(reportQuery)
    const [additionalReports, setAdditionalReports] = useState<{ queryKey: string; items: AutoCareChatReport[]; nextCursor: string | null }>({ queryKey: '', items: [], nextCursor: null })
    const hasAdditionalReports = additionalReports.queryKey === reportQueryKey
    const reports = [...(query.data?.items ?? []), ...(hasAdditionalReports ? additionalReports.items : [])]
    const nextCursor = hasAdditionalReports ? additionalReports.nextCursor : query.data?.nextCursor ?? null
    const [loadMoreFailed, setLoadMoreFailed] = useState(false)
    const [decide, decision] = useDecideAdminAutoCareChatReportMutation()
    const [assign, assignment] = useAssignAdminAutoCareChatReportMutation()
    const [extend, extension] = useExtendAdminAutoCareChatReportAccessMutation()
    const [notes, setNotes] = useState<Record<string, string>>({})
    const [block, setBlock] = useState<Record<string, boolean>>({})
    const [blockDurationDays, setBlockDurationDays] = useState<Record<string, 1 | 7 | 30>>({})
    const [selectedModerators, setSelectedModerators] = useState<Record<string, string>>({})
    const [assignmentReasons, setAssignmentReasons] = useState<Record<string, string>>({})
    const [extensionReasons, setExtensionReasons] = useState<Record<string, string>>({})
    const [validationId, setValidationId] = useState<string | null>(null)
    const [savedId, setSavedId] = useState<string | null>(null)
    const [emergencyReport, setEmergencyReport] = useState<AutoCareChatReport | null>(null)
    const [emergencyReason, setEmergencyReason] = useState('')
    const [emergencyError, setEmergencyError] = useState(false)
    const [clockTime, setClockTime] = useState<number | null>(null)

    const loadMore = async () => {
        if (!nextCursor || isLoadingMore) return
        setLoadMoreFailed(false)
        try {
            const page = await fetchReportPage({ ...reportQuery, cursor: nextCursor }, true).unwrap()
            setAdditionalReports((current) => {
                const existing = current.queryKey === reportQueryKey ? current.items : []
                const seen = new Set(existing.map((report) => report.id))
                return { queryKey: reportQueryKey, items: [...existing, ...page.items.filter((report) => !seen.has(report.id))], nextCursor: page.nextCursor }
            })
        } catch {
            setLoadMoreFailed(true)
        }
    }

    useEffect(() => {
        const updateTime = () => setClockTime(Date.now())
        const startTimer = window.setTimeout(updateTime, 0)
        const interval = window.setInterval(updateTime, 30_000)
        return () => {
            window.clearTimeout(startTimer)
            window.clearInterval(interval)
        }
    }, [])

    const submit = async (report: AutoCareChatReport, status: 'resolved' | 'dismissed') => {
        const reason = notes[report.id]?.trim() ?? ''
        if (reason.length < 10) {
            setValidationId(report.id)
            return
        }
        setValidationId(null)
        try {
            await decide({ id: report.id, status, reason, blockUser: block[report.id] === true, ...(block[report.id] ? { blockDurationDays: blockDurationDays[report.id] ?? 1 } : {}) }).unwrap()
            setAdditionalReports((current) => ({ ...current, items: current.items.filter((item) => item.id !== report.id) }))
            setSavedId(report.id)
        } catch {
            setSavedId(null)
        }
    }

    const submitAssignment = async (report: AutoCareChatReport) => {
        const reason = assignmentReasons[report.id]?.trim() ?? ''
        if (reason.length < 10) {
            setValidationId(report.id)
            return
        }
        setValidationId(null)
        try {
            await assign({ id: report.id, moderatorId: selectedModerators[report.id] || null, reason }).unwrap()
            setSavedId(report.id)
            setAssignmentReasons((current) => ({ ...current, [report.id]: '' }))
        } catch {
            setSavedId(null)
        }
    }

    const submitExtension = async (report: AutoCareChatReport) => {
        const reason = extensionReasons[report.id]?.trim() ?? ''
        if (reason.length < 10) {
            setValidationId(report.id)
            return
        }
        setValidationId(null)
        try {
            await extend({ id: report.id, reason }).unwrap()
            setSavedId(report.id)
            setExtensionReasons((current) => ({ ...current, [report.id]: '' }))
        } catch {
            setSavedId(null)
        }
    }

    const openEmergencyReview = () => {
        const reason = emergencyReason.trim()
        if (reason.length < 10 || !emergencyReport) {
            setEmergencyError(true)
            return
        }
        setEmergencyError(false)
        const params = new URLSearchParams({ chat: emergencyReport.threadId, report: emergencyReport.id })
        navigate(`${ROUTES.superAdminChats}?${params}`, { state: { emergencyReason: reason } })
        setEmergencyReport(null)
        setEmergencyReason('')
    }

    const text = {
        title: t('adminChatReports.title'),
        description: t('adminChatReports.description'),
        filter: t('adminChatReports.filter'),
        active: t('adminChatReports.scopeActive'),
        archive: t('adminChatReports.scopeArchive'),
        search: t('adminChatReports.search'),
        searchPlaceholder: t('adminChatReports.searchPlaceholder'),
        applySearch: t('adminChatReports.applySearch'),
        assignmentFilter: t('adminChatReports.assignmentFilter'),
        allAssignments: t('adminChatReports.allAssignments'),
        assignedToMe: t('adminChatReports.assignedToMe'),
        unassignedReports: t('adminChatReports.unassignedReports'),
        categoryFilter: t('adminChatReports.categoryFilter'),
        allCategories: t('adminChatReports.allCategories'),
        resultsCount: t('adminChatReports.resultsCount'),
        clearFilters: t('adminChatReports.clearFilters'),
        stale: t('adminChatReports.stale'),
        all: t('adminChatReports.all'),
        pending: t('adminChatReports.pending'),
        loadMore: t('adminChatReports.loadMore'),
        resolved: t('adminChatReports.resolved'),
        dismissed: t('adminChatReports.dismissed'),
        empty: t('adminChatReports.empty'),
        category: t('adminChatReports.category'),
        reporter: t('adminChatReports.reporter'),
        reported: t('adminChatReports.reported'),
        created: t('adminChatReports.created'),
        descriptionLabel: t('adminChatReports.descriptionLabel'),
        openChat: t('adminChatReports.openChat'),
        decisionReason: t('adminChatReports.decisionReason'),
        placeholder: t('adminChatReports.placeholder'),
        required: t('adminChatReports.required'),
        requiredLegacy: t('adminChatReports.requiredLegacy'),
        block: t('adminChatReports.block'),
        blockDuration: t('adminChatReports.blockDuration'),
        blockScope: t('adminChatReports.blockScope'),
        durationOneDay: t('adminChatReports.durationOneDay'),
        durationSevenDays: t('adminChatReports.durationSevenDays'),
        durationThirtyDays: t('adminChatReports.durationThirtyDays'),
        overturned: t('adminChatReports.overturned'),
        resolve: t('adminChatReports.resolve'),
        dismiss: t('adminChatReports.dismiss'),
        saved: t('adminChatReports.saved'),
        failedDecision: t('adminChatReports.failedDecision'),
        failed: t('adminChatReports.failed'),
        assignment: t('adminChatReports.assignment'),
        selectModerator: t('adminChatReports.selectModerator'),
        assignmentReason: t('adminChatReports.assignmentReason'),
        assign: t('adminChatReports.assign'),
        assignmentSaved: t('adminChatReports.assignmentSaved'),
        assignmentFailed: t('adminChatReports.assignmentFailed'),
        accessUntil: t('adminChatReports.accessUntil'),
        extendAccess: t('adminChatReports.extendAccess'),
        extensionReason: t('adminChatReports.extensionReason'),
        extensionSaved: t('adminChatReports.extensionSaved'),
        extensionFailed: t('adminChatReports.extensionFailed'),
        emergencyRead: t('adminChatReports.emergencyRead'),
        emergencyReason: t('adminChatReports.emergencyReason'),
        emergencyOpen: t('adminChatReports.emergencyOpen'),
        assignedOnly: t('adminChatReports.assignedOnly'),
        unanchored: t('adminChatReports.unanchored'),
        legacyDecision: t('adminChatReports.legacyDecision'),
        categories: {
            spam: t('adminChatReports.categories.spam'),
            unsafe: t('adminChatReports.categories.unsafe'),
            harassment: t('adminChatReports.categories.harassment'),
            threat: t('adminChatReports.categories.threat'),
            fraud: t('adminChatReports.categories.fraud'),
            other: t('adminChatReports.categories.other'),
        },
        statuses: {
            pending: t('adminChatReports.statuses.pending'),
            resolved: t('adminChatReports.statuses.resolved'),
            dismissed: t('adminChatReports.statuses.dismissed'),
        },
    }

    return <><section id="admin-chat-reports" className="scroll-mt-24 rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-status-warning/15 text-status-warning-foreground"><Flag className="size-5" /></span><div><h2 className="text-lg font-black text-foreground">{text.title}</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{text.description}</p></div></div>
            <form className="grid gap-3 rounded-[var(--radius-card)] border border-border bg-background p-3 sm:grid-cols-2 xl:grid-cols-4" onSubmit={(event) => { event.preventDefault(); setAppliedSearch(searchInput.trim().slice(0, 120)); setAdditionalReports({ queryKey: '', items: [], nextCursor: null }); setLoadMoreFailed(false) }}>
                <label className="grid gap-1 text-xs font-bold text-muted-foreground sm:col-span-2"><span>{text.search}</span><span className="flex gap-2"><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} maxLength={120} placeholder={text.searchPlaceholder} className="h-10 min-w-0 flex-1 rounded-[var(--radius-control)] border border-border bg-card px-3 text-sm font-normal text-foreground" /><Button type="submit" size="sm" variant="outline">{text.applySearch}</Button></span></label>
                <label className="grid gap-1 text-xs font-bold text-muted-foreground"><span>{text.filter}</span><select value={scope} onChange={(event) => { if (event.target.value === 'active' || event.target.value === 'archive') { setScope(event.target.value); setAdditionalReports({ queryKey: '', items: [], nextCursor: null }); setLoadMoreFailed(false) } }} className="h-10 cursor-pointer rounded-[var(--radius-control)] border border-border bg-card px-3 text-sm font-semibold text-foreground"><option value="active">{text.active}</option><option value="archive">{text.archive}</option></select></label>
                <label className="grid gap-1 text-xs font-bold text-muted-foreground"><span>{text.assignmentFilter}</span><select value={assignmentFilter} onChange={(event) => { setAssignmentFilter(event.target.value); setAdditionalReports({ queryKey: '', items: [], nextCursor: null }); setLoadMoreFailed(false) }} className="h-10 cursor-pointer rounded-[var(--radius-control)] border border-border bg-card px-3 text-sm font-semibold text-foreground"><option value="">{text.allAssignments}</option><option value="me">{text.assignedToMe}</option>{isSuperAdmin ? <><option value="unassigned">{text.unassignedReports}</option>{moderators.map((moderator) => <option key={moderator.id} value={moderator.id}>{moderator.name}</option>)}</> : null}</select></label>
                <label className="grid gap-1 text-xs font-bold text-muted-foreground"><span>{text.categoryFilter}</span><select value={categoryFilter} onChange={(event) => { const value = event.target.value; if (value === '' || isReportCategory(value)) { setCategoryFilter(value); setAdditionalReports({ queryKey: '', items: [], nextCursor: null }); setLoadMoreFailed(false) } }} className="h-10 cursor-pointer rounded-[var(--radius-control)] border border-border bg-card px-3 text-sm font-semibold text-foreground"><option value="">{text.allCategories}</option>{(['spam', 'unsafe', 'harassment', 'threat', 'fraud', 'other'] as const).map((category) => <option key={category} value={category}>{text.categories[category]}</option>)}</select></label>
            </form>
        </div>
        {query.isLoading && <div role="status" className="mt-5 h-28 animate-pulse rounded-[var(--radius-card)] bg-muted"><span className="sr-only">{t('common.loading')}</span></div>}
        {query.error && !query.data && <div role="alert" className="mt-5 rounded-[var(--radius-card)] border border-destructive/30 bg-destructive/5 p-4"><p className="text-sm font-semibold text-destructive">{getApiErrorMessage(query.error, text.failed)}</p><RetryButton className="mt-3" onRetry={query.refetch} label={t('common.retry')} /></div>}
        {query.error && query.data && <div role="status" className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-control)] border border-status-warning/30 bg-status-warning/10 px-3 py-2 text-xs font-semibold text-status-warning-foreground"><span>{text.stale}: {getApiErrorMessage(query.error, text.failed)}</span><RetryButton onRetry={query.refetch} label={t('common.retry')} /></div>}
        {decision.error && <div role="alert" className="mt-5 rounded-[var(--radius-card)] border border-destructive/30 bg-destructive/5 p-4 text-sm font-semibold text-destructive">{getApiErrorMessage(decision.error, text.failedDecision)}</div>}
        {assignment.error && <div role="alert" className="mt-5 rounded-[var(--radius-card)] border border-destructive/30 bg-destructive/5 p-4 text-sm font-semibold text-destructive">{getApiErrorMessage(assignment.error, text.assignmentFailed)}</div>}
        {extension.error && <div role="alert" className="mt-5 rounded-[var(--radius-card)] border border-destructive/30 bg-destructive/5 p-4 text-sm font-semibold text-destructive">{getApiErrorMessage(extension.error, text.extensionFailed)}</div>}
        {!query.isLoading && query.data && <p className="mt-4 text-xs font-semibold text-muted-foreground">{text.resultsCount}: {query.data.totalCount ?? reports.length}</p>}
        {!query.isLoading && (!query.error || query.data) && (reports.length === 0 ? <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] bg-secondary p-4"><p className="text-sm text-muted-foreground">{text.empty}</p>{(scope !== 'active' || appliedSearch || assignmentFilter || categoryFilter) && <Button type="button" variant="outline" size="sm" onClick={() => { setScope('active'); setSearchInput(''); setAppliedSearch(''); setAssignmentFilter(''); setCategoryFilter(''); setAdditionalReports({ queryKey: '', items: [], nextCursor: null }); setLoadMoreFailed(false) }}>{text.clearFilters}</Button>}</div> : <div className="mt-5 grid gap-3">{reports.map((report) => {
            const assignedUser = moderatorsQuery.data?.find((user) => user.id === report.assignedModeratorId)
            const assignedToViewer = report.assignedModeratorId === viewer.data?.id
            const accessActive = report.status === 'pending' && clockTime !== null && Boolean(report.accessExpiresAt && Date.parse(report.accessExpiresAt) > clockTime)
            const hasMessageEvidence = Boolean(report.messageId?.trim())
            const canAssignedModeratorRead = !isSuperAdmin && assignedToViewer && accessActive && hasMessageEvidence
            const canDecide = isSuperAdmin || canAssignedModeratorRead
            const chatUrl = `${ROUTES.adminChats}?chat=${encodeURIComponent(report.threadId)}&report=${encodeURIComponent(report.id)}`
            return <article key={report.id} className="rounded-[var(--radius-card)] border border-border bg-background p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-status-warning/15 text-status-warning-foreground"><Flag className="size-4" /></span><div className="min-w-0"><p className="font-black text-foreground">{text.categories[report.category]}</p><p className="mt-1 text-xs text-muted-foreground">{text.reporter}: <span className="font-semibold text-foreground">••••{report.reporterId.slice(-4)}</span></p><p className="mt-1 text-xs text-muted-foreground">{text.reported}: <span className="font-semibold text-foreground">{report.reportedUserId ? `••••${report.reportedUserId.slice(-4)}` : t('common.notProvided')}</span></p><p className="mt-1 text-xs text-muted-foreground">{text.assignment}: {assignedUser?.name ?? (report.assignedModeratorId ? `••••${report.assignedModeratorId.slice(-4)}` : t('common.notProvided'))}</p></div></div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-secondary px-2 py-1 text-[11px] font-black text-muted-foreground">{text.statuses[report.status]}</span><time className="text-xs text-muted-foreground">{text.created}: {formatDateTime(report.createdAt, locale, { dateStyle: 'medium', timeStyle: 'short' })}</time></div></div>
                {report.description && <p className="mt-4 rounded-[var(--radius-control)] border border-border bg-card p-3 text-sm leading-6 text-muted-foreground"><b className="text-foreground">{text.descriptionLabel}:</b> {report.description}</p>}
                {report.status === 'pending' && <>
                    {isSuperAdmin && hasMessageEvidence && <div className="mt-4 grid gap-3 rounded-[var(--radius-control)] border border-border bg-card p-3"><label className="grid gap-1 text-xs font-bold text-muted-foreground"><span>{text.assignment}</span><select value={selectedModerators[report.id] ?? report.assignedModeratorId ?? ''} onChange={(event) => setSelectedModerators((current) => ({ ...current, [report.id]: event.target.value }))} className="h-10 rounded-[var(--radius-control)] border border-border bg-background px-3"><option value="">{text.selectModerator}</option>{moderators.map((moderator) => <option key={moderator.id} value={moderator.id}>{moderator.name} · {moderator.email}</option>)}</select></label><label className="grid gap-1 text-xs font-bold text-muted-foreground"><span>{text.assignmentReason}</span><input value={assignmentReasons[report.id] ?? ''} onChange={(event) => setAssignmentReasons((current) => ({ ...current, [report.id]: event.target.value }))} maxLength={500} className="h-10 rounded-[var(--radius-control)] border border-border bg-background px-3 text-sm font-normal text-foreground" /></label><Button type="button" size="sm" loading={assignment.isLoading} disabled={assignment.isLoading || !selectedModerators[report.id] && !report.assignedModeratorId} onClick={() => void submitAssignment(report)}>{text.assign}</Button></div>}
                    {!isSuperAdmin && assignedToViewer && accessActive && !report.extensionUsed && <div className="mt-3 grid gap-2 rounded-[var(--radius-control)] border border-border bg-card p-3"><p className="text-xs font-semibold text-muted-foreground">{report.accessExpiresAt ? `${text.accessUntil}: ${formatDateTime(report.accessExpiresAt, locale, { dateStyle: 'medium', timeStyle: 'short' })}` : ''}</p><label className="grid gap-1 text-xs font-bold text-muted-foreground"><span>{text.extensionReason}</span><input value={extensionReasons[report.id] ?? ''} onChange={(event) => setExtensionReasons((current) => ({ ...current, [report.id]: event.target.value }))} maxLength={500} className="h-10 rounded-[var(--radius-control)] border border-border bg-background px-3 text-sm font-normal text-foreground" /></label><Button type="button" size="sm" variant="outline" loading={extension.isLoading} disabled={extension.isLoading} onClick={() => void submitExtension(report)}>{text.extendAccess}</Button></div>}
                    <div className="mt-4 flex flex-wrap items-center gap-2">{isSuperAdmin && hasMessageEvidence ? <Button type="button" size="sm" variant="outline" onClick={() => { setEmergencyReport(report); setEmergencyReason(''); setEmergencyError(false) }}><ExternalLink className="mr-1.5 size-4" />{text.emergencyRead}</Button> : canAssignedModeratorRead ? <Link to={chatUrl} className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] border border-border px-3 text-xs font-black text-foreground transition hover:border-primary hover:text-primary"><ExternalLink className="size-3.5" />{text.openChat}</Link> : <p className="text-xs font-semibold text-muted-foreground">{hasMessageEvidence ? text.assignedOnly : text.unanchored}{report.accessExpiresAt ? ` ${text.accessUntil}: ${formatDateTime(report.accessExpiresAt, locale, { dateStyle: 'medium', timeStyle: 'short' })}` : ''}</p>}</div>
                    {canDecide ? <><label className="mt-4 grid gap-2 text-xs font-bold text-muted-foreground"><span>{text.decisionReason}</span><textarea rows={2} value={notes[report.id] ?? ''} onChange={(event) => { setValidationId(null); setSavedId(null); setNotes((current) => ({ ...current, [report.id]: event.target.value })) }} placeholder={text.placeholder} aria-invalid={validationId === report.id} className="rounded-[var(--radius-control)] border border-border bg-card p-3 text-sm font-normal text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>{!hasMessageEvidence && <p className="mt-1 text-xs text-muted-foreground">{text.legacyDecision}</p>}{hasMessageEvidence && <><label className="mt-3 flex cursor-pointer items-center gap-2 text-xs font-semibold text-foreground"><input type="checkbox" checked={block[report.id] === true} onChange={(event) => setBlock((current) => ({ ...current, [report.id]: event.target.checked }))} className="size-4 cursor-pointer accent-primary" />{text.block}<ShieldBan className="size-3.5 text-status-warning-foreground" /></label><p className="mt-1 text-xs text-muted-foreground">{text.blockScope}</p>{block[report.id] ? <label className="mt-2 grid gap-1 text-xs font-bold text-muted-foreground"><span>{text.blockDuration}</span><select value={blockDurationDays[report.id] ?? 1} onChange={(event) => setBlockDurationDays((current) => ({ ...current, [report.id]: Number(event.target.value) as 1 | 7 | 30 }))} className="h-10 rounded-[var(--radius-control)] border border-border bg-background px-3 text-sm font-semibold text-foreground"><option value={1}>{text.durationOneDay}</option><option value={7}>{text.durationSevenDays}</option>{isSuperAdmin ? <option value={30}>{text.durationThirtyDays}</option> : null}</select></label> : null}</>}{validationId === report.id && <p role="alert" className="mt-2 text-xs font-bold text-destructive">{text.required}</p>}<div className="mt-3 flex flex-wrap items-center gap-2"><Button type="button" size="sm" loading={decision.isLoading} disabled={decision.isLoading} onClick={() => void submit(report, 'resolved')}><CheckCircle2 className="mr-1.5 size-4" />{text.resolve}</Button><Button type="button" size="sm" variant="outline" loading={decision.isLoading} disabled={decision.isLoading} onClick={() => void submit(report, 'dismissed')}><XCircle className="mr-1.5 size-4" />{text.dismiss}</Button>{savedId === report.id && <span role="status" className="text-xs font-bold text-status-success-foreground">{text.saved}</span>}</div></> : null}
                </>}
                {report.status !== 'pending' && report.resolutionReason ? <p className="mt-4 rounded-[var(--radius-control)] bg-secondary px-3 py-2 text-sm text-muted-foreground"><b>{text.decisionReason}:</b> {report.resolutionReason}</p> : null}
                {report.overturnedAt ? <p className="mt-2 text-xs font-semibold text-status-warning-foreground">{text.overturned}: {formatDateTime(report.overturnedAt, locale, { dateStyle: 'medium', timeStyle: 'short' })}</p> : null}
            </article>
        })}</div>)}
        {loadMoreFailed && <p role="alert" className="mt-3 text-xs font-semibold text-destructive">{text.failed}</p>}
        {nextCursor && <Button type="button" variant="outline" className="mt-4" loading={isLoadingMore} disabled={isLoadingMore} onClick={() => void loadMore()}>{isLoadingMore ? t('common.loading') : text.loadMore}</Button>}
    </section><ConfirmDialog isOpen={Boolean(emergencyReport)} title={text.emergencyRead} description={text.emergencyReason} confirmLabel={text.emergencyOpen} confirmVariant="destructive" onCancel={() => { setEmergencyReport(null); setEmergencyError(false) }} onConfirm={openEmergencyReview}><label className="grid gap-1 text-xs font-bold text-foreground"><span>{text.emergencyReason}</span><textarea rows={3} maxLength={500} value={emergencyReason} onChange={(event) => { setEmergencyReason(event.target.value); setEmergencyError(false) }} className="rounded-[var(--radius-control)] border border-border bg-background p-3 text-sm font-normal" /></label>{emergencyError && <p role="alert" className="mt-2 text-xs font-bold text-destructive">{text.required}</p>}</ConfirmDialog></>
}

function isReportCategory(value: string): value is AutoCareChatReport['category'] {
    return value === 'spam' || value === 'unsafe' || value === 'harassment' || value === 'threat' || value === 'fraud' || value === 'other'
}
