import { ExternalLink, Flag, ShieldBan, CheckCircle2, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import {
    type AutoCareChatReport,
    useDecideAdminAutoCareChatReportMutation,
    useGetAdminAutoCareChatReportsQuery,
} from '@/entities/automotive-service'
import { ROUTES } from '@/shared/constants/routes'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'
import { RetryButton } from '@/shared/ui/query-refresh-error'
import { Button } from '@/components/ui/button'

type ReportFilter = AutoCareChatReport['status'] | 'all'

const copy = {
    ru: {
        title: 'Жалобы на чаты',
        description: 'Проверяйте сообщения и вложения из обращения, затем фиксируйте решение и при необходимости блокируйте участника.',
        filter: 'Статус жалоб',
        all: 'Все',
        pending: 'Ожидают',
        resolved: 'Решены',
        dismissed: 'Отклонены',
        empty: 'Жалоб с выбранным статусом нет.',
        category: 'Причина',
        reporter: 'Заявитель',
        reported: 'Участник',
        created: 'Создана',
        descriptionLabel: 'Комментарий',
        openChat: 'Открыть чат',
        decisionReason: 'Комментарий решения',
        placeholder: 'Опишите проверку и принятое решение…',
        required: 'Добавьте комментарий перед сохранением решения.',
        block: 'Заблокировать участника в этом чате',
        resolve: 'Решить',
        dismiss: 'Отклонить',
        saved: 'Решение сохранено',
        failedDecision: 'Не удалось сохранить решение. Проверьте жалобу и повторите попытку.',
        failed: 'Не удалось загрузить жалобы на чаты.',
        categories: { spam: 'Спам', harassment: 'Оскорбления', fraud: 'Мошенничество', unsafe: 'Небезопасно', other: 'Другое' },
        statuses: { pending: 'Ожидает', resolved: 'Решена', dismissed: 'Отклонена' },
    },
    en: {
        title: 'Chat reports',
        description: 'Review messages and attachments from the report, then record a decision and block a participant when needed.',
        filter: 'Report status',
        all: 'All',
        pending: 'Pending',
        resolved: 'Resolved',
        dismissed: 'Dismissed',
        empty: 'No reports match this status.',
        category: 'Reason',
        reporter: 'Reporter',
        reported: 'Participant',
        created: 'Created',
        descriptionLabel: 'Details',
        openChat: 'Open chat',
        decisionReason: 'Decision note',
        placeholder: 'Summarise the review and decision…',
        required: 'Add a note before saving the decision.',
        block: 'Block participant in this chat',
        resolve: 'Resolve',
        dismiss: 'Dismiss',
        saved: 'Decision saved',
        failedDecision: 'Could not save the decision. Check the report and try again.',
        failed: 'Could not load chat reports.',
        categories: { spam: 'Spam', harassment: 'Harassment', fraud: 'Fraud', unsafe: 'Unsafe', other: 'Other' },
        statuses: { pending: 'Pending', resolved: 'Resolved', dismissed: 'Dismissed' },
    },
} as const

export function AdminChatReportsPanel() {
    const { locale, t } = useTranslation()
    const text = locale === 'ru' ? copy.ru : copy.en
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
        } catch {
            // The mutation state renders a localized retryable error below.
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
        {!query.isLoading && !query.error && ((query.data?.length ?? 0) === 0 ? <p className="mt-5 rounded-[var(--radius-card)] bg-secondary p-4 text-sm text-muted-foreground">{text.empty}</p> : <div className="mt-5 grid gap-3">{query.data?.map((report) => <article key={report.id} className="rounded-[var(--radius-card)] border border-border bg-background p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-status-warning/15 text-status-warning-foreground"><Flag className="size-4" /></span><div className="min-w-0"><p className="font-black text-foreground">{text.categories[report.category]}</p><p className="mt-1 text-xs text-muted-foreground">{text.reporter}: <span className="font-semibold text-foreground">{report.reporterId}</span></p><p className="mt-1 text-xs text-muted-foreground">{text.reported}: {report.reportedUserId ?? '—'}</p></div></div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-secondary px-2 py-1 text-[11px] font-black text-muted-foreground">{text.statuses[report.status]}</span><time className="text-xs text-muted-foreground">{text.created}: {new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(report.createdAt))}</time></div></div>{report.description && <p className="mt-4 rounded-[var(--radius-control)] border border-border bg-card p-3 text-sm leading-6 text-muted-foreground"><b className="text-foreground">{text.descriptionLabel}:</b> {report.description}</p>}<div className="mt-4 flex flex-wrap items-center gap-2"><Link to={`${ROUTES.adminChats}?chat=${encodeURIComponent(report.threadId)}`} className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] border border-border px-3 text-xs font-black text-foreground transition hover:border-primary hover:text-primary"><ExternalLink className="size-3.5" />{text.openChat}</Link></div>{report.status === 'pending' ? <><label className="mt-4 grid gap-2 text-xs font-bold text-muted-foreground"><span>{text.decisionReason}</span><textarea rows={2} value={notes[report.id] ?? ''} onChange={(event) => { setValidationId(null); setSavedId(null); setNotes((current) => ({ ...current, [report.id]: event.target.value })) }} placeholder={text.placeholder} className="rounded-[var(--radius-control)] border border-border bg-card p-3 text-sm font-normal text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label><label className="mt-3 flex cursor-pointer items-center gap-2 text-xs font-semibold text-foreground"><input type="checkbox" checked={block[report.id] === true} onChange={(event) => setBlock((current) => ({ ...current, [report.id]: event.target.checked }))} className="size-4 cursor-pointer accent-primary" />{text.block}<ShieldBan className="size-3.5 text-status-warning-foreground" /></label>{validationId === report.id && <p className="mt-2 text-xs font-bold text-destructive">{text.required}</p>}<div className="mt-3 flex flex-wrap items-center gap-2"><Button type="button" size="sm" loading={decision.isLoading} disabled={decision.isLoading} onClick={() => void submit(report, 'resolved')}><CheckCircle2 className="mr-1.5 size-4" />{text.resolve}</Button><Button type="button" size="sm" variant="outline" loading={decision.isLoading} disabled={decision.isLoading} onClick={() => void submit(report, 'dismissed')}><XCircle className="mr-1.5 size-4" />{text.dismiss}</Button>{savedId === report.id && <span role="status" className="text-xs font-bold text-status-success-foreground">{text.saved}</span>}</div></> : report.resolutionReason ? <p className="mt-4 rounded-[var(--radius-control)] bg-secondary px-3 py-2 text-sm text-muted-foreground"><b>{text.decisionReason}:</b> {report.resolutionReason}</p> : null}</article>)}</div>)}
    </section>
}
