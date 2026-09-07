import { CheckCircle2, ExternalLink, Flag, ShieldBan, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { useDecideAdminAutoCareChatReportMutation, useGetAdminAutoCareChatReportsQuery } from '@/entities/automotive-service'
import type { AutoCareChatReport } from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { ROUTES } from '@/shared/constants/routes'
import { formatDateTime } from '@/shared/lib/locale-format'
import { useTranslation } from '@/shared/lib/useTranslation'
import { RetryButton } from '@/shared/ui/query-refresh-error'

type ReportFilter = AutoCareChatReport['status'] | 'all'

interface ReportCopy {
    title: string
    description: string
    filter: string
    all: string
    pending: string
    resolved: string
    dismissed: string
    empty: string
    category: string
    reporter: string
    reported: string
    created: string
    descriptionLabel: string
    openChat: string
    decisionReason: string
    placeholder: string
    required: string
    block: string
    resolve: string
    dismiss: string
    saved: string
    failedDecision: string
    failed: string
    notProvided: string
    categories: Record<AutoCareChatReport['category'], string>
    statuses: Record<AutoCareChatReport['status'], string>
}

export function AdminChatReportsPanel() {
    const { locale, t } = useTranslation()
    const text: ReportCopy = {
        title: t('adminChatReports.title'),
        description: t('adminChatReports.description'),
        filter: t('adminChatReports.filter'),
        all: t('adminChatReports.all'),
        pending: t('adminChatReports.pending'),
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
        block: t('adminChatReports.block'),
        resolve: t('adminChatReports.resolve'),
        dismiss: t('adminChatReports.dismiss'),
        saved: t('adminChatReports.saved'),
        failedDecision: t('adminChatReports.failedDecision'),
        failed: t('adminChatReports.failed'),
        notProvided: t('common.notProvided'),
        categories: {
            spam: t('adminChatReports.categories.spam'),
            harassment: t('adminChatReports.categories.harassment'),
            fraud: t('adminChatReports.categories.fraud'),
            unsafe: t('adminChatReports.categories.unsafe'),
            other: t('adminChatReports.categories.other'),
        },
        statuses: {
            pending: t('adminChatReports.statuses.pending'),
            resolved: t('adminChatReports.statuses.resolved'),
            dismissed: t('adminChatReports.statuses.dismissed'),
        },
    }
    const [filter, setFilter] = useState<ReportFilter>('pending')
    const query = useGetAdminAutoCareChatReportsQuery(filter === 'all' ? undefined : { status: filter })
    const [decide, decision] = useDecideAdminAutoCareChatReportMutation()
    const [notes, setNotes] = useState<Record<string, string>>({})
    const [block, setBlock] = useState<Record<string, boolean>>({})
    const [validationId, setValidationId] = useState<string | null>(null)
    const [savedId, setSavedId] = useState<string | null>(null)

    const submit = async (report: AutoCareChatReport, status: 'resolved' | 'dismissed') => {
        const reason = notes[report.id]?.trim() ?? ''
        if (!reason) {
            setValidationId(report.id)
            return
        }
        setValidationId(null)
        try {
            await decide({ id: report.id, status, reason, blockUser: block[report.id] === true }).unwrap()
            setSavedId(report.id)
        } catch (error) {
            console.error('Failed to decide chat report', error)
        }
    }

    return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-status-warning/15 text-status-warning-foreground"><Flag className="size-5" /></span><div><h2 className="text-lg font-black text-foreground">{text.title}</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{text.description}</p></div></div>
            <label className="grid shrink-0 gap-1 text-xs font-bold text-muted-foreground"><span>{text.filter}</span><select value={filter} onChange={(event) => setFilter(event.target.value as ReportFilter)} className="h-9 min-w-32 cursor-pointer appearance-none rounded-[var(--radius-control)] border border-border bg-card px-3 text-sm font-semibold text-foreground"><option value="pending">{text.pending}</option><option value="resolved">{text.resolved}</option><option value="dismissed">{text.dismissed}</option><option value="all">{text.all}</option></select></label>
        </div>
        {query.isLoading && <div role="status" className="mt-5 h-28 animate-pulse rounded-[var(--radius-card)] bg-muted"><span className="sr-only">{t('common.loading')}</span></div>}
        {query.error && <div role="alert" className="mt-5 rounded-[var(--radius-card)] border border-destructive/30 bg-destructive/5 p-4"><p className="text-sm font-semibold text-destructive">{getApiErrorMessage(query.error, text.failed)}</p><RetryButton className="mt-3" onRetry={query.refetch} label={t('common.retry')} /></div>}
        {decision.error && <div role="alert" className="mt-5 rounded-[var(--radius-card)] border border-destructive/30 bg-destructive/5 p-4 text-sm font-semibold text-destructive">{getApiErrorMessage(decision.error, text.failedDecision)}</div>}
        {!query.isLoading && !query.error && ((query.data?.length ?? 0) === 0 ? <p className="mt-5 rounded-[var(--radius-card)] bg-secondary p-4 text-sm text-muted-foreground">{text.empty}</p> : <div className="mt-5 grid gap-3">{query.data?.map((report) => <article key={report.id} className="rounded-[var(--radius-card)] border border-border bg-background p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-status-warning/15 text-status-warning-foreground"><Flag className="size-4" /></span><div className="min-w-0"><p className="font-black text-foreground">{text.categories[report.category]}</p><p className="mt-1 text-xs text-muted-foreground">{text.reporter}: <span className="font-semibold text-foreground">{report.reporterId}</span></p><p className="mt-1 text-xs text-muted-foreground">{text.reported}: {report.reportedUserId ?? text.notProvided}</p></div></div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-secondary px-2 py-1 text-[11px] font-black text-muted-foreground">{text.statuses[report.status]}</span><time className="text-xs text-muted-foreground">{text.created}: {formatDateTime(report.createdAt, locale, { dateStyle: 'medium', timeStyle: 'short' })}</time></div></div>{report.description && <p className="mt-4 rounded-[var(--radius-control)] border border-border bg-card p-3 text-sm leading-6 text-muted-foreground"><b className="text-foreground">{text.descriptionLabel}:</b> {report.description}</p>}<div className="mt-4 flex flex-wrap items-center gap-2"><Link to={`${ROUTES.adminChats}?chat=${encodeURIComponent(report.threadId)}`} className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] border border-border px-3 text-xs font-black text-foreground transition hover:border-primary hover:text-primary"><ExternalLink className="size-3.5" />{text.openChat}</Link></div>{report.status === 'pending' ? <><label className="mt-4 grid gap-2 text-xs font-bold text-muted-foreground"><span>{text.decisionReason}</span><textarea rows={2} value={notes[report.id] ?? ''} onChange={(event) => { setValidationId(null); setSavedId(null); setNotes((current) => ({ ...current, [report.id]: event.target.value })) }} placeholder={text.placeholder} aria-invalid={validationId === report.id} className="rounded-[var(--radius-control)] border border-border bg-card p-3 text-sm font-normal text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label><label className="mt-3 flex cursor-pointer items-center gap-2 text-xs font-semibold text-foreground"><input type="checkbox" checked={block[report.id] === true} onChange={(event) => setBlock((current) => ({ ...current, [report.id]: event.target.checked }))} className="size-4 cursor-pointer accent-primary" />{text.block}<ShieldBan className="size-3.5 text-status-warning-foreground" /></label>{validationId === report.id && <p role="alert" className="mt-2 text-xs font-bold text-destructive">{text.required}</p>}<div className="mt-3 flex flex-wrap items-center gap-2"><Button type="button" size="sm" loading={decision.isLoading} disabled={decision.isLoading} onClick={() => void submit(report, 'resolved')}><CheckCircle2 className="mr-1.5 size-4" />{text.resolve}</Button><Button type="button" size="sm" variant="outline" loading={decision.isLoading} disabled={decision.isLoading} onClick={() => void submit(report, 'dismissed')}><XCircle className="mr-1.5 size-4" />{text.dismiss}</Button>{savedId === report.id && <span role="status" className="text-xs font-bold text-status-success-foreground">{text.saved}</span>}</div></> : report.resolutionReason ? <p className="mt-4 rounded-[var(--radius-control)] bg-secondary px-3 py-2 text-sm text-muted-foreground"><b>{text.decisionReason}:</b> {report.resolutionReason}</p> : null}</article>)}</div>)}
    </section>
}
